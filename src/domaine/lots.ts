import Decimal from 'decimal.js';
import { normaliser } from './recherche';
import type { Nature } from './regles';

export type TriLots = 'saisie' | 'numero' | 'lot' | 'entreprise' | 'montant' | 'attribuer';

/** Les ordres du menu « Trier par », libellés et ordre de la maquette (TRIS_LOT_LIBELLES). */
export const TRIS_LOTS: { v: TriLots; t: string }[] = [
	{ v: 'saisie', t: 'Ordre du chantier' },
	{ v: 'numero', t: 'Numéro de lot' },
	{ v: 'lot', t: 'Désignation (A → Z)' },
	{ v: 'entreprise', t: 'Entreprise (A → Z)' },
	{ v: 'montant', t: 'Montant décroissant' },
	{ v: 'attribuer', t: "À attribuer d'abord" },
];

export type LotTriable = {
	ordre: number;
	numero: string | null;
	designation: string;
	entreprise: string | null;
	corpsEtat: string;
	nature: Nature;
	htEngage: string;
};

const cmpTexte = (a: string, b: string) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' });

const TRIS: Record<TriLots, (a: LotTriable, b: LotTriable) => number> = {
	saisie: (a, b) => a.ordre - b.ordre,
	numero: (a, b) => cmpTexte(a.numero ?? '', b.numero ?? '') || cmpTexte(a.designation, b.designation),
	lot: (a, b) => cmpTexte(a.designation, b.designation),
	entreprise: (a, b) => cmpTexte(a.entreprise ?? '', b.entreprise ?? '') || cmpTexte(a.designation, b.designation),
	montant: (a, b) => new Decimal(b.htEngage).comparedTo(a.htEngage),
	attribuer: (a, b) => (a.entreprise ? 1 : 0) - (b.entreprise ? 1 : 0) || cmpTexte(a.designation, b.designation),
};

/** Recherche puis tri, pour l'affichage seulement : l'ordre du chantier ne change jamais. */
export function lotsVisibles<T extends LotTriable>(lots: T[], requete: string, tri: TriLots): T[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	const vus = lots.filter((l) => {
		const texte = normaliser([
			l.numero ?? '', l.designation, l.entreprise ?? '', l.corpsEtat,
			l.nature === 'SOUS_TRAITANCE' ? 'sous-traitance' : 'gré à gré',
		].join(' '));
		return mots.every((m) => texte.includes(m));
	});
	return [...vus].sort(TRIS[tri]);
}
