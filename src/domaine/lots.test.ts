import { describe, expect, it } from 'vitest';
import { lotsVisibles, type LotTriable } from './lots';

const lot = (o: Partial<LotTriable> & { ordre: number }): LotTriable => ({
	numero: null, designation: '', entreprise: null, corpsEtat: '', nature: 'GRE_A_GRE', htEngage: '0', ...o,
});
const lots = [
	lot({ ordre: 1, numero: '02', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', htEngage: '96250' }),
	lot({ ordre: 2, numero: '10', designation: 'CARRELAGE', entreprise: null, htEngage: '0' }),
	lot({ ordre: 3, numero: null, designation: 'ESCALIER', entreprise: 'PASSION BOIS', nature: 'SOUS_TRAITANCE', htEngage: '6800' }),
];
const ordres = (l: LotTriable[]) => l.map((x) => x.ordre);

describe('lots visibles', () => {
	it('ordre du chantier par défaut', () => {
		expect(ordres(lotsVisibles([lots[2], lots[0], lots[1]], '', 'saisie'))).toEqual([1, 2, 3]);
	});
	it('tri par montant décroissant', () => {
		expect(ordres(lotsVisibles(lots, '', 'montant'))).toEqual([1, 3, 2]);
	});
	it('à attribuer d\'abord', () => {
		expect(ordres(lotsVisibles(lots, '', 'attribuer'))[0]).toBe(2);
	});
	it('recherche sans accents, y compris la nature', () => {
		expect(ordres(lotsVisibles(lots, 'oeuvre', 'saisie'))).toEqual([1]);
		expect(ordres(lotsVisibles(lots, 'Œuvre', 'saisie'))).toEqual([1]);
		expect(ordres(lotsVisibles(lots, 'sous-traitance', 'saisie'))).toEqual([3]);
		expect(ordres(lotsVisibles(lots, 'rebours', 'saisie'))).toEqual([1]);
	});
	it('ne modifie pas le tableau reçu', () => {
		const copie = [...lots];
		lotsVisibles(lots, '', 'montant');
		expect(lots).toEqual(copie);
	});
});
