import { etendue, type Etendue, type PeriodePlan, type Plage } from './planning';
import { depuisIso, lundiDuRang, rangDe, versIso } from './semaines';

/** Forme du planning échangée entre le serveur et l'écran : dates en `AAAA-MM-JJ` (lundis). */
export type PeriodeVue = { id: string; intitule: string; debut: string; duree: number; dependDeId: string | null };
export type LotPlanning = {
	id: string; numero: string | null; designation: string; entreprise: string | null; telephone: string | null;
	couleur: string; periodes: PeriodeVue[];
};
export type FermetureVue = { id: string; libelle: string; debut: string; duree: number };
export type PlanningVue = { chantierId: string; dateSignaturePrevue: string | null; lots: LotPlanning[]; fermetures: FermetureVue[] };
export type ReponsePlanning = { planning: PlanningVue; message?: string; periodeId?: string };

/** Rang de la semaine d'une date `AAAA-MM-JJ` (un jour quelconque donne le rang de son lundi). */
export const rangIso = (iso: string): number => rangDe(depuisIso(iso));
export const isoRang = (rang: number): string => versIso(lundiDuRang(rang));

export function periodesDuPlanning(vue: PlanningVue): PeriodePlan[] {
	return vue.lots.flatMap((l) => l.periodes.map((p) => ({
		id: p.id, lotId: l.id, intitule: p.intitule, debut: rangIso(p.debut), duree: p.duree, dependDeId: p.dependDeId,
	})));
}

/** Replace des périodes calculées dans la vue : triées par début, l'ordre d'origine départageant les égalités. */
export function appliquerPeriodes(vue: PlanningVue, periodes: PeriodePlan[]): PlanningVue {
	const parLot = new Map<string, PeriodePlan[]>();
	for (const p of periodes) parLot.set(p.lotId, [...(parLot.get(p.lotId) ?? []), p]);
	return {
		...vue,
		lots: vue.lots.map((l) => ({
			...l,
			periodes: (parLot.get(l.id) ?? [])
				.map((p, i) => ({ p, i }))
				.sort((a, b) => a.p.debut - b.p.debut || a.i - b.i)
				.map(({ p }) => ({ id: p.id, intitule: p.intitule, debut: isoRang(p.debut), duree: p.duree, dependDeId: p.dependDeId })),
		})),
	};
}

export const plagesFermetures = (vue: PlanningVue): Plage[] => vue.fermetures.map((f) => ({ debut: rangIso(f.debut), duree: f.duree }));

/** Sans période : la date de signature prévue, sinon le jour donné. */
export const rangParDefaut = (vue: PlanningVue, aujourdhui: string): number => rangIso(vue.dateSignaturePrevue ?? aujourdhui);

export const etendueDuPlanning = (vue: PlanningVue, aujourdhui: string): Etendue =>
	etendue([...periodesDuPlanning(vue), ...plagesFermetures(vue)], rangParDefaut(vue, aujourdhui));
