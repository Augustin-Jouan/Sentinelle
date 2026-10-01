'use client';

import { useSyncExternalStore } from 'react';

const abonnes = new Set<() => void>();
function abonner(rappel: () => void) {
	abonnes.add(rappel);
	return () => { abonnes.delete(rappel); };
}
function notifier() {
	for (const r of abonnes) r();
}

function lireBrut(cle: string): string | null {
	try {
		return localStorage.getItem(cle);
	} catch {
		return null;
	}
}

/** Lue après le montage (le rendu serveur prend le défaut) ; une valeur illisible ou d'une ancienne version est ignorée. */
export function usePreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): [T, (v: T) => void] {
	const brut = useSyncExternalStore(abonner, () => lireBrut(cle), () => null);
	let valeur = defaut;
	try {
		const lu: unknown = JSON.parse(brut ?? 'null');
		if (valide(lu)) valeur = lu;
	} catch { /* stockage indisponible ou valeur corrompue : le défaut reste */ }
	function changer(v: T) {
		try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* le choix vaut pour la page */ }
		notifier();
	}
	return [valeur, changer];
}
