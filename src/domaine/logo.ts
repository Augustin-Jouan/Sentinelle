import { ErreurMetier } from './erreurs';

/** Longueur maximale de l'image encodée. Chaque document figé en garde une copie, et le navigateur réduit l'image avant l'envoi. */
export const LOGO_TAILLE_MAX = 300_000;

const FORME = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/;
/** Début du fichier en base64 : un type annoncé ne prouve rien. */
const SIGNATURES = { png: 'iVBORw0KGg', jpeg: '/9j/' } as const;

/** Seuls de vrais PNG et JPEG entrent : le logo s'affiche dans l'application et s'imprime sur tous les documents. */
export function verifierLogo(valeur: string): void {
	if (valeur.length > LOGO_TAILLE_MAX) throw new ErreurMetier('Cette image est trop lourde.');
	const forme = FORME.exec(valeur);
	if (!forme || !forme[2].startsWith(SIGNATURES[forme[1] as keyof typeof SIGNATURES])) {
		throw new ErreurMetier('Choisissez une image PNG ou JPEG.');
	}
}
