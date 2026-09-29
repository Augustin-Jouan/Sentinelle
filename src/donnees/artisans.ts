import { z } from 'zod';
import { ErreurMetier } from '@/domaine/erreurs';
import { estDoublon } from './erreursPrisma';
import { prisma } from './prisma';

export type ArtisanFiche = {
	id: string; nom: string; adresse: string; cp: string; commune: string;
	interlocuteur: string; telephone: string; email: string; actif: boolean; nombreLots: number;
};

export type ChampArtisan = 'nom' | 'adresse' | 'cp' | 'commune' | 'interlocuteur' | 'telephone' | 'email';

const REGLES: Record<ChampArtisan, z.ZodType<string>> = {
	nom: z.string().trim().min(1, "Le nom de l'entreprise est obligatoire.").max(120, '120 caractères au plus.'),
	adresse: z.string().trim().max(200, '200 caractères au plus.'),
	cp: z.string().trim().max(10, '10 caractères au plus.'),
	commune: z.string().trim().max(100, '100 caractères au plus.'),
	interlocuteur: z.string().trim().max(100, '100 caractères au plus.'),
	telephone: z.string().trim().max(30, '30 caractères au plus.'),
	email: z.string().refine((v) => v === '' || z.email().safeParse(v).success, 'Adresse e-mail invalide.'),
};

function valider(champ: ChampArtisan, valeur: string): string {
	const r = REGLES[champ].safeParse(champ === 'email' ? valeur.trim() : valeur);
	if (!r.success) throw new ErreurMetier(r.error.issues[0].message, champ);
	return r.data;
}

/** « Z.I. du Pigeon Blanc, 35640 MARTIGNÉ-FERCHAUD » */
export function adresseArtisan(a: { adresse: string; cp: string; commune: string } | null): string {
	if (!a) return '';
	return [a.adresse, [a.cp, a.commune].filter(Boolean).join(' ')].filter((x) => x.trim()).join(', ');
}

export async function listerArtisans(): Promise<ArtisanFiche[]> {
	const lignes = await prisma.artisan.findMany({ orderBy: { nom: 'asc' }, include: { _count: { select: { lots: true } } } });
	return lignes.map(({ _count, ...a }) => ({ ...a, nombreLots: _count.lots }));
}

export async function creerArtisan(nom: string): Promise<string> {
	try {
		return (await prisma.artisan.create({ data: { nom: valider('nom', nom) } })).id;
	} catch (e) {
		if (estDoublon(e)) throw new ErreurMetier('Une entreprise porte déjà ce nom.', 'nom');
		throw e;
	}
}

export async function modifierChampArtisan(id: string, champ: ChampArtisan, valeur: string): Promise<void> {
	try {
		await prisma.artisan.update({ where: { id }, data: { [champ]: valider(champ, valeur) } });
	} catch (e) {
		if (estDoublon(e)) throw new ErreurMetier('Une entreprise porte déjà ce nom.', 'nom');
		throw e;
	}
}

/** Pas de suppression : une entreprise se désactive et disparaît du menu d'attribution. */
export async function changerActiviteArtisan(id: string, actif: boolean): Promise<void> {
	await prisma.artisan.update({ where: { id }, data: { actif } });
}
