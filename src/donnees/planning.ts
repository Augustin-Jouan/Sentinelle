import { randomUUID } from 'node:crypto';
import { estCouleur } from '@/domaine/couleurs';
import { ErreurMetier } from '@/domaine/erreurs';
import * as regles from '@/domaine/planning';
import { etendueDuPlanning, periodesDuPlanning, rangIso, type PlanningVue, type ReponsePlanning } from '@/domaine/planningVue';
import { dateParis, lundiDuRang, rangSemaine, semaineDuRang, semaineExiste, versIso } from '@/domaine/semaines';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from './prisma';

type Tx = Prisma.TransactionClient;
export type ChampPeriode = 'intitule' | 'semaine' | 'annee' | 'duree';
export type ChampFermeture = 'libelle' | 'semaine' | 'annee' | 'duree';
type Suite = { message?: string; periodeId?: string } | void;

const PERIODE_DISPARUE = "Cette période n'existe plus.";
const FERMETURE_DISPARUE = "Cette fermeture n'existe plus.";
const LOT_DISPARU = "Ce lot n'existe plus.";
const INTROUVABLE = 'Élément introuvable.';

async function lire(db: Pick<Tx, 'chantier'>, chantierId: string): Promise<PlanningVue | null> {
	const c = await db.chantier.findUnique({
		where: { id: chantierId },
		select: {
			id: true,
			dateSignaturePrevue: true,
			lots: {
				orderBy: { ordre: 'asc' },
				select: {
					id: true, numero: true, designation: true, couleur: true,
					artisan: { select: { nom: true, telephone: true } },
					periodes: {
						orderBy: [{ debut: 'asc' }, { creeLe: 'asc' }],
						select: { id: true, intitule: true, debut: true, duree: true, dependDeId: true },
					},
				},
			},
			fermetures: { orderBy: [{ debut: 'asc' }, { id: 'asc' }], select: { id: true, libelle: true, debut: true, duree: true } },
		},
	});
	if (!c) return null;
	return {
		chantierId: c.id,
		dateSignaturePrevue: c.dateSignaturePrevue ? versIso(c.dateSignaturePrevue) : null,
		lots: c.lots.map((l) => ({
			id: l.id, numero: l.numero, designation: l.designation, couleur: l.couleur,
			entreprise: l.artisan?.nom ?? null,
			telephone: l.artisan?.telephone || null,
			periodes: l.periodes.map((x) => ({ ...x, debut: versIso(x.debut) })),
		})),
		fermetures: c.fermetures.map((f) => ({ ...f, debut: versIso(f.debut) })),
	};
}

export function lirePlanning(chantierId: string): Promise<PlanningVue | null> {
	return lire(prisma, chantierId);
}

/**
 * Verrou du chantier, relecture, opération, relecture. L'opération s'applique au planning de la base,
 * jamais à celui que le navigateur avait sous les yeux : deux gestes sur des périodes différentes sont conservés.
 */
async function sousVerrou(chantierId: string, operation: (tx: Tx, vue: PlanningVue) => Promise<Suite>): Promise<ReponsePlanning> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Chantier" WHERE id = ${chantierId} FOR UPDATE`;
		if (!verrou.length) throw new ErreurMetier(INTROUVABLE);
		const suite = (await operation(tx, (await lire(tx, chantierId))!)) ?? {};
		return { planning: (await lire(tx, chantierId))!, ...suite };
	});
}

/** N'écrit que les périodes qui ont changé. */
async function ecrirePeriodes(tx: Tx, avant: regles.PeriodePlan[], apres: regles.PeriodePlan[]) {
	const anciennes = new Map(avant.map((x) => [x.id, x]));
	for (const x of apres) {
		const a = anciennes.get(x.id);
		const donnees = { intitule: x.intitule, debut: lundiDuRang(x.debut), duree: x.duree, dependDeId: x.dependDeId };
		if (!a) {
			await tx.periode.create({ data: { id: x.id, lotId: x.lotId, ...donnees } });
		} else if (a.intitule !== x.intitule || a.debut !== x.debut || a.duree !== x.duree || a.dependDeId !== x.dependDeId) {
			await tx.periode.update({ where: { id: x.id }, data: donnees });
		}
	}
	const restantes = new Set(apres.map((x) => x.id));
	const supprimees = avant.filter((x) => !restantes.has(x.id)).map((x) => x.id);
	if (supprimees.length) await tx.periode.deleteMany({ where: { id: { in: supprimees } } });
}

/** Chaque id doit être une période du chantier : sinon « Élément introuvable. » (autre chantier) ou « n'existe plus ». */
async function verifierPeriodes(tx: Tx, periodes: regles.PeriodePlan[], ids: string[], ignorerDisparues = false) {
	const connues = new Set(periodes.map((x) => x.id));
	for (const id of ids) {
		if (connues.has(id)) continue;
		if (await tx.periode.findUnique({ where: { id }, select: { id: true } })) throw new ErreurMetier(INTROUVABLE);
		if (!ignorerDisparues) throw new ErreurMetier(PERIODE_DISPARUE);
	}
}

async function chantierDuLot(lotId: string): Promise<string> {
	const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { chantierId: true } });
	if (!lot) throw new ErreurMetier(LOT_DISPARU);
	return lot.chantierId;
}

async function chantierDeLaPeriode(id: string): Promise<string> {
	const x = await prisma.periode.findUnique({ where: { id }, select: { lot: { select: { chantierId: true } } } });
	if (!x) throw new ErreurMetier(PERIODE_DISPARUE);
	return x.lot.chantierId;
}

async function chantierDeLaFermeture(id: string): Promise<string> {
	const f = await prisma.fermeture.findUnique({ where: { id }, select: { chantierId: true } });
	if (!f) throw new ErreurMetier(FERMETURE_DISPARUE);
	return f.chantierId;
}

/** Nombre entier saisi dans un champ ; tout le reste (vide, lettres, décimales) est refusé. */
function entier(valeur: string, message: string, champ: string): number {
	const t = valeur.trim();
	if (!/^\d{1,6}$/.test(t)) throw new ErreurMetier(message, champ);
	return Number(t);
}

/** Une semaine 53 qui n'existe pas est refusée, jamais recalée sur la semaine 1 suivante. */
function rangSaisi(annee: number, semaine: number): number {
	if (annee < 2000 || annee > 2100) throw new ErreurMetier("L'année doit être comprise entre 2000 et 2100.", 'annee');
	if (!semaineExiste(annee, semaine)) throw new ErreurMetier("Cette semaine n'existe pas.", 'semaine');
	return rangSemaine(annee, semaine);
}

/** Nouveau début quand on change la semaine ou l'année d'un début existant. */
function debutSaisi(debut: number, champ: 'semaine' | 'annee', valeur: string): number {
	const s = semaineDuRang(debut);
	return champ === 'annee'
		? rangSaisi(entier(valeur, 'Année : saisissez un nombre entier.', 'annee'), s.semaine)
		: rangSaisi(s.annee, entier(valeur, 'Semaine : saisissez un nombre entier.', 'semaine'));
}

function changementPeriode(x: regles.PeriodePlan, champ: ChampPeriode, valeur: string): { debut?: number; duree?: number; intitule?: string } {
	if (champ === 'intitule') {
		const intitule = valeur.trim();
		if (intitule.length > 120) throw new ErreurMetier("L'intitulé fait 120 caractères au plus.", 'intitule');
		return { intitule };
	}
	// La borne 1-104 est contrôlée par le domaine.
	if (champ === 'duree') return { duree: entier(valeur, 'Durée : saisissez un nombre entier.', 'duree') };
	return { debut: debutSaisi(x.debut, champ, valeur) };
}

export async function creerPeriode(lotId: string, debut: string, duree: number): Promise<ReponsePlanning> {
	return sousVerrou(await chantierDuLot(lotId), async (tx, vue) => {
		if (!vue.lots.some((l) => l.id === lotId)) throw new ErreurMetier(LOT_DISPARU);
		const avant = periodesDuPlanning(vue);
		const id = randomUUID();
		const rang = rangIso(debut);
		const res = regles.creerPeriode(avant, { id, lotId, intitule: '', debut: rang, duree, dependDeId: null });
		await ecrirePeriodes(tx, avant, res.periodes);
		return { message: `Période créée — semaine ${semaineDuRang(rang).semaine}, ${duree} sem. Nommez-la si besoin.`, periodeId: id };
	});
}

export async function deplacerPeriodes(chantierId: string, mouvements: { id: string; debut: string }[]): Promise<ReponsePlanning> {
	return sousVerrou(chantierId, async (tx, vue) => {
		const avant = periodesDuPlanning(vue);
		await verifierPeriodes(tx, avant, mouvements.map((m) => m.id));
		const vises = mouvements.map((m) => ({ id: m.id, debut: rangIso(m.debut) }));
		const res = regles.deplacerPeriodes(avant, vises);
		await ecrirePeriodes(tx, avant, res.periodes);
		if (vises.length < 2) return { message: regles.messageSuites(res.decalees) };
		// Les débuts sont absolus : si un collègue a bougé l'une des périodes entre-temps, les décalages diffèrent.
		const deltas = new Set(vises.map((v) => v.debut - avant.find((x) => x.id === v.id)!.debut));
		const [delta] = deltas;
		if (deltas.size === 1 && delta) return { message: regles.messageGroupe(vises.length, delta, res.decalees) };
		if (deltas.size === 1) return { message: regles.messageSuites(res.decalees) };
		const suites = regles.messageSuites(res.decalees);
		return { message: `${vises.length} périodes déplacées.${suites ? ` ${suites}` : ''}` };
	});
}

export async function modifierPeriode(id: string, champ: ChampPeriode, valeur: string): Promise<ReponsePlanning> {
	return sousVerrou(await chantierDeLaPeriode(id), async (tx, vue) => {
		const avant = periodesDuPlanning(vue);
		const x = avant.find((y) => y.id === id);
		if (!x) throw new ErreurMetier(PERIODE_DISPARUE);
		const res = regles.modifierPeriode(avant, id, changementPeriode(x, champ, valeur));
		await ecrirePeriodes(tx, avant, res.periodes);
		return { message: regles.messageSuites(res.decalees) };
	});
}

export async function lierPeriode(id: string, dependDeId: string | null): Promise<ReponsePlanning> {
	return sousVerrou(await chantierDeLaPeriode(id), async (tx, vue) => {
		const avant = periodesDuPlanning(vue);
		await verifierPeriodes(tx, avant, dependDeId ? [id, dependDeId] : [id]);
		const res = regles.lierPeriode(avant, id, dependDeId);
		await ecrirePeriodes(tx, avant, res.periodes);
		if (!dependDeId) return { message: 'Lien retiré — la période redevient libre.' };
		const suites = regles.messageSuites(res.decalees);
		return { message: suites ? `Lien posé. ${suites}` : 'Lien posé.' };
	});
}

export async function supprimerPeriodes(chantierId: string, ids: string[]): Promise<ReponsePlanning> {
	return sousVerrou(chantierId, async (tx, vue) => {
		const avant = periodesDuPlanning(vue);
		await verifierPeriodes(tx, avant, ids, true);
		const res = regles.supprimerPeriodes(avant, ids);
		await ecrirePeriodes(tx, avant, res.periodes);
		const n = avant.length - res.periodes.length;
		return { message: n > 1 ? `${n} périodes supprimées.` : n ? 'Période supprimée.' : undefined };
	});
}

/** « Congés », 2 semaines, au lundi du début de l'axe (comme la maquette). */
export async function ajouterFermeture(chantierId: string, aujourdhui = versIso(dateParis(new Date()))): Promise<ReponsePlanning> {
	return sousVerrou(chantierId, async (tx, vue) => {
		const debut = lundiDuRang(etendueDuPlanning(vue, aujourdhui).debut);
		await tx.fermeture.create({ data: { chantierId, libelle: 'Congés', debut, duree: 2 } });
	});
}

function changementFermeture(debut: number, champ: ChampFermeture, valeur: string): { libelle?: string; debut?: Date; duree?: number } {
	if (champ === 'libelle') {
		const libelle = valeur.trim();
		if (libelle.length > 60) throw new ErreurMetier('Le libellé fait 60 caractères au plus.', 'libelle');
		return { libelle };
	}
	if (champ === 'duree') {
		const duree = entier(valeur, 'Durée : saisissez un nombre entier.', 'duree');
		if (duree < 1 || duree > 52) throw new ErreurMetier("La durée d'une fermeture doit être comprise entre 1 et 52 semaines.", 'duree');
		return { duree };
	}
	return { debut: lundiDuRang(debutSaisi(debut, champ, valeur)) };
}

export async function modifierFermeture(id: string, champ: ChampFermeture, valeur: string): Promise<ReponsePlanning> {
	return sousVerrou(await chantierDeLaFermeture(id), async (tx, vue) => {
		const f = vue.fermetures.find((x) => x.id === id);
		if (!f) throw new ErreurMetier(FERMETURE_DISPARUE);
		await tx.fermeture.update({ where: { id }, data: changementFermeture(rangIso(f.debut), champ, valeur) });
	});
}

export async function supprimerFermeture(id: string): Promise<ReponsePlanning> {
	return sousVerrou(await chantierDeLaFermeture(id), async (tx) => {
		// Supprimée par un collègue entre le contrôle et le verrou : on le dit plutôt que d'annoncer une suppression.
		const { count } = await tx.fermeture.deleteMany({ where: { id } });
		if (!count) throw new ErreurMetier(FERMETURE_DISPARUE);
		return { message: 'Fermeture supprimée.' };
	});
}

export async function changerCouleurLot(lotId: string, couleur: string): Promise<ReponsePlanning> {
	if (!estCouleur(couleur)) throw new ErreurMetier('Couleur inconnue.');
	return sousVerrou(await chantierDuLot(lotId), async (tx) => {
		const { count } = await tx.lot.updateMany({ where: { id: lotId }, data: { couleur } });
		if (!count) throw new ErreurMetier(LOT_DISPARU);
	});
}
