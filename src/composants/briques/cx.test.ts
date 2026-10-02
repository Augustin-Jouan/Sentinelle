import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
	it('joint les classes et ignore false, null, undefined et les chaînes vides', () => {
		expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
	});
	it('ne fusionne rien : les doublons restent', () => {
		expect(cx('mt-2', 'mt-2')).toBe('mt-2 mt-2');
	});
	it('sans classe, une chaîne vide', () => {
		expect(cx()).toBe('');
	});
});
