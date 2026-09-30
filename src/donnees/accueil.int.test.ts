import { beforeEach, describe, expect, it } from 'vitest';
import { lundiIso } from '@/domaine/semaines';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { SUPPRESSION_IMPOSSIBLE } from '@/domaine/accueil';
import { lireAccueil } from './accueil';
import { supprimerChantier } from './chantiers';
import { prisma } from './prisma';

let ca: { id: string };

async function chantier(reference: string) {
	return prisma.chantier.create({ data: {
		reference, maitreOuvrage: 'M. TEST', commune: 'ISSÉ', dateSignaturePrevue: new Date('2026-10-02T00:00:00Z'),
		chargeAffaireId: ca.id, creeParId: ca.id,
	} });
}

describe('accueil', () => {
	beforeEach(async () => {
		await viderBase();
		ca = await creerUtilisateurTest({ nom: 'Augustin Jouan' });
	});

	it('lit une carte par chantier : lots, attribués, périodes, documents, TTC engagé avenants compris', async () => {
		const c = await chantier('TEST — Issé');
		const artisan = await prisma.artisan.create({ data: { nom: 'MATELEC' } });
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'ÉLECTRICITÉ', artisanId: artisan.id, montantHtInitial: 1000 } });
		await prisma.lot.create({ data: { chantierId: c.id, ordre: 2, designation: 'PEINTURE' } });
		await prisma.avenant.create({ data: { lotId: lot.id, numero: 1, montantHt: 100, date: new Date('2026-05-12T00:00:00Z') } });
		await prisma.periode.create({ data: { lotId: lot.id, intitule: 'Réseaux', debut: lundiIso(2026, 40), duree: 1 } });

		const [carte] = await lireAccueil();

		expect(carte).toMatchObject({
			id: c.id, reference: 'TEST — Issé', commune: 'ISSÉ', chargeAffaire: 'Augustin Jouan', dateSignature: '2026-10-02',
			termine: false, lots: 2, attribues: 1, periodes: 1, documents: 0, ttc: '1320.00',
		});
	});

	it('supprime un chantier sans document, avec ses lots, périodes et fermetures', async () => {
		const c = await chantier('TEST — Vide');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.periode.create({ data: { lotId: lot.id, intitule: 'Fondations', debut: lundiIso(2026, 16), duree: 3 } });
		await prisma.fermeture.create({ data: { chantierId: c.id, libelle: 'Congés', debut: lundiIso(2026, 31), duree: 2 } });

		await supprimerChantier(c.id);

		expect(await prisma.chantier.count()).toBe(0);
		expect(await prisma.lot.count()).toBe(0);
		expect(await prisma.periode.count()).toBe(0);
	});

	it('refuse de supprimer un chantier qui a un document, sans rien effacer', async () => {
		const c = await chantier('TEST — Documenté');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.document.create({ data: {
			chantierId: c.id, lotId: lot.id, serie: lot.id, type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: 'x.pdf', creeParId: ca.id,
		} });

		await expect(supprimerChantier(c.id)).rejects.toThrow(SUPPRESSION_IMPOSSIBLE);
		expect(await prisma.lot.count()).toBe(1);
	});
});
