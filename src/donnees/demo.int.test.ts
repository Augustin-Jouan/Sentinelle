import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DonneesReception } from '@/documents/schemas';
import { TypeDocument } from '@/generated/prisma/enums';
import { construireDemo, REFERENCE_TEST } from '../../prisma/demo/construire';
import { creerParametresTest, creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { prisma } from './prisma';
import { seedArtisans } from './seed';

const faux = vi.fn(async () => {
	const d = await PDFDocument.create();
	d.addPage();
	return d.save();
});
let chantierId: string;

describe('jeu de démonstration', () => {
	beforeAll(async () => {
		await viderBase();
		await creerParametresTest();
		await seedArtisans();
		const admin = await creerUtilisateurTest({ role: 'admin' });
		await construireDemo(admin.id, { rendrePdf: faux });
		// Relancé : la base repart des mêmes chantiers, sans doublon.
		await construireDemo(admin.id, { rendrePdf: faux });
		chantierId = (await prisma.chantier.findUniqueOrThrow({ where: { reference: REFERENCE_TEST } })).id;
	});

	it('les 4 chantiers de la maquette et le chantier TEST, une seule fois', async () => {
		const refs = (await prisma.chantier.findMany({ select: { reference: true } })).map((c) => c.reference).sort();
		expect(refs).toEqual(['GUÉRIN — Erbray', 'MOREAU — Soudan', 'PERRIER — Louisfert', 'SCI LES CHÊNES — Derval', REFERENCE_TEST].sort());
	});

	it('TEST : lots des deux natures, dont un sans entreprise', async () => {
		const lots = await prisma.lot.findMany({ where: { chantierId } });
		expect(new Set(lots.map((l) => l.nature))).toEqual(new Set(['GRE_A_GRE', 'SOUS_TRAITANCE']));
		expect(lots.some((l) => l.artisanId === null)).toBe(true);
	});

	it('TEST : avenants en plus et en moins, acomptes manuels et certificats, une caution', async () => {
		const avenants = await prisma.avenant.findMany({ where: { lot: { chantierId } } });
		expect(avenants.some((a) => a.montantHt.gt(0))).toBe(true);
		expect(avenants.some((a) => a.montantHt.lt(0))).toBe(true);
		const acomptes = await prisma.acompte.findMany({ where: { lot: { chantierId } } });
		expect(acomptes.some((a) => a.manuel)).toBe(true);
		expect(acomptes.filter((a) => !a.manuel).length).toBeGreaterThanOrEqual(2);
		expect(await prisma.lot.count({ where: { chantierId, cautionBancaire: true } })).toBeGreaterThan(0);
	});

	it('TEST : planning enchaîné et fermetures', async () => {
		expect(await prisma.periode.count({ where: { lot: { chantierId }, dependDeId: { not: null } } })).toBeGreaterThan(0);
		expect(await prisma.fermeture.count({ where: { chantierId } })).toBeGreaterThan(0);
	});

	it('TEST : un compte rendu enregistré et un brouillon', async () => {
		const crs = await prisma.compteRendu.findMany({ where: { chantierId }, orderBy: { numero: 'asc' } });
		expect(crs.map((c) => c.statut)).toEqual(['ENREGISTRE', 'BROUILLON']);
	});

	it('TEST : un PV pour chaque décision, réserves levées sur l\'un', async () => {
		const pvs = await prisma.document.findMany({ where: { chantierId, type: 'PV_RECEPTION' }, select: { donnees: true } });
		const decisions = pvs.map((d) => (d.donnees as unknown as DonneesReception).contenu.decision);
		expect(new Set(decisions)).toEqual(new Set(['SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE']));
		expect(await prisma.reception.count({ where: { lot: { chantierId }, reservesLeveesLe: { not: null } } })).toBe(1);
	});

	it('TEST : tous les types de documents', async () => {
		const types = new Set((await prisma.document.findMany({ where: { chantierId }, select: { type: true } })).map((d) => d.type));
		expect(types).toEqual(new Set(Object.values(TypeDocument)));
	});
});
