'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ajouterAvenant, CHAMPS_AVENANT, modifierChampAvenant, supprimerAvenant, type ChampAvenant } from '@/donnees/avenants';
import { executer, type Resultat } from './executer';

// Un avenant change le montant engagé : la liste des chantiers (total TTC) se rafraîchit aussi.
const rafraichir = (chantierId: string) => {
	revalidatePath(`/chantiers/${chantierId}`, 'layout');
	revalidatePath('/chantiers');
};

export async function ajouterAvenantAction(lotId: string): Promise<Resultat<{ id: string; numero: number; message: string }>> {
	return executer({}, async () => {
		const { chantierId, id, numero, message } = await ajouterAvenant(z.string().parse(lotId));
		rafraichir(chantierId);
		return { id, numero, message };
	});
}

export async function modifierAvenantAction(avenantId: string, champ: ChampAvenant, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await modifierChampAvenant(z.string().parse(avenantId), z.enum(CHAMPS_AVENANT).parse(champ), z.string().parse(valeur))).chantierId);
		return null;
	});
}

export async function supprimerAvenantAction(avenantId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await supprimerAvenant(z.string().parse(avenantId))).chantierId);
		return null;
	});
}
