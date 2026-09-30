import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { insererPlanningPerrier } from '../../tests/integration/planningPerrier';
import { etatsDocumentsChantier } from './etats';
import { genererPlanning, genererRecap, genererVisa } from './generer';
import { fermerNavigateur } from './pdf';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;
let ids: Record<string, string>;

const etats = () => etatsDocumentsChantier(p.chantierId, deps.maintenant);
const allonger = (intitule: string, duree: number) => prisma.periode.update({ where: { id: ids[intitule] }, data: { duree } });
const planning = () => genererPlanning(p.chantierId, p.utilisateurId, deps);
const visa = () => genererVisa(p.chantierId, p.utilisateurId, deps);

describe('génération du planning et du visa', () => {
	afterAll(fermerNavigateur);

	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		ids = (await insererPlanningPerrier(p)).periodes;
	});

	it('planning : v1, rien de nouveau tant que rien ne change (même un autre jour), v2 après une modification', async () => {
		const v1 = await planning();
		expect(v1).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Planning-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: v1.documentId } });
		expect([doc.type, doc.serie, doc.lotId, doc.sourceId]).toEqual(['PLANNING', 'PLANNING', null, null]);
		expect(await genererPlanning(p.chantierId, p.utilisateurId, { ...deps, maintenant: new Date('2026-10-05T08:00:00Z') }))
			.toMatchObject({ version: 1, nouvelle: false });
		await allonger('Peintures', 4);
		expect(await planning()).toMatchObject({ version: 2, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Planning-v2.pdf' });
		expect(faux).toHaveBeenCalledTimes(2);
	});

	it('planning sans période : rien à imprimer, état « à produire »', async () => {
		await prisma.periode.deleteMany({});
		await expect(planning()).rejects.toThrow('Aucune période : rien à imprimer.');
		expect((await etats()).planning.etat).toBe('a-produire');
	});

	it('visa : refusé sans planning, puis rattaché à la dernière version', async () => {
		await expect(visa()).rejects.toThrow("Aucune version du planning : générez d'abord le planning.");
		const v1 = await planning();
		const r = await visa();
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-VisaPlanning-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId, doc.sourceId]).toEqual(['VISA_PLANNING', 'VISA', null, v1.documentId]);
		expect((doc.donnees as { contenu: { planning: { version: number } } }).contenu.planning.version).toBe(1);
		expect(await visa()).toMatchObject({ version: 1, nouvelle: false });
	});

	it('états : planning « modifié » après un changement, visa « périmé » seulement après une nouvelle version du planning', async () => {
		await planning();
		await visa();
		let e = await etats();
		expect(e.planning.etat).toBe('a-jour');
		expect(e.visa).toMatchObject({ etat: 'a-jour', surVersion: 1, derniereVersionPlanning: 1 });

		await allonger('Peintures', 4);
		e = await etats();
		expect(e.planning.etat).toBe('modifie');
		expect(e.visa.etat).toBe('a-jour');

		await planning();
		e = await etats();
		expect(e.planning.etat).toBe('a-jour');
		expect(e.visa).toMatchObject({ etat: 'perime', surVersion: 1, derniereVersionPlanning: 2 });

		await visa();
		e = await etats();
		expect(e.visa).toMatchObject({ etat: 'a-jour', surVersion: 2, derniereVersionPlanning: 2 });
		expect(e.visa.versions.map((v) => v.version)).toEqual([2, 1]);
	});

	it('une période modifiée pendant le rendu : aucune version', async () => {
		const pendant = vi.fn(async () => {
			await allonger('Peintures', 4);
			return new Uint8Array([1]);
		});
		await expect(genererPlanning(p.chantierId, p.utilisateurId, { ...deps, rendrePdf: pendant }))
			.rejects.toThrow('Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour.');
		expect(await prisma.document.count()).toBe(0);
	});

	it('une nouvelle version du planning pendant le rendu du visa : aucun visa', async () => {
		await planning();
		const pendant = vi.fn(async () => {
			await allonger('Peintures', 4);
			await planning();
			return new Uint8Array([1]);
		});
		await expect(genererVisa(p.chantierId, p.utilisateurId, { ...deps, rendrePdf: pendant }))
			.rejects.toThrow('Les données ont changé pendant la génération');
		expect(await prisma.document.count({ where: { serie: 'VISA' } })).toBe(0);
	});

	it('récapitulatif et planning : deux séries sans lot, chacune en v1', async () => {
		expect((await genererRecap(p.chantierId, p.utilisateurId, deps)).version).toBe(1);
		expect((await planning()).version).toBe(1);
		expect((await etats()).recap.etat).toBe('a-jour');
	});

	it('par défaut, le vrai PDF du planning tient sur une page', async () => {
		const r = await genererPlanning(p.chantierId, p.utilisateurId, { maintenant: deps.maintenant });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect((await PDFDocument.load(doc.pdf)).getPageCount()).toBe(1);
	});
});
