import { describe, expect, it } from 'vitest';
import { appliquerPeriodes, etendueDuPlanning, isoRang, periodesDuPlanning, rangIso, type PlanningVue } from './planningVue';
import { rangSemaine } from './semaines';

const vue: PlanningVue = {
	chantierId: 'c',
	dateSignaturePrevue: '2026-04-03',
	lots: [
		{ id: 'l1', numero: '01', designation: 'TERRASSEMENT', entreprise: null, telephone: null, couleur: 'noir', periodes: [
			{ id: 'a', intitule: 'Accès', debut: '2026-04-06', duree: 1, dependDeId: null },
		] },
		{ id: 'l2', numero: '02', designation: 'GROS ŒUVRE', entreprise: 'REBOURS', telephone: null, couleur: 'noir', periodes: [
			{ id: 'b', intitule: 'Fondations', debut: '2026-04-13', duree: 3, dependDeId: 'a' },
			{ id: 'c', intitule: 'Élévation', debut: '2026-05-11', duree: 4, dependDeId: 'b' },
		] },
	],
	fermetures: [],
};

describe('vue du planning', () => {
	it('dates et rangs', () => {
		expect(rangIso('2026-04-06')).toBe(rangSemaine(2026, 15));
		expect(rangIso('2026-04-09')).toBe(rangSemaine(2026, 15));
		expect(isoRang(rangSemaine(2026, 15))).toBe('2026-04-06');
	});

	it('aller-retour sans perte', () => {
		expect(appliquerPeriodes(vue, periodesDuPlanning(vue))).toEqual(vue);
	});

	it('appliquer replace les périodes dans leur lot, triées par début', () => {
		const periodes = periodesDuPlanning(vue).map((p) => (p.id === 'b' ? { ...p, debut: rangSemaine(2026, 30) } : p));
		const suite = appliquerPeriodes(vue, periodes);
		expect(suite.lots[1].periodes.map((p) => p.id)).toEqual(['c', 'b']);
		expect(suite.lots[1].periodes[1].debut).toBe('2026-07-20');
	});

	it('étendue par défaut : date de signature, sinon le jour donné, élargie aux mois', () => {
		// Signature le 3 avril 2026 (S14, lundi 30 mars) : l'axe recule jusqu'au premier lundi de mars (S10).
		// Sans signature, le 30 septembre 2026 (S40, lundi 28 septembre) : premier lundi de septembre (S37).
		const vide = { ...vue, lots: [] };
		expect(etendueDuPlanning(vide, '2026-09-30').debut).toBe(rangSemaine(2026, 10));
		expect(etendueDuPlanning({ ...vide, dateSignaturePrevue: null }, '2026-09-30').debut).toBe(rangSemaine(2026, 37));
	});
});
