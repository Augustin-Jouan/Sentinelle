'use server';

import { revalidatePath } from 'next/cache';
import { genererMarche, genererMarchesManquants, genererRecap, type ResultatGeneration } from '@/documents/generer';
import { prisma } from '@/donnees/prisma';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');

export async function genererMarcheAction(lotId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererMarche(lotId, u.id);
		const { chantierId } = await prisma.lot.findUniqueOrThrow({ where: { id: lotId }, select: { chantierId: true } });
		rafraichir(chantierId);
		return r;
	});
}

export async function genererRecapAction(chantierId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererRecap(chantierId, u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function genererMarchesManquantsAction(chantierId: string): Promise<Resultat<{ generes: string[]; ignores: { lot: string; raison: string }[] }>> {
	return executer({}, async (u) => {
		const r = await genererMarchesManquants(chantierId, u.id);
		rafraichir(chantierId);
		return r;
	});
}
