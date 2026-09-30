import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierMarche, nomFichierPlanning, nomFichierRecap, nomFichierVisa } from '@/domaine/fichiers';
import { LIBELLES_MANQUES, manquesPourGenerer } from '@/domaine/regles';
import { prisma } from '@/donnees/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { empreinteDocument } from './batir';
import { construireDonneesMarche, construireDonneesPlanning, construireDonneesRecap, construireDonneesVisa, lireSources } from './donnees';
import { htmlVersPdf, type RendrePdf } from './pdf';
import { rendreHtml } from './rendu';
import type { DonneesDocument } from './schemas';
import { SERIES } from './series';

export type ResultatGeneration = { documentId: string; version: number; nomFichier: string; nouvelle: boolean };
type Dependances = { maintenant?: Date; rendrePdf?: RendrePdf };

const imprimerParDefaut: RendrePdf = (html) => htmlVersPdf(html, { paysage: true });

/** Planning et visa : A4 paysage, toujours une seule page (échelle mesurée, refus sous 0,4). */
const imprimerUneFeuille: RendrePdf = (html) => htmlVersPdf(html, { paysage: true, uneSeuleFeuille: true });

/**
 * construire (fait par l'appelant) → empreinte → PDF hors transaction → contrôle de fraîcheur → insertion sous verrou.
 * L'objet enregistré est exactement celui qui a produit le PDF.
 */
async function enregistrerVersion(p: {
	chantierId: string;
	lotId: string | null;
	/** Id du lot pour un marché, sinon une valeur de SERIES. */
	serie: string;
	/** Pour un visa : la version du planning source. */
	sourceId?: string | null;
	donnees: DonneesDocument;
	nomFichier: (version: number) => string;
	utilisateurId: string;
	rendrePdf: RendrePdf;
	/** Relit la base et recalcule l'empreinte, pour comparaison seulement : rien n'est enregistré de cet objet. */
	empreinteActuelle: () => Promise<string>;
}): Promise<ResultatGeneration> {
	const serie = { chantierId: p.chantierId, serie: p.serie };
	const emp = empreinteDocument(p.donnees);
	const derniere = await prisma.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
	if (derniere?.empreinte === emp) {
		return { documentId: derniere.id, version: derniere.version, nomFichier: derniere.nomFichier, nouvelle: false };
	}

	let pdf: Uint8Array;
	try {
		pdf = await p.rendrePdf(await rendreHtml(p.donnees));
	} catch (e) {
		if (e instanceof ErreurMetier) throw e;
		// Ni HTML, ni montant, ni nom de client dans le journal.
		console.error('[pdf] échec de génération', { type: p.donnees.type, erreur: e instanceof Error ? e.name : typeof e });
		throw new ErreurMetier("La génération du PDF a échoué. Réessayez ; si le problème persiste, prévenez l'administrateur.");
	}

	// Données modifiées pendant le rendu : ce PDF est déjà périmé, il ne doit pas devenir la dernière version.
	// Le verrou ne protège pas de ce cas (les saisies ne le prennent pas), d'où la relecture ici.
	if ((await p.empreinteActuelle()) !== emp) {
		throw new ErreurMetier('Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour.');
	}

	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.chantierId}), hashtext(${p.serie}))`;
		const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
		if (courante?.empreinte === emp) {
			return { documentId: courante.id, version: courante.version, nomFichier: courante.nomFichier, nouvelle: false };
		}
		const version = (courante?.version ?? 0) + 1;
		const nomFichier = p.nomFichier(version);
		const cree = await tx.document.create({
			data: {
				...serie, lotId: p.lotId, sourceId: p.sourceId ?? null, type: p.donnees.type, version,
				donnees: p.donnees as unknown as Prisma.InputJsonValue, empreinte: emp, pdf: new Uint8Array(pdf), nomFichier, creeParId: p.utilisateurId,
			},
		});
		return { documentId: cree.id, version, nomFichier, nouvelle: true };
	});
}

export async function genererMarche(lotId: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const maintenant = deps.maintenant ?? new Date();
	const { chantierId, chantier, lot, donnees } = await construireDonneesMarche(lotId, maintenant);
	const manques = manquesPourGenerer({
		artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
		maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
	});
	if (manques.length) {
		throw new ErreurMetier(`Impossible de générer le marché : ${manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.`);
	}
	return enregistrerVersion({
		chantierId, lotId, serie: lotId, donnees, utilisateurId, rendrePdf: deps.rendrePdf ?? imprimerParDefaut,
		empreinteActuelle: async () => empreinteDocument((await construireDonneesMarche(lotId, maintenant)).donnees),
		nomFichier: (version) => nomFichierMarche({
			reference: chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature, version,
		}),
	});
}

export async function genererRecap(chantierId: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const maintenant = deps.maintenant ?? new Date();
	const { chantier, donnees } = await construireDonneesRecap(chantierId, maintenant);
	return enregistrerVersion({
		chantierId, lotId: null, serie: SERIES.RECAPITULATIF, donnees, utilisateurId, rendrePdf: deps.rendrePdf ?? imprimerParDefaut,
		empreinteActuelle: async () => empreinteDocument((await construireDonneesRecap(chantierId, maintenant)).donnees),
		nomFichier: (version) => nomFichierRecap(chantier.reference, version),
	});
}

export async function genererPlanning(chantierId: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const maintenant = deps.maintenant ?? new Date();
	const { chantier, donnees } = await construireDonneesPlanning(chantierId, maintenant);
	return enregistrerVersion({
		chantierId, lotId: null, serie: SERIES.PLANNING, donnees, utilisateurId, rendrePdf: deps.rendrePdf ?? imprimerUneFeuille,
		empreinteActuelle: async () => empreinteDocument((await construireDonneesPlanning(chantierId, maintenant)).donnees),
		nomFichier: (version) => nomFichierPlanning(chantier.reference, version),
	});
}

/** Le visa porte sur la dernière version générée du planning ; s'il en paraît une pendant le rendu, il est abandonné. */
export async function genererVisa(chantierId: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const maintenant = deps.maintenant ?? new Date();
	const { chantier, source, donnees } = await construireDonneesVisa(chantierId, maintenant);
	return enregistrerVersion({
		chantierId, lotId: null, serie: SERIES.VISA, sourceId: source.id, donnees, utilisateurId,
		rendrePdf: deps.rendrePdf ?? imprimerUneFeuille,
		empreinteActuelle: async () => empreinteDocument((await construireDonneesVisa(chantierId, maintenant)).donnees),
		nomFichier: (version) => nomFichierVisa(chantier.reference, version),
	});
}

/** L'un après l'autre : jamais plus d'une génération à la fois pour cette action. */
export async function genererMarchesManquants(chantierId: string, utilisateurId: string, deps: Dependances = {}) {
	const { chantier, lots } = await lireSources(chantierId);
	// Un marché généré est un document dont la série est l'id du lot : avenants et certificats portent aussi `lotId`.
	const dejaGeneres = new Set(
		(await prisma.document.findMany({ where: { chantierId, serie: { in: lots.map((l) => l.id) } }, select: { serie: true }, distinct: ['serie'] }))
			.map((d) => d.serie),
	);
	const generes: string[] = [];
	const ignores: { lot: string; raison: string }[] = [];
	for (const lot of lots) {
		if (dejaGeneres.has(lot.id)) continue;
		const libelle = lot.numero ? `Lot ${lot.numero}` : lot.designation;
		const manques = manquesPourGenerer({
			artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
			maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
		});
		if (manques.length) {
			ignores.push({ lot: libelle, raison: manques.map((m) => LIBELLES_MANQUES[m]).join(', ') });
			continue;
		}
		await genererMarche(lot.id, utilisateurId, deps);
		generes.push(libelle);
	}
	return { generes, ignores };
}
