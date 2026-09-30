import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { DONNEES_CHANGEES, imprimerReception, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import { batirReception, type SaisiesReception, type SaisiesReceptionCommunes, type SourceReception } from '@/documents/reception';
import type { DonneesReception } from '@/documents/schemas';
import { serieReception } from '@/documents/series';
import { verifierDate } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierReception, nomFichierReceptions } from '@/domaine/fichiers';
import {
	AUCUN_LOT_RECEPTIONNABLE, controlerLevee, controlerReception, DATE_RECEPTION, DECISIONS, LIMITES_PV, MOTIFS_TROP_LONGS, SANS_ENTREPRISE,
	TOUS_LES_LOTS, verifierReserves, verifierTexteCourt, type ChampReception, type ChampReceptionCommun, type Decision,
} from '@/domaine/reception';
import { dateParis, depuisIso, versIso } from '@/domaine/semaines';
import type { Parametres, Prisma, Reception } from '@/generated/prisma/client';
import { versDateCalendaire, versSaisieDate } from './chantiers';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import { sousVerrouChantier, sousVerrouLot, sousVerrouLots, verrouillerChantier, type Tx } from './verrouLot';

export type PageReception = { lotId: string; entreprise: string; source: SourceReception; saisies: SaisiesReception };

/** Ce que l'aperçu du PV reçoit (Task 9) : il rebâtit chaque feuille à la frappe (`batirReception`). */
export type ReceptionsOuvertes = {
	chantierId: string;
	/** Id du lot, ou TOUS_LES_LOTS. */
	cible: string;
	/** Menu « Procès-verbal pour » : les lots réceptionnables, dans l'ordre de saisie. */
	options: { lotId: string; libelle: string; entreprise: string }[];
	commun: SaisiesReceptionCommunes;
	pages: PageReception[];
	blocage: string | null;
};

export type ResultatReception = ResultatGeneration & { lotId: string; entreprise: string };

const INTROUVABLE = 'Chantier introuvable.';
const INCLURE = {
	lots: { orderBy: { ordre: 'asc' as const }, include: { artisan: { select: { nom: true, interlocuteur: true } }, reception: true } },
} satisfies Prisma.ChantierInclude;
type ChantierReception = Prisma.ChantierGetPayload<{ include: typeof INCLURE }>;
type LotReception = ChantierReception['lots'][number];

const libelleLot = (l: { numero: string | null; designation: string }) => `${l.numero ? `${l.numero} — ` : ''}${l.designation}`;
const jsonDe = (d: DonneesReception) => d as unknown as Prisma.InputJsonValue;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou des lots. */
async function lire(client: Tx, chantierId: string): Promise<{ chantier: ChantierReception; parametres: Parametres } | null> {
	const chantier = await client.chantier.findUnique({ where: { id: chantierId }, include: INCLURE });
	if (!chantier) return null;
	return { chantier, parametres: (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT };
}

function sourceReception(c: ChantierReception, l: LotReception, p: Parametres): SourceReception {
	return {
		chantier: { maitreOuvrage: c.maitreOuvrage, adresse: c.adresse, cp: c.cp, commune: c.commune, mission: c.mission },
		lot: { id: l.id, numero: l.numero, designation: l.designation, entreprise: l.artisan?.nom ?? null, retenueGarantie: l.retenueGarantie.toString() },
		societe: { adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email, siteWeb: p.siteWeb },
	};
}

function saisiesDe(l: LotReception): SaisiesReception {
	const r: Reception | null = l.reception;
	if (!r) return { decision: 'SANS_RESERVES', dateEffet: '', reserves: '', delai: '', motifs: '', representant: l.artisan?.interlocuteur ?? '' };
	return { decision: r.decision, dateEffet: versSaisieDate(r.dateEffet), reserves: r.reserves, delai: r.delai, motifs: r.motifs, representant: r.representant };
}

const communDe = (c: ChantierReception): SaisiesReceptionCommunes => ({
	date: versSaisieDate(c.receptionDate), signataire: c.receptionSignataire, contrat: versSaisieDate(c.contratMoeDate), maitreOeuvre: c.receptionMaitreOeuvre,
});

function ouverture(lu: { chantier: ChantierReception; parametres: Parametres }, cible: string, blocage: string | null): ReceptionsOuvertes {
	const { chantier, parametres } = lu;
	const lots = chantier.lots.filter((l) => l.artisan && (cible === TOUS_LES_LOTS || l.id === cible));
	return {
		chantierId: chantier.id, cible,
		options: chantier.lots.filter((l) => l.artisan).map((l) => ({ lotId: l.id, libelle: libelleLot(l), entreprise: l.artisan?.nom ?? '' })),
		commun: communDe(chantier),
		pages: blocage ? [] : lots.map((l) => ({ lotId: l.id, entreprise: l.artisan?.nom ?? '', source: sourceReception(chantier, l, parametres), saisies: saisiesDe(l) })),
		blocage,
	};
}

function visee(chantier: ChantierReception, cible: string): { receptionnables: LotReception[]; vises: LotReception[]; blocage: string | null } | null {
	if (cible !== TOUS_LES_LOTS && !chantier.lots.some((l) => l.id === cible)) return null;
	const receptionnables = chantier.lots.filter((l) => l.artisan);
	const vises = receptionnables.filter((l) => cible === TOUS_LES_LOTS || l.id === cible);
	const blocage = !receptionnables.length ? AUCUN_LOT_RECEPTIONNABLE : !vises.length ? SANS_ENTREPRISE : null;
	return { receptionnables, vises, blocage };
}

/** Lecture seule : ce que l'aperçu affiche avant le remplissage déclenché par l'action de montage. */
export async function lireReceptionsOuvertes(chantierId: string, cible: string): Promise<ReceptionsOuvertes | null> {
	const lu = await lire(prisma, chantierId);
	if (!lu) return null;
	const vis = visee(lu.chantier, cible);
	if (!vis) return null;
	return ouverture(lu, cible, vis.blocage);
}

/**
 * Remplit les champs communs vides et crée les brouillons des lots visés. À appeler depuis une Server Action,
 * jamais depuis le GET de la page.
 */
export async function preparerReceptions(chantierId: string, cible: string, maintenant = new Date()): Promise<ReceptionsOuvertes | null> {
	const avant = await lire(prisma, chantierId);
	if (!avant) return null;
	const vis = visee(avant.chantier, cible);
	if (!vis) return null;
	if (!vis.blocage) {
		const { name } = await prisma.utilisateur.findUniqueOrThrow({ where: { id: avant.chantier.chargeAffaireId }, select: { name: true } });
		await prisma.$executeRaw`
			UPDATE "Chantier" SET
				"receptionDate" = COALESCE("receptionDate", ${versIso(dateParis(maintenant))}::date),
				"contratMoeDate" = COALESCE("contratMoeDate", "dateSignaturePrevue"),
				"receptionMaitreOeuvre" = CASE WHEN "receptionMaitreOeuvre" = '' THEN ${name} ELSE "receptionMaitreOeuvre" END
			WHERE id = ${chantierId}`;
		await prisma.reception.createMany({
			data: vis.vises.filter((l) => !l.reception).map((l) => ({ lotId: l.id, representant: l.artisan?.interlocuteur ?? '' })),
			skipDuplicates: true,
		});
	}
	const apres = await lire(prisma, chantierId);
	if (!apres) return null;
	return ouverture(apres, cible, vis.blocage);
}

type ChampsReception = Partial<Pick<Reception, 'decision' | 'dateEffet' | 'reserves' | 'delai' | 'motifs' | 'representant'>>;

function donneesChamp(champ: ChampReception, valeur: string): ChampsReception {
	switch (champ) {
		case 'decision':
			return { decision: z.enum(DECISIONS).parse(valeur) };
		case 'dateEffet':
			return { dateEffet: versDateCalendaire(valeur) };
		case 'reserves':
			return { reserves: verifierReserves(valeur) };
		case 'motifs':
			if (valeur.length > LIMITES_PV.long) throw new ErreurMetier(MOTIFS_TROP_LONGS, 'motifs');
			return { motifs: valeur };
		case 'delai':
			return { delai: verifierTexteCourt(valeur, champ) };
		case 'representant':
			return { representant: verifierTexteCourt(valeur, champ) };
	}
}

export async function modifierChampReception(lotId: string, champ: ChampReception, valeur: string): Promise<void> {
	const data = donneesChamp(champ, valeur);
	await sousVerrouLot(lotId, async (tx, lot) => {
		if (!lot.artisanId) throw new ErreurMetier(SANS_ENTREPRISE);
		await tx.reception.upsert({ where: { lotId }, create: { lotId, ...data }, update: data });
	});
}

/** Une colonne de `Chantier` : le changement vaut pour toutes les pages ouvertes. */
export async function modifierChampReceptionCommun(chantierId: string, champ: ChampReceptionCommun, valeur: string): Promise<void> {
	const data: Prisma.ChantierUpdateManyMutationInput =
		champ === 'date' ? { receptionDate: versDateCalendaire(valeur) }
		: champ === 'contrat' ? { contratMoeDate: versDateCalendaire(valeur) }
		: champ === 'signataire' ? { receptionSignataire: verifierTexteCourt(valeur, champ) }
		: { receptionMaitreOeuvre: verifierTexteCourt(valeur, champ) };
	await sousVerrouChantier(chantierId, async (tx) => {
		const { count } = await tx.chantier.updateMany({ where: { id: chantierId }, data });
		if (!count) throw new ErreurMetier(INTROUVABLE);
	});
}

type Feuille = { lot: LotReception; entreprise: string; donnees: DonneesReception };

/**
 * Les feuilles des lots demandés (ceux que l'aperçu affichait), dans l'ordre de saisie, contrôlées.
 * Le refus d'un lot porte son id dans `champ` : l'aperçu passe sur lui. `DATE_RECEPTION` porte le nom du champ.
 */
async function construire(client: Tx, chantierId: string, lotIds: string[]): Promise<{ chantier: ChantierReception; feuilles: Feuille[] }> {
	const lu = await lire(client, chantierId);
	if (!lu) throw new ErreurMetier(INTROUVABLE);
	const { chantier, parametres } = lu;
	const demandes = new Set(lotIds);
	if (!demandes.size) throw new ErreurMetier(AUCUN_LOT_RECEPTIONNABLE);
	const vises = chantier.lots.filter((l) => demandes.has(l.id));
	if (vises.length !== demandes.size) throw new ErreurMetier('Lot introuvable.');
	const commun = communDe(chantier);
	if (!commun.date) throw new ErreurMetier(DATE_RECEPTION, 'date');
	const feuilles = vises.map((l) => {
		if (!l.artisan) throw new ErreurMetier(SANS_ENTREPRISE, l.id);
		const saisies = saisiesDe(l);
		const refus = controlerReception({ entreprise: l.artisan.nom, decision: saisies.decision, reserves: saisies.reserves, motifs: saisies.motifs });
		if (refus) throw new ErreurMetier(refus, l.id);
		return { lot: l, entreprise: l.artisan.nom, donnees: batirReception(sourceReception(chantier, l, parametres), saisies, commun) };
	});
	return { chantier, feuilles };
}

/**
 * Un lot ou tous (spec § 6). `lotIds` : les pages de l'aperçu ; un lot attribué depuis n'est pas ajouté, un lot
 * qui a perdu son entreprise refuse tout. Feuilles contrôlées, PDF rendus hors transaction pour les seules
 * feuilles changées, puis sous le verrou de tous les lots : feuilles refaites (`DONNEES_CHANGEES` si l'une
 * diffère), versions insérées, levée effacée pour chaque nouvelle version. Un refus n'écrit rien.
 */
export async function genererReceptions(chantierId: string, lotIds: string[], utilisateurId: string, deps: Dependances = {}): Promise<ResultatReception[]> {
	const { feuilles } = await construire(prisma, chantierId, lotIds);
	const prets = new Map<string, { empreinte: string; pdf: Uint8Array | null; donnees: DonneesReception }>();
	for (const f of feuilles) {
		const empreinte = empreinteDocument(f.donnees);
		const derniere = await prisma.document.findFirst({
			where: { chantierId, serie: serieReception(f.lot.id) }, orderBy: { version: 'desc' }, select: { empreinte: true },
		});
		prets.set(f.lot.id, { empreinte, pdf: derniere?.empreinte === empreinte ? null : await rendrePdfDocument(f.donnees, deps.rendrePdf ?? imprimerReception), donnees: f.donnees });
	}
	return sousVerrouLots([...prets.keys()], async (tx) => {
		if (!(await verrouillerChantier(tx, chantierId))) throw new ErreurMetier(INTROUVABLE);
		const { chantier, feuilles: fraiches } = await construire(tx, chantierId, lotIds);
		if (fraiches.length !== prets.size || fraiches.some((f) => prets.get(f.lot.id)?.empreinte !== empreinteDocument(f.donnees))) {
			throw new ErreurMetier(DONNEES_CHANGEES);
		}
		const resultats: ResultatReception[] = [];
		for (const f of fraiches) {
			const { empreinte, pdf, donnees } = prets.get(f.lot.id)!;
			const serie = { chantierId, serie: serieReception(f.lot.id) };
			const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
			if (courante?.empreinte === empreinte) {
				resultats.push({ documentId: courante.id, version: courante.version, nomFichier: courante.nomFichier, nouvelle: false, lotId: f.lot.id, entreprise: f.entreprise });
				continue;
			}
			// Une autre version est parue pendant le rendu : ce contenu n'a pas de PDF prêt.
			if (!pdf) throw new ErreurMetier(DONNEES_CHANGEES);
			const version = (courante?.version ?? 0) + 1;
			const nomFichier = nomFichierReception({
				reference: chantier.reference, numero: f.lot.numero, designation: f.lot.designation, nature: f.lot.nature, version,
			});
			const doc = await tx.document.create({
				data: {
					...serie, lotId: f.lot.id, type: 'PV_RECEPTION', version, donnees: jsonDe(donnees), empreinte,
					pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
				},
			});
			await tx.reception.upsert({
				where: { lotId: f.lot.id },
				create: { lotId: f.lot.id, representant: f.lot.artisan?.interlocuteur ?? '' },
				update: { reservesLeveesLe: null },
			});
			resultats.push({ documentId: doc.id, version, nomFichier, nouvelle: true, lotId: f.lot.id, entreprise: f.entreprise });
		}
		return resultats;
	});
}

/** Décision et date de réception du dernier PV émis du lot, ou nul. */
async function dernierPv(client: Tx, lotId: string): Promise<{ decision: Decision; date: string } | null> {
	const d = await client.document.findFirst({ where: { serie: serieReception(lotId), lotId }, orderBy: { version: 'desc' }, select: { donnees: true } });
	if (!d) return null;
	const c = (d.donnees as unknown as DonneesReception).contenu;
	return { decision: c.decision, date: c.dateReception };
}

export async function leverReserves(lotId: string, date: string): Promise<{ chantierId: string }> {
	const jour = verifierDate(date.trim());
	return sousVerrouLot(lotId, async (tx, lot) => {
		controlerLevee(await dernierPv(tx, lotId), jour);
		await tx.reception.update({ where: { lotId }, data: { reservesLeveesLe: depuisIso(jour) } });
		return { chantierId: lot.chantierId };
	});
}

export async function annulerLevee(lotId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		await tx.reception.updateMany({ where: { lotId }, data: { reservesLeveesLe: null } });
		return { chantierId: lot.chantierId };
	});
}

/** PV de CE chantier seulement, une page par lot dans l'ordre de saisie ; sinon nul. Le PDF assemblé n'est pas stocké. */
export async function assemblerReceptions(chantierId: string, documentIds: string[]): Promise<{ pdf: Uint8Array; nomFichier: string } | null> {
	const ids = [...new Set(documentIds)];
	if (!ids.length) return null;
	const docs = await prisma.document.findMany({
		where: { id: { in: ids } },
		select: { chantierId: true, type: true, pdf: true, lot: { select: { ordre: true } }, chantier: { select: { reference: true } } },
	});
	if (docs.length !== ids.length || docs.some((d) => d.chantierId !== chantierId || d.type !== 'PV_RECEPTION')) return null;
	const sortie = await PDFDocument.create();
	for (const d of docs.sort((a, b) => (a.lot?.ordre ?? 0) - (b.lot?.ordre ?? 0))) {
		const source = await PDFDocument.load(d.pdf);
		for (const page of await sortie.copyPages(source, source.getPageIndices())) sortie.addPage(page);
	}
	return { pdf: await sortie.save(), nomFichier: nomFichierReceptions(docs[0].chantier.reference) };
}
