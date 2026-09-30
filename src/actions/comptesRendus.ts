'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ResultatGeneration } from '@/documents/generer';
import type { SaisiesCompteRendu } from '@/documents/compteRendu';
import type { ChampCompteRendu, Convocation } from '@/domaine/compteRendu';
import {
	abandonnerBrouillon, changerConvocation, corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu,
	saisiesCompteRenduSchema,
} from '@/donnees/comptesRendus';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const id = z.string().min(1);
const champSchema = z.enum(['date', 'rdvDate', 'rdvHeure', 'avancement', 'coordination', 'redacteur', 'portable']);

export async function creerBrouillonAction(chantierId: string): Promise<Resultat<{ id: string; numero: number }>> {
	return executer({}, async () => {
		const r = await creerBrouillon(id.parse(chantierId));
		rafraichir(chantierId);
		return r;
	});
}

/** Pas de rafraîchissement : la page Documents ne montre rien des champs du brouillon. */
export async function modifierChampCompteRenduAction(compteRenduId: string, champ: ChampCompteRendu, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampCompteRendu(id.parse(compteRenduId), champSchema.parse(champ), z.string().max(25000).parse(valeur));
		return null;
	});
}

export async function changerConvocationAction(compteRenduId: string, lotId: string): Promise<Resultat<Record<string, Convocation>>> {
	return executer({}, () => changerConvocation(id.parse(compteRenduId), id.parse(lotId)));
}

export async function abandonnerBrouillonAction(compteRenduId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await abandonnerBrouillon(id.parse(compteRenduId))).chantierId);
		return null;
	});
}

export async function enregistrerCompteRenduAction(compteRenduId: string): Promise<Resultat<ResultatGeneration & { numero: number }>> {
	return executer({}, async (u) => {
		const { chantierId, ...r } = await enregistrerCompteRendu(id.parse(compteRenduId), u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function corrigerCompteRenduAction(compteRenduId: string, saisies: SaisiesCompteRendu): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const { chantierId, ...r } = await corrigerCompteRendu(id.parse(compteRenduId), saisiesCompteRenduSchema.parse(saisies), u.id);
		rafraichir(chantierId);
		return r;
	});
}
