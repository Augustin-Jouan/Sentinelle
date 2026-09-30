import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { batirCompteRendu, type SaisiesCompteRendu, type SourceCompteRendu } from '@/documents/compteRendu';
import { DONNEES_CHANGEES, imprimerPortrait, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import type { DonneesCompteRendu } from '@/documents/schemas';
import { serieCompteRendu } from '@/documents/series';
import { verifierDate } from '@/domaine/certificats';
import {
	BROUILLON_DISPARU, compteRenduVide, CONVOCATIONS, convocationSuivante, coordinationBase, CR_INTROUVABLE, CR_VIDE, DERNIER_CR_SEUL,
	HEURE_INVALIDE, HEURE_SANS_DATE, HEURE_VALIDE, LIMITES_CR, MESSAGES_LONGUEUR_CR, numeroPris, numeroSuivant,
	type ChampCompteRendu, type Convocation,
} from '@/domaine/compteRendu';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierCompteRendu } from '@/domaine/fichiers';
import { dateParis, depuisIso } from '@/domaine/semaines';
import type { CompteRendu, Prisma } from '@/generated/prisma/client';
import { versDateCalendaire, versSaisieDate } from './chantiers';
import { estDoublon } from './erreursPrisma';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import { sousVerrouChantier, type Tx } from './verrouLot';

export const convocationsSchema = z.record(z.string(), z.enum(CONVOCATIONS));

/** Les saisies de la feuille telles que l'aperçu les envoie en correction ; le serveur les revérifie (`verifierSaisies`). */
export const saisiesCompteRenduSchema = z.object({
	date: z.string().max(10),
	rdvDate: z.string().max(10),
	rdvHeure: z.string().max(5),
	avancement: z.string().max(LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement),
	coordination: z.string().max(LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination),
	redacteur: z.string().max(LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court),
	portable: z.string().max(LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court),
	convocations: convocationsSchema,
});

export type ModeCompteRendu = 'brouillon' | 'lecture' | 'correction';

/** Ce que l'aperçu du compte rendu reçoit (Task 8). */
export type CompteRenduOuvert = {
	id: string;
	chantierId: string;
	numero: number;
	mode: ModeCompteRendu;
	/** Lots, entreprises et en-tête du moment (brouillon et correction). */
	source: SourceCompteRendu;
	saisies: SaisiesCompteRendu;
	/** Lecture : la feuille figée de la dernière version. */
	fige: DonneesCompteRendu | null;
	derniere: { documentId: string; version: number } | null;
	/** Le compte rendu enregistré de plus grand numéro : lui seul se corrige. */
	dernier: boolean;
	blocage: string | null;
};

const INTROUVABLE = 'Chantier introuvable.';
const jsonDe = (d: DonneesCompteRendu) => d as unknown as Prisma.InputJsonValue;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou. Lots dans l'ordre de saisie. */
async function lireSource(client: Tx, chantierId: string, numero: number): Promise<SourceCompteRendu> {
	const c = await client.chantier.findUnique({
		where: { id: chantierId },
		include: { lots: { orderBy: { ordre: 'asc' }, include: { artisan: { select: { nom: true, interlocuteur: true, telephone: true } } } } },
	});
	if (!c) throw new ErreurMetier(INTROUVABLE);
	const p = (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT;
	return {
		numero,
		chantier: { maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune },
		lots: c.lots.map((l) => ({
			id: l.id, designation: l.designation, entreprise: l.artisan?.nom ?? null,
			interlocuteur: l.artisan?.interlocuteur ?? '', telephone: l.artisan?.telephone ?? '',
		})),
		societe: { adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email, siteWeb: p.siteWeb },
	};
}

function saisiesDe(cr: CompteRendu): SaisiesCompteRendu {
	const convocations = convocationsSchema.safeParse(cr.convocations);
	return {
		date: versSaisieDate(cr.date), rdvDate: versSaisieDate(cr.rdvDate), rdvHeure: cr.rdvHeure ?? '',
		avancement: cr.avancement, coordination: cr.coordination, redacteur: cr.redacteur, portable: cr.portable,
		convocations: convocations.success ? convocations.data : {},
	};
}

function verifierLongueur(valeur: string, max: number, message: string, champ: string): string {
	if (valeur.length > max) throw new ErreurMetier(message, champ);
	return valeur;
}

const verifierCourt = (valeur: string, champ: string) => verifierLongueur(valeur.trim(), LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court, champ);

/** '' : pas d'heure. La base refuse de même une heure mal formée ou sans date (CHECK). */
function verifierHeure(heure: string, avecDate: boolean): string {
	const h = heure.trim();
	if (!h) return '';
	if (!HEURE_VALIDE.test(h)) throw new ErreurMetier(HEURE_INVALIDE, 'rdvHeure');
	if (!avecDate) throw new ErreurMetier(HEURE_SANS_DATE, 'rdvHeure');
	return h;
}

function verifierSaisies(s: SaisiesCompteRendu): SaisiesCompteRendu {
	verifierDate(s.date);
	const rdvDate = s.rdvDate.trim();
	versDateCalendaire(rdvDate);
	return {
		date: s.date,
		rdvDate,
		rdvHeure: verifierHeure(s.rdvHeure, rdvDate !== ''),
		avancement: verifierLongueur(s.avancement, LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement, 'avancement'),
		coordination: verifierLongueur(s.coordination, LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination, 'coordination'),
		redacteur: verifierCourt(s.redacteur, 'redacteur'),
		portable: verifierCourt(s.portable, 'portable'),
		convocations: convocationsSchema.parse(s.convocations),
	};
}

/** Ce qu'un champ saisi écrit dans la ligne. Vider la date du rendez-vous efface aussi son heure. */
function donneesChamp(cr: CompteRendu, champ: ChampCompteRendu, valeur: string): Prisma.CompteRenduUpdateInput {
	switch (champ) {
		case 'date':
			return { date: depuisIso(verifierDate(valeur.trim())) };
		case 'rdvDate': {
			const d = versDateCalendaire(valeur);
			return d ? { rdvDate: d } : { rdvDate: null, rdvHeure: null };
		}
		case 'rdvHeure':
			return { rdvHeure: verifierHeure(valeur, cr.rdvDate !== null) || null };
		case 'avancement':
			return { avancement: verifierLongueur(valeur, LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement, champ) };
		case 'coordination':
			return { coordination: verifierLongueur(valeur, LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination, champ) };
		case 'redacteur':
			return { redacteur: verifierCourt(valeur, champ) };
		case 'portable':
			return { portable: verifierCourt(valeur, champ) };
	}
}

/** `SELECT … FOR NO KEY UPDATE` sur la ligne du brouillon ; enregistré ou abandonné entre-temps : « Ce brouillon n'existe plus. » */
async function verrouillerBrouillon(tx: Tx, id: string): Promise<CompteRendu> {
	const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "CompteRendu" WHERE id = ${id} AND statut = 'BROUILLON' FOR NO KEY UPDATE`;
	if (!verrou.length) throw new ErreurMetier(BROUILLON_DISPARU);
	return tx.compteRendu.findUniqueOrThrow({ where: { id } });
}

function sousVerrouBrouillon<T>(id: string, operation: (tx: Tx, cr: CompteRendu) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => operation(tx, await verrouillerBrouillon(tx, id)));
}

async function estDernier(client: Tx, chantierId: string, numero: number): Promise<boolean> {
	return !(await client.compteRendu.findFirst({ where: { chantierId, statut: 'ENREGISTRE', numero: { gt: numero } }, select: { id: true } }));
}

const BROUILLON = { chantierId: true, id: true, numero: true } as const;

/**
 * Le brouillon du chantier, créé s'il n'existe pas, depuis le dernier enregistré (spec § 5).
 * Deux créations simultanées visent le même numéro : l'unicité (chantier, numéro) refuse la seconde, qui ouvre la première.
 */
export async function creerBrouillon(chantierId: string, maintenant = new Date()): Promise<{ id: string; numero: number }> {
	return sousVerrouChantier(chantierId, async (tx) => {
		const existant = await tx.compteRendu.findFirst({ where: { chantierId, statut: 'BROUILLON' }, select: BROUILLON });
		if (existant) return existant;
		const chantier = await tx.chantier.findUnique({
			where: { id: chantierId },
			include: { chargeAffaire: { select: { name: true, telephone: true } }, lots: { orderBy: { ordre: 'asc' }, select: { id: true, designation: true } } },
		});
		if (!chantier) throw new ErreurMetier(INTROUVABLE);
		const lots = new Set(chantier.lots.map((l) => l.id));
		for (let essai = 0; essai < 3; essai++) {
			const precedent = await tx.compteRendu.findFirst({ where: { chantierId, statut: 'ENREGISTRE' }, orderBy: { numero: 'desc' } });
			const convocations = precedent ? Object.fromEntries(Object.entries(saisiesDe(precedent).convocations).filter(([lotId]) => lots.has(lotId))) : {};
			const numero = numeroSuivant(precedent ? [precedent.numero] : []);
			try {
				return await tx.compteRendu.create({
					data: {
						chantierId, numero, date: dateParis(maintenant),
						coordination: precedent?.coordination ?? coordinationBase(chantier.lots.map((l) => l.designation)),
						convocations, redacteur: chantier.chargeAffaire.name, portable: chantier.chargeAffaire.telephone ?? '',
					},
					select: BROUILLON,
				});
			} catch (e) {
				if (!estDoublon(e)) throw e;
				const gagnant = await tx.compteRendu.findFirst({ where: { chantierId, statut: 'BROUILLON' }, select: BROUILLON });
				if (gagnant) return gagnant;
			}
		}
		throw new ErreurMetier(numeroPris(numeroSuivant([])));
	});
}

export async function lireBrouillon(chantierId: string): Promise<CompteRenduOuvert | null> {
	const cr = await prisma.compteRendu.findFirst({ where: { chantierId, statut: 'BROUILLON' } });
	if (!cr) return null;
	return {
		id: cr.id, chantierId, numero: cr.numero, mode: 'brouillon', source: await lireSource(prisma, chantierId, cr.numero),
		saisies: saisiesDe(cr), fige: null, derniere: null, dernier: false, blocage: null,
	};
}

/** Un compte rendu enregistré de CE chantier, sinon nul (lien périmé ou d'un autre chantier). Correction d'un plus ancien : lecture seule. */
export async function ouvrirCompteRendu(id: string, chantierId: string, mode: 'lecture' | 'correction'): Promise<CompteRenduOuvert | null> {
	const cr = await prisma.compteRendu.findFirst({ where: { id, chantierId, statut: 'ENREGISTRE' } });
	if (!cr) return null;
	const doc = await prisma.document.findFirst({
		where: { chantierId, serie: serieCompteRendu(id) }, orderBy: { version: 'desc' }, select: { id: true, version: true, donnees: true },
	});
	const dernier = await estDernier(prisma, chantierId, cr.numero);
	const corrigeable = mode === 'correction' && dernier;
	return {
		id, chantierId, numero: cr.numero, mode: corrigeable ? 'correction' : 'lecture',
		source: await lireSource(prisma, chantierId, cr.numero), saisies: saisiesDe(cr),
		fige: doc ? (doc.donnees as unknown as DonneesCompteRendu) : null,
		derniere: doc ? { documentId: doc.id, version: doc.version } : null,
		dernier,
		blocage: mode === 'correction' && !dernier ? DERNIER_CR_SEUL : null,
	};
}

export async function modifierChampCompteRendu(id: string, champ: ChampCompteRendu, valeur: string): Promise<void> {
	await sousVerrouBrouillon(id, async (tx, cr) => {
		await tx.compteRendu.update({ where: { id }, data: donneesChamp(cr, champ, valeur) });
	});
}

/** Relit les convocations sous verrou et ne change que ce lot : deux clics simultanés sur deux lots sont gardés. */
export async function changerConvocation(id: string, lotId: string): Promise<Record<string, Convocation>> {
	return sousVerrouBrouillon(id, async (tx, cr) => {
		if (!(await tx.lot.findFirst({ where: { id: lotId, chantierId: cr.chantierId }, select: { id: true } }))) throw new ErreurMetier('Lot introuvable.');
		const convocations = saisiesDe(cr).convocations;
		const suivantes = { ...convocations, [lotId]: convocationSuivante(convocations[lotId]) };
		await tx.compteRendu.update({ where: { id }, data: { convocations: suivantes } });
		return suivantes;
	});
}

export async function abandonnerBrouillon(id: string): Promise<{ chantierId: string }> {
	return sousVerrouBrouillon(id, async (tx, cr) => {
		await tx.compteRendu.delete({ where: { id } });
		return { chantierId: cr.chantierId };
	});
}

/** Contrôles puis feuille : exactement ce que le PDF imprimera. */
async function construire(client: Tx, cr: { chantierId: string; numero: number }, saisies: SaisiesCompteRendu): Promise<DonneesCompteRendu> {
	const s = verifierSaisies(saisies);
	if (compteRenduVide(s.avancement, s.coordination)) throw new ErreurMetier(CR_VIDE);
	return batirCompteRendu(await lireSource(client, cr.chantierId, cr.numero), s);
}

async function creerVersion(tx: Tx, p: {
	cr: { id: string; chantierId: string; numero: number }; version: number; donnees: DonneesCompteRendu; empreinte: string; pdf: Uint8Array; utilisateurId: string;
}): Promise<ResultatGeneration> {
	const { reference } = await tx.chantier.findUniqueOrThrow({ where: { id: p.cr.chantierId }, select: { reference: true } });
	const nomFichier = nomFichierCompteRendu(reference, p.cr.numero, p.version);
	const doc = await tx.document.create({
		data: {
			chantierId: p.cr.chantierId, lotId: null, serie: serieCompteRendu(p.cr.id), type: 'COMPTE_RENDU', version: p.version,
			donnees: jsonDe(p.donnees), empreinte: p.empreinte, pdf: new Uint8Array(p.pdf), nomFichier, creeParId: p.utilisateurId,
		},
	});
	return { documentId: doc.id, version: p.version, nomFichier, nouvelle: true };
}

/** Lecture → PDF hors transaction → sous verrou du chantier : brouillon relu, empreinte refaite, statut, version 1. */
export async function enregistrerCompteRendu(id: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration & { chantierId: string; numero: number }> {
	const brouillon = await prisma.compteRendu.findFirst({ where: { id, statut: 'BROUILLON' } });
	if (!brouillon) throw new ErreurMetier(BROUILLON_DISPARU);
	const donnees = await construire(prisma, brouillon, saisiesDe(brouillon));
	const empreinte = empreinteDocument(donnees);
	const pdf = await rendrePdfDocument(donnees, deps.rendrePdf ?? imprimerPortrait);
	// Enregistrement et correction : `FOR NO KEY UPDATE` sur le chantier d'abord, puis sur le compte rendu (spec § 2, « Verrous »).
	return sousVerrouChantier(brouillon.chantierId, async (tx) => {
		const cr = await verrouillerBrouillon(tx, id);
		if (empreinteDocument(await construire(tx, cr, saisiesDe(cr))) !== empreinte) throw new ErreurMetier(DONNEES_CHANGEES);
		// Numéro : le brouillon le détient, l'unicité (chantier, numéro) interdit à toute autre ligne de le prendre.
		await tx.compteRendu.update({ where: { id }, data: { statut: 'ENREGISTRE' } });
		const r = await creerVersion(tx, { cr, version: 1, donnees, empreinte, pdf, utilisateurId });
		return { ...r, chantierId: cr.chantierId, numero: cr.numero };
	});
}

/** Correction du dernier enregistré : même numéro, version suivante ; empreinte inchangée, aucune (règle du Socle). */
export async function corrigerCompteRendu(id: string, saisies: SaisiesCompteRendu, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration & { chantierId: string }> {
	const cr = await prisma.compteRendu.findFirst({ where: { id, statut: 'ENREGISTRE' }, select: BROUILLON });
	if (!cr) throw new ErreurMetier(CR_INTROUVABLE);
	const s = verifierSaisies(saisies);
	const preparer = async (client: Tx) => {
		if (!(await estDernier(client, cr.chantierId, cr.numero))) throw new ErreurMetier(DERNIER_CR_SEUL);
		return construire(client, cr, s);
	};
	const donnees = await preparer(prisma);
	const empreinte = empreinteDocument(donnees);
	const serie = { chantierId: cr.chantierId, serie: serieCompteRendu(id) };
	const identique = (d: { id: string; version: number; nomFichier: string; empreinte: string } | null) =>
		d?.empreinte === empreinte ? { documentId: d.id, version: d.version, nomFichier: d.nomFichier, nouvelle: false, chantierId: cr.chantierId } : null;
	const dejaLa = identique(await prisma.document.findFirst({ where: serie, orderBy: { version: 'desc' } }));
	if (dejaLa) return dejaLa;
	const pdf = await rendrePdfDocument(donnees, deps.rendrePdf ?? imprimerPortrait);
	return sousVerrouChantier(cr.chantierId, async (tx) => {
		await tx.$queryRaw`SELECT id FROM "CompteRendu" WHERE id = ${id} FOR NO KEY UPDATE`;
		if (empreinteDocument(await preparer(tx)) !== empreinte) throw new ErreurMetier(DONNEES_CHANGEES);
		const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
		const memeVersion = identique(courante);
		if (memeVersion) return memeVersion;
		await tx.compteRendu.update({
			where: { id },
			data: {
				date: depuisIso(s.date), rdvDate: versDateCalendaire(s.rdvDate), rdvHeure: s.rdvHeure || null,
				avancement: s.avancement, coordination: s.coordination, redacteur: s.redacteur, portable: s.portable, convocations: s.convocations,
			},
		});
		const r = await creerVersion(tx, { cr, version: (courante?.version ?? 0) + 1, donnees, empreinte, pdf, utilisateurId });
		return { ...r, chantierId: cr.chantierId };
	});
}
