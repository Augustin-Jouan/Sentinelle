'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ajouterLot, attribuerArtisan, CHAMPS_LOT, changerNature, modifierChampLot, supprimerLot, type ChampLot } from '@/donnees/lots';
import { executer, type Resultat } from './executer';

// La liste des chantiers affiche le total TTC : elle se rafraîchit aussi.
const rafraichir = (chantierId: string) => {
	revalidatePath(`/chantiers/${chantierId}`, 'layout');
	revalidatePath('/chantiers');
};

export async function modifierChampLotAction(lotId: string, champ: ChampLot, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		const { chantierId } = await modifierChampLot(lotId, z.enum(CHAMPS_LOT).parse(champ), z.string().parse(valeur));
		rafraichir(chantierId);
		return null;
	});
}

export async function ajouterLotAction(chantierId: string): Promise<Resultat<{ id: string }>> {
	return executer({}, async () => {
		const id = await ajouterLot(chantierId);
		rafraichir(chantierId);
		return { id };
	});
}

export async function supprimerLotAction(lotId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await supprimerLot(lotId)).chantierId);
		return null;
	});
}

export async function attribuerArtisanAction(lotId: string, artisanId: string | null): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await attribuerArtisan(lotId, artisanId)).chantierId);
		return null;
	});
}

export async function changerNatureAction(lotId: string, nature: 'GRE_A_GRE' | 'SOUS_TRAITANCE'): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await changerNature(lotId, z.enum(['GRE_A_GRE', 'SOUS_TRAITANCE']).parse(nature))).chantierId);
		return null;
	});
}
