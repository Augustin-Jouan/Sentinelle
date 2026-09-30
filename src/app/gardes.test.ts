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

/*
 * Un layout n'empêche pas ses pages de s'exécuter ni d'envoyer leurs données (doc Next 16, « Layouts and auth
 * checks ») : sans garde propre, une page lit la base et livre ses données dans le corps de la redirection, même
 * à qui n'a qu'un cookie inventé. Chaque page et chaque layout vérifie donc la session AVANT toute lecture.
 */
describe('gardes de session', () => {
	it.each(trouver(path.join('src', 'app', '(app)'), ['page.tsx', 'layout.tsx']))('%s commence par exigerPage()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('exigerPage');
	});

	const routes = trouver(path.join('src', 'app', 'api'), ['route.ts'])
		.filter((f) => !f.includes(`${path.sep}auth${path.sep}`) && !f.includes(`${path.sep}sante${path.sep}`));

	it.each(routes)('%s commence par utilisateurConnecte()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('utilisateurConnecte');
	});

	it('les listes ne sont pas vides (le test voit bien les fichiers)', () => {
		expect(trouver(path.join('src', 'app', '(app)'), ['page.tsx']).length).toBeGreaterThan(8);
		expect(routes.length).toBeGreaterThanOrEqual(4);
	});
});
