import { describe, expect, it } from 'vitest';
import {
	compteRenduVide, CONVOCATIONS, convocationSuivante, coordinationBase, intitule, lignesAvancement, numeroSuivant, numeroTexte,
	rubriquesCoordination, segments, texteRendezVous,
} from './compteRendu';

const simple = (texte: string) => [{ texte, surligne: false }];

describe('compte rendu : règles', () => {
	it('convocations : D → C → P → A → E → D, D par défaut', () => {
		expect(CONVOCATIONS).toEqual(['D', 'C', 'P', 'A', 'E']);
		expect(convocationSuivante(undefined)).toBe('C');
		expect(CONVOCATIONS.map((c) => convocationSuivante(c))).toEqual(['C', 'P', 'A', 'E', 'D']);
	});

	it("coordination de base : un intitulé par lot, puis le maître d'ouvrage", () => {
		expect(coordinationBase(['GROS ŒUVRE', '  ', 'Nouveau lot'])).toBe("GROS ŒUVRE :\n\nLOT :\n\nNouveau lot :\n\nMAÎTRE D'OUVRAGE :");
	});

	it('numéro suivant, affiché sur deux chiffres', () => {
		expect(numeroSuivant([])).toBe(1);
		expect(numeroSuivant([1, 4, 2])).toBe(5);
		expect([numeroTexte(4), numeroTexte(12)]).toEqual(['04', '12']);
	});

	it('**texte** est surligné', () => {
		expect(segments('GROS **reprise** du **mur**')).toEqual([
			{ texte: 'GROS ', surligne: false }, { texte: 'reprise', surligne: true },
			{ texte: ' du ', surligne: false }, { texte: 'mur', surligne: true },
		]);
		expect(segments('** seul')).toEqual(simple('** seul'));
		expect(segments('')).toEqual([]);
	});

	it('intitulés : majuscules, trois lettres au moins, terminés par « : »', () => {
		expect(intitule('GROS ŒUVRE :')).toEqual({ titre: 'GROS ŒUVRE', suite: '' });
		expect(intitule("MAÎTRE D'OUVRAGE : RAS")).toEqual({ titre: "MAÎTRE D'OUVRAGE", suite: 'RAS' });
		expect(intitule('PLOMBERIE — CHAUFFAGE — V.M.C. : **reprise** du mur'))
			.toEqual({ titre: 'PLOMBERIE — CHAUFFAGE — V.M.C.', suite: '**reprise** du mur' });
		expect(intitule('DU 12 : prévoir')).toBeNull();
		expect(intitule('Gros œuvre : rien')).toBeNull();
		expect(intitule('prévoir la dalle')).toBeNull();
	});

	it('coordination imprimée : rubriques, lignes vides ignorées, rubrique vide omise', () => {
		const texte = "GROS ŒUVRE :\n  prévoir la dalle  \n\nCHARPENTE :\n\nPEINTURE : **reprise** du mur\nMAÎTRE D'OUVRAGE :";
		expect(rubriquesCoordination(texte)).toEqual([
			{ titre: 'GROS ŒUVRE', suite: [], lignes: [simple('prévoir la dalle')] },
			{ titre: 'PEINTURE', suite: [{ texte: 'reprise', surligne: true }, { texte: ' du mur', surligne: false }], lignes: [] },
		]);
	});

	it('des lignes avant le premier intitulé forment une rubrique sans titre', () => {
		expect(rubriquesCoordination('Réunion sur place.\nGROS ŒUVRE :')).toEqual([{ titre: '', suite: [], lignes: [simple('Réunion sur place.')] }]);
	});

	it('texte collé depuis un traitement de texte : \\r\\n, tabulation, espace insécable', () => {
		expect(rubriquesCoordination('\tGROS ŒUVRE :\r\n\tprévoir la dalle\r\n\r\n')).toEqual([
			{ titre: 'GROS ŒUVRE', suite: [], lignes: [simple('prévoir la dalle')] },
		]);
	});

	it('avancement : une entrée par ligne, lignes vides gardées, surlignage compris', () => {
		expect(lignesAvancement('  Fondations **coulées**\n\nDallage  \n')).toEqual([
			[{ texte: 'Fondations ', surligne: false }, { texte: 'coulées', surligne: true }], [], simple('Dallage'),
		]);
		expect(lignesAvancement('   ')).toEqual([]);
	});

	it('compte rendu vide : ni avancement, ni rubrique imprimable', () => {
		expect(compteRenduVide('  ', "GROS ŒUVRE :\n\nMAÎTRE D'OUVRAGE :")).toBe(true);
		expect(compteRenduVide('Fondations', '')).toBe(false);
		expect(compteRenduVide('', 'GROS ŒUVRE : RAS')).toBe(false);
	});

	it('prochain rendez-vous', () => {
		expect(texteRendezVous('2026-10-13', '14:00')).toBe('mardi 13/10/2026 à 14h00');
		expect(texteRendezVous('2026-10-13', '')).toBe('mardi 13/10/2026');
		expect(texteRendezVous('2026-10-13', '14:00', true)).toBe('mardi 13/10 à 14h00');
		expect(texteRendezVous('', '14:00')).toBe('');
	});
});
