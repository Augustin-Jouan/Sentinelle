/** Clé du thème choisi par l'interrupteur (préférence de ce navigateur seulement). */
export const CLE_THEME = 'sentinelle-theme';

/** Posé en tête de <head>, avant tout rendu : pas de flash clair quand le sombre est choisi. */
export const SCRIPT_THEME = `try{var t=localStorage.getItem('${CLE_THEME}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

/** Bascule clair / sombre, comme flipTheme() de la maquette, et s'en souvient. */
export function basculerTheme(): void {
	const racine = document.documentElement;
	const sombre = racine.getAttribute('data-theme') === 'dark'
		|| (!racine.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
	const suivant = sombre ? 'light' : 'dark';
	racine.setAttribute('data-theme', suivant);
	try { localStorage.setItem(CLE_THEME, suivant); } catch { /* stockage indisponible : le choix vaut pour la page */ }
}
