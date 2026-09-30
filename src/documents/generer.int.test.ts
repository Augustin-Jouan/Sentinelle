import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOT_DISPARU } from '@/donnees/lots';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { genererMarche, genererMarchesManquants, genererRecap } from './generer';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;

describe('génération et versions', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
	});

	it('crée la v1 avec le PDF, la copie JSON et le nom de fichier', async () => {
		const r = await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Marche-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect(doc.type).toBe('MARCHE_GRE_A_GRE');
		expect(Array.from(doc.pdf)).toEqual([37, 80, 68, 70]);
		expect((doc.donnees as { contenu: { montantTtcTexte: string } }).contenu.montantTtcTexte).toBe('115 500,00 €');
	});

	it('ne crée rien si rien n\'a changé, même un autre jour ou après un changement de paramètres', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.parametres.update({ where: { id: 1 }, data: { telephone: '02 99 99 99 99' } });
		const r = await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, { ...deps, maintenant: new Date('2026-12-01T08:00:00Z') });
		expect(r).toMatchObject({ version: 1, nouvelle: false });
		expect(faux).toHaveBeenCalledTimes(1);
	});

	it('crée la v2 quand le lot change', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { montantHtInitial: '97000' } });
		expect(await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps)).toMatchObject({ version: 2, nouvelle: true });
	});

	it('changer la nature continue la même série avec l\'autre type', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { nature: 'SOUS_TRAITANCE', exemplaires: 2 } });
		const r = await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		expect(r).toMatchObject({ version: 2, nomFichier: 'PERRIER-LOUISFERT-ST-GROS-OEUVRE-Marche-v2.pdf' });
		const types = (await prisma.document.findMany({ where: { lotId: p.lots['GROS ŒUVRE'] }, orderBy: { version: 'asc' } })).map((d) => d.type);
		expect(types).toEqual(['MARCHE_GRE_A_GRE', 'MARCHE_SOUS_TRAITANCE']);
	});

	it('un échec de Chromium ne crée aucune ligne', async () => {
		const echec = vi.fn(async () => { throw new Error('Chromium a planté'); });
		await expect(genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, { ...deps, rendrePdf: echec }))
			.rejects.toThrow('La génération du PDF a échoué. Réessayez ; si le problème persiste, prévenez l\'administrateur.');
		expect(await prisma.document.count()).toBe(0);
	});

	it('refuse un lot incomplet en nommant ce qui manque', async () => {
		await expect(genererMarche(p.lots['ENDUIT EXTÉRIEUR'], p.utilisateurId, deps))
			.rejects.toThrow("Impossible de générer le marché : pas d'entreprise, montant nul.");
	});

	it('un artisan archivé reste générable', async () => {
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { actif: false } });
		expect((await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps)).version).toBe(1);
	});

	it('le récapitulatif a sa propre série', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const r = await genererRecap(p.chantierId, p.utilisateurId, deps);
		expect(r).toMatchObject({ version: 1, nomFichier: 'PERRIER-LOUISFERT-RecapMarches-v1.pdf' });
		await prisma.lot.update({ where: { id: p.lots.PEINTURE }, data: { montantHtInitial: '9500' } });
		expect((await genererRecap(p.chantierId, p.utilisateurId, deps)).version).toBe(2);
	});

	it('deux générations simultanées du même contenu ne créent qu\'une version', async () => {
		const [a, b] = await Promise.all([
			genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps),
			genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps),
		]);
		expect(a.documentId).toBe(b.documentId);
		expect(await prisma.document.count()).toBe(1);
	});

	it('un contenu modifié pendant une génération lente ne crée pas de version périmée', async () => {
		let liberer!: () => void;
		const bloque = new Promise<void>((r) => { liberer = r; });
		const lent = vi.fn(async () => { await bloque; return new Uint8Array([1]); });
		const premiere = genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, { ...deps, rendrePdf: lent });
		await vi.waitFor(() => expect(lent).toHaveBeenCalled());
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { montantHtInitial: '97000' } });
		const seconde = await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		liberer();
		// La génération lente porte l'ancien contenu : elle est abandonnée au lieu de passer devant la v1 à jour.
		await expect(premiere).rejects.toThrow('Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour.');
		expect(seconde.version).toBe(1);
		expect(await prisma.document.count()).toBe(1);
	});

	it('génère les marchés manquants un par un et dit ce qui est ignoré', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const r = await genererMarchesManquants(p.chantierId, p.utilisateurId, deps);
		expect(r.generes).toHaveLength(11);
		expect(r.generes).not.toContain('Lot 02');
		expect(r.generes).toContain('ESCALIER');
		expect(r.ignores).toEqual([{ lot: 'Lot 12', raison: "pas d'entreprise, montant nul" }]);
		expect(await prisma.document.count()).toBe(12);
	});

	it('lot supprimé pendant le rendu : message métier, pas d\'erreur inattendue', async () => {
		const lotId = p.lots.PEINTURE;
		await expect(genererMarche(lotId, p.utilisateurId, {
			...deps,
			rendrePdf: async () => {
				await prisma.lot.delete({ where: { id: lotId } });
				return new Uint8Array([37, 80, 68, 70]);
			},
		})).rejects.toThrow(LOT_DISPARU);
		expect(await prisma.document.count()).toBe(0);
	});
});
