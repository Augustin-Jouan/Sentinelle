import artisans from '../../prisma/donnees/artisans.json';
import { creerCompteAvecMotDePasse } from './comptes';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';

export const ARTISANS_INITIAUX: { nom: string; adresse: string; cp: string; commune: string; interlocuteur: string; telephone: string }[] = artisans;

/** Idempotent : ne touche jamais à des paramètres déjà présents. */
export async function seedParametres(): Promise<void> {
	if ((await prisma.parametres.count()) === 0) await prisma.parametres.create({ data: PARAMETRES_PAR_DEFAUT });
}

/** Idempotent : ne charge le référentiel que s'il est vide. Renvoie le nombre d'artisans ajoutés. */
export async function seedArtisans(): Promise<number> {
	if ((await prisma.artisan.count()) > 0) return 0;
	return (await prisma.artisan.createMany({ data: ARTISANS_INITIAUX })).count;
}

/** Crée l'admin seulement s'il n'en existe aucun ; n'écrase jamais un mot de passe. */
export async function creerPremierAdmin(p: { email: string; nom: string; motDePasse: string }): Promise<'cree' | 'existe'> {
	if ((await prisma.utilisateur.count({ where: { role: 'admin' } })) > 0) return 'existe';
	await creerCompteAvecMotDePasse({ ...p, role: 'admin', doitChangerMotDePasse: false });
	return 'cree';
}
