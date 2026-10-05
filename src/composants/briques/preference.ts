'use client';

import { useSyncExternalStore } from 'react';

const memoire = new Map<string, string>();
const abonnes = new Set<() => void>();
function abonner(rappel: () => void) {
	abonnes.add(rappel);
	return () => { abonnes.delete(rappel); };
}
function notifier() {
	for (const r of abonnes) r();
}

function lireBrut(cle: string): string | null {
	if (memoire.has(cle)) return memoire.get(cle)!;
	try {
		return localStorage.getItem(cle);
	} catch {
		return null;
	}
}

/** Mémoire d'abord, puis le navigateur : si le stockage lève, le choix vaut pour la page. */
export function changerPreference<T>(cle: string, v: T): void {
	const json = JSON.stringify(v);
	memoire.set(cle, json);
	try { localStorage.setItem(cle, json); } catch { /* le choix vaut pour la page */ }
	notifier();
}

/** `brut` : le JSON du stockage, ou `null` (rendu serveur / hydratation). */
export function interpreterPreference<T>(brut: string | null, defaut: T, valide: (v: unknown) => v is T): T {
	try {
		const lu: unknown = JSON.parse(brut ?? 'null');
		if (valide(lu)) return lu;
	} catch { /* stockage indisponible ou valeur corrompue : le défaut reste */ }
	return defaut;
}

export function valeurPreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): T {
	return interpreterPreference(lireBrut(cle), defaut, valide);
}

/** Lue après le montage (le rendu serveur et l'hydratation prennent le défaut) ; une valeur illisible ou d'une ancienne version est ignorée. */
export function usePreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): [T, (v: T) => void] {
	const brut = useSyncExternalStore(abonner, () => lireBrut(cle), () => null);
	return [interpreterPreference(brut, defaut, valide), (v) => changerPreference(cle, v)];
}
