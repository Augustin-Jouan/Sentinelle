'use client';

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PointerEventReact, type RefObject } from 'react';
import type { PeriodePlan } from '@/domaine/planning';
import { isoRang, type PlanningVue } from '@/domaine/planningVue';
import { pastille, pastilleGroupe } from './geometrie';
import type { Outil } from './preferences';

/** Début et durée (rangs) des périodes saisies, le temps d'un glisser. */
export type Positions = Record<string, { debut: number; duree: number }>;
export type Cadre = { left: number; top: number; right: number; bottom: number };

export type RenduGeste = {
	/** Outil Main : la nappe est tenue. */
	saisi: boolean;
	positions: Positions | null;
	/** Période en cours de tracé, en colonnes de l'axe. */
	fantome: { lotId: string; debut: number; duree: number } | null;
	lasso: { left: number; top: number; width: number; height: number } | null;
	lassoIds: string[] | null;
	pastille: { x: number; y: number; texte: string } | null;
};

export type OptionsGestes = {
	outil: Outil;
	/** Rang de la première colonne de l'axe. */
	debutAxe: number;
	w: number;
	periodes: PeriodePlan[];
	selection: string[];
	cadre: RefObject<HTMLDivElement | null>;
	onSelection: (ids: string[], principal?: string | null) => void;
	onBasculer: (id: string) => void;
	onOuvrirLot: (lotId: string) => void;
	onTracer: (lotId: string, debut: number, duree: number) => void;
	onDeplacer: (mouvements: { id: string; debut: number }[]) => void;
	onAllonger: (id: string, duree: number) => void;
};

/** Repère d'un geste sur une piste : bord gauche de la piste à l'écran, axe et largeur de semaine au moment du clic. */
type Repere = { gauchePiste: number; d0: number; w: number };
type Geste =
	| { mode: 'main'; x0: number; gauche: number; periodeId: string | null; lotId: string | null; ajout: boolean; bouge: boolean }
	| { mode: 'lasso'; x0: number; y0: number; ids: string[]; bouge: boolean }
	| (Repere & { mode: 'tracer'; lotId: string; x0: number; debut: number; fin: number; bouge: boolean })
	| (Repere & {
		mode: 'deplacer'; lotId: string; periodeId: string; ancre: number; depart: number;
		groupe: { id: string; r0: number; duree: number }[]; delta: number; bouge: boolean;
	})
	| (Repere & { mode: 'allonger'; lotId: string; periodeId: string; depart: number; duree0: number; duree: number; bouge: boolean });

const REPOS: RenduGeste = { saisi: false, positions: null, fantome: null, lasso: null, lassoIds: null, pastille: null };
/** Au-delà de ce déplacement (px), un clic devient un glisser. */
const SEUIL = 3;
/** Largeur (px) du bord droit d'une barre qui l'allonge. */
const BORD = 8;

export function appliquerPositions(vue: PlanningVue, positions: Positions): PlanningVue {
	return {
		...vue,
		lots: vue.lots.map((l) => ({
			...l,
			periodes: l.periodes.map((p) => {
				const x = positions[p.id];
				return x ? { ...p, debut: isoRang(x.debut), duree: x.duree } : p;
			}),
		})),
	};
}

export const touche = (a: Cadre, b: Cadre): boolean => a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;

/** Colonne de l'axe sous l'abscisse ; jamais à gauche du début de l'axe pris au clic. */
const colonne = (r: Repere, x: number) => Math.max(0, Math.floor((x - r.gauchePiste) / r.w));
const pres = (e: PointerEvent, texte: string) => ({ x: e.clientX + 16, y: e.clientY - 36, texte });

/** Gestes de la maquette (`ganttMouseDown`, `ganttMouseMove`, `ganttMouseUp`), en Pointer Events. */
export function useGestes(options: OptionsGestes) {
	const [rendu, setRendu] = useState<RenduGeste>(REPOS);
	const geste = useRef<Geste | null>(null);
	const courantes = useRef(options);
	useLayoutEffect(() => {
		courantes.current = options;
	});

	useEffect(() => {
		function bouger(e: PointerEvent) {
			const g = geste.current;
			if (!g) return;
			const { cadre } = courantes.current;
			switch (g.mode) {
				case 'main': {
					const dx = e.clientX - g.x0;
					if (Math.abs(dx) > SEUIL) g.bouge = true;
					if (cadre.current) cadre.current.scrollLeft = g.gauche - dx;
					return;
				}
				case 'lasso': {
					const c = {
						left: Math.min(g.x0, e.clientX), top: Math.min(g.y0, e.clientY),
						right: Math.max(g.x0, e.clientX), bottom: Math.max(g.y0, e.clientY),
					};
					if (c.right - c.left > SEUIL || c.bottom - c.top > SEUIL) g.bouge = true;
					g.ids = [...(cadre.current?.querySelectorAll<HTMLElement>('.g-bar') ?? [])]
						.filter((b) => touche(c, b.getBoundingClientRect()))
						.map((b) => b.dataset.periode!);
					setRendu({ ...REPOS, lasso: { left: c.left, top: c.top, width: c.right - c.left, height: c.bottom - c.top }, lassoIds: g.ids });
					return;
				}
				case 'tracer': {
					if (Math.abs(e.clientX - g.x0) > SEUIL) g.bouge = true;
					if (!g.bouge) return;
					g.fin = colonne(g, e.clientX);
					const debut = Math.min(g.debut, g.fin);
					const duree = Math.abs(g.fin - g.debut) + 1;
					setRendu({ ...REPOS, fantome: { lotId: g.lotId, debut, duree }, pastille: pres(e, pastille(g.d0 + debut, duree)) });
					return;
				}
				case 'deplacer': {
					const vise = colonne(g, e.clientX) - g.ancre;
					g.delta = Math.max(vise - g.depart, -Math.min(...g.groupe.map((x) => x.r0)));
					if (g.delta) g.bouge = true;
					setRendu({
						...REPOS,
						positions: Object.fromEntries(g.groupe.map((x) => [x.id, { debut: g.d0 + x.r0 + g.delta, duree: x.duree }])),
						pastille: pres(e, g.groupe.length > 1
							? pastilleGroupe(g.delta, g.groupe.length)
							: pastille(g.d0 + g.depart + g.delta, g.groupe[0].duree)),
					});
					return;
				}
				case 'allonger': {
					g.duree = Math.max(1, colonne(g, e.clientX) - g.depart + 1);
					if (g.duree !== g.duree0) g.bouge = true;
					setRendu({
						...REPOS,
						positions: { [g.periodeId]: { debut: g.d0 + g.depart, duree: g.duree } },
						pastille: pres(e, pastille(g.d0 + g.depart, g.duree)),
					});
				}
			}
		}

		/** Fin du geste : n'envoie que ce qui a changé ; un clic net sélectionne et ouvre le panneau du lot. */
		function terminer(lache: boolean) {
			const g = geste.current;
			if (!g) return;
			geste.current = null;
			setRendu(REPOS);
			if (!lache) return;
			const o = courantes.current;
			switch (g.mode) {
				case 'main':
					if (g.bouge || !g.periodeId || !g.lotId) return;
					if (g.ajout) return o.onBasculer(g.periodeId);
					o.onSelection([g.periodeId]);
					return o.onOuvrirLot(g.lotId);
				case 'lasso':
					if (g.bouge) o.onSelection(g.ids);
					return;
				case 'tracer':
					if (g.bouge) o.onTracer(g.lotId, g.d0 + Math.min(g.debut, g.fin), Math.abs(g.fin - g.debut) + 1);
					return;
				case 'deplacer':
					if (g.delta) return o.onDeplacer(g.groupe.map((x) => ({ id: x.id, debut: g.d0 + x.r0 + g.delta })));
					if (g.bouge) return;
					o.onSelection([g.periodeId]);
					return o.onOuvrirLot(g.lotId);
				case 'allonger':
					if (g.duree !== g.duree0) return o.onAllonger(g.periodeId, g.duree);
					if (!g.bouge) o.onOuvrirLot(g.lotId);
			}
		}

		const lacher = () => terminer(true);
		const annuler = () => terminer(false);
		window.addEventListener('pointermove', bouger);
		window.addEventListener('pointerup', lacher);
		window.addEventListener('pointercancel', annuler);
		window.addEventListener('blur', annuler);
		return () => {
			window.removeEventListener('pointermove', bouger);
			window.removeEventListener('pointerup', lacher);
			window.removeEventListener('pointercancel', annuler);
			window.removeEventListener('blur', annuler);
		};
	}, []);

	function onPointerDown(e: PointerEventReact<HTMLDivElement>) {
		if (e.button !== 0 || e.pointerType === 'touch') return;
		const o = courantes.current;
		const cible = e.target as HTMLElement;
		const bar = cible.closest<HTMLElement>('.g-bar');
		const ajout = e.shiftKey || e.ctrlKey || e.metaKey;

		// Outil Main : le glissement fait défiler la vue, où qu'il commence ; on ne sélectionne qu'au relâchement.
		if (o.outil === 'main') {
			geste.current = {
				mode: 'main', x0: e.clientX, gauche: e.currentTarget.scrollLeft,
				periodeId: bar?.dataset.periode ?? null, lotId: bar?.dataset.lot ?? null, ajout, bouge: false,
			};
			setRendu({ ...REPOS, saisi: true });
			e.preventDefault();
			return;
		}

		// La ligne des fermetures n'a pas de `data-lot` : rien à y tracer.
		const piste = cible.closest<HTMLElement>('.g-piste[data-lot]');
		if (!piste) return;
		const repere: Repere = { gauchePiste: piste.getBoundingClientRect().left, d0: o.debutAxe, w: o.w };
		const col = colonne(repere, e.clientX);

		if (bar) {
			const id = bar.dataset.periode!;
			const lotId = bar.dataset.lot!;
			if (ajout) {
				o.onBasculer(id);
				e.preventDefault();
				return;
			}
			const p = o.periodes.find((x) => x.id === id);
			if (!p) return;
			const depart = p.debut - o.debutAxe;
			if (e.clientX >= bar.getBoundingClientRect().right - BORD) {
				o.onSelection([id]);
				geste.current = { ...repere, mode: 'allonger', lotId, periodeId: id, depart, duree0: p.duree, duree: p.duree, bouge: false };
			} else {
				// Saisir une période d'une sélection multiple emporte tout le groupe.
				const ids = o.selection.length > 1 && o.selection.includes(id) ? o.selection : [id];
				o.onSelection(ids, id);
				geste.current = {
					...repere, mode: 'deplacer', lotId, periodeId: id, ancre: col - depart, depart, delta: 0, bouge: false,
					groupe: o.periodes.filter((x) => ids.includes(x.id)).map((x) => ({ id: x.id, r0: x.debut - o.debutAxe, duree: x.duree })),
				};
			}
		} else if (e.shiftKey) {
			geste.current = { mode: 'lasso', x0: e.clientX, y0: e.clientY, ids: [], bouge: false };
		} else {
			geste.current = { ...repere, mode: 'tracer', lotId: piste.dataset.lot!, x0: e.clientX, debut: col, fin: col, bouge: false };
		}
		e.preventDefault();
	}

	return { rendu, onPointerDown };
}
