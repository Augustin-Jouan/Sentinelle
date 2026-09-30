import { zipSync, type Zippable } from 'fflate';
import { construireDonneesRecap } from '@/documents/donnees';
import { avenantDeLaSerie } from '@/documents/series';
import { recapVersXlsx } from '@/documents/tableur';
import { cheminsArchive, dernieresVersions, DOSSIERS_ARCHIVE } from '@/domaine/archive';
import { nomFichierArchive, nomFichierTableur } from '@/domaine/fichiers';
import { dateParis, versIso } from '@/domaine/semaines';
import { prisma } from './prisma';

/**
 * « Tout télécharger » (spec § 8) : la dernière version de chaque série, rangée par dossier, plus le tableur du
 * récapitulatif produit à la volée. Les lettres des avenants supprimés n'y sont pas. Nul : rien à télécharger.
 * PDF stockés sans recompression (niveau 0) ; noms en UTF-8 (fflate pose le drapeau UTF-8 du ZIP).
 */
export async function construireArchive(chantierId: string, maintenant = new Date()): Promise<{ zip: Uint8Array; nomFichier: string } | null> {
	const chantier = await prisma.chantier.findUnique({
		where: { id: chantierId },
		select: { reference: true, lots: { select: { avenants: { select: { id: true } } } } },
	});
	if (!chantier) return null;
	const docs = await prisma.document.findMany({ where: { chantierId }, select: { id: true, serie: true, version: true, type: true, nomFichier: true } });
	if (!docs.length) return null;
	const avenants = new Set(chantier.lots.flatMap((l) => l.avenants.map((a) => a.id)));
	const retenus = dernieresVersions(docs).filter((d) => {
		const avenantId = avenantDeLaSerie(d.serie);
		return avenantId === null || avenants.has(avenantId);
	});
	const fichiers = cheminsArchive(retenus.map((d) => ({ id: d.id, dossier: DOSSIERS_ARCHIVE[d.type], nom: d.nomFichier })));
	const pdfs = new Map(
		(await prisma.document.findMany({ where: { id: { in: fichiers.map((f) => f.id) } }, select: { id: true, pdf: true } })).map((d) => [d.id, d.pdf]),
	);
	const contenu: Zippable = {};
	for (const f of fichiers) contenu[f.chemin] = new Uint8Array(pdfs.get(f.id) ?? new Uint8Array());
	const { donnees } = await construireDonneesRecap(chantierId, maintenant);
	contenu[nomFichierTableur(chantier.reference)] = new Uint8Array(await recapVersXlsx(donnees));
	return { zip: zipSync(contenu, { level: 0 }), nomFichier: nomFichierArchive(chantier.reference, versIso(dateParis(maintenant))) };
}
