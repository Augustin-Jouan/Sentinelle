import { describe, expect, it } from 'vitest';
import { isoRang, rangIso, type PlanningVue } from '@/domaine/planningVue';
import { appliquerPositions, touche } from './useGestes';

const vue: PlanningVue = {
	chantierId: 'c', dateSignaturePrevue: null, fermetures: [],
	lots: [{
		id: 'go', numero: '02', designation: 'GROS ŒUVRE', entreprise: null, telephone: null, couleur: 'noir',
		periodes: [
			{ id: 'a', intitule: 'Fondations', debut: '2026-04-13', duree: 3, dependDeId: null }, // S16
			{ id: 'b', intitule: 'Élévation', debut: '2026-05-11', duree: 4, dependDeId: 'a' }, // S20
		],
	}],
};

describe('positions pendant un glisser', () => {
	it('déplace les seules périodes saisies, sans recalage ni cascade', () => {
		// Fondations portée en S19, sur l'Élévation (S20) : l'Élévation ne bouge pas avant le relâchement.
		const r = appliquerPositions(vue, { a: { debut: rangIso('2026-04-13') + 3, duree: 3 } });
		expect(r.lots[0].periodes).toEqual([
			{ id: 'a', intitule: 'Fondations', debut: '2026-05-04', duree: 3, dependDeId: null },
			vue.lots[0].periodes[1],
		]);
	});

	it('allonge une période', () => {
		const r = appliquerPositions(vue, { b: { debut: rangIso('2026-05-11'), duree: 6 } });
		expect(r.lots[0].periodes[1]).toMatchObject({ debut: isoRang(rangIso('2026-05-11')), duree: 6 });
	});

	it('sans position, le planning est inchangé', () => {
		expect(appliquerPositions(vue, {})).toEqual(vue);
	});
});

describe('cadre de sélection', () => {
	const barre = { left: 100, top: 50, right: 200, bottom: 80 };

	it('touche une barre qu\'il recouvre en partie, bord compris', () => {
		expect(touche({ left: 190, top: 0, right: 300, bottom: 60 }, barre)).toBe(true);
		expect(touche({ left: 200, top: 80, right: 210, bottom: 90 }, barre)).toBe(true);
	});

	it('ignore une barre à côté', () => {
		expect(touche({ left: 201, top: 0, right: 300, bottom: 100 }, barre)).toBe(false);
		expect(touche({ left: 0, top: 81, right: 300, bottom: 100 }, barre)).toBe(false);
	});
});
