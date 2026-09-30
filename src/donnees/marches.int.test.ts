import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { lireVueMarches } from './marches';
import { prisma } from './prisma';

describe('vue de l\'onglet Marchés', () => {
	beforeEach(viderBase);

	it('le lot porte ses avenants et l\'état de ses certificats', async () => {
		const p = await insererPerrier();
		const lotId = p.lots.PEINTURE;
		await prisma.avenant.create({ data: { lotId, numero: 2, montantHt: '-300', devis: 'D-7', date: new Date('2026-05-12T00:00:00Z') } });
		await prisma.acompte.create({ data: { lotId, numero: 1, montantHt: '2000', manuel: true } });
		const certificat = await prisma.acompte.create({ data: {
			lotId, numero: 2, montantHt: '1000', cumulRealiseHt: '3000', mois: '2026-07', date: new Date('2026-09-30T00:00:00Z'),
		} });
		const vue = await lireVueMarches(p.chantierId);
		if (!vue) throw new Error('attendu');
		expect(vue.lots.find((l) => l.id === lotId)).toMatchObject({
			avenants: [{ numero: 2, devis: 'D-7', montantHt: '-300', date: '2026-05-12' }],
			certificat: { possible: true, dernier: { id: certificat.id, numero: 2 } },
		});
		expect(vue.lots.find((l) => l.designation === 'ENDUIT EXTÉRIEUR')?.certificat).toEqual({ possible: false, dernier: null });
		expect(vue.lots.find((l) => l.designation === 'GROS ŒUVRE')?.certificat).toEqual({ possible: true, dernier: null });
	});

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
		if (!vue) throw new Error('attendu');
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

	it('chantier inconnu : nul', async () => {
		expect(await lireVueMarches('inconnu')).toBeNull();
	});
});
