'use server';

import { revalidatePath } from 'next/cache';
import { genererAvenant, genererMarche, genererMarchesManquants, genererPlanning, genererRecap, genererVisa, type ResultatGeneration } from '@/documents/generer';
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

export async function genererAvenantAction(avenantId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererAvenant(avenantId, u.id);
		const { chantierId } = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId }, select: { chantierId: true } });
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

export async function genererPlanningAction(chantierId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererPlanning(chantierId, u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function genererVisaAction(chantierId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererVisa(chantierId, u.id);
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
