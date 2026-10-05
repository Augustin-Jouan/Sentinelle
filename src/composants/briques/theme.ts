/** Clé du thème choisi par l'interrupteur (cookie + localStorage, ce navigateur seulement). */
export const CLE_THEME = 'sentinelle-theme';

const MAX_AGE = 60 * 60 * 24 * 365;

function ecrireCookie(valeur: 'light' | 'dark'): void {
	document.cookie = `${CLE_THEME}=${valeur};path=/;max-age=${MAX_AGE};SameSite=Lax`;
}

/** Pose `data-theme` et s'en souvient (cookie pour le SSR, localStorage pour ce navigateur). */
export function appliquerTheme(valeur: 'light' | 'dark'): void {
	document.documentElement.setAttribute('data-theme', valeur);
	try { localStorage.setItem(CLE_THEME, valeur); } catch { /* le cookie suffit au prochain chargement */ }
	try { ecrireCookie(valeur); } catch { /* stockage indisponible : le choix vaut pour la page */ }
}

/** Bascule clair / sombre, comme flipTheme() de la maquette, et s'en souvient. */
export function basculerTheme(): void {
	const racine = document.documentElement;
	const sombre = racine.getAttribute('data-theme') === 'dark'
		|| (!racine.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
	appliquerTheme(sombre ? 'light' : 'dark');
}
