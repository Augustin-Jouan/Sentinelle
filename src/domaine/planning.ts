import { ErreurMetier } from './erreurs';
import { libelleMois, lundiDuRang, nombreSemaines, rangSemaine, semaineDuRang } from './semaines';

/** Toutes les positions sont des rangs de semaine (voir semaines.ts). */
export type Plage = { debut: number; duree: number };
export type PeriodePlan = Plage & { id: string; lotId: string; intitule: string; dependDeId: string | null };
/** `decalees` : périodes déplacées par la cascade, hors celles que l'opération visait. */
export type ResultatPlan = { periodes: PeriodePlan[]; decalees: number };
export type Etendue = { debut: number; fin: number; nb: number };
export type Colonne = { rang: number; semaine: number; annee: number };

export const DUREE_MAX = 104;
export const RANG_MIN = rangSemaine(2000, 1);
export const RANG_MAX = rangSemaine(2100, nombreSemaines(2100));

const PERIODE_DISPARUE = "Cette période n'existe plus.";

export const finPeriode = (p: Plage): number => p.debut + p.duree - 1;

function trouver(periodes: PeriodePlan[], id: string): PeriodePlan {
	const p = periodes.find((x) => x.id === id);
	if (!p) throw new ErreurMetier(PERIODE_DISPARUE);
	return p;
}

const copier = (periodes: PeriodePlan[]) => periodes.map((p) => ({ ...p }));

export function verifierDuree(duree: number): void {
	if (!Number.isInteger(duree) || duree < 1 || duree > DUREE_MAX) {
		throw new ErreurMetier(`La durée doit être comprise entre 1 et ${DUREE_MAX} semaines.`);
	}
}

/** Vrai si `candidat` est `id` ou en dépend, directement ou non. */
export function dependDe(periodes: PeriodePlan[], candidat: string, id: string): boolean {
	const index = new Map(periodes.map((p) => [p.id, p]));
	let courant: string | null = candidat;
	for (let pas = 0; courant && pas <= periodes.length; pas++) {
		if (courant === id) return true;
		courant = index.get(courant)?.dependDeId ?? null;
	}
	return false;
}

/** Profondeur de chaque période dans sa chaîne (0 = sans amont) : l'amont passe toujours avant ses suites. */
function profondeurs(periodes: PeriodePlan[]): Map<string, number> {
	const index = new Map(periodes.map((p) => [p.id, p]));
	const prof = new Map<string, number>();
	for (const depart of periodes) {
		const chaine: PeriodePlan[] = [];
		let p: PeriodePlan | undefined = depart;
		while (p && !prof.has(p.id)) {
			if (chaine.includes(p)) throw new Error('Boucle de dépendances dans le planning.');
			chaine.push(p);
			p = p.dependDeId ? index.get(p.dependDeId) : undefined;
		}
		let niveau = p ? prof.get(p.id)! + 1 : 0;
		for (let i = chaine.length - 1; i >= 0; i--) prof.set(chaine[i].id, niveau++);
	}
	return prof;
}

/**
 * Applique la contrainte fin → début à tout le planning, amont d'abord : une période liée commence
 * au plus tôt la semaine qui suit la fin de son amont. Ne recule jamais une période.
 * Le résultat ne dépend donc pas de l'ordre dans lequel on a modifié les périodes.
 */
export function contraindre(periodes: PeriodePlan[], visees: ReadonlySet<string> = new Set()): ResultatPlan {
	const avant = new Map(periodes.map((p) => [p.id, p.debut]));
	const resultat = copier(periodes);
	const index = new Map(resultat.map((p) => [p.id, p]));
	const prof = profondeurs(resultat);
	for (const p of [...resultat].sort((a, b) => prof.get(a.id)! - prof.get(b.id)!)) {
		const amont = p.dependDeId ? index.get(p.dependDeId) : undefined;
		if (amont && p.debut <= finPeriode(amont)) p.debut = finPeriode(amont) + 1;
	}
	for (const p of resultat) {
		if (p.debut < RANG_MIN) throw new ErreurMetier('Les périodes ne peuvent pas commencer avant 2000.');
		if (finPeriode(p) > RANG_MAX) throw new ErreurMetier('Ce déplacement pousserait des périodes au-delà de 2100.');
	}
	const decalees = resultat.filter((p) => !visees.has(p.id) && avant.get(p.id) !== p.debut).length;
	return { periodes: resultat, decalees };
}

export function creerPeriode(periodes: PeriodePlan[], nouvelle: PeriodePlan): ResultatPlan {
	verifierDuree(nouvelle.duree);
	return contraindre([...periodes, nouvelle], new Set([nouvelle.id]));
}

export function deplacerPeriodes(periodes: PeriodePlan[], mouvements: { id: string; debut: number }[]): ResultatPlan {
	const copie = copier(periodes);
	for (const m of mouvements) trouver(copie, m.id).debut = m.debut;
	return contraindre(copie, new Set(mouvements.map((m) => m.id)));
}

export function decalerPeriodes(periodes: PeriodePlan[], ids: string[], semaines: number): ResultatPlan {
	return deplacerPeriodes(periodes, ids.map((id) => ({ id, debut: trouver(periodes, id).debut + semaines })));
}

export function modifierPeriode(
	periodes: PeriodePlan[], id: string, changement: { debut?: number; duree?: number; intitule?: string },
): ResultatPlan {
	if (changement.duree !== undefined) verifierDuree(changement.duree);
	const copie = copier(periodes);
	Object.assign(trouver(copie, id), changement);
	return contraindre(copie, new Set([id]));
}

export function lierPeriode(periodes: PeriodePlan[], id: string, dependDeId: string | null): ResultatPlan {
	const copie = copier(periodes);
	const p = trouver(copie, id);
	if (dependDeId !== null) {
		const amont = trouver(copie, dependDeId);
		if (dependDe(copie, dependDeId, id)) {
			throw new ErreurMetier(`Ce lien créerait une boucle : ${amont.intitule || 'la période choisie'} dépend déjà de cette période.`);
		}
	}
	p.dependDeId = dependDeId;
	return contraindre(copie, new Set([id]));
}

/** Les périodes déjà absentes sont ignorées ; les suites des périodes supprimées sont détachées sans bouger. */
export function supprimerPeriodes(periodes: PeriodePlan[], ids: string[]): ResultatPlan {
	const retirees = new Set(ids);
	return {
		periodes: periodes
			.filter((p) => !retirees.has(p.id))
			.map((p) => ({ ...p, dependDeId: p.dependDeId && retirees.has(p.dependDeId) ? null : p.dependDeId })),
		decalees: 0,
	};
}

/** Amonts possibles d'une période : ni elle-même, ni ce qui dépend d'elle. */
export function optionsDependance(periodes: PeriodePlan[], id: string): PeriodePlan[] {
	return periodes.filter((p) => p.id !== id && !dependDe(periodes, p.id, id));
}

const moisDuRang = (rang: number) => lundiDuRang(rang).getUTCMonth();

/** De la première à la dernière semaine couverte, élargie pour ne jamais couper un mois (règle `etendue` de la maquette). */
export function etendue(plages: Plage[], rangParDefaut: number): Etendue {
	let debut = rangParDefaut;
	let fin = rangParDefaut + 51;
	if (plages.length) {
		debut = Math.min(...plages.map((p) => p.debut));
		fin = Math.max(...plages.map(finPeriode));
	}
	for (let garde = 0; garde < 6 && moisDuRang(debut - 1) === moisDuRang(debut); garde++) debut--;
	for (let garde = 0; garde < 6 && moisDuRang(fin + 1) === moisDuRang(fin); garde++) fin++;
	return { debut, fin, nb: fin - debut + 1 };
}

/** De la première semaine de la première période à la dernière semaine de la dernière ; sans les fermetures. */
export function periodeTravaux(plages: Plage[]): { debut: number; fin: number } | null {
	if (!plages.length) return null;
	return { debut: Math.min(...plages.map((p) => p.debut)), fin: Math.max(...plages.map(finPeriode)) };
}

export function colonnes(e: Etendue): Colonne[] {
	return Array.from({ length: e.nb }, (_, i) => {
		const s = semaineDuRang(e.debut + i);
		return { rang: e.debut + i, semaine: s.semaine, annee: s.annee };
	});
}

export function moisDesColonnes(cols: Colonne[]): { libelle: string; nb: number }[] {
	const mois: { libelle: string; nb: number }[] = [];
	for (const c of cols) {
		const libelle = libelleMois(c.rang);
		const dernier = mois[mois.length - 1];
		if (dernier?.libelle === libelle) dernier.nb++;
		else mois.push({ libelle, nb: 1 });
	}
	return mois;
}

export function messageSuites(n: number): string | undefined {
	if (!n) return undefined;
	return n > 1 ? `${n} périodes décalées à la suite.` : '1 période décalée à la suite.';
}

export function messageGroupe(nombre: number, delta: number, suites: number): string {
	const semaines = `${Math.abs(delta)} semaine${Math.abs(delta) > 1 ? 's' : ''}`;
	return `${nombre} périodes décalées de ${semaines} ${delta < 0 ? 'plus tôt' : 'plus tard'}${suites ? ` — ${suites} à la suite` : ''}.`;
}
