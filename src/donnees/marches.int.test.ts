import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { lireVueMarches } from './marches';
import { prisma } from './prisma';

describe('vue de l\'onglet Marchés', () => {
	beforeEach(viderBase);

	it('assemble lots, entreprises, montants et totaux', async () => {
		const u = await creerUtilisateurTest();
		const artisan = await prisma.artisan.create({ data: { nom: 'CONSTRUCTIONS REBOURS', adresse: 'Z.I. du Pigeon Blanc', cp: '35640', commune: 'MARTIGNÉ-FERCHAUD', actif: false } });
		const c = await prisma.chantier.create({ data: {
			reference: 'T', maitreOuvrage: 'M. T', adresse: 'Le Haut Bois', chargeAffaireId: u.id, creeParId: u.id,
			dateSignaturePrevue: new Date('2026-04-03T00:00:00Z'),
			lots: { create: [
				{ ordre: 2, numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', exemplaires: 2 },
				{ ordre: 1, numero: '02', designation: 'GROS ŒUVRE', artisanId: artisan.id, montantHtInitial: '96250' },
			] },
		} });
		const vue = await lireVueMarches(c.id);
		expect(vue.dateSignatureChantier).toBe('2026-04-03');
		expect(vue.lots.map((l) => l.designation)).toEqual(['GROS ŒUVRE', 'ESCALIER']);
		expect(vue.lots[0]).toMatchObject({
			entreprise: 'CONSTRUCTIONS REBOURS', commune: 'MARTIGNÉ-FERCHAUD', artisanArchive: true,
			htInitial: '96250', tauxTva: '20', ttcEngage: '115500', manques: [],
		});
		expect(vue.lots[1].manques).toEqual(['entreprise', 'montant']);
		expect(vue.artisans[0].adresseComplete).toBe('Z.I. du Pigeon Blanc, 35640 MARTIGNÉ-FERCHAUD');
		expect([vue.totalHtTexte, vue.totalTvaTexte, vue.totalTtcTexte])
			.toEqual(['96 250,00 €', '19 250,00 €', '115 500,00 €']);
	});
});
