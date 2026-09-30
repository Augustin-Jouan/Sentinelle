'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ReponsePlanning } from '@/domaine/planningVue';
import { depuisIso } from '@/domaine/semaines';
import * as planning from '@/donnees/planning';
import type { ChampFermeture, ChampPeriode } from '@/donnees/planning';
import { dureePeriode } from './dureePeriode';
import { executer, type Resultat } from './executer';

const id = z.string().min(1);
const dateIso = z.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide.')
	.refine((s) => !Number.isNaN(depuisIso(s).getTime()), 'Date invalide.');
const champPeriode = z.enum(['intitule', 'semaine', 'annee', 'duree']);
const champFermeture = z.enum(['libelle', 'semaine', 'annee', 'duree']);
const valeur = z.string().max(500);

/** L'écran reçoit le planning dans la réponse : seule la page Documents (états « modifié ») est à revalider. */
async function repondre(travail: Promise<ReponsePlanning>): Promise<ReponsePlanning> {
	const r = await travail;
	revalidatePath(`/chantiers/${r.planning.chantierId}/documents`);
	return r;
}

export async function creerPeriodeAction(lotId: string, debut: string, semaines: number): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.creerPeriode(id.parse(lotId), dateIso.parse(debut), dureePeriode.parse(semaines))));
}

export async function deplacerPeriodesAction(chantierId: string, mouvements: { id: string; debut: string }[]): Promise<Resultat<ReponsePlanning>> {
	const schema = z.array(z.object({ id, debut: dateIso })).min(1);
	return executer({}, () => repondre(planning.deplacerPeriodes(id.parse(chantierId), schema.parse(mouvements))));
}

export async function modifierPeriodeAction(periodeId: string, champ: ChampPeriode, texte: string): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.modifierPeriode(id.parse(periodeId), champPeriode.parse(champ), valeur.parse(texte))));
}

export async function lierPeriodeAction(periodeId: string, dependDeId: string | null): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.lierPeriode(id.parse(periodeId), id.nullable().parse(dependDeId))));
}

export async function supprimerPeriodesAction(chantierId: string, ids: string[]): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.supprimerPeriodes(id.parse(chantierId), z.array(id).min(1).parse(ids))));
}

export async function ajouterFermetureAction(chantierId: string): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.ajouterFermeture(id.parse(chantierId))));
}

export async function modifierFermetureAction(fermetureId: string, champ: ChampFermeture, texte: string): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.modifierFermeture(id.parse(fermetureId), champFermeture.parse(champ), valeur.parse(texte))));
}

export async function supprimerFermetureAction(fermetureId: string): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.supprimerFermeture(id.parse(fermetureId))));
}

export async function changerCouleurLotAction(lotId: string, couleur: string): Promise<Resultat<ReponsePlanning>> {
	return executer({}, () => repondre(planning.changerCouleurLot(id.parse(lotId), z.string().parse(couleur))));
}
