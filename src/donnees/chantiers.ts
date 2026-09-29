import { z } from 'zod';
import { ErreurMetier } from '@/domaine/erreurs';
import { LOTS_DE_BASE } from '@/domaine/lotsDeBase';
import { formatEuros, totalArrondi, ttcEngage } from '@/domaine/montants';
import { exemplairesParDefaut } from '@/domaine/regles';
import { estDoublon } from './erreursPrisma';
import { prisma } from './prisma';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** '' → null ; 'AAAA-MM-JJ' → minuit UTC (colonne @db.Date). */
export function versDateCalendaire(valeur: string): Date | null {
	const v = valeur.trim();
	if (!v) return null;
	const d = new Date(`${v}T00:00:00Z`);
	if (!DATE.test(v) || Number.isNaN(d.getTime())) throw new ErreurMetier('Date invalide.');
	return d;
}

export function versSaisieDate(d: Date | null): string {
	return d ? d.toISOString().slice(0, 10) : '';
}

export const chantierSchema = z.object({
	reference: z.string().trim().min(1, 'La référence est obligatoire.').max(80, '80 caractères au plus.'),
	maitreOuvrage: z.string().trim().min(1, 'Le nom du client est obligatoire.').max(200, '200 caractères au plus.'),
	adresseClient: z.string().trim().max(300, '300 caractères au plus.'),
	natureTravaux: z.string().trim().max(300, '300 caractères au plus.'),
	adresse: z.string().trim().max(200, '200 caractères au plus.'),
	cp: z.string().trim().max(10, '10 caractères au plus.'),
	commune: z.string().trim().max(100, '100 caractères au plus.'),
	clientHabiteSurPlace: z.boolean(),
	mission: z.enum(['COMPLETE', 'PARTIELLE']),
	dateSignaturePrevue: z.string().trim().refine((v) => v === '' || DATE.test(v), 'Date invalide.'),
	chargeAffaireId: z.string().min(1, "Choisissez le chargé d'affaire."),
	partirDesLotsDeBase: z.boolean(),
});

export type SaisieChantier = z.input<typeof chantierSchema>;

const adresseComplete = (c: { adresse: string; cp: string; commune: string }) =>
	[c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter((x) => x.trim()).join(', ');

function traduireErreur(e: unknown): never {
	if (e instanceof z.ZodError) throw new ErreurMetier(e.issues[0].message, String(e.issues[0].path[0] ?? ''));
	if (estDoublon(e)) throw new ErreurMetier('Cette référence existe déjà.', 'reference');
	throw e;
}

export async function creerChantier(saisie: SaisieChantier, creeParId: string): Promise<string> {
	try {
		const s = chantierSchema.parse(saisie);
		const chantier = await prisma.chantier.create({
			data: {
				reference: s.reference,
				maitreOuvrage: s.maitreOuvrage,
				adresseClient: s.clientHabiteSurPlace ? adresseComplete(s) : s.adresseClient,
				natureTravaux: s.natureTravaux,
				adresse: s.adresse,
				cp: s.cp,
				commune: s.commune,
				mission: s.mission,
				dateSignaturePrevue: versDateCalendaire(s.dateSignaturePrevue),
				chargeAffaireId: s.chargeAffaireId,
				creeParId,
				lots: s.partirDesLotsDeBase
					? {
						create: LOTS_DE_BASE.map((l, i) => ({
							ordre: i + 1,
							numero: l.numero,
							designation: l.designation,
							nature: l.nature,
							couleur: l.couleur,
							exemplaires: exemplairesParDefaut(l.nature),
						})),
					}
					: undefined,
			},
		});
		return chantier.id;
	} catch (e) {
		traduireErreur(e);
	}
}

export type ChampChantier =
	| 'reference' | 'maitreOuvrage' | 'adresseClient' | 'natureTravaux' | 'adresse' | 'cp' | 'commune'
	| 'mission' | 'dateSignaturePrevue' | 'chargeAffaireId';

export async function modifierChampChantier(id: string, champ: ChampChantier, valeur: string): Promise<void> {
	try {
		const v = chantierSchema.shape[champ].parse(valeur);
		const donnee = champ === 'dateSignaturePrevue' ? versDateCalendaire(String(v)) : v;
		await prisma.chantier.update({ where: { id }, data: { [champ]: donnee } });
	} catch (e) {
		traduireErreur(e);
	}
}

export async function marquerTermine(id: string, termine: boolean): Promise<void> {
	await prisma.chantier.update({ where: { id }, data: { termine } });
}

export type ChantierListe = {
	id: string; reference: string; maitreOuvrage: string; commune: string;
	chargeAffaire: string; termine: boolean; totalTtcTexte: string;
};

export async function listerChantiers(): Promise<ChantierListe[]> {
	const lignes = await prisma.chantier.findMany({
		orderBy: { creeLe: 'desc' },
		include: { chargeAffaire: true, lots: { select: { montantHtInitial: true, tauxTva: true } } },
	});
	return lignes.map((c) => ({
		id: c.id,
		reference: c.reference,
		maitreOuvrage: c.maitreOuvrage,
		commune: c.commune,
		chargeAffaire: c.chargeAffaire.name,
		termine: c.termine,
		totalTtcTexte: formatEuros(totalArrondi(c.lots.map((l) => ttcEngage(l.montantHtInitial.toString(), l.tauxTva.toString())))),
	}));
}

export type EnTeteChantierVue = {
	id: string; reference: string; maitreOuvrage: string; adresseClient: string; natureTravaux: string;
	adresse: string; cp: string; commune: string; mission: 'COMPLETE' | 'PARTIELLE';
	dateSignaturePrevue: string; chargeAffaireId: string; termine: boolean;
};

export async function lireEnTeteChantier(id: string): Promise<EnTeteChantierVue | null> {
	const c = await prisma.chantier.findUnique({ where: { id } });
	if (!c) return null;
	return {
		id: c.id, reference: c.reference, maitreOuvrage: c.maitreOuvrage, adresseClient: c.adresseClient,
		natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune, mission: c.mission,
		dateSignaturePrevue: versSaisieDate(c.dateSignaturePrevue), chargeAffaireId: c.chargeAffaireId, termine: c.termine,
	};
}

export async function listerChargesAffaire(): Promise<{ id: string; nom: string }[]> {
	const lignes = await prisma.utilisateur.findMany({ where: { NOT: { banned: true } }, orderBy: { name: 'asc' } });
	return lignes.map((u) => ({ id: u.id, nom: u.name }));
}
