import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Les deux noms possibles du cookie de Better Auth (avec et sans préfixe sécurisé), avec une valeur inventée. */
const COOKIE_INVENTE = 'better-auth.session_token=invente; __Secure-better-auth.session_token=invente';
const SECRETS = ['M. et Mme PERRIER', 'CONSTRUCTIONS REBOURS', 'FINANCIER'];

// Revue du 2026-09-30 : ces pages livraient leurs données dans le corps de la redirection.
test('sans session valide, aucune page ne livre de données, même avec un cookie inventé', async ({ page, playwright }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.getByRole('link', { name: 'FINANCIER', exact: true }).click();
	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
	const chantier = new URL(page.url()).pathname.replace(/\/marches$/, '');

	const inconnu = await playwright.request.newContext({ baseURL: 'http://localhost:3100', extraHTTPHeaders: { Cookie: COOKIE_INVENTE } });
	const chemins = [
		'/', '/chantiers', '/chantiers/nouveau', '/artisans', '/parametres', '/admin/comptes',
		chantier, `${chantier}/marches`, `${chantier}/documents`, `${chantier}/documents?pv=tous`, `${chantier}/planning`,
	];
	for (const chemin of chemins) {
		const r = await inconnu.get(chemin, { maxRedirects: 0 });
		expect(r.status(), chemin).toBe(307);
		expect(r.headers().location, chemin).toMatch(/\/connexion$/);
		const corps = await r.text();
		for (const secret of SECRETS) expect(corps, `${chemin} livre « ${secret} »`).not.toContain(secret);
	}
	await inconnu.dispose();
});
