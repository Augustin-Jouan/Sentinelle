import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * Le garde-fou des briques (spec § 4) :
 * - className d'une brique sert au placement, et à rien d'autre ;
 * - l'identité passe par les jetons : jamais de couleur, de taille de texte, de police ni d'ombre en valeur arbitraire.
 */

const DOSSIER = path.join('src', 'composants', 'briques');

/** Les briques : les composants exportés (`export function Nom`) des fichiers .tsx de briques/. */
function nomsDesBriques(): Set<string> {
	const noms = new Set<string>();
	for (const f of readdirSync(DOSSIER).filter((n) => n.endsWith('.tsx') && !n.endsWith('.test.tsx'))) {
		for (const m of readFileSync(path.join(DOSSIER, f), 'utf8').matchAll(/export function ([A-Z]\w*)/g)) noms.add(m[1]);
	}
	return noms;
}

/** L'interface : src/**\/*.{ts,tsx}, sans les tests, le client Prisma ni les feuilles imprimables (src/documents, hors périmètre). */
function fichiers(dossier = 'src'): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return ['generated', 'documents'].includes(e.name) && dossier === 'src' ? [] : fichiers(chemin);
		return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [chemin] : [];
	});
}

/** L'utilitaire sans ses préfixes de variantes : « max-etroit:w-full » → « w-full » ; les ':' entre crochets ne comptent pas. */
export function utilitaire(classe: string): string {
	let profondeur = 0;
	let dernier = -1;
	for (let i = 0; i < classe.length; i++) {
		if (classe[i] === '[') profondeur++;
		else if (classe[i] === ']') profondeur--;
		else if (classe[i] === ':' && profondeur === 0) dernier = i;
	}
	return classe.slice(dernier + 1).replace(/^!|!$/g, '');
}

const PLACEMENT = /^(-?m[trblxyse]?-|self-|justify-self-|place-self-|order-|col-|row-|basis-|grow|shrink|flex-(1|none|auto|initial)$|w-|min-w-|max-w-|align-)/;

/** Les chaînes littérales d'une expression (un gabarit, un ternaire, un appel à cx…). */
function chainesDans(n: ts.Node): string[] {
	if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
	if (ts.isTemplateExpression(n)) return [n.head.text, ...n.templateSpans.flatMap((s) => [s.literal.text, ...chainesDans(s.expression)])];
	const sortie: string[] = [];
	ts.forEachChild(n, (e) => { sortie.push(...chainesDans(e)); });
	return sortie;
}

const source = (fichier: string, texte: string) =>
	ts.createSourceFile(fichier, texte, ts.ScriptTarget.Latest, true, fichier.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** « fichier : <Bouton> className « bg-accent » » pour chaque classe de className qui n'est pas du placement. */
export function violationsPlacement(fichier: string, texte: string, briques: Set<string>): string[] {
	const sortie: string[] = [];
	const visiter = (n: ts.Node): void => {
		if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && briques.has(n.tagName.getText())) {
			for (const a of n.attributes.properties) {
				if (!ts.isJsxAttribute(a) || a.name.getText() !== 'className' || !a.initializer) continue;
				for (const c of chainesDans(a.initializer).flatMap((t) => t.split(/\s+/)).filter(Boolean)) {
					if (!PLACEMENT.test(utilitaire(c))) sortie.push(`${fichier} : <${n.tagName.getText()}> className « ${c} »`);
				}
			}
		}
		ts.forEachChild(n, visiter);
	};
	visiter(source(fichier, texte));
	return sortie;
}

const COULEUR = /#|rgba?\(|hsla?\(|oklch|oklab|color-mix|light-dark|var\(--|currentcolor/i;
const PROPRIETE_IDENTITE = /^\[(color|background(-color)?|border(-[a-z]+)?-color|outline-color|fill|stroke|box-shadow|text-shadow|font(-family|-size)?)\s*:/;

/** Une valeur arbitraire de couleur, de taille de texte, de police ou d'ombre ? */
export function horsIdentite(classe: string): boolean {
	const u = utilitaire(classe);
	if (/^(text|font|shadow|inset-shadow|drop-shadow|text-shadow)-\[/.test(u)) return true;
	if (PROPRIETE_IDENTITE.test(u)) return true;
	const valeur = /-\[(.*)\]$/.exec(u)?.[1] ?? /^\[(.*)\]$/.exec(u)?.[1];
	return valeur !== undefined && COULEUR.test(valeur);
}

export function violationsIdentite(fichier: string, texte: string): string[] {
	return chainesDans(source(fichier, texte)).flatMap((t) => t.split(/\s+/)).filter((c) => c.includes('[') && horsIdentite(c))
		.map((c) => `${fichier} : « ${c} »`);
}

describe('garde-fou des briques : le vérificateur', () => {
	const briques = new Set(['Bouton', 'Pastille']);

	it('admet le placement, préfixes de variantes compris', () => {
		expect(violationsPlacement('a.tsx', '<Bouton className="ml-3 self-stretch max-etroit:w-full flex-1 -mt-2 align-[1px]" />', briques)).toEqual([]);
	});

	it('refuse tout le reste, nomme le fichier, la brique et la classe', () => {
		expect(violationsPlacement('a.tsx', '<Pastille className={cx("mt-1", ouvert && "bg-accent")}>x</Pastille>', briques))
			.toEqual(['a.tsx : <Pastille> className « bg-accent »']);
	});

	it('ne regarde que les briques', () => {
		expect(violationsPlacement('a.tsx', '<div className="bg-accent" />', briques)).toEqual([]);
	});

	it('refuse une couleur, une taille de texte, une police ou une ombre arbitraires', () => {
		for (const c of ['bg-[#fff]', 'text-[13px]', 'font-[Outfit]', 'shadow-[0_1px_2px_black]', 'border-[var(--rule)]', 'hover:bg-[rgb(0,0,0)]', '[color:red]', '[&_svg]:fill-[#000]']) {
			expect(horsIdentite(c), c).toBe(true);
		}
	});

	it('admet une géométrie arbitraire et les variantes arbitraires', () => {
		for (const c of ['leading-[1.3]', 'w-[min(31rem,100vw)]', 'rounded-[4px]', '[&_thead_th]:text-11', '[&_tbody_tr:not([data-ouvert]):hover]:bg-surface', 'px-[calc(0.75rem-1px)]']) {
			expect(horsIdentite(c), c).toBe(false);
		}
	});
});

describe('garde-fou des briques : le code', () => {
	const briques = nomsDesBriques();
	const tous = fichiers();

	it('className d\'une brique : placement seulement', () => {
		expect(tous.flatMap((f) => violationsPlacement(f, readFileSync(f, 'utf8'), briques))).toEqual([]);
	});

	it('identité par jetons : aucune couleur, taille de texte, police ni ombre arbitraire', () => {
		expect(tous.flatMap((f) => violationsIdentite(f, readFileSync(f, 'utf8')))).toEqual([]);
	});
});
