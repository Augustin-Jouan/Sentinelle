import { expect, test } from '@playwright/test';
import { config } from 'dotenv';
import pg from 'pg';
import { ADMIN, carteChantier, seConnecter } from './aide';

// override : aide.ts (importé avant, imports hissés) a déjà chargé .env et sa base de développement.
config({ path: '.env.test', override: true });

/** Compte les PV d'un chantier sans passer par Prisma (le client généré est ESM, Playwright charge le spec en CJS). */
async function compterReceptions(chantierId: string) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		const r = await client.query<{ n: number }>(
			'SELECT count(*)::int AS n FROM "Reception" r JOIN "Lot" l ON l.id = r."lotId" WHERE l."chantierId" = $1',
			[chantierId],
		);
		return r.rows[0].n;
	} finally {
		await client.end();
	}
}

/** Les deux noms possibles du cookie de Better Auth (avec et sans préfixe sécurisé), avec une valeur inventée. */
const COOKIE_INVENTE = 'better-auth.session_token=invente; __Secure-better-auth.session_token=invente';
const SECRETS = ['M. et Mme PERRIER', 'CONSTRUCTIONS REBOURS', 'FINANCIER'];

// Revue du 2026-09-30 : ces pages livraient leurs données dans le corps de la redirection.
test('sans session valide, aucune page ne livre de données, même avec un cookie inventé', async ({ page, playwright }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await carteChantier(page, 'FINANCIER').click();
	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
	const chantier = new URL(page.url()).pathname.replace(/\/marches$/, '');
	const chantierId = chantier.split('/').pop()!;

	const inconnu = await playwright.request.newContext({ baseURL: 'http://localhost:3100', extraHTTPHeaders: { Cookie: COOKIE_INVENTE } });
	const chemins = [
		'/', '/chantiers', '/chantiers/nouveau', '/artisans', '/parametres', '/admin/comptes',
		chantier, `${chantier}/marches`, `${chantier}/documents`, `${chantier}/documents?pv=tous`, `${chantier}/planning`,
	];
	const avantPv = await compterReceptions(chantierId);
	for (const chemin of chemins) {
		const r = await inconnu.get(chemin, { maxRedirects: 0 });
		expect(r.status(), chemin).toBe(307);
		expect(r.headers().location, chemin).toMatch(/\/connexion$/);
		const corps = await r.text();
		for (const secret of SECRETS) expect(corps, `${chemin} livre « ${secret} »`).not.toContain(secret);
	}
	expect(await compterReceptions(chantierId), '?pv=tous n\'écrit pas sans session').toBe(avantPv);

	const fichiers = [
		`/api/chantiers/${chantierId}/archive`,
		`/api/chantiers/${chantierId}/receptions-pdf?documents=x`,
		'/api/documents/x/pdf',
	];
	for (const chemin of fichiers) {
		const r = await inconnu.get(chemin, { maxRedirects: 0 });
		expect(r.status(), chemin).toBe(401);
		const corps = await r.body();
		expect(corps.subarray(0, 5).toString(), `${chemin} n'est pas un PDF`).not.toBe('%PDF-');
		expect([...corps.subarray(0, 2)], `${chemin} n'est pas un ZIP`).not.toEqual([0x50, 0x4b]);
	}

	const adminAuth = await inconnu.post('/api/auth/admin/create-user', { maxRedirects: 0 });
	expect(adminAuth.status()).toBe(404);

	await inconnu.dispose();
});
