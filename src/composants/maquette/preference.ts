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

export function valeurPreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): T {
	try {
		const lu: unknown = JSON.parse(lireBrut(cle) ?? 'null');
		if (valide(lu)) return lu;
	} catch { /* stockage indisponible ou valeur corrompue : le défaut reste */ }
	return defaut;
}

/** Lue après le montage (le rendu serveur prend le défaut) ; une valeur illisible ou d'une ancienne version est ignorée. */
export function usePreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): [T, (v: T) => void] {
	useSyncExternalStore(abonner, () => lireBrut(cle), () => null);
	return [valeurPreference(cle, defaut, valide), (v) => changerPreference(cle, v)];
}
