import type { Parametres } from '@/generated/prisma/client';
import { prisma } from './prisma';

/** Valeurs d'installation (spec § 4) ; l'admin les corrige dans la page Paramètres. */
export const PARAMETRES_PAR_DEFAUT = {
	id: 1,
	raisonSociale: 'S.A.S SOCOREVE',
	libelleActivite: 'Société Construction Rénovation Vente',
	adresse: '71 rue du Général Patton',
	cp: '44110',
	ville: 'Châteaubriant',
	telephone: '02 40 81 40 26',
	fax: null,
	email: 'contact@socoreve-chateaubriant.fr',
	villeSignature: 'Châteaubriant',
} satisfies Parametres;

export async function lireParametres(): Promise<Parametres> {
	return (await prisma.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT;
}
