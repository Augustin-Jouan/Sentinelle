'use client';

import { useEffect, useState } from 'react';

/** Lue après le montage (le rendu serveur prend le défaut) ; une valeur illisible ou d'une ancienne version est ignorée. */
export function usePreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): [T, (v: T) => void] {
	const [valeur, setValeur] = useState<T>(defaut);
	useEffect(() => {
		try {
			const lu: unknown = JSON.parse(localStorage.getItem(cle) ?? 'null');
			if (valide(lu)) setValeur(lu);
		} catch { /* stockage indisponible ou valeur corrompue : le défaut reste */ }
	}, [cle]);   // eslint-disable-line react-hooks/exhaustive-deps -- `valide` est une fonction stable du module appelant
	function changer(v: T) {
		setValeur(v);
		try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* le choix vaut pour la page */ }
	}
	return [valeur, changer];
}
