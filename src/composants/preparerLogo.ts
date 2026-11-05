import { ErreurMetier } from '@/domaine/erreurs';
import { LOGO_TAILLE_MAX } from '@/domaine/logo';

const FICHIER_MAX = 2 * 1024 * 1024;
const FORMATS = ['image/png', 'image/jpeg'];
/** Plus grand côté, en pixels : 600 suffit largement au plus grand cadre imprimé ; on descend si l'image reste trop lourde. */
const COTES = [600, 450, 300];

/**
 * Dans le navigateur : réduit l'image avant l'envoi, car chaque document figé garde une copie du logo.
 * Le serveur revérifie le résultat (verifierLogo).
 */
export async function preparerLogo(fichier: File): Promise<string> {
	if (!FORMATS.includes(fichier.type)) throw new ErreurMetier('Choisissez une image PNG ou JPEG.');
	if (fichier.size > FICHIER_MAX) throw new ErreurMetier('Cette image dépasse 2 Mo.');
	const image = await createImageBitmap(fichier).catch(() => {
		throw new ErreurMetier('Cette image est illisible.');
	});
	try {
		for (const cote of COTES) {
			const echelle = Math.min(1, cote / Math.max(image.width, image.height));
			const toile = document.createElement('canvas');
			toile.width = Math.round(image.width * echelle);
			toile.height = Math.round(image.height * echelle);
			toile.getContext('2d')!.drawImage(image, 0, 0, toile.width, toile.height);
			const resultat = toile.toDataURL(fichier.type, 0.9);
			if (resultat.length <= LOGO_TAILLE_MAX) return resultat;
		}
		throw new ErreurMetier('Cette image est trop lourde.');
	} finally {
		image.close();
	}
}
