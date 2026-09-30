import { AVENANT_DISPARU, dateLongue, montantsLettre, numeroAvenantTexte, sommeAvenants } from '@/domaine/avenants';
import { empreinte } from '@/domaine/empreinte';
import { ErreurMetier } from '@/domaine/erreurs';
import {
	complementRetenue, formatEuros, formatNombreCourt, formatPourcentFixe, totalArrondi, arrondiCentime, ttcEngage, ttcInitial,
} from '@/domaine/montants';
import { colonnes, etendue, moisDesColonnes, periodeTravaux } from '@/domaine/planning';
import {
	corpsEtatImprime, dateDuJourTexte, dateSignatureMarche, destinataireFactures, exemplairesTexte, formatDateCalendaire,
	type Mission, type Nature,
} from '@/domaine/regles';
import { lundiDuRang, rangDe, semaineDuRang, versIso } from '@/domaine/semaines';
import type { Cadre, DonneesAvenant, DonneesDocument, DonneesMarche, DonneesPlanning, DonneesRecap, DonneesVisa, EntetePlanning, LigneRecap } from './schemas';

export type SourceParametres = {
	raisonSociale: string; libelleActivite: string; adresse: string; cp: string; ville: string;
	telephone: string; fax: string | null; villeSignature: string;
};

export type SourceArtisan = { nom: string; adresse: string; cp: string; commune: string; interlocuteur: string; telephone: string };

export type SourceChantier = {
	reference: string; maitreOuvrage: string; adresseClient: string; natureTravaux: string;
	adresse: string; cp: string; commune: string; mission: Mission; dateSignaturePrevue: Date | null; chargeAffaire: string;
};

export type SourceAvenant = { id: string; numero: number; devis: string; montantHt: string; date: Date; objet: string };

export type SourceLot = {
	id: string; numero: string | null; designation: string; nature: Nature;
	montantHtInitial: string; tauxTva: string; retenueGarantie: string; exemplaires: number;
	corpsEtat: string; travaux: string; clauseParticuliere: string; dateSignature: Date | null;
	artisanId: string | null; artisan: SourceArtisan | null;
	/** Triés par numéro. Le marché imprimé les ignore ; le récapitulatif et le certificat les comptent. */
	avenants: SourceAvenant[];
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
		const ttc = arrondiCentime(ttcEngage(l.montantHtInitial, l.tauxTva, sommeAvenants(l.avenants)));
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

export type SourcePeriode = { intitule: string; debut: Date; duree: number };

export type SourcePlanning = {
	chantier: SourceChantier;
	/** Tous les lots, dans l'ordre du chantier ; leurs périodes triées par début. */
	lots: { designation: string; entreprise: string | null; couleur: string; periodes: SourcePeriode[] }[];
	fermetures: { debut: Date; duree: number }[];
};

/** « adresse – CP commune », comme `enTetePlanning` de la maquette. */
export function entetePlanning(c: SourceChantier): EntetePlanning {
	return {
		coordination: ouTiret(c.chargeAffaire),
		maitreOuvrage: ouTiret(c.maitreOuvrage),
		projet: ouTiret(c.natureTravaux),
		adresseChantier: ouTiret(joindre([c.adresse, joindre([c.cp, c.commune], ' ')], ' – ')),
	};
}

const semaineEtAnnee = (rang: number) => {
	const s = semaineDuRang(rang);
	return { semaine: s.semaine, annee: s.annee };
};

export function batirPlanning(s: SourcePlanning, p: SourceParametres, maintenant: Date): DonneesPlanning {
	const periodes = s.lots.flatMap((l) => l.periodes.map((x) => ({ debut: rangDe(x.debut), duree: x.duree })));
	const travaux = periodeTravaux(periodes);
	if (!travaux) throw new ErreurMetier('Aucune période : rien à imprimer.');
	const fermetures = s.fermetures.map((f) => ({ debut: rangDe(f.debut), duree: f.duree }));
	// Le même axe qu'à l'écran. Il couvre toutes les périodes et fermetures : rien n'est à rogner.
	const e = etendue([...periodes, ...fermetures], travaux.debut);
	const cols = colonnes(e);
	return {
		type: 'PLANNING',
		contenu: {
			entete: entetePlanning(s.chantier),
			axe: {
				premierLundi: versIso(lundiDuRang(e.debut)),
				semaines: cols.map((c) => ({ numero: c.semaine, annee: c.annee })),
				mois: moisDesColonnes(cols).map((m) => ({ libelle: m.libelle, nbSemaines: m.nb })),
			},
			fermetures: fermetures.map((f) => ({ colonne: f.debut - e.debut, duree: f.duree })),
			lignes: s.lots.map((l) => ({
				entreprise: l.entreprise ?? TIRET,
				lot: ouTiret(l.designation),
				couleur: l.couleur,
				barres: l.periodes.map((x) => ({ colonne: rangDe(x.debut) - e.debut, duree: x.duree, intitule: x.intitule })),
			})),
			periodeTravaux: { debut: semaineEtAnnee(travaux.debut), fin: semaineEtAnnee(travaux.fin) },
		},
		cadre: batirCadre(p, maintenant),
	};
}

/** Construit depuis une version générée du planning, jamais depuis les données actuelles. */
export function batirVisa(source: { version: number; donnees: DonneesPlanning }, p: SourceParametres, maintenant: Date): DonneesVisa {
	const c = source.donnees.contenu;
	const date = source.donnees.cadre.dateGeneration;
	const { debut, fin } = c.periodeTravaux;
	return {
		type: 'VISA_PLANNING',
		contenu: {
			entete: c.entete,
			planning: { version: source.version, date },
			periodeTravaux: c.periodeTravaux,
			phrase: `Planning prévisionnel des travaux sur la période de la Semaine ${debut.semaine} de ${debut.annee} à la Semaine ${fin.semaine} de ${fin.annee} (version ${source.version} du ${date})`,
			lignes: c.lignes.map((l) => ({ entreprise: l.entreprise, lot: l.lot })),
		},
		cadre: batirCadre(p, maintenant),
	};
}

/** Fac-similé de « 4- AVENANT.doc » (maquette `buildDocAvenant`) : le « marché initial » compte les avenants antérieurs encore présents. */
export function batirAvenant(c: SourceChantier, l: SourceLot, avenantId: string, p: SourceParametres, maintenant: Date): DonneesAvenant {
	const a = l.avenants.find((x) => x.id === avenantId);
	if (!a) throw new ErreurMetier(AVENANT_DISPARU);
	const m = montantsLettre({ htInitial: l.montantHtInitial, tauxTva: l.tauxTva, avenants: l.avenants, numero: a.numero });
	return {
		type: 'AVENANT',
		contenu: {
			entete: entetePlanning(c),
			lieuDate: `${p.villeSignature}, le ${dateLongue(a.date)}`,
			numero: numeroAvenantTexte(a.numero),
			entreprise: l.artisan?.nom ?? TIRET,
			lot: l.designation || 'Lot sans désignation',
			sens: m.plusValue ? 'plus-value' : 'moins-value',
			objet: a.objet,
			montants: {
				marcheInitial: formatEuros(m.marcheInitial),
				devis: { numero: a.devis, montant: formatEuros(m.devis) },
				difference: formatEuros(m.devis),
				nouveauMontant: formatEuros(m.nouveauMontant),
			},
		},
		cadre: batirCadre(p, maintenant),
	};
}

/** Seul `{ type, contenu }` compte : ni l'en-tête SOCOREVE ni le jour de génération ne rendent un document « modifié ». */
export function empreinteDocument(d: DonneesDocument): string {
	return empreinte({ type: d.type, contenu: d.contenu });
}
