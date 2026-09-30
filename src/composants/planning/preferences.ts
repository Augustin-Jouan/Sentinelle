import { useMemo, useSyncExternalStore } from 'react';
import { DENSITES, type Densite } from './geometrie';

export type Outil = 'main' | 'cible';
export type Preferences = { outil: Outil; densite: Densite };
export const PREFERENCES_PAR_DEFAUT: Preferences = { outil: 'cible', densite: 'normale' };

const CLE_PREFERENCES = 'sentinelle.planning.preferences';
const cleMasques = (chantierId: string) => `sentinelle.planning.masques.${chantierId}`;

type Source = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Le navigateur si possible, la mémoire sinon : en navigation privée ou si le stockage est refusé,
 * rien ne plante et le choix vaut pour la session.
 */
export function creerStockage(source: () => Source | null) {
	const memoire = new Map<string, string>();
	const abonnes = new Set<() => void>();
	return {
		lire(cle: string): string | null {
			if (memoire.has(cle)) return memoire.get(cle)!;
			try {
				return source()?.getItem(cle) ?? null;
			} catch {
				return null;
			}
		},
		ecrire(cle: string, valeur: string): void {
			memoire.set(cle, valeur);
			try {
				source()?.setItem(cle, valeur);
			} catch {
				// Stockage refusé ou plein : le choix reste en mémoire.
			}
			for (const rappel of abonnes) rappel();
		},
		abonner(rappel: () => void): () => void {
			abonnes.add(rappel);
			return () => { abonnes.delete(rappel); };
		},
	};
}

const stockage = creerStockage(() => (typeof window === 'undefined' ? null : window.localStorage));

function json(brut: string | null): unknown {
	try {
		return brut ? JSON.parse(brut) : null;
	} catch {
		return null;
	}
}

export function lirePreferences(brut: string | null): Preferences {
	const v = json(brut) as { outil?: unknown; densite?: unknown } | null;
	return {
		outil: v?.outil === 'main' || v?.outil === 'cible' ? v.outil : PREFERENCES_PAR_DEFAUT.outil,
		densite: typeof v?.densite === 'string' && Object.hasOwn(DENSITES, v.densite) ? (v.densite as Densite) : PREFERENCES_PAR_DEFAUT.densite,
	};
}

export function lireMasques(brut: string | null): string[] {
	const v = json(brut);
	return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Outil et densité (communs à tous les chantiers), lots masqués (par chantier). Le serveur rend les valeurs
 * par défaut ; le navigateur passe aux valeurs enregistrées juste après l'hydratation, sans décalage.
 */
export function usePreferencesPlanning(chantierId: string) {
	const cle = cleMasques(chantierId);
	const brutPreferences = useSyncExternalStore(stockage.abonner, () => stockage.lire(CLE_PREFERENCES), () => null);
	const brutMasques = useSyncExternalStore(stockage.abonner, () => stockage.lire(cle), () => null);
	const preferences = useMemo(() => lirePreferences(brutPreferences), [brutPreferences]);
	const masques = useMemo(() => lireMasques(brutMasques), [brutMasques]);
	return {
		preferences,
		masques,
		changerPreferences: (p: Preferences) => stockage.ecrire(CLE_PREFERENCES, JSON.stringify(p)),
		basculerLot: (lotId: string) => stockage.ecrire(cle, JSON.stringify(masques.includes(lotId) ? masques.filter((x) => x !== lotId) : [...masques, lotId])),
		toutAfficher: () => stockage.ecrire(cle, '[]'),
	};
}
