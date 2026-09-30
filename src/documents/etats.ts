import { manquesAvenant, sommeAvenants, type ManqueAvenant } from '@/domaine/avenants';
import { certificatPossible } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { htEngage } from '@/domaine/montants';
import { manquesPourGenerer, type Manque } from '@/domaine/regles';
import { prisma } from '@/donnees/prisma';
import { batirAvenant, batirMarche, batirPlanning, batirRecap, empreinteDocument } from './batir';
import { lireSourcePlanning, lireSources } from './donnees';
import type { TypeDocument } from './libelles';
import { donneesDocumentSchema, type DonneesDocument } from './schemas';
import { avenantDeLaSerie, serieAvenant, serieCertificat, SERIES } from './series';

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
export type CaseAvenant = { avenantId: string; numero: number; etat: EtatSerie; versions: VersionResume[]; manques: ManqueAvenant[] };
/** Pas d'état : un certificat est un acte de paiement, figé tel qu'émis ; seule sa correction crée une version (spec § 6). */
export type CaseCertificat = { acompteId: string; numero: number; manuel: boolean; versions: VersionResume[]; corrigeable: boolean };
export type LigneDocuments = {
	lotId: string; lotTexte: string; manques: Manque[]; marche: SerieDocuments;
	avenants: CaseAvenant[]; certificats: CaseCertificat[]; certificatPossible: boolean;
	/** Versions du marché et des lettres d'avenants (supprimés compris), de la plus récente à la plus ancienne. */
	historique: VersionResume[];
};
export type VueDocuments = {
	chantierId: string; reference: string; recap: SerieDocuments; planning: SerieDocuments; visa: SerieVisa;
	entreprises: { entreprise: string | null; lots: LigneDocuments[] }[];
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

/** L'état se calcule en reconstruisant le contenu actuel et en le comparant à la dernière version : rien n'est stocké. */
export async function etatsDocumentsChantier(chantierId: string, maintenant = new Date()): Promise<VueDocuments> {
	const [{ chantier, lots, parametres }, docs, empreinteDuPlanning, acomptes, lettres] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({ where: { chantierId }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
		prisma.acompte.findMany({ where: { lot: { chantierId } }, orderBy: { numero: 'asc' }, select: { id: true, lotId: true, numero: true, manuel: true } }),
		// Le numéro imprimé d'une lettre survit à son avenant : il sert à l'historique des avenants supprimés.
		prisma.document.findMany({ where: { chantierId, type: 'AVENANT' }, select: { id: true, donnees: true } }),
	]);
	const numeroLettre = new Map(lettres.map((d) => [d.id, (d.donnees as { contenu?: { numero?: string } }).contenu?.numero ?? '?']));
	const docsDe = (s: string) => docs.filter((d) => d.serie === s);
	const groupes = new Map<string | null, LigneDocuments[]>();
	for (const lot of lots) {
		const cle = lot.artisan?.nom ?? null;
		const actuels = new Set(lot.avenants.map((a) => a.id));
		const acomptesDuLot = acomptes.filter((a) => a.lotId === lot.id);
		const ligne: LigneDocuments = {
			lotId: lot.id,
			lotTexte: `${lot.numero ? `${lot.numero} — ` : ''}${lot.designation}`,
			manques: manquesPourGenerer({
				artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
				maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
			}),
			marche: serie(docsDe(lot.id), empreinteDocument(batirMarche(chantier, lot, parametres, maintenant))),
			avenants: lot.avenants.map((a) => ({
				avenantId: a.id,
				numero: a.numero,
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
			historique: docs
				.filter((d) => d.lotId === lot.id && (d.serie === lot.id || avenantDeLaSerie(d.serie) !== null))
				.map((d) => {
					const avenantId = avenantDeLaSerie(d.serie);
					if (avenantId === null) return resume(d);
					return { ...resume(d), libelle: `Avenant n° ${numeroLettre.get(d.id)}${actuels.has(avenantId) ? '' : ' · avenant supprimé'}` };
				})
				.sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
		};
		groupes.set(cle, [...(groupes.get(cle) ?? []), ligne]);
	}
	return {
		chantierId,
		reference: chantier.reference,
		recap: serie(docsDe(SERIES.RECAPITULATIF), empreinteDocument(batirRecap(chantier, lots, parametres, maintenant))),
		planning: serie(docsDe(SERIES.PLANNING), empreinteDuPlanning),
		visa: serieVisa(docsDe(SERIES.VISA), docsDe(SERIES.PLANNING)),
		entreprises: [...groupes.entries()]
			.sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b, 'fr')))
			.map(([entreprise, l]) => ({ entreprise, lots: l })),
	};
}

export async function lireDocument(id: string): Promise<{ id: string; chantierId: string; lotId: string | null; version: number; donnees: DonneesDocument; nomFichier: string } | null> {
	const d = await prisma.document.findUnique({ where: { id }, select: { id: true, chantierId: true, lotId: true, version: true, donnees: true, nomFichier: true } });
	if (!d) return null;
	return { ...d, donnees: donneesDocumentSchema.parse(d.donnees) };
}
