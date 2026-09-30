import { ErreurMetier } from '@/domaine/erreurs';
import { manquesPourGenerer, type Manque } from '@/domaine/regles';
import { prisma } from '@/donnees/prisma';
import { batirMarche, batirPlanning, batirRecap, empreinteDocument } from './batir';
import { lireSourcePlanning, lireSources } from './donnees';
import type { TypeDocument } from './libelles';
import { donneesDocumentSchema, type DonneesDocument } from './schemas';
import { SERIES } from './series';

export type EtatSerie = 'a-produire' | 'a-jour' | 'modifie';
/** « Périmé » : le visa fait signer une version du planning qui n'est plus la dernière. */
export type EtatVisa = 'a-produire' | 'a-jour' | 'perime';
export type VersionResume = {
	id: string; version: number; type: TypeDocument;
	creeLe: string; auteur: string; nomFichier: string;
};
export type SerieDocuments = { etat: EtatSerie; versions: VersionResume[] };
export type SerieVisa = { etat: EtatVisa; versions: VersionResume[]; surVersion: number | null; derniereVersionPlanning: number | null };
export type LigneDocuments = { lotId: string; lotTexte: string; manques: Manque[]; marche: SerieDocuments };
export type VueDocuments = {
	chantierId: string; reference: string; recap: SerieDocuments; planning: SerieDocuments; visa: SerieVisa;
	entreprises: { entreprise: string | null; lots: LigneDocuments[] }[];
};

const SELECTION = {
	id: true, serie: true, sourceId: true, version: true, type: true, creeLe: true, nomFichier: true, empreinte: true,
	creePar: { select: { name: true } },
} as const;

type DocLu = {
	id: string; serie: string; sourceId: string | null; version: number; type: TypeDocument; creeLe: Date;
	nomFichier: string; empreinte: string; creePar: { name: string };
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
	const [{ chantier, lots, parametres }, docs, empreinteDuPlanning] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({ where: { chantierId }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
	]);
	const docsDe = (s: string) => docs.filter((d) => d.serie === s);
	const groupes = new Map<string | null, LigneDocuments[]>();
	for (const lot of lots) {
		const cle = lot.artisan?.nom ?? null;
		const ligne: LigneDocuments = {
			lotId: lot.id,
			lotTexte: `${lot.numero ? `${lot.numero} — ` : ''}${lot.designation}`,
			manques: manquesPourGenerer({
				artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
				maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
			}),
			marche: serie(docsDe(lot.id), empreinteDocument(batirMarche(chantier, lot, parametres, maintenant))),
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
