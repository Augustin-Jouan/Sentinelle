import { beforeEach, describe, expect, it } from 'vitest';
import { creerParametresTest, viderBase } from '../../tests/integration/aide';
import { LOGO_SOCOREVE } from '@/documents/gabarits/logo';
import { lireParametres, modifierLogo, modifierParametre } from './parametres';

describe('paramètres', () => {
	beforeEach(async () => {
		await viderBase();
		await creerParametresTest();
	});

	it('modifie un champ', async () => {
		await modifierParametre('adresse', '  Z.I route de St Nazaire ');
		expect((await lireParametres()).adresse).toBe('Z.I route de St Nazaire');
	});

	it('le fax vide devient null', async () => {
		await modifierParametre('fax', '02 40 28 36 23');
		await modifierParametre('fax', '   ');
		expect((await lireParametres()).fax).toBeNull();
	});

	it('refuse de vider un champ obligatoire', async () => {
		await expect(modifierParametre('raisonSociale', ' ')).rejects.toThrow('Ce champ est obligatoire.');
	});

	it('RCS, APE et TVA intracommunautaire : valeurs par défaut, modifiables, obligatoires', async () => {
		const p = await lireParametres();
		expect([p.email, p.rcs, p.ape, p.tvaIntracommunautaire])
			.toEqual(['contact@socoreve-chateaubriant.com', '328999503', '4120A', 'FR47328999503']);
		await modifierParametre('tvaIntracommunautaire', ' FR47328999503 ');
		expect((await lireParametres()).tvaIntracommunautaire).toBe('FR47328999503');
		await expect(modifierParametre('rcs', '  ')).rejects.toThrow('Ce champ est obligatoire.');
	});

	it('à l\'installation, le logo est celui de SOCOREVE', async () => {
		expect((await lireParametres()).logo).toBe(LOGO_SOCOREVE);
	});

	it('change le logo, puis le retire', async () => {
		await modifierLogo('data:image/png;base64,iVBORw0KGgoAAAAN');
		expect((await lireParametres()).logo).toBe('data:image/png;base64,iVBORw0KGgoAAAAN');
		await modifierLogo(null);
		expect((await lireParametres()).logo).toBeNull();
	});

	it('refuse ce qui n\'est pas une image et garde le logo en place', async () => {
		await expect(modifierLogo('data:image/svg+xml;base64,PHN2Zz4=')).rejects.toThrow('Choisissez une image PNG ou JPEG.');
		expect((await lireParametres()).logo).toBe(LOGO_SOCOREVE);
	});
});
