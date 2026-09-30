import { dateCourteSlash } from '@/domaine/certificats';
import { lignesReserves, type Decision } from '@/domaine/reception';
import { societeReception, type SourceCoordonnees } from './coordonnees';
import type { DonneesReception } from './schemas';

/* Module pur (ni base, ni Node) : l'aperçu le rappelle à chaque frappe, le serveur à la génération. */

/** Saisies propres au lot (ligne `Reception`) ; dates AAAA-MM-JJ, '' si vide. */
export type SaisiesReception = { decision: Decision; dateEffet: string; reserves: string; delai: string; motifs: string; representant: string };
/** Champs communs à tous les PV du chantier (colonnes de `Chantier`). */
export type SaisiesReceptionCommunes = { date: string; signataire: string; contrat: string; maitreOeuvre: string };

export type SourceReception = {
	chantier: { maitreOuvrage: string; adresse: string; cp: string; commune: string; mission: 'COMPLETE' | 'PARTIELLE' };
	lot: { id: string; numero: string | null; designation: string; entreprise: string | null; retenueGarantie: string };
	societe: SourceCoordonnees;
};

/** « 5 », « 2,5 » : virgule décimale, sans zéro inutile (spec § 6). */
export function tauxCourt(taux: string): string {
	return (taux.includes('.') ? taux.replace(/\.?0+$/, '') : taux).replace('.', ',');
}

export function batirReception(s: SourceReception, saisies: SaisiesReception, commun: SaisiesReceptionCommunes): DonneesReception {
	const c = s.chantier;
	const signataire = commun.signataire.trim();
	const avec = saisies.decision === 'AVEC_RESERVES';
	return {
		type: 'PV_RECEPTION',
		contenu: {
			enDateDu: dateCourteSlash(commun.date),
			maitreOuvrage: c.maitreOuvrage.trim() || '—',
			adresseTravaux: c.adresse.trim(),
			cpCommune: [c.cp, c.commune].map((x) => x.trim()).filter(Boolean).join(' – '),
			soussigne: signataire || c.maitreOuvrage.trim(),
			representantDe: signataire ? c.maitreOuvrage.trim() : '',
			maitreOeuvre: commun.maitreOeuvre.trim(),
			entreprise: s.lot.entreprise ?? '',
			representant: saisies.representant.trim(),
			lot: s.lot.numero ? `${s.lot.numero} — ${s.lot.designation}` : s.lot.designation,
			mission: c.mission === 'COMPLETE' ? 'complète' : 'partielle',
			contrat: dateCourteSlash(commun.contrat),
			decision: saisies.decision,
			effet: saisies.decision === 'DIFFEREE' ? '' : dateCourteSlash(saisies.dateEffet || commun.date),
			motifs: saisies.decision === 'DIFFEREE' ? saisies.motifs.trim() : '',
			reserves: avec ? lignesReserves(saisies.reserves) : [],
			delai: avec ? saisies.delai.trim() : '',
			retenue: tauxCourt(s.lot.retenueGarantie),
			dateReception: commun.date,
		},
		societe: societeReception(s.societe),
	};
}
