import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Tous les fichiers `nom` sous `dossier`, récursivement. */
function trouver(dossier: string, noms: string[]): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return trouver(chemin, noms);
		return noms.includes(e.name) ? [chemin] : [];
	});
}

/** La première attente du composant exporté (les fonctions d'aide définies au-dessus ne comptent pas). */
function premiereAttente(fichier: string): string {
	const texte = readFileSync(fichier, 'utf8');
	const corps = texte.slice(Math.max(0, texte.search(/export (default |async function GET)/)));
	return /await\s+([\w.]+)/.exec(corps)?.[1] ?? '(aucune)';
}

function avantPremiereAttente(fichier: string): string {
	const texte = readFileSync(fichier, 'utf8');
	const corps = texte.slice(Math.max(0, texte.search(/export (default |async function GET)/)));
	const idx = corps.search(/await\s+/);
	return idx < 0 ? corps : corps.slice(0, idx);
}

/*
 * Un layout n'empêche pas ses pages de s'exécuter ni d'envoyer leurs données (doc Next 16, « Layouts and auth
 * checks ») : sans garde propre, une page lit la base et livre ses données dans le corps de la redirection, même
 * à qui n'a qu'un cookie inventé. Chaque page et chaque layout vérifie donc la session AVANT toute lecture.
 */
describe('gardes de session', () => {
	const pagesApp = trouver(path.join('src', 'app', '(app)'), ['page.tsx', 'layout.tsx']);
	const motDePasse = path.join('src', 'app', 'mot-de-passe', 'page.tsx');
	const routes = trouver(path.join('src', 'app', 'api'), ['route.ts'])
		.filter((f) => !f.includes(`${path.sep}auth${path.sep}`) && !f.includes(`${path.sep}sante${path.sep}`));

	it.each(pagesApp)('%s commence par exigerPage()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('exigerPage');
	});

	it('mot-de-passe/page.tsx commence par utilisateurConnecte()', () => {
		expect(premiereAttente(motDePasse)).toBe('utilisateurConnecte');
	});

	it.each(routes)('%s commence par utilisateurConnecte()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('utilisateurConnecte');
	});

	it('aucune lecture prisma/donnees avant la première attente', () => {
		for (const fichier of [...pagesApp, motDePasse, ...routes]) {
			expect(avantPremiereAttente(fichier), fichier).not.toMatch(/\bprisma\.|@\/donnees\//);
		}
	});

	it('executer commence par utilisateurConnecte()', () => {
		const texte = readFileSync(path.join('src', 'actions', 'executer.ts'), 'utf8');
		const corps = texte.slice(texte.search(/export async function executer/));
		expect(/await\s+([\w.]+)/.exec(corps)?.[1]).toBe('utilisateurConnecte');
	});

	it('les listes ne sont pas vides (le test voit bien les fichiers)', () => {
		expect(trouver(path.join('src', 'app', '(app)'), ['page.tsx']).length).toBeGreaterThan(8);
		// archive, receptions-pdf, documents/[id]/pdf
		expect(routes.length).toBeGreaterThanOrEqual(3);
	});
});
