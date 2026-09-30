import { beforeEach, describe, expect, it } from 'vitest';
import { lundiIso } from '@/domaine/semaines';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { lireNavigation } from './navigation';
import { prisma } from './prisma';

describe('lireNavigation', () => {
	beforeEach(viderBase);

	it('compte les lots, les périodes et les documents de chaque chantier, et toutes les entreprises', async () => {
		const admin = await creerUtilisateurTest();
		const a = await prisma.chantier.create({ data: { reference: 'A — Test', maitreOuvrage: 'A', chargeAffaireId: admin.id, creeParId: admin.id, creeLe: new Date('2026-01-01') } });
		const b = await prisma.chantier.create({ data: { reference: 'B — Test', maitreOuvrage: 'B', termine: true, chargeAffaireId: admin.id, creeParId: admin.id, creeLe: new Date('2026-02-01') } });
		const lot = await prisma.lot.create({ data: { chantierId: a.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.lot.create({ data: { chantierId: a.id, ordre: 2, designation: 'CHARPENTE' } });
		await prisma.periode.createMany({ data: [
			{ lotId: lot.id, intitule: 'Fondations', debut: lundiIso(2026, 16), duree: 3 },
			{ lotId: lot.id, intitule: 'Élévation', debut: lundiIso(2026, 20), duree: 4 },
		] });
		await prisma.artisan.createMany({ data: [{ nom: 'X' }, { nom: 'Y', actif: false }] });

		const vue = await lireNavigation();

		// Du plus récent au plus ancien, comme la liste de la maquette (un nouveau chantier arrive en tête).
		expect(vue.chantiers).toEqual([
			{ id: b.id, reference: 'B — Test', termine: true, lots: 0, periodes: 0, documents: 0 },
			{ id: a.id, reference: 'A — Test', termine: false, lots: 2, periodes: 2, documents: 0 },
		]);
		expect(vue.artisans).toBe(2);   // archivées comprises : la maquette les compte (state.artisans.length)
	});
});
