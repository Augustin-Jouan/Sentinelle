import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { ErreurMetier } from './erreurs';
import {
	arrondiCentime, complementRetenue, formatEuros, formatMontantSaisie, formatNombreCourt, formatPourcentFixe,
	formatTauxSaisie, htDepuisTtc, htEngage, lireNombreFr, totalArrondi, ttcEngage, ttcInitial,
} from './montants';

describe('ttcInitial / ttcEngage / htEngage', () => {
	it('applique la TVA au HT initial', () => {
		expect(ttcInitial('96250', '20').toFixed(2)).toBe('115500.00');
	});
	it('le montant engagé ajoute les avenants', () => {
		expect(htEngage('1000', '-280').toFixed(2)).toBe('720.00');
		expect(ttcEngage('1000', '20', '250').toFixed(2)).toBe('1500.00');
	});
	it('sans avenant, engagé = initial', () => {
		expect(ttcEngage('18400', '20').equals(ttcInitial('18400', '20'))).toBe(true);
	});
});

describe('htDepuisTtc', () => {
	it.each([['1000', '20'], ['1000', '5.5'], ['1000', '10'], ['123456.78', '20'], ['0.01', '5.5']])(
		'aller-retour TTC %s à %s %% retrouve le TTC au centime',
		(ttc, taux) => {
			const ht = htDepuisTtc(ttc, taux);
			expect(arrondiCentime(ttcInitial(ht, taux)).toFixed(2)).toBe(new Decimal(ttc).toFixed(2));
		},
	);
	it('garde 8 décimales', () => {
		expect(htDepuisTtc('1000', '20').toFixed()).toBe('833.33333333');
	});
	it('déduit les avenants', () => {
		expect(htDepuisTtc('1200', '20', '100').toFixed(2)).toBe('900.00');
	});
	it('refuse un TTC inférieur aux seuls avenants', () => {
		expect(() => htDepuisTtc('100', '20', '500')).toThrow('Ce TTC est inférieur aux seuls avenants.');
	});
});

describe('arrondis et totaux', () => {
	it('arrondit au centime, demi vers le haut', () => {
		expect(arrondiCentime('0.005').toFixed(2)).toBe('0.01');
		expect(arrondiCentime('2.344999').toFixed(2)).toBe('2.34');
	});
	it('le total est la somme des lignes déjà arrondies', () => {
		expect(totalArrondi(['0.004', '0.004', '0.004']).toFixed(2)).toBe('0.00');
		expect(totalArrondi(['0.005', '0.005']).toFixed(2)).toBe('0.02');
	});
	it('complément de la retenue', () => {
		expect(complementRetenue('5').toFixed()).toBe('95');
	});
});

describe('formats imprimés', () => {
	it('euros avec espace fine entre milliers et espace insécable avant €', () => {
		expect(formatEuros('115500')).toBe('115\u202f500,00\u00a0€');
		expect(formatEuros('999.999999996')).toBe('1\u202f000,00\u00a0€');
		expect(formatEuros('0')).toBe('0,00\u00a0€');
		expect(formatEuros('1234567.891')).toBe('1\u202f234\u202f567,89\u00a0€');
	});
	it('pourcentage à deux décimales (gré à gré, récap)', () => {
		expect(formatPourcentFixe('20')).toBe('20,00\u00a0%');
		expect(formatPourcentFixe('5.5')).toBe('5,50\u00a0%');
	});
	it('montant et taux dans les champs de saisie, sans symbole', () => {
		expect(formatMontantSaisie('96250')).toBe('96\u202f250,00');
		expect(formatTauxSaisie('20')).toBe('20,00');
		expect(lireNombreFr(formatMontantSaisie('1234567.891')).toFixed(2)).toBe('1234567.89');
	});
	it('nombre court : décimales seulement si utiles (comme la maquette)', () => {
		expect(formatNombreCourt('5')).toBe('5');
		expect(formatNombreCourt('20.00')).toBe('20');
		expect(formatNombreCourt('5.5')).toBe('5,50');
	});
});

describe('lireNombreFr', () => {
	it.each([
		['115 500,00 €', '115500'],
		['115\u202f500,00\u00a0€', '115500'],
		['1.234,50', '1234.5'],
		['1234.5', '1234.5'],
		['20 %', '20'],
		[' 7 ', '7'],
		['-280', '-280'],
	])('lit « %s »', (saisie, attendu) => {
		expect(lireNombreFr(saisie).equals(new Decimal(attendu))).toBe(true);
	});
	it.each(['', 'abc', '12,3,4', '1 2x'])('refuse « %s »', (saisie) => {
		expect(() => lireNombreFr(saisie)).toThrow(ErreurMetier);
	});

	it.each([
		['96.250', '« 96.250 » est ambigu : écrivez 96 250 ou 96,25.'],
		['1.500', '« 1.500 » est ambigu : écrivez 1 500 ou 1,5.'],
		['2.000 €', '« 2.000 € » est ambigu : écrivez 2 000 ou 2.'],
		['-300.000', '« -300.000 » est ambigu : écrivez -300 000 ou -300.'],
	])('%s : ambigu, refusé plutôt que deviné', (saisie, message) => {
		expect(() => lireNombreFr(saisie)).toThrow(message);
	});

	it.each([['12.5', '12.5'], ['0.125', '0.125'], ['1234.500', '1234.5'], ['1.234,50', '1234.5'], ['96 250', '96250']])(
		'%s : non ambigu, lu %s',
		(saisie, attendu) => {
			expect(lireNombreFr(saisie).toString()).toBe(attendu);
		},
	);

	it('relit un taux affiché à la façon de la maquette (« 20.00 », « 5.50 »)', () => {
		expect(lireNombreFr('20.00').toString()).toBe('20');
		expect(lireNombreFr('5.50').toString()).toBe('5.5');
	});
});
