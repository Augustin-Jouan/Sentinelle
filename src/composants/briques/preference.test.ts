import { afterEach, describe, expect, it, vi } from 'vitest';
import { changerPreference, interpreterPreference, valeurPreference } from './preference';

const estTexte = (v: unknown): v is string => typeof v === 'string';

describe('préférence (stockage)', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('changer garde le choix quand localStorage.setItem lève', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => { throw new Error('SecurityError'); },
			setItem: () => { throw new Error('QuotaExceededError'); },
		});
		expect(() => changerPreference('sentinelle-tri-chantiers', 'commune')).not.toThrow();
		expect(valeurPreference('sentinelle-tri-chantiers', 'ref', estTexte)).toBe('commune');
	});

	it('sans brut (hydratation) le défaut l\'emporte, même si le JSON serait valide', () => {
		expect(interpreterPreference(null, 'ref', estTexte)).toBe('ref');
		expect(interpreterPreference('"commune"', 'ref', estTexte)).toBe('commune');
	});
});
