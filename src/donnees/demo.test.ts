import { describe, expect, it } from 'vitest';
import { refusDemo } from '../../prisma/demo/garde';

const DEV = 'postgresql://sentinelle:sentinelle@localhost:5432/sentinelle';

describe('garde-fou du jeu de démonstration', () => {
	it('accepte la base de développement locale', () => {
		expect(refusDemo(DEV, undefined)).toBeNull();
		expect(refusDemo('postgresql://u:p@127.0.0.1:5432/sentinelle', 'development')).toBeNull();
	});

	it('refuse une base distante', () => {
		expect(refusDemo('postgresql://sentinelle:x@db:5432/sentinelle', undefined)).toMatch(/locale/);
		expect(refusDemo('postgresql://sentinelle:x@exemple.fr:5432/sentinelle', undefined)).toMatch(/locale/);
	});

	it('refuse la base de test, remise à zéro par les tests', () => {
		expect(refusDemo('postgresql://sentinelle:sentinelle@localhost:5433/sentinelle_test', undefined)).toMatch(/_test/);
	});

	it('refuse la production et une URL absente', () => {
		expect(refusDemo(DEV, 'production')).toMatch(/production/);
		expect(refusDemo(undefined, undefined)).toMatch(/DATABASE_URL/);
	});
});
