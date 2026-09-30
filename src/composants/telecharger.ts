/** Télécharge un fichier servi en pièce jointe sans quitter la page (l'aperçu se ferme juste après). */
export function telecharger(href: string): void {
	const lien = document.createElement('a');
	lien.href = href;
	lien.download = '';
	lien.click();
}
