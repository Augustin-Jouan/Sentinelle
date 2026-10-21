import { describe, expect, it } from 'vitest';
import { lienAide } from './aide';

describe('lien « Aide »', () => {
	it('une adresse http(s) passe telle quelle', () => {
		expect(lienAide('https://claude.ai/artifact/abc')).toBe('https://claude.ai/artifact/abc');
		expect(lienAide('  http://intranet.local/guide.pdf ')).toBe('http://intranet.local/guide.pdf');
	});

	it('absente, vide ou illisible : pas de lien', () => {
		expect(lienAide(undefined)).toBeNull();
		expect(lienAide('')).toBeNull();
		expect(lienAide('   ')).toBeNull();
		expect(lienAide('guide.pdf')).toBeNull();
	});

	it('jamais un autre protocole', () => {
		expect(lienAide('javascript:alert(1)')).toBeNull();
		expect(lienAide('file:///etc/passwd')).toBeNull();
	});
});
