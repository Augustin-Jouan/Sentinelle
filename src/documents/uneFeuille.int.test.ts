import { PDFDocument } from 'pdf-lib';
import { chromium } from 'playwright';
import { afterAll, describe, expect, it } from 'vitest';
import { COULEURS } from '@/domaine/couleurs';
import { lundiDuRang, lundiIso, rangDe } from '@/domaine/semaines';
import { PERRIER_CHANTIER, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { sourcePlanningPerrier } from '../../tests/fixtures/planningPerrier';
import { batirPlanning, batirVisa, type SourcePlanning } from './batir';
import { fermerNavigateur, htmlVersPdf } from './pdf';
import { rendreHtml } from './rendu';
import type { DonneesDocument } from './schemas';
import { ajusterUneFeuille, ECHELLE_MIN, HAUTEUR_UTILE_PX, LARGEUR_UTILE_PX, OPTIONS_UNE_FEUILLE } from './uneFeuille';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const perrier = batirPlanning(sourcePlanningPerrier(), PERRIER_PARAMETRES, MAINTENANT);

/** `nbLots` lots aux noms d'entreprise de 40 caractères ; le premier couvre 104 semaines. */
function sourceChargee(nbLots: number): SourcePlanning {
	const depart = rangDe(lundiIso(2026, 1));
	return {
		chantier: PERRIER_CHANTIER,
		lots: Array.from({ length: nbLots }, (_, i) => ({
			designation: `LOT ${String(i + 1).padStart(2, '0')} — CORPS D'ÉTAT`,
			entreprise: `ENTREPRISE ${String(i + 1).padStart(2, '0')} ${'X'.repeat(26)}`,
			couleur: COULEURS[i % COULEURS.length].cle,
			periodes: [{ intitule: `Période ${i + 1}`, debut: lundiDuRang(depart + ((i * 3) % 100)), duree: i === 0 ? 104 : 4 }],
		})),
		fermetures: [],
	};
}

async function pages(donnees: DonneesDocument) {
	const pdf = await PDFDocument.load(await htmlVersPdf(await rendreHtml(donnees), { uneSeuleFeuille: true }));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), paysage: width > height };
}

/** La mesure telle que Playwright la fait avant page.pdf. */
async function mesurer(donnees: DonneesDocument) {
	const navigateur = await chromium.launch();
	try {
		const page = await navigateur.newPage({ viewport: { width: LARGEUR_UTILE_PX, height: HAUTEUR_UTILE_PX } });
		await page.setContent(await rendreHtml(donnees), { waitUntil: 'load' });
		await page.evaluate(async () => { await document.fonts.ready; });
		const mesure = await page.evaluate(ajusterUneFeuille, OPTIONS_UNE_FEUILLE);
		const caches = await page.locator('.d-sems span').evaluateAll((s) => s.filter((x) => (x as HTMLElement).style.visibility === 'hidden').length);
		return { ...mesure, caches };
	} finally {
		await navigateur.close();
	}
}

describe('une seule feuille', () => {
	afterAll(fermerNavigateur);

	it('PERRIER : une page A4 paysage, à l\'échelle 1', async () => {
		expect(await pages(perrier)).toEqual({ nombre: 1, paysage: true });
		const { pas, echelle } = await mesurer(perrier);
		expect(echelle).toBe(1);
		// Référence relue par l'E2E de l'aperçu (Task 11) : l'aperçu doit mesurer la même chose.
		await expect(JSON.stringify({ pas, echelle })).toMatchFileSnapshot('../../tests/fixtures/mesures-perrier-planning.json');
	});

	it('la feuille de visa PERRIER tient sur une page', async () => {
		expect(await pages(batirVisa({ version: 1, donnees: perrier }, PERRIER_PARAMETRES, MAINTENANT))).toEqual({ nombre: 1, paysage: true });
	});

	it('30 lots sur 104 semaines, noms de 40 caractères : un numéro de semaine sur deux au moins, une page', async () => {
		const d = batirPlanning(sourceChargee(30), PERRIER_PARAMETRES, MAINTENANT);
		const m = await mesurer(d);
		expect(m.pas).toBeGreaterThanOrEqual(2);
		expect(m.caches).toBeGreaterThan(0);
		expect((await pages(d)).nombre).toBe(1);
	});

	it('40 lots : la feuille est réduite, toujours une page', async () => {
		const d = batirPlanning(sourceChargee(40), PERRIER_PARAMETRES, MAINTENANT);
		const { echelle } = await mesurer(d);
		expect(echelle).toBeLessThan(1);
		expect(echelle).toBeGreaterThanOrEqual(ECHELLE_MIN);
		expect((await pages(d)).nombre).toBe(1);
	});

	it('200 lots : refusé plutôt qu\'illisible', async () => {
		const d = batirPlanning(sourceChargee(200), PERRIER_PARAMETRES, MAINTENANT);
		await expect(htmlVersPdf(await rendreHtml(d), { uneSeuleFeuille: true })).rejects.toThrow('Trop de lots pour une seule feuille.');
	});
});
