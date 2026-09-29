import { manquesPourGenerer, type Manque } from '@/domaine/regles';
import { prisma } from '@/donnees/prisma';
import { batirMarche, batirRecap, empreinteDocument } from './batir';
import { lireSources } from './donnees';
import { donneesDocumentSchema, type DonneesDocument } from './schemas';

export type EtatSerie = 'a-produire' | 'a-jour' | 'modifie';
export type VersionResume = {
	id: string; version: number; type: 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' | 'RECAPITULATIF';
	creeLe: string; auteur: string; nomFichier: string;
};
export type SerieDocuments = { etat: EtatSerie; versions: VersionResume[] };
export type LigneDocuments = { lotId: string; lotTexte: string; manques: Manque[]; marche: SerieDocuments };
export type VueDocuments = {
	chantierId: string; reference: string; recap: SerieDocuments;
	entreprises: { entreprise: string | null; lots: LigneDocuments[] }[];
};

type DocLu = { id: string; lotId: string | null; version: number; type: VersionResume['type']; creeLe: Date; nomFichier: string; empreinte: string; creePar: { name: string } };

function serie(docs: DocLu[], empreinteActuelle: string): SerieDocuments {
	const versions = docs.map((d) => ({
		id: d.id, version: d.version, type: d.type, creeLe: d.creeLe.toISOString(), auteur: d.creePar.name, nomFichier: d.nomFichier,
	}));
	if (!docs.length) return { etat: 'a-produire', versions };
	return { etat: docs[0].empreinte === empreinteActuelle ? 'a-jour' : 'modifie', versions };
}

/** L'état se calcule en reconstruisant le contenu actuel et en le comparant à la dernière version : rien n'est stocké. */
export async function etatsDocumentsChantier(chantierId: string, maintenant = new Date()): Promise<VueDocuments> {
	const [{ chantier, lots, parametres }, docs] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({
			where: { chantierId },
			orderBy: { version: 'desc' },
			select: { id: true, lotId: true, version: true, type: true, creeLe: true, nomFichier: true, empreinte: true, creePar: { select: { name: true } } },
		}),
	]);
	const docsDe = (lotId: string | null) => docs.filter((d) => d.lotId === lotId);
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
		recap: serie(docsDe(null), empreinteDocument(batirRecap(chantier, lots, parametres, maintenant))),
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
