/**
 * Le lien « Aide » du menu Mon compte : l'adresse du guide d'utilisation, réglée par `URL_AIDE` sur le serveur
 * (lue à chaque requête, pas figée dans l'image). Vide ou autre chose qu'une adresse http(s) : pas de lien.
 */
export function lienAide(valeur: string | undefined): string | null {
	const texte = valeur?.trim();
	if (!texte) return null;
	try {
		const url = new URL(texte);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch {
		return null;
	}
}
