import { describe, expect, it } from 'vitest';
import { empreinte, serialiserStable } from './empreinte';

describe('empreinte', () => {
	it('ne dépend pas de l\'ordre des clés', () => {
		expect(serialiserStable({ b: 1, a: { d: [1, 2], c: 'x' } })).toBe('{"a":{"c":"x","d":[1,2]},"b":1}');
		expect(empreinte({ a: 1, b: 2 })).toBe(empreinte({ b: 2, a: 1 }));
	});
	it('ignore les clés undefined, garde null', () => {
		expect(serialiserStable({ a: undefined, b: null })).toBe('{"b":null}');
	});
	it('change quand une valeur change', () => {
		expect(empreinte({ a: 1 })).not.toBe(empreinte({ a: 2 }));
	});
	it('SHA-256 hexadécimal', () => {
		expect(empreinte('x')).toMatch(/^[0-9a-f]{64}$/);
	});
});
