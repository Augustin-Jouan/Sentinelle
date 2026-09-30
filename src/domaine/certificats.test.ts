import { describe, expect, it } from 'vitest';
import {
	alerteCertificat, calculerCertificat, certificatPossible, controlerCertificat, CUMUL_AU_DELA, CUMUL_MANQUANT, dateCourteSlash, lireCumul,
	lireMontantAcompte, moisLong, PRESENT_NON_POSITIF, verifierDate, verifierMois, type CalculCertificat, type EntreeCalcul,
} from './certificats';

const texte = (k: CalculCertificat) => Object.fromEntries(
	Object.entries(k).map(([c, v]) => [c, Array.isArray(v) ? v.map((x) => x.toFixed(2)) : v.toFixed(2)]),
);

// Spec, annexe A : CARRELAGE — FAÏENCE, avenant n° 01 de + 850, acomptes antérieurs 3 000 et 4 200, cumul 9 850.
const CARRELAGE: EntreeCalcul = {
	htInitial: '12600', avenants: ['850'], tauxTva: '20', tauxRetenue: '5', caution: false,
	precedents: ['3000', '4200'], cumulRealise: '9850',
};

describe('calcul du certificat', () => {
	it('annexe A, sans caution', () => {
		expect(texte(calculerCertificat(CARRELAGE))).toEqual({
			marcheHt: '12600.00', avenants: ['850.00'], totalHt: '13450.00', totalTva: '2690.00', totalTtc: '16140.00',
			precedentsHt: '7200.00', precedentsTva: '1440.00', precedentsTtc: '8640.00',
			realiseHt: '9850.00', presentHt: '2650.00', presentTva: '530.00', presentTtc: '3180.00',
			retenue: '159.00', mandate: '3021.00',
		});
	});

	it('annexe A, avec caution : pas de retenue', () => {
		const k = calculerCertificat({ ...CARRELAGE, caution: true });
		expect([k.retenue.toFixed(2), k.mandate.toFixed(2)]).toEqual(['0.00', '3180.00']);
	});

	it('annexe A : un demi-centime s\'arrondit au-dessus', () => {
		const k = calculerCertificat({
			htInitial: '5000', avenants: [], tauxTva: '10', tauxRetenue: '5', caution: false, precedents: [], cumulRealise: '1184.09',
		});
		expect([k.presentTva, k.presentTtc, k.retenue, k.mandate].map((x) => x.toFixed(2))).toEqual(['118.41', '1302.50', '65.13', '1237.37']);
	});

	it('E2E de la spec : PEINTURE, avenant − 300, acomptes 2 000 et 3 000, cumul 7 000, caution', () => {
		const k = calculerCertificat({
			htInitial: '9450', avenants: ['-300'], tauxTva: '20', tauxRetenue: '5', caution: true, precedents: ['2000', '3000'], cumulRealise: '7000',
		});
		expect([k.totalHt, k.precedentsHt, k.presentHt, k.presentTva, k.presentTtc, k.retenue, k.mandate].map((x) => x.toFixed(2)))
			.toEqual(['9150.00', '5000.00', '2000.00', '400.00', '2400.00', '0.00', '2400.00']);
	});

	it('présent acompte nul ou négatif : refusé', () => {
		expect(() => controlerCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '7200' }))).toThrow(PRESENT_NON_POSITIF);
		expect(() => controlerCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '5000' }))).toThrow(PRESENT_NON_POSITIF);
		expect(() => controlerCertificat(calculerCertificat(CARRELAGE))).not.toThrow();
	});

	it('un certificat demande une entreprise et un montant engagé positif', () => {
		expect(certificatPossible({ artisanId: 'a', htEngage: '0.01' })).toBe(true);
		expect(certificatPossible({ artisanId: null, htEngage: '100' })).toBe(false);
		expect(certificatPossible({ artisanId: 'a', htEngage: '0' })).toBe(false);
	});

	it('cumul au-delà du total avenants compris : alerte, pas refus', () => {
		expect(alerteCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '13450.01' }))).toBe(CUMUL_AU_DELA);
		expect(alerteCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '13450' }))).toBeNull();
	});
});

describe('saisies du certificat', () => {
	it('cumul : obligatoire, lisible, au centime', () => {
		expect(() => lireCumul('  ')).toThrow(CUMUL_MANQUANT);
		expect(() => lireCumul('abc')).toThrow('Montant : saisissez un nombre.');
		expect(lireCumul('9 850,004').toFixed(2)).toBe('9850.00');
	});

	it('acompte antérieur : positif', () => {
		expect(lireMontantAcompte('3 000').toFixed(2)).toBe('3000.00');
		expect(() => lireMontantAcompte('0')).toThrow('Le montant doit être positif.');
		expect(() => lireMontantAcompte('-5')).toThrow('Le montant doit être positif.');
	});

	it('mois : AAAA-MM, mois 01 à 12', () => {
		expect(verifierMois('2026-07')).toBe('2026-07');
		for (const faux of ['2026-13', '2026-00', '1999-01', '2026-7', 'juillet']) {
			expect(() => verifierMois(faux)).toThrow('Mois : choisissez un mois.');
		}
	});

	it('date : un jour qui existe', () => {
		expect(verifierDate('2026-09-30')).toBe('2026-09-30');
		expect(() => verifierDate('2026-02-30')).toThrow('Date : choisissez une date.');
		expect(() => verifierDate('30/09/2026')).toThrow('Date : choisissez une date.');
	});

	it('textes imprimés', () => {
		expect(moisLong('2026-07')).toBe('Juillet 2026');
		expect(moisLong('2027-01')).toBe('Janvier 2027');
		expect(dateCourteSlash('2026-09-30')).toBe('30/09/2026');
		expect([moisLong(''), moisLong('2026-13'), dateCourteSlash('')]).toEqual(['', '', '']);
	});
});
