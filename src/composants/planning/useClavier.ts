'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

type OptionsClavier = {
	nbSelection: number;
	panneauOuvert: boolean;
	onDecaler: (semaines: number) => void;
	onSupprimer: () => void;
	onVider: () => void;
};

/** Pas de raccourci dans un champ, un menu, ni quand une fenêtre (menu des lots, fermetures, confirmation, aperçu) est ouverte. */
function ignorer(e: KeyboardEvent): boolean {
	if (e.altKey || e.ctrlKey || e.metaKey) return true;
	const cible = e.target instanceof Element ? e.target : null;
	if (cible?.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="menu"], [role="listbox"]')) return true;
	return document.querySelector('[data-bloque-clavier]') !== null;
}

/** ← → décalent la sélection (Maj : 4 semaines), Suppr la supprime, Échap vide une sélection multiple. */
export function useClavier(o: OptionsClavier) {
	const options = useRef(o);
	useLayoutEffect(() => {
		options.current = o;
	});

	useEffect(() => {
		function surTouche(e: KeyboardEvent) {
			if (ignorer(e)) return;
			const { nbSelection, panneauOuvert, onDecaler, onSupprimer, onVider } = options.current;
			if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && nbSelection) {
				e.preventDefault();
				onDecaler((e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 4 : 1));
			} else if ((e.key === 'Delete' || e.key === 'Backspace') && nbSelection) {
				e.preventDefault();
				onSupprimer();
			} else if (e.key === 'Escape' && !panneauOuvert && nbSelection > 1) {
				// Panneau ouvert : Échap le ferme (le Sheet s'en charge) et garde la sélection.
				onVider();
			}
		}
		window.addEventListener('keydown', surTouche);
		return () => window.removeEventListener('keydown', surTouche);
	}, []);
}
