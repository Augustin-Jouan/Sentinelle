'use client';

import { useEffect } from 'react';

/** Le dernier chantier ouvert dans ce navigateur : la pastille « Ouvert » de l'accueil (state.currentId de la maquette). */
export const CLE_CHANTIER_OUVERT = 'sentinelle-chantier-ouvert';

export function lireChantierOuvert(): string | null {
	try { return localStorage.getItem(CLE_CHANTIER_OUVERT); } catch { return null; }
}

/** Posé par le layout d'un chantier : ouvrir un chantier en fait le chantier courant. */
export function MemoriserChantierOuvert({ id }: { id: string }) {
	useEffect(() => {
		try { localStorage.setItem(CLE_CHANTIER_OUVERT, id); } catch { /* stockage indisponible : pas de pastille */ }
	}, [id]);
	return null;
}
