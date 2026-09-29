import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { prisma } from './prisma';

async function chantierAvecLot() {
	const u = await creerUtilisateurTest();
	const chantier = await prisma.chantier.create({
		data: { reference: 'TEST', maitreOuvrage: 'M. TEST', chargeAffaireId: u.id, creeParId: u.id },
	});
	const lot = await prisma.lot.create({
		data: { chantierId: chantier.id, ordre: 1, designation: 'GROS ŒUVRE', montantHtInitial: '833.33333333' },
	});
	return { u, chantier, lot };
}

const documentDe = (chantierId: string, creeParId: string, lotId: string | null, version: number) => ({
	chantierId, creeParId, lotId, version,
	type: lotId ? ('MARCHE_GRE_A_GRE' as const) : ('RECAPITULATIF' as const),
	donnees: {}, empreinte: 'x', pdf: new Uint8Array([1]), nomFichier: 'x.pdf',
});

describe('schéma', () => {
	beforeEach(viderBase);

	it('garde 8 décimales sur le HT initial', async () => {
		const { lot } = await chantierAvecLot();
		const relu = await prisma.lot.findUniqueOrThrow({ where: { id: lot.id } });
		expect(relu.montantHtInitial.toString()).toBe('833.33333333');
	});

	it('un seul récapitulatif par version (NULLS NOT DISTINCT)', async () => {
		const { u, chantier } = await chantierAvecLot();
		await prisma.document.create({ data: documentDe(chantier.id, u.id, null, 1) });
		await expect(prisma.document.create({ data: documentDe(chantier.id, u.id, null, 1) })).rejects.toThrow();
	});

	it('un lot qui a un document ne se supprime pas', async () => {
		const { u, chantier, lot } = await chantierAvecLot();
		await prisma.document.create({ data: documentDe(chantier.id, u.id, lot.id, 1) });
		await expect(prisma.lot.delete({ where: { id: lot.id } })).rejects.toThrow();
	});

	it('l\'ordre d\'un lot est unique dans son chantier', async () => {
		const { chantier } = await chantierAvecLot();
		await expect(prisma.lot.create({ data: { chantierId: chantier.id, ordre: 1, designation: 'X' } })).rejects.toThrow();
	});

	it('supprimer un chantier sans document supprime ses lots', async () => {
		const { chantier } = await chantierAvecLot();
		await prisma.chantier.delete({ where: { id: chantier.id } });
		expect(await prisma.lot.count()).toBe(0);
	});
});
