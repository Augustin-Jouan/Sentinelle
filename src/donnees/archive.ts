import { zipSync, type Zippable } from 'fflate';
import { avenantDeLaSerie } from '@/documents/series';
import { cheminsArchive, dernieresVersions, DOSSIERS_ARCHIVE } from '@/domaine/archive';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierArchive } from '@/domaine/fichiers';
import { dateParis, versIso } from '@/domaine/semaines';
import { prisma } from './prisma';

/** Plafond mémoire du process unique Next (le même qui lance au plus 2 Chromium). */
export const MAX_OCTETS_ARCHIVE = 60 * 1024 * 1024;
export const ARCHIVE_TROP_LOURDE = "L'archive dépasse 60 Mo : contactez l'administrateur pour un export.";

/**
 * « Tout télécharger » (spec § 8) : la dernière version de chaque série, rangée par dossier. Les lettres des avenants
 * supprimés n'y sont pas. Nul : rien à télécharger.
 * PDF stockés sans recompression (niveau 0) ; noms en UTF-8 (fflate pose le drapeau UTF-8 du ZIP).
 */
export async function construireArchive(
	chantierId: string,
	maintenant = new Date(),
	maxOctets = MAX_OCTETS_ARCHIVE,
): Promise<{ zip: Uint8Array; nomFichier: string } | null> {
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
	const ids = fichiers.map((f) => f.id);
	const [{ octets }] = await prisma.$queryRaw<{ octets: bigint }[]>`
		SELECT COALESCE(SUM(octet_length(pdf)), 0)::bigint AS octets FROM "Document" WHERE id = ANY(${ids})`;
	if (octets > BigInt(maxOctets)) throw new ErreurMetier(ARCHIVE_TROP_LOURDE);
	const pdfs = new Map(
		(await prisma.document.findMany({ where: { id: { in: ids } }, select: { id: true, pdf: true } })).map((d) => [d.id, d.pdf]),
	);
	const contenu: Zippable = {};
	for (const f of fichiers) contenu[f.chemin] = new Uint8Array(pdfs.get(f.id) ?? new Uint8Array());
	return { zip: zipSync(contenu, { level: 0 }), nomFichier: nomFichierArchive(chantier.reference, versIso(dateParis(maintenant))) };
}
