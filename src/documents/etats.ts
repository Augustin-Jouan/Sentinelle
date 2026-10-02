import Decimal from 'decimal.js';
import { manquesAvenant, sommeAvenants, type ManqueAvenant } from '@/domaine/avenants';
import { certificatPossible, dateCourteSlash } from '@/domaine/certificats';
import { texteRendezVous } from '@/domaine/compteRendu';
import { etatReception, type CaseReceptionEtat } from '@/domaine/reception';
import { versIso } from '@/domaine/semaines';
import { ErreurMetier } from '@/domaine/erreurs';
import { htEngage } from '@/domaine/montants';
import { manquesPourGenerer, type Manque, type Nature } from '@/domaine/regles';
import { prisma } from '@/donnees/prisma';
import { batirAvenant, batirMarche, batirPlanning, batirRecap, empreinteDocument } from './batir';
import { lireSourcePlanning, lireSources } from './donnees';
import type { TypeDocument } from './libelles';
import { donneesDocumentSchema, type DonneesDocument, type DonneesReception } from './schemas';
import { avenantDeLaSerie, serieAvenant, serieCertificat, serieCompteRendu, serieReception, SERIES } from './series';

export type EtatSerie = 'a-produire' | 'a-jour' | 'modifie';
/** « Périmé » : le visa fait signer une version du planning qui n'est plus la dernière. */
export type EtatVisa = 'a-produire' | 'a-jour' | 'perime';
export type VersionResume = {
	id: string; version: number; type: TypeDocument;
	creeLe: string; auteur: string; nomFichier: string;
	/** Historique d'un lot : « Avenant n° 02 », « Avenant n° 01 · avenant supprimé » ; sinon le libellé du type. */
	libelle?: string;
};
export type SerieDocuments = { etat: EtatSerie; versions: VersionResume[] };
export type SerieVisa = { etat: EtatVisa; versions: VersionResume[]; surVersion: number | null; derniereVersionPlanning: number | null };
export type CaseAvenant = { avenantId: string; numero: number; montantHt: string; etat: EtatSerie; versions: VersionResume[]; manques: ManqueAvenant[] };
/** Pas d'état : un certificat est un acte de paiement, figé tel qu'émis ; seule sa correction crée une version (spec § 6). */
export type CaseCertificat = { acompteId: string; numero: number; manuel: boolean; versions: VersionResume[]; corrigeable: boolean };
/** La case Réception d'un lot attribué : l'état du dernier PV émis (jamais « modifié » : un PV est un acte daté). */
export type CaseReception = CaseReceptionEtat & { derniere: VersionResume | null; leveeLe: string | null };
/** Un compte rendu enregistré ; `date` : « 06/10/2026 ». Pas d'état : il n'est jamais reconstruit (spec § 5). */
export type CompteRenduResume = { id: string; numero: number; date: string; versions: VersionResume[]; dernier: boolean };
export type CarteComptesRendus = {
	brouillon: { numero: number } | null;
	/** Du plus grand numéro au plus petit. */
	liste: CompteRenduResume[];
	/** Celui du dernier enregistré, « mardi 13/10 à 14h00 » ; '' s'il n'en fixe pas ; nul sans compte rendu. */
	prochainRdv: string | null;
};
export type LigneDocuments = {
	lotId: string; lotTexte: string; numero: string | null; designation: string; nature: Nature; entreprise: string | null;
	manques: Manque[]; marche: SerieDocuments;
	avenants: CaseAvenant[]; certificats: CaseCertificat[]; certificatPossible: boolean;
	/** Nul pour un lot sans entreprise. */
	reception: CaseReception | null;
	/** Versions du marché, des lettres d'avenants (supprimés compris) et des PV de réception, de la plus récente à la plus ancienne. */
	historique: VersionResume[];
};
export type VueDocuments = {
	chantierId: string; reference: string; recap: SerieDocuments; planning: SerieDocuments; visa: SerieVisa;
	comptesRendus: CarteComptesRendus;
	/** En-tête de la page : « 23 documents · dernier le 06/10/2026 ». `dernierLe` : ISO. */
	resume: { nombre: number; dernierLe: string | null };
	lots: LigneDocuments[];
};

const SELECTION = {
	id: true, serie: true, sourceId: true, version: true, type: true, creeLe: true, nomFichier: true, empreinte: true,
	lotId: true,
	creePar: { select: { name: true } },
} as const;

type DocLu = {
	id: string; serie: string; sourceId: string | null; version: number; type: TypeDocument; creeLe: Date;
	nomFichier: string; empreinte: string; lotId: string | null; creePar: { name: string };
};

const resume = (d: DocLu): VersionResume => ({
	id: d.id, version: d.version, type: d.type, creeLe: d.creeLe.toISOString(), auteur: d.creePar.name, nomFichier: d.nomFichier,
});

function serie(docs: DocLu[], empreinteActuelle: string): SerieDocuments {
	const versions = docs.map(resume);
	if (!docs.length) return { etat: 'a-produire', versions };
	return { etat: docs[0].empreinte === empreinteActuelle ? 'a-jour' : 'modifie', versions };
}

/** `visas` et `plannings` : du plus récent au plus ancien. */
function serieVisa(visas: DocLu[], plannings: DocLu[]): SerieVisa {
	const dernierPlanning = plannings[0] ?? null;
	const source = visas.length ? plannings.find((d) => d.id === visas[0].sourceId) ?? null : null;
	return {
		etat: !visas.length ? 'a-produire' : visas[0].sourceId === dernierPlanning?.id ? 'a-jour' : 'perime',
		versions: visas.map(resume),
		surVersion: source?.version ?? null,
		derniereVersionPlanning: dernierPlanning?.version ?? null,
	};
}

/** Empreinte du planning actuel ; vide s'il n'a aucune période (aucune version ne peut alors être à jour). */
async function empreintePlanning(chantierId: string, maintenant: Date): Promise<string> {
	const { source, parametres } = await lireSourcePlanning(chantierId);
	try {
		return empreinteDocument(batirPlanning(source, parametres, maintenant));
	} catch (e) {
		if (e instanceof ErreurMetier) return '';
		throw e;
	}
}

export async function etatSeriePlanning(chantierId: string, maintenant = new Date()): Promise<SerieDocuments> {
	const [docs, emp] = await Promise.all([
		prisma.document.findMany({ where: { chantierId, serie: SERIES.PLANNING }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
	]);
	return serie(docs, emp);
}

type CompteRenduLu = { id: string; numero: number; statut: 'BROUILLON' | 'ENREGISTRE'; date: Date; rdvDate: Date | null; rdvHeure: string | null };

/** `comptesRendus` : du plus grand numéro au plus petit. */
function carteComptesRendus(comptesRendus: CompteRenduLu[], docsDe: (serie: string) => DocLu[]): CarteComptesRendus {
	const enregistres = comptesRendus.filter((c) => c.statut === 'ENREGISTRE');
	const brouillon = comptesRendus.find((c) => c.statut === 'BROUILLON');
	const dernier = enregistres[0];
	return {
		brouillon: brouillon ? { numero: brouillon.numero } : null,
		liste: enregistres.map((c, i) => ({
			id: c.id, numero: c.numero, date: dateCourteSlash(versIso(c.date)), versions: docsDe(serieCompteRendu(c.id)).map(resume), dernier: i === 0,
		})),
		prochainRdv: dernier ? texteRendezVous(dernier.rdvDate ? versIso(dernier.rdvDate) : '', dernier.rdvHeure ?? '', true) : null,
	};
}

/** L'état se calcule en reconstruisant le contenu actuel et en le comparant à la dernière version : rien n'est stocké. */
export async function etatsDocumentsChantier(chantierId: string, maintenant = new Date()): Promise<VueDocuments | null> {
	const existe = await prisma.chantier.findUnique({ where: { id: chantierId }, select: { id: true } });
	if (!existe) return null;
	const [{ chantier, lots, parametres }, docs, empreinteDuPlanning, acomptes, lettres, comptesRendus, proces, receptions] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({ where: { chantierId }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
		prisma.acompte.findMany({ where: { lot: { chantierId } }, orderBy: { numero: 'asc' }, select: { id: true, lotId: true, numero: true, manuel: true } }),
		// Le numéro imprimé d'une lettre survit à son avenant : il sert à l'historique des avenants supprimés.
		prisma.document.findMany({ where: { chantierId, type: 'AVENANT' }, select: { id: true, donnees: true } }),
		prisma.compteRendu.findMany({
			where: { chantierId }, orderBy: { numero: 'desc' },
			select: { id: true, numero: true, statut: true, date: true, rdvDate: true, rdvHeure: true },
		}),
		// Décision et date de chaque PV : l'état de la case vient du dernier émis, jamais d'une reconstruction.
		prisma.document.findMany({ where: { chantierId, type: 'PV_RECEPTION' }, select: { id: true, donnees: true } }),
		prisma.reception.findMany({ where: { lot: { chantierId } }, select: { lotId: true, reservesLeveesLe: true } }),
	]);
	const numeroLettre = new Map(lettres.map((d) => [d.id, (d.donnees as { contenu?: { numero?: string } }).contenu?.numero ?? '?']));
	const contenuPv = new Map(proces.map((d) => [d.id, (d.donnees as unknown as DonneesReception).contenu]));
	const levees = new Map(receptions.map((r) => [r.lotId, r.reservesLeveesLe ? versIso(r.reservesLeveesLe) : null]));
	const docsDe = (s: string) => docs.filter((d) => d.serie === s);
	const enOrdre: LigneDocuments[] = [];
	for (const lot of lots) {
		const actuels = new Set(lot.avenants.map((a) => a.id));
		const acomptesDuLot = acomptes.filter((a) => a.lotId === lot.id);
		const pvs = docsDe(serieReception(lot.id));
		const dernierPv = pvs[0] ? contenuPv.get(pvs[0].id) : undefined;
		const leveeLe = levees.get(lot.id) ?? null;
		const ligne: LigneDocuments = {
			lotId: lot.id,
			lotTexte: `${lot.numero ? `${lot.numero} — ` : ''}${lot.designation}`,
			numero: lot.numero,
			designation: lot.designation,
			nature: lot.nature,
			entreprise: lot.artisan?.nom ?? null,
			manques: manquesPourGenerer({
				artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
				maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
			}),
			marche: serie(docsDe(lot.id), empreinteDocument(batirMarche(chantier, lot, parametres, maintenant))),
			avenants: lot.avenants.map((a) => ({
				avenantId: a.id,
				numero: a.numero,
				montantHt: new Decimal(a.montantHt).toFixed(),
				manques: manquesAvenant({ artisanId: lot.artisanId, montantHt: a.montantHt }),
				...serie(docsDe(serieAvenant(a.id)), empreinteDocument(batirAvenant(chantier, lot, a.id, parametres, maintenant))),
			})),
			certificats: acomptesDuLot.map((a, i) => ({
				acompteId: a.id,
				numero: a.numero,
				manuel: a.manuel,
				versions: docsDe(serieCertificat(a.id)).map(resume),
				corrigeable: !a.manuel && i === acomptesDuLot.length - 1,
			})),
			certificatPossible: certificatPossible({
				artisanId: lot.artisanId, htEngage: htEngage(lot.montantHtInitial, sommeAvenants(lot.avenants)),
			}),
			reception: lot.artisan ? {
				...etatReception(dernierPv ? { decision: dernierPv.decision, date: dernierPv.dateReception } : null, leveeLe),
				derniere: pvs[0] ? resume(pvs[0]) : null,
				leveeLe,
			} : null,
			historique: docs
				.filter((d) => d.lotId === lot.id && (d.serie === lot.id || d.serie === serieReception(lot.id) || avenantDeLaSerie(d.serie) !== null))
				.map((d) => {
					if (d.serie === serieReception(lot.id)) return { ...resume(d), libelle: 'PV' };
					const avenantId = avenantDeLaSerie(d.serie);
					if (avenantId === null) return resume(d);
					return { ...resume(d), libelle: `Avenant n° ${numeroLettre.get(d.id)}${actuels.has(avenantId) ? '' : ' · avenant supprimé'}` };
				})
				.sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
		};
		enOrdre.push(ligne);
	}
	return {
		chantierId,
		reference: chantier.reference,
		recap: serie(docsDe(SERIES.RECAPITULATIF), empreinteDocument(batirRecap(chantier, lots, parametres, maintenant))),
		planning: serie(docsDe(SERIES.PLANNING), empreinteDuPlanning),
		visa: serieVisa(docsDe(SERIES.VISA), docsDe(SERIES.PLANNING)),
		comptesRendus: carteComptesRendus(comptesRendus, docsDe),
		lots: enOrdre,
		resume: {
			nombre: docs.length,
			dernierLe: docs.reduce<string | null>((plus, d) => {
				const t = d.creeLe.toISOString();
				return plus === null || t > plus ? t : plus;
			}, null),
		},
	};
}

/** Les versions d'une série (le menu « Version » de l'aperçu), de la plus récente à la plus ancienne. */
export async function versionsDeLaSerie(chantierId: string, serie: string): Promise<VersionResume[]> {
	const docs = await prisma.document.findMany({ where: { chantierId, serie }, orderBy: { version: 'desc' }, select: SELECTION });
	return docs.map(resume);
}

export async function lireDocument(id: string): Promise<{ id: string; chantierId: string; lotId: string | null; version: number; serie: string; type: TypeDocument; donnees: DonneesDocument; nomFichier: string } | null> {
	const d = await prisma.document.findUnique({ where: { id }, select: { id: true, chantierId: true, lotId: true, version: true, serie: true, type: true, donnees: true, nomFichier: true } });
	if (!d) return null;
	return { ...d, donnees: donneesDocumentSchema.parse(d.donnees) };
}
