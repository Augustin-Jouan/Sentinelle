import { dateCourteSlash } from './certificats';

/*
 * Règles du compte rendu de chantier (spec § 5), pures : l'aperçu les appelle dans le navigateur,
 * le serveur à l'enregistrement.
 */

/** Lettres de convocation, dans l'ordre où un clic les fait tourner (maquette `CONVOCS`). */
export const CONVOCATIONS = ['D', 'C', 'P', 'A', 'E'] as const;
export type Convocation = (typeof CONVOCATIONS)[number];

export type ChampCompteRendu = 'date' | 'rdvDate' | 'rdvHeure' | 'avancement' | 'coordination' | 'redacteur' | 'portable';

export const CR_VIDE = "Saisissez l'avancement ou la coordination avant d'enregistrer.";
export const DERNIER_CR_SEUL = 'Seul le dernier compte rendu se corrige.';
export const BROUILLON_DISPARU = "Ce brouillon n'existe plus.";
export const CR_INTROUVABLE = 'Compte rendu introuvable.';
export const HEURE_INVALIDE = 'Heure : saisissez HH:MM.';
export const HEURE_SANS_DATE = "Saisissez d'abord la date du prochain rendez-vous.";
export const numeroPris = (n: number) => `Le compte rendu n° ${n} existe déjà.`;
export const LIMITES_CR = { avancement: 5000, coordination: 20000, court: 120 } as const;
export const MESSAGES_LONGUEUR_CR = {
	avancement: "L'avancement est limité à 5 000 caractères.",
	coordination: 'La coordination est limitée à 20 000 caractères.',
	court: '120 caractères au plus.',
} as const;
/** Même expression que la contrainte `CompteRendu_heure_valide` de la base. */
export const HEURE_VALIDE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function convocationSuivante(c: Convocation | undefined): Convocation {
	return CONVOCATIONS[(CONVOCATIONS.indexOf(c ?? 'D') + 1) % CONVOCATIONS.length];
}

/** Coordination d'un premier compte rendu : « DÉSIGNATION : » par lot, puis le maître d'ouvrage. */
export function coordinationBase(designations: string[]): string {
	return [...designations.map((d) => `${d.trim() || 'LOT'} :`), "MAÎTRE D'OUVRAGE :"].join('\n\n');
}

export function numeroSuivant(numeros: number[]): number {
	return numeros.length ? Math.max(...numeros) + 1 : 1;
}

export const numeroTexte = (n: number): string => String(n).padStart(2, '0');

export type Segment = { texte: string; surligne: boolean };
/** `titre` vide : lignes écrites avant le premier intitulé. */
export type Rubrique = { titre: string; suite: Segment[]; lignes: Segment[][] };

/** `**texte**` → surligné, comme les passages jaunes du document d'origine. */
export function segments(ligne: string): Segment[] {
	const r: Segment[] = [];
	let debut = 0;
	for (const m of ligne.matchAll(/\*\*(.+?)\*\*/g)) {
		const i = m.index ?? 0;
		if (i > debut) r.push({ texte: ligne.slice(debut, i), surligne: false });
		r.push({ texte: m[1], surligne: true });
		debut = i + m[0].length;
	}
	if (debut < ligne.length) r.push({ texte: ligne.slice(debut), surligne: false });
	return r;
}

const INTITULE = /^\s*([A-ZÀ-ÖØ-ÝŒÆ0-9][A-ZÀ-ÖØ-ÝŒÆ0-9 .,/'’\-–—()]*?)\s*:\s*(.*)$/;
const TROIS_MAJUSCULES = /[A-ZÀ-ÖØ-ÝŒÆ]{3}/;

/** Une ligne en MAJUSCULES (trois lettres au moins) terminée par « : » ouvre une rubrique (maquette `titreCo`). */
export function intitule(ligne: string): { titre: string; suite: string } | null {
	const m = INTITULE.exec(ligne);
	return m && TROIS_MAJUSCULES.test(m[1]) ? { titre: m[1], suite: m[2].trim() } : null;
}

/** Texte collé d'un traitement de texte : `\r\n`, tabulations et espaces insécables deviennent ordinaires. */
const lignesDe = (texte: string) => texte.replace(/[\t  ]/g, ' ').split(/\r?\n/);

/** La coordination imprimée : lignes vides ignorées, rubrique sans texte omise (maquette `crCoordination`). */
export function rubriquesCoordination(texte: string): Rubrique[] {
	const rubriques: Rubrique[] = [];
	let courante: Rubrique | null = null;
	for (const brute of lignesDe(texte)) {
		const ligne = brute.trimEnd();
		const t = intitule(ligne);
		if (t) {
			courante = { titre: t.titre, suite: segments(t.suite), lignes: [] };
			rubriques.push(courante);
		} else if (ligne.trim()) {
			if (!courante) {
				courante = { titre: '', suite: [], lignes: [] };
				rubriques.push(courante);
			}
			courante.lignes.push(segments(ligne.trim()));
		}
	}
	return rubriques.filter((r) => r.suite.length > 0 || r.lignes.length > 0);
}

/** L'avancement imprimé : une entrée par ligne, lignes vides comprises (la maquette l'imprime en pre-wrap). */
export function lignesAvancement(texte: string): Segment[][] {
	const t = texte.trim();
	return t ? lignesDe(t).map((l) => segments(l.trimEnd())) : [];
}

export function compteRenduVide(avancement: string, coordination: string): boolean {
	return !avancement.trim() && rubriquesCoordination(coordination).length === 0;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « mardi 13/10/2026 à 14h00 » ; `court` : « mardi 13/10 à 14h00 » (carte de la page Documents) ; '' sans date. */
export function texteRendezVous(date: string, heure: string, court = false): string {
	const jour = dateCourteSlash(date);
	if (!jour) return '';
	const nom = JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()];
	return `${nom} ${court ? jour.slice(0, 5) : jour}${HEURE_VALIDE.test(heure) ? ` à ${heure.replace(':', 'h')}` : ''}`;
}
