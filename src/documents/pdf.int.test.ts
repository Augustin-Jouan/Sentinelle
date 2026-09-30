import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { batirMarche, batirRecap } from './batir';
import { fermerNavigateur, generationsEnCours, htmlVersPdf } from './pdf';
import { rendreHtml } from './rendu';
import type { DonneesDocument } from './schemas';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const lot = (d: string) => PERRIER_LOTS.find((l) => l.designation === d)!;

async function pages(donnees: DonneesDocument) {
	const pdf = await PDFDocument.load(await htmlVersPdf(await rendreHtml(donnees)));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), paysage: width > height, largeur: Math.round(width) };
}

describe('impression PDF', () => {
	afterAll(fermerNavigateur);

	it.each([
		['marché de gré à gré', batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT)],
		['marché de sous-traitance', batirMarche(PERRIER_CHANTIER, lot('ESCALIER'), PERRIER_PARAMETRES, MAINTENANT)],
		['récapitulatif', batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES, MAINTENANT)],
	])('%s : une seule page A4 paysage', async (_nom, donnees) => {
		expect(await pages(donnees)).toEqual({ nombre: 1, paysage: true, largeur: 842 });
	});

	it('une clause particulière de 600 caractères tient encore sur une page', async () => {
		const clause = 'Les travaux de reprise des réseaux existants sont compris dans le présent lot. '.repeat(10).slice(0, 600);
		const d = batirMarche(PERRIER_CHANTIER, { ...lot('GROS ŒUVRE'), clauseParticuliere: clause }, PERRIER_PARAMETRES, MAINTENANT);
		expect((await pages(d)).nombre).toBe(1);
	});

	it('aucune requête réseau : une ressource externe est bloquée sans faire attendre', async () => {
		const debut = Date.now();
		const pdf = await htmlVersPdf('<!doctype html><html><body><img src="http://exemple.invalid/x.png"><p>ok</p></body></html>');
		expect(pdf.byteLength).toBeGreaterThan(0);
		expect(Date.now() - debut).toBeLessThan(15_000);
	});

	it('refuse une troisième génération simultanée', async () => {
		const html = await rendreHtml(batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT));
		const resultats = await Promise.allSettled([htmlVersPdf(html), htmlVersPdf(html), htmlVersPdf(html)]);
		const refus = resultats.filter((r) => r.status === 'rejected');
		expect(refus).toHaveLength(1);
		expect((refus[0] as PromiseRejectedResult).reason.message).toBe('Génération en cours, réessayez dans quelques secondes.');
	});

	it('un délai dépassé lève une erreur ; la place revient quand Chromium a vraiment fini', async () => {
		await expect(htmlVersPdf('<p>x</p>', { delaiMs: 1 })).rejects.toThrow('Délai de génération PDF dépassé.');
		await vi.waitFor(() => expect(generationsEnCours()).toBe(0), { timeout: 10_000 });
		const pdf = await htmlVersPdf('<p>après</p>');
		expect(pdf.byteLength).toBeGreaterThan(0);
	});
});
