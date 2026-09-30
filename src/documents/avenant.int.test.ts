import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from '@/donnees/avenants';
import { prisma } from '@/donnees/prisma';
import { formatEuros } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { genererAvenant } from './generer';
import { fermerNavigateur } from './pdf';
import type { DonneesAvenant } from './schemas';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;

async function avenant(designation: string, montant: string) {
	const { id } = await ajouterAvenant(p.lots[designation]);
	if (montant !== '0') await modifierChampAvenant(id, 'montantHt', montant);
	return id;
}
const generer = (id: string) => genererAvenant(id, p.utilisateurId, deps);

describe('lettre d\'avenant', () => {
	afterAll(fermerNavigateur);

	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
	});

	it('v1 : série de l\'avenant, lot, nom de fichier ; rien de nouveau tant que rien ne change', async () => {
		await avenant('CARRELAGE — FAÏENCE', '850');
		const id = await avenant('CARRELAGE — FAÏENCE', '-300');
		const r = await generer(id);
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Avenant02-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['AVENANT', `AVENANT:${id}`, p.lots['CARRELAGE — FAÏENCE']]);
		expect((doc.donnees as DonneesAvenant).contenu.montants.nouveauMontant).toBe(formatEuros('15780'));
		expect(await generer(id)).toMatchObject({ version: 1, nouvelle: false });
		expect(faux).toHaveBeenCalledTimes(1);
	});

	it('un avenant antérieur supprimé : v2 aux nouveaux montants ; les PDF d\'un avenant supprimé restent', async () => {
		const n1 = await avenant('CARRELAGE — FAÏENCE', '850');
		const n2 = await avenant('CARRELAGE — FAÏENCE', '-300');
		await generer(n1);
		await generer(n2);
		await supprimerAvenant(n1);
		const r = await generer(n2);
		expect(r).toMatchObject({ version: 2, nouvelle: true });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect((doc.donnees as DonneesAvenant).contenu.montants.marcheInitial).toBe(formatEuros('15120'));
		expect(await prisma.document.count({ where: { serie: `AVENANT:${n1}` } })).toBe(1);
		await expect(generer(n1)).rejects.toThrow("Cet avenant n'existe plus.");
	});

	it('montant nul ou lot sans entreprise : génération refusée', async () => {
		const nul = await avenant('PEINTURE', '0');
		await expect(generer(nul)).rejects.toThrow("Impossible de générer la lettre : montant de l'avenant.");
		const sansEntreprise = await avenant('ENDUIT EXTÉRIEUR', '100');
		await expect(generer(sansEntreprise)).rejects.toThrow("Impossible de générer la lettre : pas d'entreprise.");
		expect(await prisma.document.count()).toBe(0);
	});

	it('le vrai PDF : une page A4 portrait, même avec un objet de 600 caractères', async () => {
		const id = await avenant('PEINTURE', '-300');
		await modifierChampAvenant(id, 'objet', 'Reprise des peintures du séjour et de la cage d\'escalier après dégât des eaux. '.repeat(8).slice(0, 600));
		const r = await genererAvenant(id, p.utilisateurId, { maintenant: deps.maintenant });
		const pdf = await PDFDocument.load((await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } })).pdf);
		const { width, height } = pdf.getPage(0).getSize();
		expect([pdf.getPageCount(), width < height, Math.round(width)]).toEqual([1, true, 596]);
	});
});
