import { afterEach, describe, expect, it, vi } from 'vitest';
import { changerPreference, valeurPreference } from './preference';

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
});
