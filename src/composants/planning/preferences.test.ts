import { describe, expect, it } from 'vitest';
import { creerStockage, lireMasques, lirePreferences, PREFERENCES_PAR_DEFAUT } from './preferences';

describe('préférences d\'affichage du planning', () => {
	it('par défaut : outil Cible, densité Normale', () => {
		expect(PREFERENCES_PAR_DEFAUT).toEqual({ outil: 'cible', densite: 'normale' });
		expect(lirePreferences(null)).toEqual(PREFERENCES_PAR_DEFAUT);
	});

	it('une valeur abîmée ou inconnue retombe sur le défaut, champ par champ', () => {
		expect(lirePreferences('{')).toEqual(PREFERENCES_PAR_DEFAUT);
		expect(lirePreferences('5')).toEqual(PREFERENCES_PAR_DEFAUT);
		expect(lirePreferences('{"outil":"main","densite":"toString"}')).toEqual({ outil: 'main', densite: 'normale' });
		expect(lirePreferences('{"outil":"pinceau","densite":"large"}')).toEqual({ outil: 'cible', densite: 'large' });
		expect(lireMasques('["a",1,null,"b"]')).toEqual(['a', 'b']);
		expect(lireMasques('{"a":1}')).toEqual([]);
		expect(lireMasques(null)).toEqual([]);
	});

	it('stockage du navigateur disponible : lu et écrit', () => {
		const donnees = new Map([['k', 'v']]);
		const s = creerStockage(() => ({ getItem: (c) => donnees.get(c) ?? null, setItem: (c, v) => { donnees.set(c, v); } }));
		expect(s.lire('k')).toBe('v');
		s.ecrire('k', 'w');
		expect(donnees.get('k')).toBe('w');
	});

	it('stockage qui lève (navigation privée, quota) : rien ne plante, le choix vaut pour la session', () => {
		const s = creerStockage(() => ({
			getItem: () => { throw new Error('SecurityError'); },
			setItem: () => { throw new Error('QuotaExceededError'); },
		}));
		let prevenus = 0;
		s.abonner(() => { prevenus++; });
		expect(s.lire('k')).toBeNull();
		expect(() => s.ecrire('k', 'v')).not.toThrow();
		expect(s.lire('k')).toBe('v');
		expect(prevenus).toBe(1);
	});

	it('accès au stockage lui-même refusé', () => {
		const s = creerStockage(() => { throw new Error('SecurityError'); });
		expect(s.lire('k')).toBeNull();
		expect(() => s.ecrire('k', 'v')).not.toThrow();
	});
});
