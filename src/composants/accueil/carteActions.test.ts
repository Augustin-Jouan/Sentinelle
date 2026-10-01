import { describe, expect, it } from 'vitest';
import { sansOuvrirLaCarte } from './carteActions';

/** Enter sur le bouton interne remonte à la carte, qui preventDefault et ouvre le chantier. */
function simulerEnter(couper: boolean) {
	let ouvert = false;
	const e = {
		key: 'Enter',
		defaultPrevented: false,
		stopped: false,
		preventDefault() { this.defaultPrevented = true; },
		stopPropagation() { this.stopped = true; },
	};
	if (couper) sansOuvrirLaCarte(e);
	if (!e.stopped && (e.key === 'Enter' || e.key === ' ')) {
		e.preventDefault();
		ouvert = true;
	}
	return { ouvert, defaultPrevented: e.defaultPrevented };
}

describe('sansOuvrirLaCarte', () => {
	it('sans coupure, Enter sur Terminer ouvre le chantier et empêche le bouton', () => {
		expect(simulerEnter(false)).toEqual({ ouvert: true, defaultPrevented: true });
	});
	it('Enter/Espace sur Terminer ou Supprimer ne remonte pas à la carte', () => {
		expect(simulerEnter(true)).toEqual({ ouvert: false, defaultPrevented: false });
	});
});
