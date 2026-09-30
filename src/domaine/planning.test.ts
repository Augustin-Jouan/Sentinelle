import { describe, expect, it } from 'vitest';
import {
	colonnes, contraindre, decalerPeriodes, deplacerPeriodes, etendue, lierPeriode, messageGroupe, messageSuites,
	modifierPeriode, moisDesColonnes, optionsDependance, periodeTravaux, supprimerPeriodes, type PeriodePlan,
} from './planning';
import { rangSemaine, semaineDuRang } from './semaines';

const r = rangSemaine;
const per = (id: string, lotId: string, annee: number, semaine: number, duree: number, dependDeId: string | null = null): PeriodePlan =>
	({ id, lotId, intitule: id, debut: r(annee, semaine), duree, dependDeId });
const debutDe = (periodes: PeriodePlan[], id: string) => semaineDuRang(periodes.find((p) => p.id === id)!.debut);

// A (S16, 3 sem.) → B (S20, 4 sem.) → C (S25, 2 sem.) ; D, dans un autre lot, dépend aussi de A.
const chaine = () => [
	per('A', 'go', 2026, 16, 3),
	per('B', 'go', 2026, 20, 4, 'A'),
	per('C', 'go', 2026, 25, 2, 'B'),
	per('D', 'elec', 2026, 22, 1, 'A'),
];

describe('cascade', () => {
	it('retarder une période repousse ses suites qui ne respectent plus le lien', () => {
		const res = deplacerPeriodes(chaine(), [{ id: 'A', debut: r(2026, 18) }]);
		expect(debutDe(res.periodes, 'B')).toEqual({ annee: 2026, semaine: 21 });
		expect(debutDe(res.periodes, 'C')).toEqual({ annee: 2026, semaine: 25 });
		expect(debutDe(res.periodes, 'D')).toEqual({ annee: 2026, semaine: 22 });
		expect(res.decalees).toBe(1);
	});

	it('la cascade suit les chaînes, dans tous les lots', () => {
		const res = deplacerPeriodes(chaine(), [{ id: 'A', debut: r(2026, 21) }]);
		expect(debutDe(res.periodes, 'B')).toEqual({ annee: 2026, semaine: 24 });
		expect(debutDe(res.periodes, 'C')).toEqual({ annee: 2026, semaine: 28 });
		expect(debutDe(res.periodes, 'D')).toEqual({ annee: 2026, semaine: 24 });
		expect(res.decalees).toBe(3);
	});

	it('une suite déjà conforme ne bouge pas, et avancer ne ramène rien', () => {
		expect(debutDe(deplacerPeriodes(chaine(), [{ id: 'A', debut: r(2026, 17) }]).periodes, 'B')).toEqual({ annee: 2026, semaine: 20 });
		const avance = deplacerPeriodes(chaine(), [{ id: 'A', debut: r(2026, 10) }]);
		expect(debutDe(avance.periodes, 'B')).toEqual({ annee: 2026, semaine: 20 });
		expect(avance.decalees).toBe(0);
	});

	it('une période liée placée avant la fin de son amont se recale juste après', () => {
		const res = deplacerPeriodes(chaine(), [{ id: 'B', debut: r(2026, 10) }]);
		expect(debutDe(res.periodes, 'B')).toEqual({ annee: 2026, semaine: 19 });
		expect(res.decalees).toBe(0);
	});

	it('un déplacement de groupe ne dépend pas de l\'ordre de la sélection', () => {
		const a = decalerPeriodes(chaine(), ['A', 'B'], 2).periodes;
		const b = decalerPeriodes(chaine(), ['B', 'A'], 2).periodes;
		expect(a).toEqual(b);
		expect(debutDe(a, 'B')).toEqual({ annee: 2026, semaine: 22 });
	});

	it('allonger une période pousse ses suites', () => {
		const res = modifierPeriode(chaine(), 'A', { duree: 5 });
		expect(debutDe(res.periodes, 'B')).toEqual({ annee: 2026, semaine: 21 });
		expect(debutDe(res.periodes, 'D')).toEqual({ annee: 2026, semaine: 22 });
	});

	it('la cascade traverse le Nouvel An, semaine 53 comprise', () => {
		const res = contraindre([per('X', 'l', 2026, 52, 2), per('Y', 'l', 2026, 50, 1, 'X')]);
		expect(debutDe(res.periodes, 'Y')).toEqual({ annee: 2027, semaine: 1 });
	});

	it('bornes : ni avant 2000, ni au-delà de 2100', () => {
		expect(() => deplacerPeriodes(chaine(), [{ id: 'A', debut: r(2100, 51) }])).toThrow('Ce déplacement pousserait des périodes au-delà de 2100.');
		expect(() => deplacerPeriodes(chaine(), [{ id: 'A', debut: r(1999, 52) }])).toThrow('Les périodes ne peuvent pas commencer avant 2000.');
	});

	it('une période inconnue', () => {
		expect(() => deplacerPeriodes(chaine(), [{ id: 'Z', debut: r(2026, 20) }])).toThrow("Cette période n'existe plus.");
	});

	it('une durée hors bornes', () => {
		for (const duree of [0, 105, 2.5]) {
			expect(() => modifierPeriode(chaine(), 'A', { duree })).toThrow('La durée doit être comprise entre 1 et 104 semaines.');
		}
	});
});

describe('liens', () => {
	it('refuse une boucle directe ou indirecte', () => {
		expect(() => lierPeriode(chaine(), 'A', 'B')).toThrow('Ce lien créerait une boucle : B dépend déjà de cette période.');
		expect(() => lierPeriode(chaine(), 'A', 'C')).toThrow('Ce lien créerait une boucle : C dépend déjà de cette période.');
	});

	it('poser un lien recale la période', () => {
		const res = lierPeriode([...chaine(), per('E', 'l', 2026, 10, 1)], 'E', 'C');
		expect(debutDe(res.periodes, 'E')).toEqual({ annee: 2026, semaine: 27 });
	});

	it('le sélecteur ne propose ni la période ni ses suites', () => {
		expect(optionsDependance(chaine(), 'A').map((p) => p.id)).toEqual([]);
		expect(optionsDependance(chaine(), 'C').map((p) => p.id)).toEqual(['A', 'B', 'D']);
	});

	it('supprimer détache les suites, qui restent en place', () => {
		const res = supprimerPeriodes(chaine(), ['A']);
		expect(res.periodes.map((p) => p.id)).toEqual(['B', 'C', 'D']);
		expect(res.periodes.find((p) => p.id === 'B')).toMatchObject({ dependDeId: null, debut: r(2026, 20) });
		expect(res.periodes.find((p) => p.id === 'C')!.dependDeId).toBe('B');
	});
});

describe('étendue de l\'axe', () => {
	// PERRIER : périodes de la S15 2026 à la S9 2027, fermetures en S31 et S52-53.
	const plages = [
		{ debut: r(2026, 15), duree: 1 }, { debut: r(2027, 7), duree: 3 },
		{ debut: r(2026, 31), duree: 2 }, { debut: r(2026, 52), duree: 2 },
	];

	it('élargie aux mois entiers', () => {
		expect(etendue(plages, 0)).toEqual({ debut: r(2026, 15), fin: r(2027, 13), nb: 52 });
	});

	it('sans rien : 52 semaines à partir du rang donné, élargies aux mois', () => {
		expect(etendue([], r(2026, 14))).toEqual({ debut: r(2026, 10), fin: r(2027, 13), nb: r(2027, 13) - r(2026, 10) + 1 });
	});

	it('vraie période des travaux', () => {
		expect(periodeTravaux([{ debut: r(2026, 15), duree: 1 }, { debut: r(2027, 7), duree: 3 }])).toEqual({ debut: r(2026, 15), fin: r(2027, 9) });
		expect(periodeTravaux([])).toBeNull();
	});

	it('colonnes et mois', () => {
		const cols = colonnes(etendue(plages, 0));
		expect(cols[0]).toEqual({ rang: r(2026, 15), semaine: 15, annee: 2026 });
		expect(cols[cols.length - 1]).toEqual({ rang: r(2027, 13), semaine: 13, annee: 2027 });
		expect(moisDesColonnes(cols)).toEqual([
			{ libelle: 'avr.-26', nb: 4 }, { libelle: 'mai-26', nb: 4 }, { libelle: 'juin-26', nb: 5 },
			{ libelle: 'juil.-26', nb: 4 }, { libelle: 'août-26', nb: 5 }, { libelle: 'sept.-26', nb: 4 },
			{ libelle: 'oct.-26', nb: 4 }, { libelle: 'nov.-26', nb: 5 }, { libelle: 'déc.-26', nb: 4 },
			{ libelle: 'janv.-27', nb: 4 }, { libelle: 'févr.-27', nb: 4 }, { libelle: 'mars-27', nb: 5 },
		]);
	});
});

describe('messages', () => {
	it('suites et groupes', () => {
		expect(messageSuites(0)).toBeUndefined();
		expect(messageSuites(1)).toBe('1 période décalée à la suite.');
		expect(messageSuites(3)).toBe('3 périodes décalées à la suite.');
		expect(messageGroupe(3, 2, 1)).toBe('3 périodes décalées de 2 semaines plus tard — 1 à la suite.');
		expect(messageGroupe(2, -1, 0)).toBe('2 périodes décalées de 1 semaine plus tôt.');
	});
});
