'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ResultatGeneration } from '@/documents/generer';
import {
	ajouterAcompteManuel, changerCaution, corrigerCertificat, genererCertificat, modifierAcompteManuel, saisiesCertificatSchema,
	supprimerAcompteManuel, type SaisiesCertificat,
} from '@/donnees/acomptes';
import { prisma } from '@/donnees/prisma';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const chantierDu = async (documentId: string) =>
	(await prisma.document.findUniqueOrThrow({ where: { id: documentId }, select: { chantierId: true } })).chantierId;
const id = z.string().min(1);
const nouveauSchema = saisiesCertificatSchema.extend({ numeroAttendu: z.number().int().min(1) });

export async function genererCertificatAction(lotId: string, saisies: SaisiesCertificat & { numeroAttendu: number }): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const { acompteId: _acompte, ...r } = await genererCertificat(id.parse(lotId), nouveauSchema.parse(saisies), u.id);
		rafraichir(await chantierDu(r.documentId));
		return r;
	});
}

export async function corrigerCertificatAction(acompteId: string, saisies: SaisiesCertificat): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await corrigerCertificat(id.parse(acompteId), saisiesCertificatSchema.parse(saisies), u.id);
		rafraichir(await chantierDu(r.documentId));
		return r;
	});
}

export async function ajouterAcompteManuelAction(lotId: string, saisie: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await ajouterAcompteManuel(id.parse(lotId), z.string().max(40).parse(saisie))).chantierId);
		return null;
	});
}

export async function modifierAcompteManuelAction(acompteId: string, saisie: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await modifierAcompteManuel(id.parse(acompteId), z.string().max(40).parse(saisie))).chantierId);
		return null;
	});
}

export async function supprimerAcompteManuelAction(acompteId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await supprimerAcompteManuel(id.parse(acompteId))).chantierId);
		return null;
	});
}

export async function changerCautionAction(lotId: string, caution: boolean): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await changerCaution(id.parse(lotId), z.boolean().parse(caution))).chantierId);
		return null;
	});
}
