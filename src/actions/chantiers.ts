'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { creerChantier, marquerTermine, modifierChampChantier, supprimerChantier, type ChampChantier, type SaisieChantier } from '@/donnees/chantiers';
import { executer, type Resultat } from './executer';

const CHAMPS = ['reference', 'maitreOuvrage', 'adresseClient', 'natureTravaux', 'adresse', 'cp', 'commune', 'mission', 'dateSignaturePrevue', 'chargeAffaireId'] as const;

export async function creerChantierAction(saisie: SaisieChantier): Promise<Resultat<{ id: string }>> {
	return executer({}, async (u) => {
		const id = await creerChantier(saisie, u.id);
		revalidatePath('/chantiers');
		revalidatePath('/', 'layout');
		return { id };
	});
}

export async function modifierChampChantierAction(id: string, champ: ChampChantier, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampChantier(id, z.enum(CHAMPS).parse(champ), valeur);
		revalidatePath(`/chantiers/${id}`, 'layout');
		revalidatePath('/chantiers');
		revalidatePath('/', 'layout');
		return null;
	});
}

export async function marquerTermineAction(id: string, termine: boolean): Promise<Resultat> {
	return executer({}, async () => {
		await marquerTermine(id, termine);
		revalidatePath(`/chantiers/${id}`, 'layout');
		revalidatePath('/chantiers');
		revalidatePath('/', 'layout');
		return null;
	});
}

export async function supprimerChantierAction(id: string): Promise<Resultat> {
	return executer({}, async () => {
		await supprimerChantier(id);
		revalidatePath('/', 'layout');
		return null;
	});
}
