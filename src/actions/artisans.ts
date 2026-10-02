'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { changerActiviteArtisan, creerArtisan, modifierChampArtisan, type ChampArtisan } from '@/donnees/artisans';
import { executer, type Resultat } from './executer';

const CHAMPS = ['nom', 'adresse', 'cp', 'commune', 'interlocuteur', 'telephone', 'email'] as const;

// Un artisan apparaît sur les marchés : on rafraîchit aussi les pages de chantier.
function rafraichir() {
	revalidatePath('/artisans');
	revalidatePath('/chantiers', 'layout');
}

export async function creerArtisanAction(nom: string): Promise<Resultat<{ id: string }>> {
	return executer({}, async () => {
		const id = await creerArtisan(nom);
		rafraichir();
		revalidatePath('/', 'layout');
		return { id };
	});
}

export async function modifierChampArtisanAction(id: string, champ: ChampArtisan, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampArtisan(id, z.enum(CHAMPS).parse(champ), valeur);
		rafraichir();
		return null;
	});
}

export async function changerActiviteArtisanAction(id: string, actif: boolean): Promise<Resultat> {
	return executer({}, async () => {
		await changerActiviteArtisan(id, actif);
		rafraichir();
		return null;
	});
}
