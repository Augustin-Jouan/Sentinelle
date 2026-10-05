'use client';

import { useLayoutEffect } from 'react';
import { appliquerTheme, CLE_THEME } from './theme';

/** Recopie un thème déjà choisi (localStorage) vers le cookie, pour les visites suivantes sans flash. */
export function InitTheme() {
	useLayoutEffect(() => {
		try {
			const t = localStorage.getItem(CLE_THEME);
			if (t === 'light' || t === 'dark') appliquerTheme(t);
		} catch { /* stockage indisponible */ }
	}, []);
	return null;
}
