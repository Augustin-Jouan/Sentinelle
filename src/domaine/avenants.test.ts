import { describe, expect, it } from 'vitest';
import { formatEuros } from './montants';
import {
	confirmationSuppression, dateLongue, lireMontantAvenant, manquesAvenant, montantsLettre, MOINS_VALUE_NEGATIVE, MONTANT_ILLISIBLE, numeroAvenantTexte,
	sommeAvenants, SUPPRESSION_NEGATIVE, verifierEngage,
} from './avenants';

// Spec, annexe A : lot CARRELAGE — FAÏENCE, 12 600,00 € HT, TVA 20 %.
const LOT = { htInitial: '12600', tauxTva: '20' };
const deux = [{ numero: 1, montantHt: '850' }, { numero: 2, montantHt: '-300' }];
const txt = (m: ReturnType<typeof montantsLettre>) => ({
	plusValue: m.plusValue, marcheInitial: m.marcheInitial.toFixed(2), devis: m.devis.toFixed(2), nouveauMontant: m.nouveauMontant.toFixed(2),
});

describe('lettre d\'avenant', () => {
	it('annexe A : lettre n° 02, moins-value', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: deux, numero: 2 })))
			.toEqual({ plusValue: false, marcheInitial: '16140.00', devis: '360.00', nouveauMontant: '15780.00' });
	});

	it('la lettre n° 01 ignore les avenants suivants', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: deux, numero: 1 })))
			.toEqual({ plusValue: true, marcheInitial: '15120.00', devis: '1020.00', nouveauMontant: '16140.00' });
	});

	it('annexe A : après suppression du n° 01, la lettre n° 02 repart du marché initial', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: [deux[1]], numero: 2 })))
			.toEqual({ plusValue: false, marcheInitial: '15120.00', devis: '360.00', nouveauMontant: '14760.00' });
	});

	it('un avenant absent de la liste est signalé', () => {
		expect(() => montantsLettre({ ...LOT, avenants: deux, numero: 3 })).toThrow("Cet avenant n'existe plus.");
	});
});

describe('montant d\'un avenant', () => {
	it('lit un montant signé, au centime, signe moins typographique compris', () => {
		expect(lireMontantAvenant('−300,00 €').toFixed(2)).toBe('-300.00');
		expect(lireMontantAvenant('1 234,567').toFixed(2)).toBe('1234.57');
		expect(lireMontantAvenant('0').toFixed(2)).toBe('0.00');
	});

	it('refuse une saisie illisible avec le message de la spec', () => {
		expect(() => lireMontantAvenant('abc')).toThrow(MONTANT_ILLISIBLE);
		expect(() => lireMontantAvenant('')).toThrow(MONTANT_ILLISIBLE);
	});

	it('le montant engagé ne descend pas sous zéro', () => {
		expect(() => verifierEngage('100', [{ montantHt: '-100' }])).not.toThrow();
		expect(() => verifierEngage('100', [{ montantHt: '50' }, { montantHt: '-150.01' }])).toThrow(MOINS_VALUE_NEGATIVE);
		// Supprimer une plus-value peut aussi faire passer le lot sous zéro : le message le dit.
		expect(() => verifierEngage('100', [{ montantHt: '-140' }], SUPPRESSION_NEGATIVE)).toThrow(SUPPRESSION_NEGATIVE);
	});

	it('somme, numéro imprimé, manques', () => {
		expect(sommeAvenants(deux).toFixed(2)).toBe('550.00');
		expect(sommeAvenants([]).toFixed(2)).toBe('0.00');
		expect(numeroAvenantTexte(2)).toBe('02');
		expect(numeroAvenantTexte(12)).toBe('12');
		expect(manquesAvenant({ artisanId: null, montantHt: '0' })).toEqual(['entreprise', 'montantAvenant']);
		expect(manquesAvenant({ artisanId: 'a', montantHt: '-1' })).toEqual([]);
	});

	it('annexe A : confirmation de la suppression du n° 02', () => {
		expect(confirmationSuppression(2, '12600', [{ montantHt: '850' }]))
			.toBe(`Supprimer l'avenant n° 02 ? Le montant du lot revient à ${formatEuros('13450')} HT.`);
	});

	it('date de la lettre en toutes lettres', () => {
		expect(dateLongue(new Date('2026-05-12T00:00:00Z'))).toBe('12 mai 2026');
		expect(dateLongue(new Date('2026-06-01T00:00:00Z'))).toBe('1er juin 2026');
	});
});
