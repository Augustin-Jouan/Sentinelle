import { dateCourteSlash } from '@/domaine/certificats';
import { lignesAvancement, numeroTexte, rubriquesCoordination, texteRendezVous, type Convocation } from '@/domaine/compteRendu';
import { societeCompteRendu, type SourceCoordonnees } from './coordonnees';
import type { DonneesCompteRendu } from './schemas';

/*
 * Module pur (ni base, ni Node) : l'aperçu le rappelle dans le navigateur (correction), le serveur à
 * l'enregistrement avec les valeurs relues en base. Il ne doit importer ni `batir.ts`, ni `@/donnees`.
 */

export type SourceCompteRendu = {
	numero: number;
	chantier: { maitreOuvrage: string; natureTravaux: string; adresse: string; cp: string; commune: string };
	/** Tous les lots, dans l'ordre de saisie. */
	lots: { id: string; designation: string; entreprise: string | null; interlocuteur: string; telephone: string }[];
	societe: SourceCoordonnees;
};

/** Ce qui se tape sur la feuille ; dates au format AAAA-MM-JJ, heure HH:MM, '' si vide. */
export type SaisiesCompteRendu = {
	date: string; rdvDate: string; rdvHeure: string; avancement: string; coordination: string;
	redacteur: string; portable: string; convocations: Record<string, Convocation>;
};

const TIRET = '—';
const ouTiret = (v: string | null) => (v?.trim() ? v.trim() : TIRET);

export function batirCompteRendu(s: SourceCompteRendu, saisies: SaisiesCompteRendu): DonneesCompteRendu {
	const c = s.chantier;
	return {
		type: 'COMPTE_RENDU',
		contenu: {
			numero: numeroTexte(s.numero),
			redacteur: saisies.redacteur.trim(),
			portable: saisies.portable.trim(),
			referenceChantier: ouTiret(c.natureTravaux).toLocaleUpperCase('fr-FR').replace(/M²/g, 'm²'),
			adresseChantier: [c.adresse, c.cp, c.commune].map((x) => x.trim()).filter(Boolean).join(' – '),
			maitreOuvrage: ouTiret(c.maitreOuvrage),
			date: dateCourteSlash(saisies.date),
			prochainRdv: texteRendezVous(saisies.rdvDate, saisies.rdvHeure),
			lots: s.lots.map((l) => ({
				lotId: l.id,
				lot: ouTiret(l.designation),
				entreprise: ouTiret(l.entreprise),
				interlocuteur: ouTiret(l.interlocuteur),
				telephone: ouTiret(l.telephone),
				convocation: saisies.convocations[l.id] ?? 'D',
			})),
			avancement: lignesAvancement(saisies.avancement),
			coordination: rubriquesCoordination(saisies.coordination),
		},
		societe: societeCompteRendu(s.societe),
	};
}
