'use client';

import { useSyncExternalStore } from 'react';

/** Le point de rupture max-etroit: (theme.css), en requête média. */
const ETROIT = '(width < 60rem)';

function abonner(prevenir: () => void) {
	const m = window.matchMedia(ETROIT);
	m.addEventListener('change', prevenir);
	return () => m.removeEventListener('change', prevenir);
}

/**
 * L'écran est-il étroit (un téléphone) ? Pour les rares cas où le CSS ne suffit pas : changer d'élément, pas
 * d'apparence (un champ d'une ligne qui devient un texte sur plusieurs). Le serveur rend la version large ; le
 * téléphone bascule juste après l'hydratation.
 */
export function useEtroit(): boolean {
	return useSyncExternalStore(abonner, () => window.matchMedia(ETROIT).matches, () => false);
}
