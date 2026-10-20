import { afterEach, describe, expect, it } from 'vitest';
import {
	connexionBloquee,
	noterEchecConnexion,
	noterReussiteConnexion,
	reinitialiserPlafondConnexion,
	statutConnexionPublique,
	traiterConnexionEmail,
} from './connexion';

describe('connexion publique', () => {
	afterEach(() => {
		reinitialiserPlafondConnexion();
		delete process.env.E2E;
	});

	it('aligne le compte banni sur un échec ordinaire', () => {
		expect(statutConnexionPublique(403)).toBe(401);
		expect(statutConnexionPublique(401)).toBe(401);
		expect(statutConnexionPublique(200)).toBe(200);
	});

	it('bloque le sixième échec dans la minute, puis oublie après une réussite', () => {
		const t = 1_000_000;
		for (let i = 0; i < 5; i++) noterEchecConnexion('Ada@Exemple.fr', t + i);
		expect(connexionBloquee('ada@exemple.fr', t + 10)).toBe(true);
		expect(connexionBloquee('ada@exemple.fr', t + 60_000)).toBe(false);
		noterReussiteConnexion('ada@exemple.fr');
		for (let i = 0; i < 4; i++) noterEchecConnexion('ada@exemple.fr', t);
		expect(connexionBloquee('ada@exemple.fr', t)).toBe(false);
	});

	it('réécrit un 403 sans rappeler le corps d’origine, et laisse passer E2E', async () => {
		const requete = new Request('http://localhost/api/auth/sign-in/email', {
			method: 'POST',
			body: JSON.stringify({ email: 'a@b.fr', password: 'secret-non-journalise' }),
		});
		const reponse = await traiterConnexionEmail(requete, async () => new Response('banned', { status: 403 }));
		expect(reponse.status).toBe(401);
		expect(await reponse.json()).toEqual({ message: 'Invalid email or password' });
		expect(connexionBloquee('a@b.fr')).toBe(false);

		process.env.E2E = '1';
		for (let i = 0; i < 5; i++) noterEchecConnexion('a@b.fr');
		const passe = await traiterConnexionEmail(requete, async () => new Response('ok', { status: 200 }));
		expect(passe.status).toBe(200);
	});
});
