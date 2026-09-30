import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { batirCertificat, entreeCalcul, type SaisieCertificat, type SourceCertificat } from '@/documents/certificat';
import { DONNEES_CHANGEES, imprimerCertificat, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import type { DonneesCertificat } from '@/documents/schemas';
import { serieCertificat } from '@/documents/series';
import { sommeAvenants } from '@/domaine/avenants';
import {
	ACOMPTE_DISPARU, AUTRE_CERTIFICAT, calculerCertificat, CERTIFICAT_IMPOSSIBLE, CERTIFICATS_EXISTENT, certificatPossible,
	controlerCertificat, DERNIER_SEUL, lireCumul, lireMontantAcompte, MOIS_VALIDE, verifierDate, verifierMois, type CalculCertificat,
} from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierCertificat } from '@/domaine/fichiers';
import { formatMontantSaisie, htEngage } from '@/domaine/montants';
import { dateParis, versIso } from '@/domaine/semaines';
import type { Parametres, Prisma } from '@/generated/prisma/client';
import { versSaisieDate } from './chantiers';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import { sousVerrouLot, type LotVerrouille, type Tx } from './verrouLot';

/** Les saisies de la feuille, en texte, telles que l'écran les envoie : le serveur recalcule tout (spec § 3). */
export const saisiesCertificatSchema = z.object({
	cumul: z.string().max(40),
	mois: z.string().regex(MOIS_VALIDE, 'Mois : choisissez un mois.'),
	date: z.string().max(10),
});
export type SaisiesCertificat = z.infer<typeof saisiesCertificatSchema>;

/** Ce que l'aperçu du certificat reçoit (Task 8). */
export type CertificatOuvert = {
	lotId: string;
	chantierId: string;
	source: SourceCertificat;
	/** Nouveau : mois et jour courants à Châteaubriant ; correction : les saisies du certificat. */
	saisies: SaisiesCertificat;
	/** Nul pour un nouveau certificat. */
	acompteId: string | null;
	/** Correction : la dernière version de sa série (« Générer la v2 »). */
	derniereVersion: number | null;
	/** Acomptes antérieurs saisissables (lot sans certificat), en texte de saisie ; sinon nul. */
	acomptesManuels: { id: string; saisie: string }[] | null;
	/** Ce qui empêche de générer, ou nul. */
	blocage: string | null;
};

const LOT_CERTIFICAT = {
	chantier: true,
	artisan: { select: { nom: true } },
	avenants: { orderBy: { numero: 'asc' as const }, select: { numero: true, montantHt: true } },
	acomptes: { orderBy: { numero: 'asc' as const } },
} satisfies Prisma.LotInclude;
type LotCertificat = Prisma.LotGetPayload<{ include: typeof LOT_CERTIFICAT }>;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou du lot. */
async function lireLot(lotId: string, client: Tx): Promise<{ lot: LotCertificat; parametres: Parametres }> {
	const lot = await client.lot.findUnique({ where: { id: lotId }, include: LOT_CERTIFICAT });
	if (!lot) throw new ErreurMetier('Lot introuvable.');
	return { lot, parametres: (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT };
}

function possible(lot: LotCertificat): boolean {
	const avenants = lot.avenants.map((a) => ({ montantHt: a.montantHt.toString() }));
	return certificatPossible({ artisanId: lot.artisanId, htEngage: htEngage(lot.montantHtInitial.toString(), sommeAvenants(avenants)) });
}

/** Le certificat n° `numero` : les acomptes de numéro inférieur sont ses « acomptes précédents ». */
function sourceCertificat(lot: LotCertificat, p: Parametres, numero: number): SourceCertificat {
	const c = lot.chantier;
	return {
		numero,
		chantier: { maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune },
		lot: {
			numero: lot.numero, designation: lot.designation, entreprise: lot.artisan?.nom ?? null,
			htInitial: lot.montantHtInitial.toString(), tauxTva: lot.tauxTva.toString(), tauxRetenue: lot.retenueGarantie.toString(),
			caution: lot.cautionBancaire,
		},
		avenants: lot.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt.toString() })),
		precedents: lot.acomptes
			.filter((a) => a.numero < numero)
			.map((a) => ({ id: a.id, numero: a.numero, montantHt: a.montantHt.toString(), manuel: a.manuel })),
		societe: {
			adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email,
			rcs: p.rcs, ape: p.ape, tvaIntracommunautaire: p.tvaIntracommunautaire, villeSignature: p.villeSignature,
		},
	};
}

function lireSaisies(s: SaisiesCertificat): SaisieCertificat & { cumul: NonNullable<SaisieCertificat['cumul']> } {
	return { cumul: lireCumul(s.cumul), mois: verifierMois(s.mois), date: verifierDate(s.date) };
}

/** Calcul contrôlé (présent acompte positif) puis feuille : exactement ce que le PDF imprimera. */
function construire(lot: LotCertificat, p: Parametres, numero: number, saisie: ReturnType<typeof lireSaisies>): { calcul: CalculCertificat; donnees: DonneesCertificat } {
	const source = sourceCertificat(lot, p, numero);
	const calcul = calculerCertificat(entreeCalcul(source, saisie.cumul));
	controlerCertificat(calcul);
	return { calcul, donnees: batirCertificat(source, saisie) };
}

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const jsonDe = (d: DonneesCertificat) => d as unknown as Prisma.InputJsonValue;

export async function ouvrirNouveauCertificat(lotId: string, maintenant = new Date()): Promise<CertificatOuvert> {
	const { lot, parametres } = await lireLot(lotId, prisma);
	const jour = versIso(dateParis(maintenant));
	const sansCertificat = lot.acomptes.every((a) => a.manuel);
	return {
		lotId, chantierId: lot.chantierId,
		source: sourceCertificat(lot, parametres, lot.acomptes.length + 1),
		saisies: { cumul: '', mois: jour.slice(0, 7), date: jour },
		acompteId: null,
		derniereVersion: null,
		acomptesManuels: sansCertificat ? lot.acomptes.map((a) => ({ id: a.id, saisie: formatMontantSaisie(a.montantHt.toString()) })) : null,
		blocage: possible(lot) ? null : CERTIFICAT_IMPOSSIBLE,
	};
}

/** Seul le dernier certificat du lot se rouvre en édition ; les autres s'ouvrent tels qu'émis (page Documents). */
export async function ouvrirCorrection(acompteId: string): Promise<CertificatOuvert> {
	const a = await prisma.acompte.findUnique({ where: { id: acompteId } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	const { lot, parametres } = await lireLot(a.lotId, prisma);
	const dernier = !a.manuel && lot.acomptes.at(-1)?.id === acompteId;
	const version = await prisma.document.findFirst({ where: { serie: serieCertificat(acompteId) }, orderBy: { version: 'desc' }, select: { version: true } });
	return {
		lotId: a.lotId, chantierId: lot.chantierId,
		source: sourceCertificat(lot, parametres, a.numero),
		saisies: {
			cumul: a.cumulRealiseHt ? formatMontantSaisie(a.cumulRealiseHt.toString()) : '',
			mois: a.mois ?? '',
			date: versSaisieDate(a.date),
		},
		acompteId,
		derniereVersion: version?.version ?? null,
		acomptesManuels: null,
		blocage: dernier ? null : DERNIER_SEUL,
	};
}

/** Nouveau certificat : le numéro attendu doit être toujours le suivant, vérifié sous verrou (spec § 6). */
export async function genererCertificat(
	lotId: string,
	saisies: SaisiesCertificat & { numeroAttendu: number },
	utilisateurId: string,
	deps: Dependances = {},
): Promise<ResultatGeneration & { acompteId: string }> {
	const saisie = lireSaisies(saisies);
	const numero = saisies.numeroAttendu;
	const preparer = async (client: Tx) => {
		const { lot, parametres } = await lireLot(lotId, client);
		if (lot.acomptes.length + 1 !== numero) throw new ErreurMetier(AUTRE_CERTIFICAT);
		if (!possible(lot)) throw new ErreurMetier(CERTIFICAT_IMPOSSIBLE);
		return { lot, ...construire(lot, parametres, numero, saisie) };
	};
	const avant = await preparer(prisma);
	const emp = empreinteDocument(avant.donnees);
	const pdf = await rendrePdfDocument(avant.donnees, deps.rendrePdf ?? imprimerCertificat);
	return sousVerrouLot(lotId, async (tx) => {
		const { lot, calcul, donnees } = await preparer(tx);
		if (empreinteDocument(donnees) !== emp) throw new ErreurMetier(DONNEES_CHANGEES);
		const acompte = await tx.acompte.create({
			data: {
				lotId, numero, montantHt: calcul.presentHt.toFixed(2), manuel: false,
				cumulRealiseHt: calcul.realiseHt.toFixed(2), mois: saisie.mois, date: versDate(saisie.date),
			},
		});
		const nomFichier = nomFichierCertificat({
			reference: lot.chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature, numeroCertificat: numero, version: 1,
		});
		const doc = await tx.document.create({
			data: {
				chantierId: lot.chantierId, lotId, serie: serieCertificat(acompte.id), type: 'CERTIFICAT_PAIEMENT', version: 1,
				donnees: jsonDe(avant.donnees), empreinte: emp, pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
			},
		});
		return { documentId: doc.id, version: 1, nomFichier, nouvelle: true, acompteId: acompte.id };
	});
}

/** Correction du dernier certificat : même numéro, nouvelle version ; aucune si rien n'a changé (règle du Socle). */
export async function corrigerCertificat(acompteId: string, saisies: SaisiesCertificat, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const saisie = lireSaisies(saisies);
	const a = await prisma.acompte.findUnique({ where: { id: acompteId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	const preparer = async (client: Tx) => {
		const { lot, parametres } = await lireLot(a.lotId, client);
		const acompte = lot.acomptes.find((x) => x.id === acompteId);
		if (!acompte) throw new ErreurMetier(ACOMPTE_DISPARU);
		if (acompte.manuel || lot.acomptes.at(-1)?.id !== acompteId) throw new ErreurMetier(DERNIER_SEUL);
		return { lot, acompte, ...construire(lot, parametres, acompte.numero, saisie) };
	};
	const avant = await preparer(prisma);
	const serie = { chantierId: avant.lot.chantierId, serie: serieCertificat(acompteId) };
	const emp = empreinteDocument(avant.donnees);
	const identique = (d: { id: string; version: number; nomFichier: string; empreinte: string } | null) =>
		d?.empreinte === emp ? { documentId: d.id, version: d.version, nomFichier: d.nomFichier, nouvelle: false } : null;
	const dejaLa = identique(await prisma.document.findFirst({ where: serie, orderBy: { version: 'desc' } }));
	if (dejaLa) return dejaLa;
	const pdf = await rendrePdfDocument(avant.donnees, deps.rendrePdf ?? imprimerCertificat);
	return sousVerrouLot(a.lotId, async (tx) => {
		const { lot, acompte, calcul, donnees } = await preparer(tx);
		if (empreinteDocument(donnees) !== emp) throw new ErreurMetier(DONNEES_CHANGEES);
		const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
		const memeVersion = identique(courante);
		if (memeVersion) return memeVersion;
		const version = (courante?.version ?? 0) + 1;
		await tx.acompte.update({
			where: { id: acompteId },
			data: { montantHt: calcul.presentHt.toFixed(2), cumulRealiseHt: calcul.realiseHt.toFixed(2), mois: saisie.mois, date: versDate(saisie.date) },
		});
		const nomFichier = nomFichierCertificat({
			reference: lot.chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature,
			numeroCertificat: acompte.numero, version,
		});
		const doc = await tx.document.create({
			data: {
				...serie, lotId: a.lotId, type: 'CERTIFICAT_PAIEMENT', version,
				donnees: jsonDe(avant.donnees), empreinte: emp, pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
			},
		});
		return { documentId: doc.id, version, nomFichier, nouvelle: true };
	});
}

function verifierSansCertificat(lot: LotVerrouille): void {
	if (lot.acomptes.some((a) => !a.manuel)) throw new ErreurMetier(CERTIFICATS_EXISTENT);
}

async function lotDeLAcompte(acompteId: string): Promise<string> {
	const a = await prisma.acompte.findUnique({ where: { id: acompteId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	return a.lotId;
}

/** Acompte antérieur à l'application (reprise d'un chantier en cours) : numéro suivant, tant qu'aucun certificat. */
export async function ajouterAcompteManuel(lotId: string, saisie: string): Promise<{ chantierId: string }> {
	const montant = lireMontantAcompte(saisie);
	return sousVerrouLot(lotId, async (tx, lot) => {
		verifierSansCertificat(lot);
		await tx.acompte.create({ data: { lotId, numero: lot.acomptes.length + 1, montantHt: montant.toFixed(2), manuel: true } });
		return { chantierId: lot.chantierId };
	});
}

export async function modifierAcompteManuel(acompteId: string, saisie: string): Promise<{ chantierId: string }> {
	const montant = lireMontantAcompte(saisie);
	return sousVerrouLot(await lotDeLAcompte(acompteId), async (tx, lot) => {
		verifierSansCertificat(lot);
		if (!lot.acomptes.some((a) => a.id === acompteId)) throw new ErreurMetier(ACOMPTE_DISPARU);
		await tx.acompte.update({ where: { id: acompteId }, data: { montantHt: montant.toFixed(2) } });
		return { chantierId: lot.chantierId };
	});
}

/** Les suivants reculent d'un numéro, un par un dans l'ordre croissant : l'unicité (lot, numéro) tient à chaque ligne. */
export async function supprimerAcompteManuel(acompteId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDeLAcompte(acompteId), async (tx, lot) => {
		verifierSansCertificat(lot);
		const supprime = lot.acomptes.find((a) => a.id === acompteId);
		if (!supprime) throw new ErreurMetier(ACOMPTE_DISPARU);
		await tx.acompte.delete({ where: { id: acompteId } });
		for (const a of lot.acomptes.filter((x) => x.numero > supprime.numero)) {
			await tx.acompte.update({ where: { id: a.id }, data: { numero: a.numero - 1 } });
		}
		return { chantierId: lot.chantierId };
	});
}

/** Donnée du lot, enregistrée aussitôt : elle vaut pour les certificats suivants, même si l'aperçu est fermé sans générer. */
export async function changerCaution(lotId: string, caution: boolean): Promise<{ chantierId: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		await tx.lot.update({ where: { id: lotId }, data: { cautionBancaire: caution } });
		return { chantierId: lot.chantierId };
	});
}
