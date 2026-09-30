/** Semaines ISO 8601 : le lundi ouvre la semaine, la semaine 1 contient le premier jeudi de l'année. Dates à minuit UTC. */

const MS_JOUR = 86_400_000;
export const MS_SEMAINE = 7 * MS_JOUR;
/** Lundi 5 janvier 1970 : origine des rangs de semaine. */
const ORIGINE = Date.UTC(1970, 0, 5);

export const MOIS_ABREGES = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] as const;

export type Semaine = { annee: number; semaine: number };

const minuitUtc = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Lundi (minuit UTC) de la semaine ISO donnée. Ne vérifie pas que la semaine existe : voir `semaineExiste`. */
export function lundiIso(annee: number, semaine: number): Date {
	const quatreJanvier = Date.UTC(annee, 0, 4);
	const jour = new Date(quatreJanvier).getUTCDay() || 7;
	return new Date(quatreJanvier - (jour - 1) * MS_JOUR + (semaine - 1) * MS_SEMAINE);
}

export function semaineIso(d: Date): Semaine {
	const jour = minuitUtc(d);
	const n = new Date(jour).getUTCDay() || 7;
	// Le jeudi de la même semaine porte l'année ISO.
	const jeudi = new Date(jour + (4 - n) * MS_JOUR);
	const annee = jeudi.getUTCFullYear();
	return { annee, semaine: Math.floor((jeudi.getTime() - Date.UTC(annee, 0, 1)) / MS_SEMAINE) + 1 };
}

/** 52 ou 53 : le 28 décembre est toujours dans la dernière semaine de l'année. */
export function nombreSemaines(annee: number): number {
	return semaineIso(new Date(Date.UTC(annee, 11, 28))).semaine;
}

export function semaineExiste(annee: number, semaine: number): boolean {
	return Number.isInteger(annee) && Number.isInteger(semaine) && semaine >= 1 && semaine <= nombreSemaines(annee);
}

/** Rang absolu de la semaine d'une date : deux rangs consécutifs sont deux semaines consécutives, Nouvel An compris. */
export const rangDe = (d: Date): number => Math.floor((minuitUtc(d) - ORIGINE) / MS_SEMAINE);
export const lundiDuRang = (rang: number): Date => new Date(ORIGINE + rang * MS_SEMAINE);
export const rangSemaine = (annee: number, semaine: number): number => rangDe(lundiIso(annee, semaine));
export const semaineDuRang = (rang: number): Semaine => semaineIso(lundiDuRang(rang));
export const lundiDe = (d: Date): Date => lundiDuRang(rangDe(d));

export const versIso = (d: Date): string => d.toISOString().slice(0, 10);
export const depuisIso = (s: string): Date => new Date(`${s}T00:00:00Z`);

/** « avr.-26 » : le mois du lundi de la semaine, comme le .ods d'origine. */
export function libelleMois(rang: number): string {
	const lundi = lundiDuRang(rang);
	return `${MOIS_ABREGES[lundi.getUTCMonth()]}-${String(lundi.getUTCFullYear()).slice(2)}`;
}

const FORMAT_PARIS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Le jour calendaire à Châteaubriant, en minuit UTC. */
export const dateParis = (maintenant: Date): Date => depuisIso(FORMAT_PARIS.format(maintenant));
