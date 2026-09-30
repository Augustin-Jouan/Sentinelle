import { describe, expect, it } from 'vitest';
import {
	bilanReceptions, controlerLevee, controlerReception, etatReception, LEVEE_AVANT, lignesReserves, PAS_DE_RESERVES, verifierReserves,
	type Decision,
} from './reception';

describe('réception : règles', () => {
	it('un PV avec réserves doit les dire ; un PV différé, ses motifs', () => {
		const base = { entreprise: 'CONSTRUCTIONS REBOURS', reserves: '', motifs: '' };
		expect(controlerReception({ ...base, decision: 'SANS_RESERVES' })).toBeNull();
		expect(controlerReception({ ...base, decision: 'AVEC_RESERVES', reserves: '  \n ' })).toBe('CONSTRUCTIONS REBOURS : précisez la nature des réserves.');
		expect(controlerReception({ ...base, decision: 'AVEC_RESERVES', reserves: 'Joints' })).toBeNull();
		expect(controlerReception({ ...base, decision: 'DIFFEREE' })).toBe('CONSTRUCTIONS REBOURS : précisez les motifs du report.');
		expect(controlerReception({ ...base, decision: 'DIFFEREE', motifs: 'Menuiseries non posées' })).toBeNull();
	});

	it('état de la case Réception : les cinq cas', () => {
		const pv = (decision: Decision) => ({ decision, date: '2026-10-12' });
		expect(etatReception(null, null)).toEqual({ etat: 'a-produire', texte: '+ Réception', alerte: false });
		expect(etatReception(pv('SANS_RESERVES'), null)).toEqual({ etat: 'sans-reserves', texte: 'Sans réserves · 12/10', alerte: false });
		expect(etatReception(pv('AVEC_RESERVES'), null)).toEqual({ etat: 'avec-reserves', texte: 'Avec réserves · 12/10', alerte: true });
		expect(etatReception(pv('AVEC_RESERVES'), '2026-11-20')).toEqual({ etat: 'levee', texte: 'Réserves levées le 20/11', alerte: false });
		expect(etatReception(pv('DIFFEREE'), null)).toEqual({ etat: 'differee', texte: 'Différée · 12/10', alerte: true });
		// Une réception différée n'a pas de levée : une date restée en base n'y change rien.
		expect(etatReception(pv('DIFFEREE'), '2026-11-20').etat).toBe('differee');
	});

	it('levée : seulement après un PV avec réserves, jamais avant sa date', () => {
		const avec = { decision: 'AVEC_RESERVES' as const, date: '2026-10-12' };
		expect(() => controlerLevee(null, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee({ ...avec, decision: 'SANS_RESERVES' }, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee({ ...avec, decision: 'DIFFEREE' }, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee(avec, '2026-10-11')).toThrow(LEVEE_AVANT);
		expect(() => controlerLevee(avec, '2026-10-12')).not.toThrow();
	});

	it("bilan d'une génération de plusieurs PV", () => {
		expect(bilanReceptions(10, 2)).toBe('10 PV générés, 2 inchangés.');
		expect(bilanReceptions(1, 1)).toBe('1 PV généré, 1 inchangé.');
		expect(bilanReceptions(12, 0)).toBe('12 PV générés.');
	});

	it('réserves : une par ligne, 2 000 caractères et 60 lignes au plus', () => {
		expect(lignesReserves('a\r\n\r\n  b  \nc')).toEqual(['a', 'b', 'c']);
		expect(verifierReserves('x\n'.repeat(60))).toBe('x\n'.repeat(60));
		expect(() => verifierReserves('x\n'.repeat(61))).toThrow('Les réserves sont limitées à 60 lignes.');
		expect(() => verifierReserves('x'.repeat(2001))).toThrow('Les réserves sont limitées à 2 000 caractères.');
	});
});
