import { describe, expect, it } from 'vitest';
import type { TypeDocument } from '@/documents/libelles';
import {
	decompteSuppression,
	entreeJournalSuppression,
	phraseCorrespond,
	type DocumentSuppression,
	type ResumeSuppression,
} from './suppression';

const doc = (type: TypeDocument, id: string): DocumentSuppression => ({
	id,
	type,
	serie: 'serie',
	nomFichier: 'fichier.pdf',
	version: 1,
	creeLe: new Date('2026-01-15T10:00:00.000Z'),
});

describe('suppression', () => {
	it('EX-2 — la phrase tolère casse, espaces et apostrophes', () => {
		expect(phraseCorrespond('  JE  supprime  l’atelier ', "L'Atelier")).toBe(true);
	});

	it('EX-2 — les accents restent obligatoires', () => {
		expect(phraseCorrespond('je supprime Ecole', 'École')).toBe(false);
		expect(phraseCorrespond('je supprime École', 'École')).toBe(true);
	});

	it('EX-3 — décompte par type au pluriel, sans ligne à zéro', () => {
		const resume: ResumeSuppression = {
			reference: 'Chantier test',
			documents: [
				doc('MARCHE_GRE_A_GRE', 'd1'),
				doc('CERTIFICAT_PAIEMENT', 'd2'),
				doc('CERTIFICAT_PAIEMENT', 'd3'),
				doc('CERTIFICAT_PAIEMENT', 'd4'),
				doc('COMPTE_RENDU', 'd5'),
				doc('COMPTE_RENDU', 'd6'),
			],
			lots: 0,
			periodes: 0,
			fermetures: 2,
			compteRenduEnBrouillon: true,
		};
		const lignes = decompteSuppression(resume);
		const texte = lignes.join('\n');
		expect(texte).toContain('3 certificats de paiement');
		expect(texte).toContain('2 comptes rendus');
		expect(texte).toContain('1 marché de gré à gré');
		expect(texte).toContain('2 fermetures');
		expect(texte).toContain('1 compte rendu en brouillon');
		for (const ligne of lignes) {
			expect(ligne).not.toMatch(/^0 /);
		}
	});

	it("EX-6 — l'entrée de journal ne contient que l'auteur, le chantier et le nombre de documents", () => {
		expect(entreeJournalSuppression('u1', 'c1', 3)).toEqual({ par: 'u1', chantier: 'c1', documents: 3 });
	});
});
