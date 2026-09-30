import { describe, expect, it } from 'vitest';
import { dureePeriode } from './dureePeriode';

const message = 'La durée doit être comprise entre 1 et 104 semaines.';

describe('dureePeriode', () => {
	it('refuse 0, 105 et 2.5', () => {
		for (const v of [0, 105, 2.5]) {
			const r = dureePeriode.safeParse(v);
			expect(r.success).toBe(false);
			if (!r.success) expect(r.error.issues[0].message).toBe(message);
		}
	});

	it('accepte 1 et 104', () => {
		expect(dureePeriode.parse(1)).toBe(1);
		expect(dureePeriode.parse(104)).toBe(104);
	});
});
