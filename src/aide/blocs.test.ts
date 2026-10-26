import { describe, expect, it } from 'vitest';
import { lireBlocs, lireLigne } from './blocs';

describe('une ligne du guide', () => {
	it('le gras et les liens', () => {
		expect(lireLigne('Cliquez sur **Créer le chantier** ⑬.')).toEqual([
			{ texte: 'Cliquez sur ' }, { texte: 'Créer le chantier', gras: true }, { texte: ' ⑬.' },
		]);
		expect(lireLigne('Voir [Quoi fait quoi](/aide#lot), puis **Enregistrer**')).toEqual([
			{ texte: 'Voir ' }, { texte: 'Quoi fait quoi', lien: '/aide#lot' }, { texte: ', puis ' }, { texte: 'Enregistrer', gras: true },
		]);
	});

	it('\\* écrit un astérisque', () => {
		expect(lireLigne('entre \\*\\*deux\\*\\* astérisques')).toEqual([{ texte: 'entre **deux** astérisques' }]);
	});

	it('un gras non refermé est refusé', () => {
		expect(() => lireLigne('**Créer le chantier')).toThrow(/Gras non refermé/);
	});
});

describe('le texte d\'une tâche', () => {
	it('étapes, puces, captures et paragraphes', () => {
		const blocs = lireBlocs(`
			Avant de commencer.
			![accueil]
			1. Ouvrez.
			2. Cliquez.
			![lot]
			3. Saisissez.

			- une puce
			- une autre
			Fin.
		`);
		expect(blocs.map((b) => b.type)).toEqual(['paragraphe', 'capture', 'etapes', 'capture', 'etapes', 'puces', 'paragraphe']);
		expect(blocs[2]).toMatchObject({ debut: 1, items: [[{ texte: 'Ouvrez.' }], [{ texte: 'Cliquez.' }]] });
		expect(blocs[4]).toMatchObject({ debut: 3 });
		expect(blocs[3]).toEqual({ type: 'capture', ecran: 'lot' });
		expect(blocs[5]).toMatchObject({ items: [[{ texte: 'une puce' }], [{ texte: 'une autre' }]] });
	});
});
