import Decimal from 'decimal.js';
import { ErreurMetier } from './erreurs';
import { arrondiCentime, lireNombreFr, type Valeur } from './montants';

/** `AAAA-MM`, mois 01 à 12, années 2000 à 2099 : la même expression que le CHECK de la base. */
export const MOIS_VALIDE = /^(20[0-9]{2})-(0[1-9]|1[0-2])$/;
export const CUMUL_MANQUANT = 'Saisissez le montant des travaux réalisés.';
export const PRESENT_NON_POSITIF = 'Le présent acompte doit être positif.';
export const CUMUL_AU_DELA = 'Le cumul réalisé dépasse le montant total du marché avec ses avenants.';
export const ACOMPTE_DISPARU = "Cet acompte n'existe plus.";
export const AUTRE_CERTIFICAT = 'Un autre certificat a été enregistré entre-temps : rouvrez le certificat.';
export const DERNIER_SEUL = 'Seul le dernier certificat du lot peut être corrigé.';
export const CERTIFICATS_EXISTENT = 'Des certificats existent : les acomptes antérieurs ne se modifient plus.';
export const CERTIFICAT_IMPOSSIBLE = "Attribuez une entreprise et un montant au lot avant d'en faire un certificat.";

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export type EntreeCalcul = {
	htInitial: Valeur;
	/** Montants HT des avenants, dans l'ordre des numéros. */
	avenants: Valeur[];
	tauxTva: Valeur;
	tauxRetenue: Valeur;
	caution: boolean;
	/** Montants HT des acomptes précédents, dans l'ordre des numéros. */
	precedents: Valeur[];
	cumulRealise: Valeur;
};

export type CalculCertificat = {
	marcheHt: Decimal; avenants: Decimal[]; totalHt: Decimal; totalTva: Decimal; totalTtc: Decimal;
	precedentsHt: Decimal; precedentsTva: Decimal; precedentsTtc: Decimal;
	realiseHt: Decimal; presentHt: Decimal; presentTva: Decimal; presentTtc: Decimal; retenue: Decimal; mandate: Decimal;
};

const r = arrondiCentime;
const somme = (xs: Valeur[]) => xs.reduce<Decimal>((s, x) => s.plus(x), new Decimal(0));
/** Un taux (en %) appliqué à un montant, arrondi au centime. */
const part = (x: Decimal, taux: Valeur) => r(x.times(taux).div(100));

/**
 * Maquette `calculCp`, vérifiée sur un vrai certificat : arrondi au centime à chaque ligne.
 * La maquette calculait en flottants ; ici `Decimal`, demi-centime arrondi au-dessus (spec § 6).
 */
export function calculerCertificat(e: EntreeCalcul): CalculCertificat {
	const totalHt = r(somme([e.htInitial, ...e.avenants]));
	const totalTva = part(totalHt, e.tauxTva);
	const precedentsHt = r(somme(e.precedents));
	const precedentsTva = part(precedentsHt, e.tauxTva);
	const realiseHt = r(e.cumulRealise);
	const presentHt = r(realiseHt.minus(precedentsHt));
	const presentTva = part(presentHt, e.tauxTva);
	const presentTtc = presentHt.plus(presentTva);
	const retenue = e.caution ? new Decimal(0) : part(presentTtc, e.tauxRetenue);
	return {
		marcheHt: r(e.htInitial), avenants: e.avenants.map((a) => r(a)),
		totalHt, totalTva, totalTtc: totalHt.plus(totalTva),
		precedentsHt, precedentsTva, precedentsTtc: precedentsHt.plus(precedentsTva),
		realiseHt, presentHt, presentTva, presentTtc, retenue, mandate: presentTtc.minus(retenue),
	};
}

function montant(saisie: string, champ: string): Decimal {
	try {
		return lireNombreFr(saisie).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
	} catch {
		throw new ErreurMetier('Montant : saisissez un nombre.', champ);
	}
}

export function lireCumul(saisie: string): Decimal {
	if (!saisie.trim()) throw new ErreurMetier(CUMUL_MANQUANT, 'cumul');
	return montant(saisie, 'cumul');
}

/** Acompte antérieur saisi à la main. */
export function lireMontantAcompte(saisie: string): Decimal {
	const m = montant(saisie, 'montantHt');
	if (!m.greaterThan(0)) throw new ErreurMetier('Le montant doit être positif.', 'montantHt');
	return m;
}

export function verifierMois(mois: string): string {
	if (!MOIS_VALIDE.test(mois)) throw new ErreurMetier('Mois : choisissez un mois.', 'mois');
	return mois;
}

export function verifierDate(date: string): string {
	const d = new Date(`${date}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
		throw new ErreurMetier('Date : choisissez une date.', 'date');
	}
	return date;
}

export function controlerCertificat(k: CalculCertificat): void {
	if (!k.presentHt.greaterThan(0)) throw new ErreurMetier(PRESENT_NON_POSITIF, 'cumul');
}

/** Lot sans entreprise ou montant engagé nul : bouton « Certificat de paiement » inactif (spec § 6). */
export function certificatPossible(p: { artisanId: string | null; htEngage: Valeur }): boolean {
	return !!p.artisanId && new Decimal(p.htEngage).greaterThan(0);
}

/** Avertissement d'écran, non imprimé, non bloquant (maquette `majCpCalculs`). */
export function alerteCertificat(k: CalculCertificat): string | null {
	return k.realiseHt.greaterThan(k.totalHt) ? CUMUL_AU_DELA : null;
}

/** '2026-07' → 'Juillet 2026' ; '' si le mois n'est pas valide (champ vidé dans l'aperçu). */
export function moisLong(mois: string): string {
	const r = MOIS_VALIDE.exec(mois);
	if (!r) return '';
	const nom = MOIS[Number(r[2]) - 1];
	return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${r[1]}`;
}

/** '2026-09-30' → '30/09/2026' (« Fait à Châteaubriant le : ») ; '' si la date n'a pas la bonne forme. */
export function dateCourteSlash(iso: string): string {
	const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return r ? `${r[3]}/${r[2]}/${r[1]}` : '';
}
