import { lireParametres } from '@/donnees/parametres';
import { prisma } from '@/donnees/prisma';
import { ErreurMetier } from '@/domaine/erreurs';
import { batirMarche, batirRecap, type SourceChantier, type SourceLot, type SourceParametres } from './batir';
import type { DonneesMarche, DonneesRecap } from './schemas';

const includeChantier = {
	chargeAffaire: true,
	lots: { orderBy: { ordre: 'asc' as const }, include: { artisan: true } },
};

type ChantierLu = NonNullable<Awaited<ReturnType<typeof lireChantierBrut>>>;

function lireChantierBrut(where: { id: string }) {
	return prisma.chantier.findUnique({ where, include: includeChantier });
}

function versSources(c: ChantierLu): { chantier: SourceChantier; lots: SourceLot[] } {
	return {
		chantier: {
			reference: c.reference, maitreOuvrage: c.maitreOuvrage, adresseClient: c.adresseClient,
			natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune,
			mission: c.mission, dateSignaturePrevue: c.dateSignaturePrevue, chargeAffaire: c.chargeAffaire.name,
		},
		lots: c.lots.map((l) => ({
			id: l.id, numero: l.numero, designation: l.designation, nature: l.nature,
			montantHtInitial: l.montantHtInitial.toString(), tauxTva: l.tauxTva.toString(),
			retenueGarantie: l.retenueGarantie.toString(), exemplaires: l.exemplaires,
			corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere,
			dateSignature: l.dateSignature, artisanId: l.artisanId,
			artisan: l.artisan && {
				nom: l.artisan.nom, adresse: l.artisan.adresse, cp: l.artisan.cp, commune: l.artisan.commune,
				interlocuteur: l.artisan.interlocuteur, telephone: l.artisan.telephone,
			},
		})),
	};
}

export async function lireSources(chantierId: string): Promise<{ chantier: SourceChantier; lots: SourceLot[]; parametres: SourceParametres }> {
	const [c, parametres] = await Promise.all([lireChantierBrut({ id: chantierId }), lireParametres()]);
	if (!c) throw new ErreurMetier('Chantier introuvable.');
	return { ...versSources(c), parametres };
}

export async function construireDonneesMarche(lotId: string, maintenant = new Date()): Promise<{ chantierId: string; chantier: SourceChantier; lot: SourceLot; donnees: DonneesMarche }> {
	const { chantierId } = await prisma.lot.findUniqueOrThrow({ where: { id: lotId }, select: { chantierId: true } });
	const { chantier, lots, parametres } = await lireSources(chantierId);
	const lot = lots.find((l) => l.id === lotId)!;
	return { chantierId, chantier, lot, donnees: batirMarche(chantier, lot, parametres, maintenant) };
}

export async function construireDonneesRecap(chantierId: string, maintenant = new Date()): Promise<{ chantier: SourceChantier; donnees: DonneesRecap }> {
	const { chantier, lots, parametres } = await lireSources(chantierId);
	return { chantier, donnees: batirRecap(chantier, lots, parametres, maintenant) };
}
