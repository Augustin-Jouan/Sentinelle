import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier } from './etats';
import { genererMarche, genererRecap } from './generer';

const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: async () => new Uint8Array([37, 80, 68, 70]) };
let p: Awaited<ReturnType<typeof insererPerrier>>;

/** Ligne de document minimale, pour tester les contraintes de la table sans passer par la génération. */
const ligne = (serie: string, type: 'PLANNING' | 'VISA_PLANNING', sourceId: string | null = null) => ({
	chantierId: p.chantierId, serie, type, sourceId, version: 1, donnees: {}, empreinte: 'e',
	pdf: new Uint8Array([1]), nomFichier: `${serie}.pdf`, creeParId: p.utilisateurId,
});

describe('séries de documents', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('le marché porte l\'id de son lot, le récapitulatif la série RECAPITULATIF', async () => {
		const m = await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const r = await genererRecap(p.chantierId, p.utilisateurId, deps);
		expect((await prisma.document.findUniqueOrThrow({ where: { id: m.documentId } })).serie).toBe(p.lots['GROS ŒUVRE']);
		expect((await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } })).serie).toBe('RECAPITULATIF');
	});

	it('marché, récapitulatif, planning et visa coexistent en version 1 ; une série n\'a qu\'une v1', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		const planning = await prisma.document.create({ data: ligne('PLANNING', 'PLANNING') });
		await prisma.document.create({ data: ligne('VISA', 'VISA_PLANNING', planning.id) });
		expect(await prisma.document.count({ where: { chantierId: p.chantierId, version: 1 } })).toBe(4);
		await expect(prisma.document.create({ data: ligne('PLANNING', 'PLANNING') })).rejects.toThrow();
	});

	it('une version du planning citée par un visa ne peut pas être supprimée', async () => {
		const planning = await prisma.document.create({ data: ligne('PLANNING', 'PLANNING') });
		await prisma.document.create({ data: ligne('VISA', 'VISA_PLANNING', planning.id) });
		await expect(prisma.document.delete({ where: { id: planning.id } })).rejects.toThrow();
	});

	it('les états retrouvent chaque série', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		const vue = await etatsDocumentsChantier(p.chantierId, deps.maintenant);
		if (!vue) throw new Error('attendu');
		expect(vue.recap.etat).toBe('a-jour');
		const go = vue.entreprises.flatMap((g) => g.lots).find((l) => l.lotTexte === '02 — GROS ŒUVRE')!;
		expect(go.marche).toMatchObject({ etat: 'a-jour', versions: [{ version: 1 }] });
	});
});
