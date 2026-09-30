import { describe, expect, it } from 'vitest';
import {
	dateParis, depuisIso, libelleMois, lundiDe, lundiIso, nombreSemaines, rangDe, rangSemaine, semaineDuRang,
	semaineExiste, semaineIso, versIso,
} from './semaines';

describe('semaines ISO', () => {
	it('lundi d\'une semaine', () => {
		expect(versIso(lundiIso(2026, 1))).toBe('2025-12-29');
		expect(versIso(lundiIso(2026, 15))).toBe('2026-04-06');
		expect(versIso(lundiIso(2027, 1))).toBe('2027-01-04');
	});

	it('semaine d\'une date, y compris autour du Nouvel An', () => {
		expect(semaineIso(depuisIso('2026-04-08'))).toEqual({ annee: 2026, semaine: 15 });
		expect(semaineIso(depuisIso('2025-12-29'))).toEqual({ annee: 2026, semaine: 1 });
		expect(semaineIso(depuisIso('2027-01-01'))).toEqual({ annee: 2026, semaine: 53 });
		expect(semaineIso(depuisIso('2027-01-04'))).toEqual({ annee: 2027, semaine: 1 });
	});

	it('années à 52 et 53 semaines', () => {
		expect(nombreSemaines(2026)).toBe(53);
		expect(nombreSemaines(2032)).toBe(53);
		expect(nombreSemaines(2027)).toBe(52);
	});

	it('une semaine qui n\'existe pas', () => {
		expect(semaineExiste(2026, 53)).toBe(true);
		expect(semaineExiste(2027, 53)).toBe(false);
		expect(semaineExiste(2026, 0)).toBe(false);
		expect(semaineExiste(2026, 1.5)).toBe(false);
	});

	it('rangs : suite continue par-dessus le Nouvel An', () => {
		expect(semaineDuRang(rangSemaine(2026, 53) + 1)).toEqual({ annee: 2027, semaine: 1 });
		expect(rangSemaine(2027, 1) - rangSemaine(2026, 52)).toBe(2);
		expect(rangDe(depuisIso('2026-04-12'))).toBe(rangSemaine(2026, 15));
		expect(versIso(lundiDe(depuisIso('2026-04-09')))).toBe('2026-04-06');
	});

	it('libellé de mois : celui du lundi de la semaine', () => {
		expect(libelleMois(rangSemaine(2026, 15))).toBe('avr.-26');
		expect(libelleMois(rangSemaine(2026, 14))).toBe('mars-26');
		expect(libelleMois(rangSemaine(2027, 1))).toBe('janv.-27');
	});

	it('date du jour à Paris', () => {
		expect(versIso(dateParis(new Date('2026-09-29T23:30:00Z')))).toBe('2026-09-30');
		expect(versIso(dateParis(new Date('2026-09-29T08:00:00Z')))).toBe('2026-09-29');
	});
});
