import { beforeEach, describe, expect, it } from 'vitest';
import { creerParametresTest, viderBase } from '../../tests/integration/aide';
import { lireParametres, modifierParametre } from './parametres';

describe('site web des paramètres', () => {
	beforeEach(async () => {
		await viderBase();
		await creerParametresTest();
	});

	it('rempli par défaut, facultatif : vidé, il devient nul', async () => {
		expect((await lireParametres()).siteWeb).toBe('socoreve-chateaubriant.com');
		await modifierParametre('siteWeb', '  ');
		expect((await lireParametres()).siteWeb).toBeNull();
		await modifierParametre('siteWeb', 'www.socoreve.fr');
		expect((await lireParametres()).siteWeb).toBe('www.socoreve.fr');
	});
});
