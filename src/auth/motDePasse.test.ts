import { describe, expect, it } from 'vitest';
import { genererMotDePasse } from './motDePasse';

describe('mot de passe provisoire', () => {
	it('16 caractères sans caractères ambigus', () => {
		const m = genererMotDePasse();
		expect(m).toHaveLength(16);
		expect(m).not.toMatch(/[0O1lI]/);
	});
	it('différent à chaque appel', () => {
		expect(genererMotDePasse()).not.toBe(genererMotDePasse());
	});
});
