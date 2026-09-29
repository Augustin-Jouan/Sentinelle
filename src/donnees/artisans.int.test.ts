import { beforeEach, describe, expect, it } from 'vitest';
import { viderBase } from '../../tests/integration/aide';
import { adresseArtisan, changerActiviteArtisan, creerArtisan, listerArtisans, modifierChampArtisan } from './artisans';

describe('artisans', () => {
	beforeEach(viderBase);

	it('crée puis complète une fiche', async () => {
		const id = await creerArtisan('  PASSION BOIS ');
		await modifierChampArtisan(id, 'commune', 'Châteaubriant');
		await modifierChampArtisan(id, 'email', 'contact@passion-bois.fr');
		const [fiche] = await listerArtisans();
		expect(fiche).toMatchObject({ nom: 'PASSION BOIS', commune: 'Châteaubriant', email: 'contact@passion-bois.fr', actif: true, nombreLots: 0 });
	});

	it('refuse un nom déjà pris et un nom vide', async () => {
		await creerArtisan('MATELEC');
		await expect(creerArtisan('MATELEC')).rejects.toThrow('Une entreprise porte déjà ce nom.');
		const id = await creerArtisan('AUTRE');
		await expect(modifierChampArtisan(id, 'nom', 'MATELEC')).rejects.toThrow('Une entreprise porte déjà ce nom.');
		await expect(modifierChampArtisan(id, 'nom', '  ')).rejects.toThrow("Le nom de l'entreprise est obligatoire.");
	});

	it('refuse un e-mail invalide, accepte un e-mail vide', async () => {
		const id = await creerArtisan('X');
		await expect(modifierChampArtisan(id, 'email', 'pas-un-email')).rejects.toThrow('Adresse e-mail invalide.');
		await modifierChampArtisan(id, 'email', '');
	});

	it('se désactive et se réactive', async () => {
		const id = await creerArtisan('X');
		await changerActiviteArtisan(id, false);
		expect((await listerArtisans())[0].actif).toBe(false);
		await changerActiviteArtisan(id, true);
		expect((await listerArtisans())[0].actif).toBe(true);
	});

	it('formate l\'adresse comme la maquette', () => {
		expect(adresseArtisan({ adresse: 'Z.I. du Pigeon Blanc', cp: '35640', commune: 'MARTIGNÉ-FERCHAUD' }))
			.toBe('Z.I. du Pigeon Blanc, 35640 MARTIGNÉ-FERCHAUD');
		expect(adresseArtisan({ adresse: '', cp: '', commune: 'ERBRAY' })).toBe('ERBRAY');
		expect(adresseArtisan(null)).toBe('');
	});
});
