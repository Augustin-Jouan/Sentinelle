'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ChampReception, ChampReceptionCommun } from '@/domaine/reception';
import {
	annulerLevee, genererReceptions, leverReserves, modifierChampReception, modifierChampReceptionCommun, preparerReceptions,
	type ReceptionsOuvertes, type ResultatReception,
} from '@/donnees/receptions';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const id = z.string().min(1);
const champLot = z.enum(['decision', 'dateEffet', 'reserves', 'delai', 'motifs', 'representant']);
const champCommun = z.enum(['date', 'signataire', 'contrat', 'maitreOeuvre']);
const valeur = z.string().max(4000);

/** Remplit les champs communs vides et crée les brouillons : POST, pas le GET de la page. */
export async function preparerReceptionsAction(chantierId: string, cible: string): Promise<Resultat<ReceptionsOuvertes | null>> {
	return executer({}, async () => preparerReceptions(id.parse(chantierId), z.string().min(1).parse(cible)));
}
export async function modifierChampReceptionAction(lotId: string, champ: ChampReception, v: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampReception(id.parse(lotId), champLot.parse(champ), valeur.parse(v));
		return null;
	});
}

export async function modifierChampReceptionCommunAction(chantierId: string, champ: ChampReceptionCommun, v: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampReceptionCommun(id.parse(chantierId), champCommun.parse(champ), valeur.parse(v));
		return null;
	});
}

/** `lotIds` : les pages que l'aperçu affiche, et elles seules. */
export async function genererReceptionsAction(chantierId: string, lotIds: string[]): Promise<Resultat<ResultatReception[]>> {
	return executer({}, async (u) => {
		const r = await genererReceptions(id.parse(chantierId), z.array(id).max(200).parse(lotIds), u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function leverReservesAction(lotId: string, date: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await leverReserves(id.parse(lotId), z.string().max(10).parse(date))).chantierId);
		return null;
	});
}

export async function annulerLeveeAction(lotId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await annulerLevee(id.parse(lotId))).chantierId);
		return null;
	});
}
