import type { SourcePlanning } from '@/documents/batir';
import { lundiIso } from '@/domaine/semaines';
import { PERRIER_CHANTIER, PERRIER_LOTS } from './perrier';

/** Planning de démonstration de PERRIER (spec Planning, annexe B). Tests uniquement, jamais dans le seed. */
export type PeriodeFixture = { intitule: string; semaine: number; annee: number; duree: number };
export type LignePlanFixture = { lot: string; couleur: string; periodes: PeriodeFixture[] };

const p = (intitule: string, semaine: number, annee: number, duree: number): PeriodeFixture => ({ intitule, semaine, annee, duree });

/** Dans l'ordre des lots du chantier (fixture PERRIER du Socle). */
export const PLAN_PERRIER: LignePlanFixture[] = [
	{ lot: 'TERRASSEMENT — V.R.D.', couleur: 'noir', periodes: [p('Accès et plateforme', 15, 2026, 1), p('Terrassements finaux', 42, 2026, 2)] },
	{ lot: 'GROS ŒUVRE', couleur: 'noir', periodes: [
		p('Fondations et soubassements', 16, 2026, 3), p('Élévation RDC', 20, 2026, 4), p('Plancher intermédiaire', 25, 2026, 2),
		p('Élévation étage', 28, 2026, 3), p('Appuis et seuils', 38, 2026, 1),
	] },
	{ lot: 'CHARPENTE', couleur: 'vert-clair', periodes: [p('Montage charpente', 33, 2026, 2)] },
	{ lot: 'COUVERTURE', couleur: 'bleu-fonce', periodes: [p('Couverture et gouttières', 36, 2026, 2)] },
	{ lot: 'MENUISERIES EXTÉRIEURES', couleur: 'vert-fonce', periodes: [p('Pose des menuiseries', 38, 2026, 2), p('Réglages de fin de chantier', 8, 2027, 1)] },
	{ lot: 'PLÂTRERIE — ISOLATION', couleur: 'jaune', periodes: [p('Isolation périphérique', 43, 2026, 2), p('Plafonds et cloisons', 46, 2026, 3)] },
	{ lot: 'MENUISERIES INTÉRIEURES', couleur: 'vert-fonce', periodes: [p('Pose des portes', 5, 2027, 2)] },
	{ lot: 'ÉLECTRICITÉ', couleur: 'rouge', periodes: [p('Passage des réseaux', 40, 2026, 1), p('Appareillage', 49, 2026, 2)] },
	{ lot: 'PLOMBERIE — CHAUFFAGE — V.M.C.', couleur: 'rouge', periodes: [p('Réseaux avant doublage', 40, 2026, 1), p('Pose des appareils', 48, 2026, 2)] },
	{ lot: 'CARRELAGE — FAÏENCE', couleur: 'violet', periodes: [p('Chape', 50, 2026, 1), p('Carrelage et faïence', 2, 2027, 3)] },
	{ lot: 'PEINTURE', couleur: 'bleu-clair', periodes: [p('Peintures', 7, 2027, 3)] },
	{ lot: 'ESCALIER', couleur: 'vert-fonce', periodes: [p('Fourniture et pose', 3, 2027, 1)] },
	{ lot: 'ENDUIT EXTÉRIEUR', couleur: 'orange', periodes: [p('Dégrossi des façades', 41, 2026, 2)] },
];

/** Chaque période commence après la précédente. */
export const CHAINE_PERRIER = [
	'Accès et plateforme', 'Fondations et soubassements', 'Élévation RDC', 'Plancher intermédiaire', 'Élévation étage',
	'Montage charpente', 'Couverture et gouttières', 'Pose des menuiseries', 'Isolation périphérique', 'Plafonds et cloisons',
	'Chape', 'Carrelage et faïence', 'Pose des portes', 'Peintures',
];

export const FERMETURES_PERRIER = [
	{ libelle: "Congés d'été", semaine: 31, annee: 2026, duree: 2 },
	{ libelle: 'Congés de Noël', semaine: 52, annee: 2026, duree: 2 },
];

/** Le planning de l'annexe B sous la forme que lit `batirPlanning`, sans base de données. */
export function sourcePlanningPerrier(): SourcePlanning {
	return {
		chantier: PERRIER_CHANTIER,
		lots: PERRIER_LOTS.map((l) => {
			const plan = PLAN_PERRIER.find((x) => x.lot === l.designation)!;
			return {
				designation: l.designation,
				entreprise: l.artisan?.nom ?? null,
				couleur: plan.couleur,
				periodes: plan.periodes.map((x) => ({ intitule: x.intitule, debut: lundiIso(x.annee, x.semaine), duree: x.duree })),
			};
		}),
		fermetures: FERMETURES_PERRIER.map((f) => ({ debut: lundiIso(f.annee, f.semaine), duree: f.duree })),
	};
}
