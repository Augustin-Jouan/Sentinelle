import { describe, expect, it } from 'vitest';
import { chantiersVisibles, pertesSuppression, synthese, type CarteChantier } from './accueil';
import { formatEuros } from './montants';

const carte = (o: Partial<CarteChantier>): CarteChantier => ({
	id: o.reference ?? 'x', reference: 'X', maitreOuvrage: '', natureTravaux: '', adresse: '', cp: '', commune: '', chargeAffaire: 'Augustin Jouan',
	dateSignature: '', termine: false, creeLe: '2026-01-01T00:00:00.000Z', lots: 0, attribues: 0, periodes: 0, documents: 0, ttc: '0', ...o,
});
const PERRIER = carte({ reference: 'PERRIER — Louisfert', commune: 'LOUISFERT', dateSignature: '2026-04-03', lots: 13, attribues: 12, periodes: 24, documents: 6, ttc: '417048.00', creeLe: '2026-08-31T00:00:00.000Z' });
const GUERIN = carte({ reference: 'GUÉRIN — Erbray', commune: 'ERBRAY', termine: true, lots: 4, attribues: 4, ttc: '148200.00' });
const SCI = carte({ reference: 'SCI LES CHÊNES — Derval', commune: 'DERVAL', lots: 6, attribues: 5, ttc: '290856.00', creeLe: '2026-07-02T00:00:00.000Z' });
const MOREAU = carte({ reference: 'MOREAU — Soudan', maitreOuvrage: 'M. et Mme MOREAU', commune: 'SOUDAN', creeLe: '2026-06-02T00:00:00.000Z' });
const TOUS = [PERRIER, GUERIN, SCI, MOREAU];

describe('chantiersVisibles (chantiersVisibles() de la maquette)', () => {
	it('par défaut : terminés masqués, référence de A à Z', () => {
		expect(chantiersVisibles(TOUS, '', true, 'ref').map((c) => c.reference)).toEqual(['MOREAU — Soudan', 'PERRIER — Louisfert', 'SCI LES CHÊNES — Derval']);
	});
	it('recherche sans accents sur référence, client, nature, adresse, commune, chargé d\'affaire', () => {
		expect(chantiersVisibles(TOUS, 'chenes', false, 'ref')).toEqual([SCI]);
		expect(chantiersVisibles(TOUS, 'moreau soudan', false, 'ref')).toEqual([MOREAU]);
		expect(chantiersVisibles(TOUS, 'erbray', true, 'ref')).toEqual([]);
	});
	it('les tris de la maquette ; sans date de signature, en dernier', () => {
		expect(chantiersVisibles(TOUS, '', false, 'montant').map((c) => c.reference)[0]).toBe('PERRIER — Louisfert');
		expect(chantiersVisibles(TOUS, '', false, 'lots').map((c) => c.lots)).toEqual([13, 6, 4, 0]);
		expect(chantiersVisibles(TOUS, '', false, 'signature')[0]).toBe(PERRIER);
		expect(chantiersVisibles(TOUS, '', false, 'recent')[0]).toBe(PERRIER);
		expect(chantiersVisibles(TOUS, '', false, 'commune').map((c) => c.commune)).toEqual(['DERVAL', 'ERBRAY', 'LOUISFERT', 'SOUDAN']);
	});
});

describe('synthese (renderSynthese() de la maquette)', () => {
	it('ne compte que les chantiers en cours', () => {
		expect(synthese(TOUS)).toEqual({
			enCours: 3, termines: 1, ttcTexte: formatEuros('707904'), lots: 19, aAttribuer: 2, documents: 6,
		});
	});
});

describe('pertesSuppression (removeChantier() de la maquette)', () => {
	it('dit ce que la suppression emporte, au pluriel près', () => {
		expect(pertesSuppression(PERRIER)).toEqual(['13 lots', '24 périodes de planning', '6 documents']);
		expect(pertesSuppression(carte({ lots: 1, periodes: 1 }))).toEqual(['1 lot', '1 période de planning']);
		expect(pertesSuppression(MOREAU)).toEqual([]);
	});
});
