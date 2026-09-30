import { empreinte } from '@/domaine/empreinte';
import {
	complementRetenue, formatEuros, formatNombreCourt, formatPourcentFixe, totalArrondi, arrondiCentime, ttcEngage, ttcInitial,
} from '@/domaine/montants';
import {
	corpsEtatImprime, dateDuJourTexte, dateSignatureMarche, destinataireFactures, exemplairesTexte, formatDateCalendaire,
	type Mission, type Nature,
} from '@/domaine/regles';
import type { Cadre, DonneesDocument, DonneesMarche, DonneesRecap, LigneRecap } from './schemas';

export type SourceParametres = {
	raisonSociale: string; libelleActivite: string; adresse: string; cp: string; ville: string;
	telephone: string; fax: string | null; villeSignature: string;
};

export type SourceArtisan = { nom: string; adresse: string; cp: string; commune: string; interlocuteur: string; telephone: string };

export type SourceChantier = {
	reference: string; maitreOuvrage: string; adresseClient: string; natureTravaux: string;
	adresse: string; cp: string; commune: string; mission: Mission; dateSignaturePrevue: Date | null; chargeAffaire: string;
};

export type SourceLot = {
	id: string; numero: string | null; designation: string; nature: Nature;
	montantHtInitial: string; tauxTva: string; retenueGarantie: string; exemplaires: number;
	corpsEtat: string; travaux: string; clauseParticuliere: string; dateSignature: Date | null;
	artisanId: string | null; artisan: SourceArtisan | null;
};

const TIRET = '—';
const ouTiret = (v: string) => (v.trim() ? v : TIRET);
const joindre = (morceaux: string[], separateur: string) => morceaux.filter((m) => m.trim()).join(separateur);
const adresseComplete = (a: { adresse: string; cp: string; commune: string }) =>
	joindre([a.adresse, joindre([a.cp, a.commune], ' ')], ', ');

export function batirCadre(p: SourceParametres, maintenant: Date): Cadre {
	return {
		entete: {
			raisonSociale: p.raisonSociale,
			libelleActivite: p.libelleActivite,
			adresseLigne: `${p.adresse} - ${p.cp} – ${p.ville}`,
			telephone: p.telephone,
			fax: p.fax?.trim() ? p.fax.trim() : null,
		},
		villeSignature: p.villeSignature,
		dateGeneration: dateDuJourTexte(maintenant),
	};
}

export function batirMarche(c: SourceChantier, l: SourceLot, p: SourceParametres, maintenant: Date): DonneesMarche {
	const cadre = batirCadre(p, maintenant);
	const commun = {
		maitreOuvrage: c.maitreOuvrage,
		entreprise: l.artisan?.nom ?? '',
		adresseEntreprise: l.artisan ? adresseComplete(l.artisan) : '',
		natureTravaux: c.natureTravaux,
		adresseChantier: adresseComplete(c),
		montantTtcTexte: formatEuros(ttcInitial(l.montantHtInitial, l.tauxTva)),
		retenueTexte: formatNombreCourt(l.retenueGarantie),
		dateSignature: formatDateCalendaire(dateSignatureMarche(l.dateSignature, c.dateSignaturePrevue)),
	};
	if (l.nature === 'SOUS_TRAITANCE') {
		return {
			type: 'MARCHE_SOUS_TRAITANCE',
			contenu: {
				...commun,
				corpsEtat: corpsEtatImprime(l.corpsEtat, l.designation),
				travaux: l.travaux,
				tvaTexte: `${formatNombreCourt(l.tauxTva)} %`,
			},
			cadre,
		};
	}
	return {
		type: 'MARCHE_GRE_A_GRE',
		contenu: {
			...commun,
			adresseClient: c.adresseClient,
			lotTexte: `${l.numero ? `${l.numero} — ` : ''}${l.designation || 'Lot sans désignation'}`,
			tvaTexte: formatPourcentFixe(l.tauxTva),
			destinataireFactures: destinataireFactures(l.nature, c.mission),
			complementRetenueTexte: formatNombreCourt(complementRetenue(l.retenueGarantie)),
			exemplairesTexte: exemplairesTexte(l.exemplaires),
			clauseParticuliere: l.clauseParticuliere,
		},
		cadre,
	};
}

export function batirRecap(c: SourceChantier, lots: SourceLot[], p: SourceParametres, maintenant: Date): DonneesRecap {
	const lignes: LigneRecap[] = lots.map((l) => {
		const ttc = arrondiCentime(ttcEngage(l.montantHtInitial, l.tauxTva));
		const a = l.artisan;
		return {
			numero: l.numero ?? TIRET,
			designation: ouTiret(l.designation),
			entreprise: a?.nom ?? null,
			montantTtc: ttc.isZero() ? null : ttc.toFixed(2),
			montantTtcTexte: ttc.isZero() ? TIRET : formatEuros(ttc),
			tauxTva: formatNombreCourt(l.tauxTva).replace(',', '.'),
			tvaTexte: formatPourcentFixe(l.tauxTva),
			adresse: ouTiret(a?.adresse ?? ''),
			cp: ouTiret(a?.cp ?? ''),
			commune: ouTiret(a?.commune ?? ''),
			interlocuteur: ouTiret(a?.interlocuteur ?? ''),
			telephone: ouTiret(a?.telephone ?? ''),
		};
	});
	const total = totalArrondi(lignes.map((l) => l.montantTtc ?? '0'));
	return {
		type: 'RECAPITULATIF',
		contenu: {
			maitreOuvrage: ouTiret(c.maitreOuvrage),
			natureTravaux: ouTiret(c.natureTravaux),
			adresseChantier: ouTiret(c.adresse),
			cpCommune: ouTiret(joindre([c.cp, c.commune], ' ')),
			adresseClient: ouTiret(c.adresseClient),
			mission: c.mission === 'COMPLETE' ? 'Complète' : 'Partielle',
			chargeAffaire: ouTiret(c.chargeAffaire),
			dateSignature: formatDateCalendaire(c.dateSignaturePrevue),
			lignes,
			nombreLots: lots.length,
			totalLibelle: `Total marchés — ${lots.length} lot${lots.length > 1 ? 's' : ''}`,
			totalTtc: total.toFixed(2),
			totalTtcTexte: formatEuros(total),
		},
		cadre: batirCadre(p, maintenant),
	};
}

/** Seul `{ type, contenu }` compte : ni l'en-tête SOCOREVE ni le jour de génération ne rendent un document « modifié ». */
export function empreinteDocument(d: DonneesDocument): string {
	return empreinte({ type: d.type, contenu: d.contenu });
}
