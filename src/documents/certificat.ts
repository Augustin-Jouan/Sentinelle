import Decimal from 'decimal.js';
import { calculerCertificat, dateCourteSlash, moisLong, type EntreeCalcul } from '@/domaine/certificats';
import { formatEuros } from '@/domaine/montants';
import type { DonneesCertificat, Societe } from './schemas';

/*
 * Module pur (ni base, ni Node) : l'aperçu le rappelle à chaque frappe dans le navigateur, le serveur
 * à la génération, avec les valeurs relues en base (spec § 3). Il ne doit importer ni `batir.ts`
 * (qui charge `node:crypto`), ni `@/donnees`.
 */

export type SourceSociete = {
	adresse: string; cp: string; ville: string; telephone: string; email: string | null;
	rcs: string; ape: string; tvaIntracommunautaire: string; villeSignature: string;
};

export type SourceCertificat = {
	/** Nombre d'acomptes précédents + 1. */
	numero: number;
	chantier: { maitreOuvrage: string; natureTravaux: string; adresse: string; cp: string; commune: string };
	lot: {
		numero: string | null; designation: string; entreprise: string | null;
		htInitial: string; tauxTva: string; tauxRetenue: string; caution: boolean;
	};
	/** Triés par numéro (trous possibles). */
	avenants: { numero: number; montantHt: string }[];
	/** Acomptes de numéro inférieur à celui du certificat, triés. */
	precedents: { id: string; numero: number; montantHt: string; manuel: boolean }[];
	societe: SourceSociete;
};

/** Les saisies de la feuille ; `cumul` est nul tant qu'il n'est pas saisi (aperçu seulement). */
export type SaisieCertificat = { cumul: Decimal | null; mois: string; date: string };

const LIGNES_AVENANTS = 4;
const LIGNES_PRECEDENTS = 8;
const TIRET = '—';
const ouTiret = (v: string | null) => (v?.trim() ? v : TIRET);

export function entreeCalcul(s: SourceCertificat, cumul: Decimal): EntreeCalcul {
	return {
		htInitial: s.lot.htInitial,
		avenants: s.avenants.map((a) => a.montantHt),
		tauxTva: s.lot.tauxTva,
		tauxRetenue: s.lot.tauxRetenue,
		caution: s.lot.caution,
		precedents: s.precedents.map((a) => a.montantHt),
		cumulRealise: cumul,
	};
}

/** Maquette `renderCpSheet` : « 71 rue … - 44110 CHÂTEAUBRIANT », « Tél. : … - e-mail », RCS, APE, TVA. */
export function batirSociete(p: SourceSociete): Societe {
	const email = p.email?.trim();
	return {
		adresseLigne: `${p.adresse} - ${p.cp} ${p.ville.toLocaleUpperCase('fr-FR')}`,
		contactLigne: `Tél. : ${p.telephone}${email ? ` - ${email}` : ''}`,
		rcsLigne: `RCS : ${p.rcs} – APE ${p.ape}`,
		tvaLigne: `N° TVA Intra. : ${p.tvaIntracommunautaire}`,
		villeSignature: p.villeSignature,
	};
}

/**
 * Feuille « CERTIFICAT DE PAIEMENT N° 03 » (maquette `renderCpSheet`) : lignes vides jusqu'à 4 avenants
 * et 8 acomptes précédents, au-delà les seules lignes réelles. `ligneAjout` (aperçu) garde une ligne libre
 * sous les acomptes pour en saisir un de plus.
 */
export function batirCertificat(s: SourceCertificat, saisie: SaisieCertificat, opts: { ligneAjout?: boolean } = {}): DonneesCertificat {
	// Sans cumul, les totaux du marché et des acomptes précédents s'affichent déjà ; le reste attend la saisie.
	const k = calculerCertificat(entreeCalcul(s, saisie.cumul ?? new Decimal(0)));
	const siCumul = (x: Decimal) => (saisie.cumul ? formatEuros(x) : '');
	const dernierAvenant = s.avenants.at(-1)?.numero ?? 0;
	const lignesVides = Math.max(0, LIGNES_AVENANTS - s.avenants.length);
	const nbPrecedents = Math.max(LIGNES_PRECEDENTS, s.precedents.length + (opts.ligneAjout ? 1 : 0));
	return {
		type: 'CERTIFICAT_PAIEMENT',
		contenu: {
			numero: String(s.numero).padStart(2, '0'),
			maitreOuvrage: ouTiret(s.chantier.maitreOuvrage),
			objet: ouTiret(s.chantier.natureTravaux),
			adresseChantier: [s.chantier.adresse, s.chantier.cp, s.chantier.commune].filter((x) => x.trim()).join(' – '),
			lotNumero: ouTiret(s.lot.numero),
			lot: ouTiret(s.lot.designation),
			titulaire: ouTiret(s.lot.entreprise),
			marcheHt: formatEuros(k.marcheHt),
			avenants: [
				...s.avenants.map((a, i) => ({ libelle: `Avenant ${a.numero} HT :`, montant: formatEuros(k.avenants[i]) })),
				...Array.from({ length: lignesVides }, (_, i) => ({ libelle: `Avenant ${dernierAvenant + i + 1} HT :`, montant: '' })),
			],
			totalHt: formatEuros(k.totalHt),
			totalTva: formatEuros(k.totalTva),
			totalTtc: formatEuros(k.totalTtc),
			mois: moisLong(saisie.mois),
			precedents: Array.from({ length: nbPrecedents }, (_, i) => ({
				numero: String(i + 1),
				montant: s.precedents[i] ? formatEuros(s.precedents[i].montantHt) : '',
			})),
			precedentsHt: formatEuros(k.precedentsHt),
			precedentsTva: formatEuros(k.precedentsTva),
			precedentsTtc: formatEuros(k.precedentsTtc),
			realise: siCumul(k.realiseHt),
			presentHt: siCumul(k.presentHt),
			presentTva: siCumul(k.presentTva),
			presentTtc: siCumul(k.presentTtc),
			mandate: siCumul(k.mandate),
			caution: s.lot.caution ? 'OUI' : 'NON',
			retenue: siCumul(k.retenue),
			faitLe: dateCourteSlash(saisie.date),
			valeurs: {
				htInitial: s.lot.htInitial,
				tauxTva: s.lot.tauxTva,
				tauxRetenue: s.lot.tauxRetenue,
				caution: s.lot.caution,
				avenants: s.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt })),
				precedents: s.precedents.map((a) => ({ numero: a.numero, montantHt: a.montantHt, manuel: a.manuel })),
				cumul: saisie.cumul ? saisie.cumul.toFixed(2) : null,
				mois: saisie.mois,
				date: saisie.date,
			},
		},
		societe: batirSociete(s.societe),
	};
}
