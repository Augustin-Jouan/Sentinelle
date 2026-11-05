import { LOGO_SOCOREVE } from '@/documents/gabarits/logo';
import { beforeEach, describe, expect, it } from 'vitest';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { batirMarche, batirRecap } from './batir';
import { construireDonneesMarche, construireDonneesRecap } from './donnees';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');

describe('lecture des sources en base', () => {
	beforeEach(viderBase);

	it('la base redonne exactement les objets de la fixture', async () => {
		const { chantierId, lots } = await insererPerrier();
		// La base installée porte le logo SOCOREVE ; la fixture n'en a pas.
		const parametres = { ...PERRIER_PARAMETRES, logo: LOGO_SOCOREVE };
		const marche = await construireDonneesMarche(lots['GROS ŒUVRE'], MAINTENANT);
		expect(marche.donnees).toEqual(batirMarche(PERRIER_CHANTIER, PERRIER_LOTS[1], parametres, MAINTENANT));
		const escalier = await construireDonneesMarche(lots.ESCALIER, MAINTENANT);
		expect(escalier.donnees).toEqual(batirMarche(PERRIER_CHANTIER, PERRIER_LOTS[11], parametres, MAINTENANT));
		const recap = await construireDonneesRecap(chantierId, MAINTENANT);
		expect(recap.donnees).toEqual(batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, parametres, MAINTENANT));
	});
});
