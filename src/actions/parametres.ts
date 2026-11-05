'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { modifierLogo, modifierParametre, type ChampParametres } from '@/donnees/parametres';
import { executer, type Resultat } from './executer';

const CHAMPS = [
	'raisonSociale', 'libelleActivite', 'adresse', 'cp', 'ville', 'telephone', 'fax', 'email', 'villeSignature',
	'rcs', 'ape', 'tvaIntracommunautaire', 'siteWeb',
] as const;

export async function modifierParametreAction(champ: ChampParametres, valeur: string): Promise<Resultat> {
	return executer({ admin: true }, async () => {
		await modifierParametre(z.enum(CHAMPS).parse(champ), z.string().max(200, '200 caractères au plus.').parse(valeur));
		revalidatePath('/parametres');
		return null;
	});
}

export async function modifierLogoAction(logo: string | null): Promise<Resultat> {
	return executer({ admin: true }, async () => {
		await modifierLogo(z.string().nullable().parse(logo));
		revalidatePath('/parametres');
		return null;
	});
}
