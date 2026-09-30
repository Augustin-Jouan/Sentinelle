import { dateCourteSlash } from './certificats';
import { ErreurMetier } from './erreurs';

/* Règles du procès-verbal de réception (spec § 6), pures. */

export const DECISIONS = ['SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE'] as const;
export type Decision = (typeof DECISIONS)[number];
export const LIBELLES_DECISIONS: Record<Decision, string> = {
	SANS_RESERVES: 'Sans réserves',
	AVEC_RESERVES: 'Avec réserves',
	DIFFEREE: 'Différée',
};

export type ChampReception = 'decision' | 'dateEffet' | 'reserves' | 'delai' | 'motifs' | 'representant';
export type ChampReceptionCommun = 'date' | 'signataire' | 'contrat' | 'maitreOeuvre';

export const AUCUN_LOT_RECEPTIONNABLE = "Attribuez d'abord une entreprise à un lot.";
export const SANS_ENTREPRISE = "Ce lot n'a pas d'entreprise.";
export const PAS_DE_RESERVES = "Le dernier PV de ce lot n'a pas de réserves.";
export const LEVEE_AVANT = 'La levée ne peut précéder la réception.';
export const DATE_RECEPTION = 'Date de réception : choisissez une date.';
export const MOTIFS_TROP_LONGS = 'Les motifs sont limités à 2 000 caractères.';
export const LIMITES_PV = { long: 2000, lignes: 60, court: 120 } as const;
/** Adresse `?pv=tous` : tous les lots qui ont une entreprise. Ici, et non dans `@/donnees`, parce que l'aperçu (client) s'en sert. */
export const TOUS_LES_LOTS = 'tous';

/** Un PV « avec réserves » qui n'en dit aucune, ou « différé » sans motif, ne dirait rien (maquette `enregistrerPv`). */
export function controlerReception(p: { entreprise: string; decision: Decision; reserves: string; motifs: string }): string | null {
	if (p.decision === 'AVEC_RESERVES' && !p.reserves.trim()) return `${p.entreprise} : précisez la nature des réserves.`;
	if (p.decision === 'DIFFEREE' && !p.motifs.trim()) return `${p.entreprise} : précisez les motifs du report.`;
	return null;
}

export type EtatReception = 'a-produire' | 'sans-reserves' | 'avec-reserves' | 'levee' | 'differee';
export type CaseReceptionEtat = { etat: EtatReception; texte: string; alerte: boolean };

/** La case Réception de la page Documents (spec § 7) : l'orangé (`alerte`) demande un suivi. */
export function etatReception(dernier: { decision: Decision; date: string } | null, leveeLe: string | null): CaseReceptionEtat {
	if (!dernier) return { etat: 'a-produire', texte: '+ Réception', alerte: false };
	const jour = dateCourteSlash(dernier.date).slice(0, 5);
	switch (dernier.decision) {
		case 'SANS_RESERVES':
			return { etat: 'sans-reserves', texte: `Sans réserves · ${jour}`, alerte: false };
		case 'DIFFEREE':
			return { etat: 'differee', texte: `Différée · ${jour}`, alerte: true };
		case 'AVEC_RESERVES':
			return leveeLe
				? { etat: 'levee', texte: `Réserves levées le ${dateCourteSlash(leveeLe).slice(0, 5)}`, alerte: false }
				: { etat: 'avec-reserves', texte: `Avec réserves · ${jour}`, alerte: true };
	}
}

/** Dates au format AAAA-MM-JJ : la comparaison de textes suit l'ordre des jours. */
export function controlerLevee(dernier: { decision: Decision; date: string } | null, date: string): void {
	if (!dernier || dernier.decision !== 'AVEC_RESERVES') throw new ErreurMetier(PAS_DE_RESERVES);
	if (date < dernier.date) throw new ErreurMetier(LEVEE_AVANT, 'date');
}

export function bilanReceptions(generes: number, inchanges: number): string {
	const g = `${generes} PV généré${generes > 1 ? 's' : ''}`;
	return inchanges ? `${g}, ${inchanges} inchangé${inchanges > 1 ? 's' : ''}.` : `${g}.`;
}

/** Les réserves imprimées : une par ligne, lignes vides omises. */
export function lignesReserves(texte: string): string[] {
	return texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** 2 000 caractères et 60 lignes : au-delà, le PV ne tiendrait plus sur une page lisible. */
export function verifierReserves(texte: string): string {
	if (texte.length > LIMITES_PV.long) throw new ErreurMetier('Les réserves sont limitées à 2 000 caractères.', 'reserves');
	if (lignesReserves(texte).length > LIMITES_PV.lignes) throw new ErreurMetier('Les réserves sont limitées à 60 lignes.', 'reserves');
	return texte;
}

export function verifierTexteCourt(texte: string, champ: string): string {
	const t = texte.trim();
	if (t.length > LIMITES_PV.court) throw new ErreurMetier('120 caractères au plus.', champ);
	return t;
}
