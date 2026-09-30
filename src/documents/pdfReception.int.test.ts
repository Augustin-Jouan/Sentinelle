import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { PV_COMMUN, PV_SAISIES, PV_SOURCE } from '../../tests/fixtures/reception';
import { imprimerReception } from './generer';
import { fermerNavigateur } from './pdf';
import { batirReception } from './reception';
import { rendreHtml } from './rendu';

describe('impression du PV de réception', () => {
	afterAll(fermerNavigateur);

	it('2 000 caractères de réserves en 60 lignes : une seule page A4 portrait', async () => {
		const reserves = Array.from({ length: 60 }, (_, i) => `Réserve ${String(i + 1).padStart(2, '0')} : reprendre le joint.`).join('\n').slice(0, 2000);
		expect(reserves.length).toBeGreaterThan(1900);
		const pdf = await PDFDocument.load(await imprimerReception(await rendreHtml(batirReception(PV_SOURCE, { ...PV_SAISIES, reserves }, PV_COMMUN))));
		const { width, height } = pdf.getPage(0).getSize();
		// Sur cette machine, Chromium annonce une largeur A4 portrait de 596 pt (et non 595 ISO).
		expect([pdf.getPageCount(), height > width, Math.round(width)]).toEqual([1, true, 596]);
	});
});
