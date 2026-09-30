import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { CR_SAISIES, CR_SOURCE } from '../../tests/fixtures/compteRendu';
import { batirCompteRendu } from './compteRendu';
import { imprimerPortrait } from './generer';
import { fermerNavigateur } from './pdf';
import { rendreHtml } from './rendu';

async function pages(coordination: string) {
	const pdf = await PDFDocument.load(await imprimerPortrait(await rendreHtml(batirCompteRendu(CR_SOURCE, { ...CR_SAISIES, coordination }))));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), portrait: height > width, largeur: Math.round(width) };
}

describe('impression du compte rendu', () => {
	afterAll(fermerNavigateur);

	it('court : une page A4 portrait', async () => {
		// Chromium on this machine reports A4 portrait as 596 pt wide (not ISO 595).
		expect(await pages(CR_SAISIES.coordination)).toEqual({ nombre: 1, portrait: true, largeur: 596 });
	});

	it('300 lignes de coordination : plusieurs pages A4 portrait, rien de rogné', async () => {
		const longue = ['GROS ŒUVRE :', ...Array.from({ length: 300 }, (_, i) => `Point ${i + 1} : vérifier les réservations du niveau.`)].join('\n');
		const p = await pages(longue);
		expect(p.nombre).toBeGreaterThan(1);
		expect([p.portrait, p.largeur]).toEqual([true, 596]);
	});
});
