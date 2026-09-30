import { describe, expect, it } from 'vitest';
import type { LotPlanning, PlanningVue } from '@/domaine/planningVue';
import { rangSemaine } from '@/domaine/semaines';
import { barresDuLot, cheminLien, liens, optionsGroupees, pastille, pastilleGroupe, resume, texteSelection } from './geometrie';

const r = rangSemaine;
const lot = (id: string, designation: string, periodes: LotPlanning['periodes']): LotPlanning =>
	({ id, numero: null, designation, entreprise: null, telephone: null, couleur: 'noir', periodes });
const per = (id: string, intitule: string, debut: string, duree: number, dependDeId: string | null = null) =>
	({ id, intitule, debut, duree, dependDeId });

describe('barres d\'un lot', () => {
	const go = lot('go', 'GROS ŒUVRE', [
		per('a', 'Fondations', '2026-04-13', 3), // S16
		per('b', 'Appuis', '2026-05-11', 1), // S20 ; la suivante commence 3 semaines plus loin
		per('c', 'Seuils', '2026-06-08', 1), // S24 ; la suivante la touche
		per('d', '', '2026-06-15', 1), // S25, sans intitulé
	]);
	const [a, b, c, d] = barresDuLot(go, r(2026, 15), 46);

	it('position, largeur, texte et infobulle', () => {
		expect(a).toMatchObject({ gauche: 46, largeur: 138, texte: 'Fondations', etiquette: null, titre: 'Fondations — semaine 16 de 2026, 3 semaines' });
	});

	it('la durée suit l\'intitulé quand la barre mesure au moins 150 px', () => {
		expect(barresDuLot(go, r(2026, 15), 68)[0].texte).toBe('Fondations · 3 sem.');
	});

	it('barre de moins de 96 px : intitulé à droite si la suivante laisse 80 px, sinon gardé dedans', () => {
		expect(b).toMatchObject({ texte: '', etiquette: { gauche: 276, largeurMax: 126 } });
		expect(c).toMatchObject({ texte: 'Seuils', etiquette: null });
	});

	it('sans intitulé, l\'infobulle nomme le lot', () => {
		expect(d).toMatchObject({ texte: '', etiquette: null, titre: 'GROS ŒUVRE — semaine 25 de 2026, 1 semaine' });
	});
});

describe('textes de la barre d\'outils et du glisser', () => {
	it('résumé', () => {
		expect(resume(23, 23, r(2026, 15), r(2027, 13))).toBe('23 périodes · semaine 15 de 2026 à la semaine 13 de 2027');
		expect(resume(22, 23, r(2026, 15), r(2027, 13))).toBe('22 périodes sur 23 · semaine 15 de 2026 à la semaine 13 de 2027');
		expect(resume(1, 1, r(2026, 15), r(2026, 18))).toBe('1 période · semaine 15 de 2026 à la semaine 18 de 2026');
		expect(resume(0, 23, 0, 0)).toBe('Aucune période parmi les lots affichés.');
		expect(resume(0, 0, 0, 0)).toBe("Aucune période — tracez-en une à la souris sur la ligne d'un lot.");
	});

	it('sélection', () => {
		expect(texteSelection(0)).toBe('Maj + clic ou Maj + glisser : sélection multiple');
		expect(texteSelection(1)).toBe('1 période sélectionnée — ← → pour décaler, Maj = 4 semaines, Suppr');
		expect(texteSelection(3)).toBe('3 périodes sélectionnées — ← → pour décaler, Maj = 4 semaines, Suppr, Échap');
	});

	it('pastilles, y compris par-dessus la semaine 53', () => {
		expect(pastille(r(2026, 18), 3)).toBe('S18 → S20 · 3 sem.');
		expect(pastille(r(2026, 18), 1)).toBe('S18 · 1 sem.');
		expect(pastille(r(2026, 52), 3)).toBe('S52 → S1 · 3 sem.');
		expect(pastilleGroupe(2, 3)).toBe('+2 sem. · 3 périodes');
		expect(pastilleGroupe(-2, 3)).toBe('−2 sem. · 3 périodes');
	});
});

describe('flèches de dépendance', () => {
	it('chemin orthogonal ; contournement quand l\'aval démarre trop près', () => {
		expect(cheminLien(0, 30, 100, 90)).toBe('M 0 30 H 91 V 90 H 100');
		expect(cheminLien(100, 30, 110, 90)).toBe('M 100 30 V 60 H 101 V 90 H 110');
	});

	it('entre lots affichés seulement', () => {
		const a = lot('A', 'A', [per('p1', 'Fondations', '2026-04-13', 3)]);
		const b = lot('B', 'B', [per('p2', 'Élévation', '2026-05-11', 1, 'p1')]);
		expect(liens([a, b], r(2026, 15), 10)).toEqual([{ id: 'p2', d: 'M 40 30 V 60 H 41 V 90 H 50' }]);
		expect(liens([b], r(2026, 15), 10)).toEqual([]);
	});
});

describe('sélecteur « commence après »', () => {
	it('groupé par lot, sans la période ni ses suites', () => {
		const planning: PlanningVue = {
			chantierId: 'c', dateSignaturePrevue: null, fermetures: [],
			lots: [
				lot('A', 'GROS ŒUVRE', [per('p1', 'Fondations', '2026-04-13', 3)]),
				lot('B', 'PEINTURE', [per('p2', 'Impression', '2026-05-11', 1, 'p1'), per('p3', '', '2026-07-20', 2)]),
			],
		};
		expect(optionsGroupees(planning, 'p1')).toEqual([{ lot: 'PEINTURE', periodes: [{ id: 'p3', libelle: 'période — S30 2026' }] }]);
		expect(optionsGroupees(planning, 'p3').map((g) => g.lot)).toEqual(['GROS ŒUVRE', 'PEINTURE']);
	});
});
