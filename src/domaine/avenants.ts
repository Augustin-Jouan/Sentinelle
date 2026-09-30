import Decimal from 'decimal.js';
import { ErreurMetier } from './erreurs';
import { arrondiCentime, formatEuros, htEngage, lireNombreFr, ttcEngage, type Valeur } from './montants';

export type AvenantMontant = { numero: number; montantHt: Valeur };

export const MOINS_VALUE_NEGATIVE = 'Cette moins-value rendrait le montant du lot négatif.';
export const SUPPRESSION_NEGATIVE = 'Supprimer cet avenant rendrait le montant du lot négatif.';
export const HT_INFERIEUR_AVENANTS = 'Ce HT est inférieur aux seuls avenants.';
export const MONTANT_ILLISIBLE = 'Montant : saisissez un nombre.';
export const AVENANT_DISPARU = "Cet avenant n'existe plus.";

/** « 02 » : le numéro tel qu'il s'imprime. */
export const numeroAvenantTexte = (n: number): string => String(n).padStart(2, '0');

export function sommeAvenants(avenants: { montantHt: Valeur }[]): Decimal {
	return avenants.reduce<Decimal>((s, a) => s.plus(a.montantHt), new Decimal(0));
}

/** Le signe distingue la plus-value de la moins-value ; « − » typographique accepté ; arrondi au centime. */
export function lireMontantAvenant(saisie: string): Decimal {
	try {
		return lireNombreFr(saisie.replace(/−/g, '-')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
	} catch {
		throw new ErreurMetier(MONTANT_ILLISIBLE, 'montantHt');
	}
}

/** Le montant engagé HT (initial + avenants) ne descend jamais sous zéro. */
export function verifierEngage(htInitial: Valeur, avenants: { montantHt: Valeur }[], message = MOINS_VALUE_NEGATIVE): void {
	if (htEngage(htInitial, sommeAvenants(avenants)).lessThan(0)) throw new ErreurMetier(message, 'montantHt');
}

/** « Supprimer l'avenant n° 02 ? Le montant du lot revient à 13 450,00 € HT. » (spec § 5, annexe A) */
export function confirmationSuppression(numero: number, htInitial: Valeur, autres: { montantHt: Valeur }[]): string {
	return `Supprimer l'avenant n° ${numeroAvenantTexte(numero)} ? Le montant du lot revient à ${formatEuros(htEngage(htInitial, sommeAvenants(autres)))} HT.`;
}

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Une colonne `@db.Date` (minuit UTC) en toutes lettres : « 12 mai 2026 », « 1er juin 2026 ». */
export function dateLongue(d: Date): string {
	return DATE_LONGUE.format(d).replace(/^1 /, '1er ');
}

export type MontantsLettre = { plusValue: boolean; marcheInitial: Decimal; devis: Decimal; nouveauMontant: Decimal };

/**
 * Montants TTC de la lettre n° `numero` (maquette `buildDocAvenant`) : le « marché initial » compte les
 * avenants de numéro inférieur encore présents. Chaque montant est arrondi au centime séparément.
 */
export function montantsLettre(p: { htInitial: Valeur; tauxTva: Valeur; avenants: AvenantMontant[]; numero: number }): MontantsLettre {
	const avenant = p.avenants.find((a) => a.numero === p.numero);
	if (!avenant) throw new ErreurMetier(AVENANT_DISPARU);
	const anterieurs = sommeAvenants(p.avenants.filter((a) => a.numero < p.numero));
	const montant = new Decimal(avenant.montantHt);
	return {
		plusValue: !montant.lessThan(0),
		marcheInitial: arrondiCentime(ttcEngage(p.htInitial, p.tauxTva, anterieurs)),
		devis: arrondiCentime(ttcEngage(montant.abs(), p.tauxTva)),
		nouveauMontant: arrondiCentime(ttcEngage(p.htInitial, p.tauxTva, anterieurs.plus(montant))),
	};
}

export type ManqueAvenant = 'entreprise' | 'montantAvenant';

export const LIBELLES_MANQUES_AVENANT: Record<ManqueAvenant, string> = {
	entreprise: "pas d'entreprise",
	montantAvenant: "montant de l'avenant",
};

/** Une lettre se génère pour un lot attribué et un avenant de montant non nul (spec § 5). */
export function manquesAvenant(p: { artisanId: string | null; montantHt: Valeur }): ManqueAvenant[] {
	const manques: ManqueAvenant[] = [];
	if (!p.artisanId) manques.push('entreprise');
	if (new Decimal(p.montantHt).isZero()) manques.push('montantAvenant');
	return manques;
}
