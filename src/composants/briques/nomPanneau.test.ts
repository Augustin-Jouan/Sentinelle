import { describe, expect, it } from 'vitest';
import { nomAccessible } from './nomPanneau';

describe('nomAccessible', () => {
	it('une désignation vide ne laisse pas le panneau sans nom', () => {
		expect(nomAccessible('', 'Désignation à saisir')).toBe('Désignation à saisir');
		expect(nomAccessible(undefined, 'Désignation à saisir')).toBe('Désignation à saisir');
	});
	it('une désignation renseignée est le nom du dialogue', () => {
		expect(nomAccessible('Gros œuvre', 'Désignation à saisir')).toBe('Gros œuvre');
	});
});
