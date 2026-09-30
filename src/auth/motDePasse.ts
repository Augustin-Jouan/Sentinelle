import { randomInt } from 'node:crypto';

// Sans 0/O, 1/l/I : le mot de passe se recopie à la main sans erreur.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function genererMotDePasse(longueur = 16): string {
	return Array.from({ length: longueur }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}
