import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Rule } from 'postcss';
import ts from 'typescript';

/*
 * L'héritage de la maquette (heritage.css) ne fait que maigrir pendant la migration vers les briques :
 * aucun sélecteur nouveau (la liste figée), aucune règle morte (une classe que plus rien n'écrit).
 * Outils lus par heritage.test.ts et par scripts/heritage.ts. Ils disparaissent avec l'héritage.
 */

export const FICHIER_HERITAGE = path.join('src', 'styles', 'heritage.css');
export const FICHIER_SELECTEURS = path.join('src', 'styles', 'heritage.selecteurs.txt');

/** Un sélecteur sans ses blancs superflus : la liste figée ne dépend pas de la mise en forme. */
export function normaliser(selecteur: string): string {
	return selecteur.replace(/\s+/g, ' ').trim();
}

/** Les classes citées par un sélecteur : « .chantier-actions .btn:hover » → chantier-actions, btn. */
export function classesDe(selecteur: string): string[] {
	return [...selecteur.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

const dansKeyframes = (r: Rule) => r.parent?.type === 'atrule' && /keyframes$/.test((r.parent as AtRule).name);

/** Les sélecteurs d'une feuille, un par entrée (une règle à trois sélecteurs en donne trois) ; les images clés n'en sont pas. */
export function selecteursDe(css: string): string[] {
	const sortie: string[] = [];
	postcss.parse(css).walkRules((r) => {
		if (!dansKeyframes(r)) sortie.push(...r.selectors.map(normaliser));
	});
	return sortie;
}

/** Le code qui peut écrire une classe : src/**\/*.{ts,tsx}, sans les tests, le client Prisma, le CSS des feuilles imprimables ni src/styles. */
export function fichiersSources(dossier = 'src'): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' || chemin === path.join('src', 'styles') ? [] : fichiersSources(chemin);
		if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) return [];
		return chemin === path.join('src', 'documents', 'styles.ts') ? [] : [chemin];
	});
}

/** Toutes les chaînes littérales d'un fichier : '…', "…", `…` (morceaux d'un gabarit compris). Le texte JSX n'en est pas. */
export function chainesDe(fichier: string): string[] {
	const sortie: string[] = [];
	const source = ts.createSourceFile(fichier, readFileSync(fichier, 'utf8'), ts.ScriptTarget.Latest, true,
		fichier.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	const visiter = (n: ts.Node): void => {
		if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) sortie.push(n.text);
		else if (ts.isTemplateExpression(n)) sortie.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
		ts.forEachChild(n, visiter);
	};
	visiter(source);
	return sortie;
}

/** Les mots des chaînes littérales (« btn btn-sm » → btn, btn-sm) : une classe absente de cet ensemble n'est plus écrite nulle part. */
export function motsDesChaines(fichiers: string[]): Set<string> {
	return new Set(fichiers.flatMap(chainesDe).flatMap((c) => c.split(/[^\w-]+/)).filter(Boolean));
}

/** Un sélecteur est mort dès qu'une de ses classes n'est plus écrite. Les sélecteurs sans classe ne meurent jamais. */
export function selecteursMorts(css: string, mots: Set<string>): string[] {
	return selecteursDe(css).filter((s) => classesDe(s).some((c) => !mots.has(c)));
}

/**
 * Retire les sélecteurs que `garder` refuse, puis ce qu'ils laissent vide : règles, @media,
 * et @keyframes qu'aucune animation restante n'utilise.
 */
export function elaguer(css: string, garder: (selecteur: string) => boolean): string {
	const racine = postcss.parse(css);
	racine.walkRules((r) => {
		if (dansKeyframes(r)) return;
		const vivants = r.selectors.filter((s) => garder(normaliser(s)));
		if (!vivants.length) r.remove();
		else if (vivants.length < r.selectors.length) r.selectors = vivants;
	});
	for (let retire = true; retire;) {
		retire = false;
		racine.walkAtRules((a) => {
			if (a.name !== 'keyframes' && !a.nodes?.some((n) => n.type !== 'comment')) {
				a.remove();
				retire = true;
			}
		});
	}
	const animations = new Set<string>();
	racine.walkDecls(/^animation(-name)?$/, (d) => d.value.split(/[\s,]+/).forEach((m) => animations.add(m)));
	racine.walkAtRules(/keyframes$/, (a) => { if (!animations.has(a.params)) a.remove(); });
	return racine.toString();
}

/** « btn », ou un préfixe « g-* » : la classe correspond-elle à l'un des motifs ? */
export function correspond(classe: string, motifs: string[]): boolean {
	return motifs.some((m) => (m.endsWith('*') ? classe.startsWith(m.slice(0, -1)) : classe === m));
}

export const lireHeritage = () => readFileSync(FICHIER_HERITAGE, 'utf8');
export const lireSelecteursFiges = () => new Set(readFileSync(FICHIER_SELECTEURS, 'utf8').split('\n').filter(Boolean));
