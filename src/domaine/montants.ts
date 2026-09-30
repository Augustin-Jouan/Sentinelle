import Decimal from 'decimal.js';
import { ErreurMetier } from './erreurs';

export type Valeur = Decimal.Value;

const CENT = new Decimal(100);
const ESPACE_FINE = '\u202f';
const INSECABLE = '\u00a0';

/** TTC du marché initial, tel qu'il s'imprime sur le marché. */
export function ttcInitial(htInitial: Valeur, tauxTva: Valeur): Decimal {
	return new Decimal(htInitial).times(CENT.plus(tauxTva)).div(CENT);
}

/** HT engagé = initial + avenants. */
export function htEngage(htInitial: Valeur, avenantsHt: Valeur = 0): Decimal {
	return new Decimal(htInitial).plus(avenantsHt);
}

/** TTC engagé : celui du tableau, des totaux et du récapitulatif. */
export function ttcEngage(htInitial: Valeur, tauxTva: Valeur, avenantsHt: Valeur = 0): Decimal {
	return htEngage(htInitial, avenantsHt).times(CENT.plus(tauxTva)).div(CENT);
}

/** Saisir un TTC recalcule le HT initial : HT = TTC / (1 + TVA) − avenants. 8 décimales, pour retrouver le TTC au centime. */
export function htDepuisTtc(ttc: Valeur, tauxTva: Valeur, avenantsHt: Valeur = 0): Decimal {
	const ht = new Decimal(ttc).times(CENT).div(CENT.plus(tauxTva)).minus(avenantsHt);
	if (ht.isNegative() && !ht.isZero()) throw new ErreurMetier('Ce TTC est inférieur aux seuls avenants.');
	return ht.toDecimalPlaces(8, Decimal.ROUND_HALF_UP);
}

export function arrondiCentime(v: Valeur): Decimal {
	return new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Somme de lignes arrondies une à une : la colonne imprimée tombe juste. */
export function totalArrondi(valeurs: Valeur[]): Decimal {
	return valeurs.reduce<Decimal>((somme, v) => somme.plus(arrondiCentime(v)), new Decimal(0));
}

/** « réglées à 95 % » quand la retenue est de 5 %. */
export function complementRetenue(retenue: Valeur): Decimal {
	return CENT.minus(retenue);
}

/** 115 500,00 € */
export function formatEuros(v: Valeur): string {
	const a = arrondiCentime(v);
	const [entier, cents] = a.abs().toFixed(2).split('.');
	const groupes = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
	return `${a.isNegative() && !a.isZero() ? '-' : ''}${groupes},${cents}${INSECABLE}€`;
}

/** 96 250,00 — la valeur d'un champ de saisie, relisible par lireNombreFr. */
export function formatMontantSaisie(v: Valeur): string {
	return formatEuros(v).replace(`${INSECABLE}€`, '');
}

/** 20,00 — un taux dans un champ de saisie. */
export function formatTauxSaisie(v: Valeur): string {
	return new Decimal(v).toFixed(2).replace('.', ',');
}

/** 20,00 % — toujours deux décimales. */
export function formatPourcentFixe(v: Valeur): string {
	return `${new Decimal(v).toFixed(2).replace('.', ',')}${INSECABLE}%`;
}

/** 5 ou 5,50 — les décimales seulement si utiles (règle de la maquette). */
export function formatNombreCourt(v: Valeur): string {
	const x = new Decimal(v);
	return x.isInteger() ? x.toFixed(0) : x.toFixed(2).replace('.', ',');
}

/** Lit un nombre saisi à la française : espaces, €, % ignorés ; virgule décimale ; point de milliers si une virgule suit. */
export function lireNombreFr(saisie: string): Decimal {
	let s = saisie.replace(/[\s\u00a0\u202f€%]/g, '');
	if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
	s = s.replace(',', '.');
	if (!/^-?\d+(\.\d+)?$/.test(s)) {
		throw new ErreurMetier(`« ${saisie.trim()} » n'est pas un nombre.`);
	}
	return new Decimal(s);
}
