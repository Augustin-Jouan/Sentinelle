import Decimal from 'decimal.js';
import { formatEuros, totalArrondi } from './montants';
import { normaliser } from './recherche';

export type TriChantiers = 'ref' | 'montant' | 'lots' | 'signature' | 'recent' | 'commune';

/** Les ordres de la barre d'outils, libellés de la maquette (TRIS_CH_LIBELLES). */
export const TRIS_CHANTIERS: { v: TriChantiers; t: string }[] = [
	{ v: 'ref', t: 'Référence (A → Z)' },
	{ v: 'montant', t: 'Montant décroissant' },
	{ v: 'lots', t: 'Nombre de lots' },
	{ v: 'signature', t: 'Signature la plus proche' },
	{ v: 'recent', t: 'Ajout le plus récent' },
	{ v: 'commune', t: 'Commune' },
];

/** Une carte de l'accueil. `dateSignature` : AAAA-MM-JJ ou '' ; `creeLe` : ISO ; `ttc` : total engagé, décimal. */
export type CarteChantier = {
	id: string; reference: string; maitreOuvrage: string; natureTravaux: string;
	adresse: string; cp: string; commune: string; chargeAffaire: string;
	dateSignature: string; termine: boolean; creeLe: string;
	lots: number; attribues: number; periodes: number; documents: number; ttc: string;
};

const TRIS: Record<TriChantiers, (a: CarteChantier, b: CarteChantier) => number> = {
	ref: (a, b) => a.reference.localeCompare(b.reference, 'fr'),
	montant: (a, b) => new Decimal(b.ttc).comparedTo(a.ttc),
	lots: (a, b) => b.lots - a.lots,
	// Un chantier sans date de signature passe en dernier plutôt que de remonter en tête.
	signature: (a, b) => (a.dateSignature || '9999').localeCompare(b.dateSignature || '9999'),
	recent: (a, b) => b.creeLe.localeCompare(a.creeLe),
	commune: (a, b) => (a.commune || 'zzz').localeCompare(b.commune || 'zzz', 'fr'),
};

export function chantiersVisibles(cartes: CarteChantier[], requete: string, masquerTermines: boolean, tri: TriChantiers): CarteChantier[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	return cartes
		.filter((c) => !masquerTermines || !c.termine)
		.filter((c) => {
			const texte = normaliser([c.reference, c.maitreOuvrage, c.natureTravaux, c.adresse, c.cp, c.commune, c.chargeAffaire].join(' '));
			return mots.every((m) => texte.includes(m));
		})
		.sort(TRIS[tri]);
}

export type Synthese = { enCours: number; termines: number; ttcTexte: string; lots: number; aAttribuer: number; documents: number };

/** Ce qu'on veut savoir en arrivant ; les chantiers terminés ne comptent pas. */
export function synthese(cartes: CarteChantier[]): Synthese {
	const actifs = cartes.filter((c) => !c.termine);
	return {
		enCours: actifs.length,
		termines: cartes.length - actifs.length,
		ttcTexte: formatEuros(totalArrondi(actifs.map((c) => c.ttc))),
		lots: actifs.reduce((n, c) => n + c.lots, 0),
		aAttribuer: actifs.reduce((n, c) => n + c.lots - c.attribues, 0),
		documents: actifs.reduce((n, c) => n + c.documents, 0),
	};
}

/** Un composant client l'affiche sans appeler le serveur : il vit ici, pas dans donnees/ (Prisma). */
export const SUPPRESSION_IMPOSSIBLE = 'Ce chantier a déjà des documents générés : il ne peut plus être supprimé. Marquez-le terminé.';

const pluriel = (n: number, mot: string, suite = '') => `${n} ${mot}${n > 1 ? 's' : ''}${suite}`;

/** Ce que la suppression emporte, pour la confirmation. */
export function pertesSuppression(c: CarteChantier): string[] {
	return [
		c.lots ? pluriel(c.lots, 'lot') : '',
		c.periodes ? pluriel(c.periodes, 'période', ' de planning') : '',
		c.documents ? pluriel(c.documents, 'document') : '',
	].filter(Boolean);
}
