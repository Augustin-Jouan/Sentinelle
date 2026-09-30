import { optionsDependance } from '@/domaine/planning';
import { periodesDuPlanning, rangIso, type LotPlanning, type PeriodeVue, type PlanningVue } from '@/domaine/planningVue';
import { semaineDuRang } from '@/domaine/semaines';

/** Largeur d'une semaine à l'écran, par densité (maquette : NIVEAUX). */
export const DENSITES = { compacte: 32, normale: 46, large: 68 } as const;
export type Densite = keyof typeof DENSITES;
export const LIBELLES_DENSITES: Record<Densite, string> = { compacte: 'Compacte', normale: 'Normale', large: 'Large' };

/** Hauteur d'une ligne de lot, en px : doit suivre `.g-row[data-lot]` (3.75rem) dans gantt.css. */
export const HAUTEUR_LIGNE = 60;

export type Barre = {
	periode: PeriodeVue;
	gauche: number;
	largeur: number;
	texte: string;
	titre: string;
	/** Intitulé posé à droite d'une barre trop étroite pour le porter. */
	etiquette: { gauche: number; largeurMax: number } | null;
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** Règles d'affichage des barres de la maquette (`renderPlanning`). */
export function barresDuLot(lot: LotPlanning, debutAxe: number, w: number): Barre[] {
	return lot.periodes.map((p, i) => {
		const colonne = rangIso(p.debut) - debutAxe;
		const largeur = p.duree * w;
		const suivante = lot.periodes[i + 1];
		const espace = suivante ? (rangIso(suivante.debut) - debutAxe - colonne - p.duree) * w : Infinity;
		const dehors = largeur < 96 && p.intitule !== '' && espace >= 80;
		const s = semaineDuRang(rangIso(p.debut));
		return {
			periode: p,
			gauche: colonne * w,
			largeur,
			texte: dehors ? '' : `${p.intitule}${largeur >= 150 ? ` · ${p.duree} sem.` : ''}`,
			titre: `${p.intitule || lot.designation} — semaine ${s.semaine} de ${s.annee}, ${pluriel(p.duree, 'semaine')}`,
			etiquette: dehors ? { gauche: (colonne + p.duree) * w, largeurMax: Math.min(espace - 12, 224) } : null,
		};
	});
}

/** Bornes de l'axe du chantier entier : masquer un lot ne change pas l'axe. */
export function resume(nbAffichees: number, nbTotal: number, debut: number, fin: number): string {
	if (!nbAffichees) {
		return nbTotal ? 'Aucune période parmi les lots affichés.' : "Aucune période — tracez-en une à la souris sur la ligne d'un lot.";
	}
	const d = semaineDuRang(debut);
	const f = semaineDuRang(fin);
	return `${pluriel(nbAffichees, 'période')}${nbAffichees < nbTotal ? ` sur ${nbTotal}` : ''}`
		+ ` · semaine ${d.semaine} de ${d.annee} à la semaine ${f.semaine} de ${f.annee}`;
}

export function texteSelection(n: number): string {
	if (!n) return 'Maj + clic ou Maj + glisser : sélection multiple';
	if (n === 1) return '1 période sélectionnée — ← → pour décaler, Maj = 4 semaines, Suppr';
	return `${n} périodes sélectionnées — ← → pour décaler, Maj = 4 semaines, Suppr, Échap`;
}

/** Pastille près du curseur : semaines sans année (maquette `majChip`). */
export function pastille(debut: number, duree: number): string {
	const d = semaineDuRang(debut).semaine;
	if (duree === 1) return `S${d} · 1 sem.`;
	return `S${d} → S${semaineDuRang(debut + duree - 1).semaine} · ${duree} sem.`;
}

export function pastilleGroupe(delta: number, n: number): string {
	return `${delta < 0 ? '−' : '+'}${Math.abs(delta)} sem. · ${n} périodes`;
}

/** On sort à droite de l'amont, on descend, on entre à gauche de l'aval ; trop près, on contourne par la gauche. */
export function cheminLien(x1: number, y1: number, x2: number, y2: number): string {
	const marge = 9;
	return x2 - x1 >= marge * 2
		? `M ${x1} ${y1} H ${x2 - marge} V ${y2} H ${x2}`
		: `M ${x1} ${y1} V ${(y1 + y2) / 2} H ${x2 - marge} V ${y2} H ${x2}`;
}

/** Flèches fin → début entre lots affichés : une flèche vers ou depuis un lot masqué pointerait à côté. */
export function liens(lots: LotPlanning[], debutAxe: number, w: number): { id: string; d: string }[] {
	const ligneDe = new Map<string, number>();
	const periodes = new Map<string, PeriodeVue>();
	lots.forEach((l, i) => l.periodes.forEach((p) => {
		ligneDe.set(p.id, i);
		periodes.set(p.id, p);
	}));
	const milieu = (id: string) => ligneDe.get(id)! * HAUTEUR_LIGNE + HAUTEUR_LIGNE / 2;
	const out: { id: string; d: string }[] = [];
	for (const p of periodes.values()) {
		const amont = p.dependDeId ? periodes.get(p.dependDeId) : undefined;
		if (!amont) continue;
		out.push({
			id: p.id,
			d: cheminLien((rangIso(amont.debut) + amont.duree - debutAxe) * w, milieu(amont.id), (rangIso(p.debut) - debutAxe) * w, milieu(p.id)),
		});
	}
	return out;
}

/** Options du sélecteur « commence après » : ni la période ni ses suites, groupées par lot. */
export function optionsGroupees(planning: PlanningVue, periodeId: string): { lot: string; periodes: { id: string; libelle: string }[] }[] {
	const permises = new Set(optionsDependance(periodesDuPlanning(planning), periodeId).map((p) => p.id));
	return planning.lots
		.map((l) => ({
			lot: l.designation || 'Lot sans désignation',
			periodes: l.periodes.filter((p) => permises.has(p.id)).map((p) => {
				const s = semaineDuRang(rangIso(p.debut));
				return { id: p.id, libelle: `${p.intitule || 'période'} — S${s.semaine} ${s.annee}` };
			}),
		}))
		.filter((g) => g.periodes.length > 0);
}
