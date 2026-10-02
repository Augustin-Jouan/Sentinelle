import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vitrineOuverte } from './ouverte';

describe('vitrine', () => {
	it('fermée en production, ouverte en développement et sous E2E', () => {
		expect(vitrineOuverte({ NODE_ENV: 'production' })).toBe(false);
		expect(vitrineOuverte({ NODE_ENV: 'production', E2E: '1' })).toBe(true);
		expect(vitrineOuverte({ NODE_ENV: 'development' })).toBe(true);
		expect(vitrineOuverte({ NODE_ENV: 'test' })).toBe(true);
	});

	it('ne lit aucune donnée', () => {
		for (const f of ['src/app/(app)/vitrine/page.tsx', 'src/composants/briques/vitrine/Vitrine.tsx']) {
			const source = readFileSync(f, 'utf8');
			expect(source).not.toMatch(/prisma|@\/donnees|@\/actions/);
		}
	});
});
