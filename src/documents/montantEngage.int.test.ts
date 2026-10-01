import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listerChantiers } from '@/donnees/chantiers';
import { modifierChampLot } from '@/donnees/lots';
import { lireVueMarches } from '@/donnees/marches';
import { prisma } from '@/donnees/prisma';
import { formatEuros } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { construireDonneesRecap } from './donnees';
import { etatsDocumentsChantier } from './etats';
import { genererMarche, genererMarchesManquants, genererRecap } from './generer';
import { recapVersXlsx } from './tableur';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;

const avenant = (designation: string, numero: number, montantHt: string) =>
	prisma.avenant.create({ data: { lotId: p.lots[designation], numero, montantHt, date: new Date('2026-05-12T00:00:00Z') } });
const htInitial = async (designation: string) =>
	(await prisma.lot.findUniqueOrThrow({ where: { id: p.lots[designation] } })).montantHtInitial.toString();
const ligneDocuments = async (designation: string) =>
	(await etatsDocumentsChantier(p.chantierId, deps.maintenant))!.lots.find((l) => l.lotId === p.lots[designation])!;

describe('montant engagé', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
	});

	it('compte les avenants : tableau, totaux, liste des chantiers, récapitulatif, tableur', async () => {
		// Annexe A : CARRELAGE 12 600 HT, + 850 puis − 300 → 13 150 HT, 15 780 TTC.
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		await avenant('CARRELAGE — FAÏENCE', 2, '-300');
		const vue = await lireVueMarches(p.chantierId);
		if (!vue) throw new Error('attendu');
		expect(vue.lots.find((l) => l.designation === 'CARRELAGE — FAÏENCE')).toMatchObject({
			htInitial: '12600', sommeAvenants: '550', htEngage: '13150', ttcEngage: '15780',
		});
		// PERRIER : 374 016 € TTC sans avenant ; + 550 × 1,2.
		expect(vue.totalTtcTexte).toBe(formatEuros('374676'));
		expect((await listerChantiers()).find((c) => c.id === p.chantierId)?.totalTtcTexte).toBe(formatEuros('374676'));
		const { donnees } = await construireDonneesRecap(p.chantierId, deps.maintenant);
		expect(donnees.contenu.lignes.find((l) => l.designation === 'CARRELAGE — FAÏENCE')?.montantTtc).toBe('15780.00');
		expect(donnees.contenu.totalTtc).toBe('374676.00');
		const classeur = new ExcelJS.Workbook();
		await classeur.xlsx.load((await recapVersXlsx(donnees)) as never);
		const lignes = classeur.getWorksheet('Récapitulatif')!.getSheetValues().filter(Boolean) as unknown[][];
		expect(lignes.find((l) => l[2] === 'CARRELAGE — FAÏENCE')?.[4]).toBe(15780);
		expect(lignes.find((l) => l[1] === 'TOTAL MARCHÉS')?.[4]).toBe(374676);
	});

	it('un avenant laisse le marché « à jour » mais rend le récapitulatif « modifié » ; saisir un TTC rend le marché « modifié »', async () => {
		await genererMarche(p.lots['CARRELAGE — FAÏENCE'], p.utilisateurId, deps);
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('a-jour');
		expect((await etatsDocumentsChantier(p.chantierId, deps.maintenant))!.recap.etat).toBe('modifie');

		// Le même TTC engagé redonne le même HT initial : rien ne change.
		await modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '16 140,00');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12600');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('a-jour');

		// HT initial = 16 200 / 1,2 − 850 = 12 650 : le montant signé change.
		await modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '16 200');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12650');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('modifie');
	});

	it('TTC inférieur aux seuls avenants, HT sous les moins-values : refusés, rien d\'écrit', async () => {
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		await expect(modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '1 000')).rejects.toThrow('Ce TTC est inférieur aux seuls avenants.');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12600');

		await avenant('PEINTURE', 1, '-300');
		await expect(modifierChampLot(p.lots.PEINTURE, 'montantHt', '299,99')).rejects.toThrow('Ce HT est inférieur aux seuls avenants.');
		expect(await htInitial('PEINTURE')).toBe('9450');
		await modifierChampLot(p.lots.PEINTURE, 'montantHt', '300');
		expect(await htInitial('PEINTURE')).toBe('300');
	});

	it('générer les marchés manquants : un lot qui n\'a qu\'une lettre d\'avenant et un certificat a encore son marché à produire', async () => {
		const autre = (serie: string, type: 'AVENANT' | 'CERTIFICAT_PAIEMENT') => prisma.document.create({ data: {
			chantierId: p.chantierId, lotId: p.lots.PEINTURE, serie, type, version: 1, donnees: {}, empreinte: 'e',
			pdf: new Uint8Array([1]), nomFichier: `${serie}.pdf`, creeParId: p.utilisateurId,
		} });
		await autre('AVENANT:x', 'AVENANT');
		await autre('CERTIFICAT:y', 'CERTIFICAT_PAIEMENT');
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const r = await genererMarchesManquants(p.chantierId, p.utilisateurId, deps);
		expect(r.generes).toContain('Lot 11');
		expect(r.generes).not.toContain('Lot 02');
		expect(await prisma.document.count({ where: { serie: p.lots.PEINTURE } })).toBe(1);
	});
});
