import { describe, expect, it } from 'vitest';
import { artisansProposables, filtrerArtisans, normaliser } from './recherche';

const artisans = [
	{ id: '1', nom: 'CONSTRUCTIONS REBOURS', commune: 'MARTIGNÉ-FERCHAUD', actif: true },
	{ id: '2', nom: 'CHATELAIN MICKAËL', commune: 'CHÂTEAUBRIANT', actif: true },
	{ id: '3', nom: 'AM COUVERTURE', commune: 'DERVAL', actif: false },
];

describe('recherche d\'artisan', () => {
	it('normalise sans accents ni majuscules', () => {
		expect(normaliser('  Châteaubriant ')).toBe('chateaubriant');
	});
	it('cherche dans le nom et la commune, sans accents', () => {
		expect(filtrerArtisans(artisans, 'chateau').map((a) => a.id)).toEqual(['2']);
		expect(filtrerArtisans(artisans, 'martigne').map((a) => a.id)).toEqual(['1']);
	});
	it('tous les mots doivent correspondre', () => {
		expect(filtrerArtisans(artisans, 'rebours martigne').map((a) => a.id)).toEqual(['1']);
		expect(filtrerArtisans(artisans, 'rebours derval')).toEqual([]);
	});
	it('une requête vide renvoie tout', () => {
		expect(filtrerArtisans(artisans, '  ')).toHaveLength(3);
	});
	it('les archivés ne sont proposés que s\'ils sont déjà attribués', () => {
		expect(artisansProposables(artisans, null).map((a) => a.id)).toEqual(['1', '2']);
		expect(artisansProposables(artisans, '3').map((a) => a.id)).toEqual(['1', '2', '3']);
	});
});
