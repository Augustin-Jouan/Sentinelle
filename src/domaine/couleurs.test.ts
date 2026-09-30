import { describe, expect, it } from 'vitest';
import { COULEURS, couleurDe, estCouleur } from './couleurs';
import { LOTS_DE_BASE } from './lotsDeBase';

describe('palette du planning', () => {
	it('9 couleurs, dans l\'ordre de la maquette', () => {
		expect(COULEURS.map((c) => c.cle)).toEqual(['noir', 'orange', 'vert-clair', 'bleu-fonce', 'vert-fonce', 'jaune', 'rouge', 'violet', 'bleu-clair']);
	});

	it('les couleurs des lots de base sont dans la palette', () => {
		for (const l of LOTS_DE_BASE) expect(estCouleur(l.couleur)).toBe(true);
		expect(estCouleur('fuchsia')).toBe(false);
	});

	it('une clé inconnue retombe sur le noir', () => {
		expect(couleurDe('violet')).toEqual({ cle: 'violet', nom: 'Violet', fond: '#7a4092', texte: '#ffffff' });
		expect(couleurDe('fuchsia').cle).toBe('noir');
	});
});
