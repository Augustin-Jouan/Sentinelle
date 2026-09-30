import {
	AVENANT_DISPARU, lireMontantAvenant, numeroAvenantTexte, SUPPRESSION_NEGATIVE, verifierEngage,
} from '@/domaine/avenants';
import { verifierDate } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { dateParis } from '@/domaine/semaines';
import { prisma } from './prisma';
import { montantsAvenants, sousVerrouLot } from './verrouLot';

export const CHAMPS_AVENANT = ['devis', 'montantHt', 'date', 'objet'] as const;
export type ChampAvenant = (typeof CHAMPS_AVENANT)[number];

const LIMITES: Record<'devis' | 'objet', [number, string]> = {
	devis: [40, 'Le numéro de devis est limité à 40 caractères.'],
	objet: [600, "L'objet est limité à 600 caractères."],
};

async function lotDe(avenantId: string): Promise<string> {
	const a = await prisma.avenant.findUnique({ where: { id: avenantId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(AVENANT_DISPARU);
	return a.lotId;
}

/** Numéro = compteur du lot + 1, sous verrou du lot : jamais réattribué, même après suppression (spec § 5). */
export async function ajouterAvenant(lotId: string, maintenant = new Date()): Promise<{ chantierId: string; id: string; numero: number; message: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		const { dernierNumeroAvenant: numero } = await tx.lot.update({
			where: { id: lotId }, data: { dernierNumeroAvenant: { increment: 1 } }, select: { dernierNumeroAvenant: true },
		});
		const a = await tx.avenant.create({ data: { lotId, numero, date: dateParis(maintenant) } });
		return { chantierId: lot.chantierId, id: a.id, numero, message: `Avenant n° ${numeroAvenantTexte(numero)} ajouté — saisissez son montant.` };
	});
}

/** Le montant est contrôlé avec les avenants relus sous verrou : deux moins-values simultanées ne rendent pas le lot négatif. */
export async function modifierChampAvenant(avenantId: string, champ: ChampAvenant, valeur: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDe(avenantId), async (tx, lot) => {
		const avenant = lot.avenants.find((a) => a.id === avenantId);
		if (!avenant) throw new ErreurMetier(AVENANT_DISPARU);
		let donnees: { devis?: string; montantHt?: string; date?: Date; objet?: string };
		if (champ === 'montantHt') {
			const montant = lireMontantAvenant(valeur).toFixed(2);
			const apres = montantsAvenants(lot).map((a) => (a.numero === avenant.numero ? { ...a, montantHt: montant } : a));
			verifierEngage(lot.montantHtInitial.toString(), apres);
			donnees = { montantHt: montant };
		} else if (champ === 'date') {
			donnees = { date: new Date(`${verifierDate(valeur.trim())}T00:00:00Z`) };
		} else {
			const texte = valeur.trim();
			const [max, message] = LIMITES[champ];
			if (texte.length > max) throw new ErreurMetier(message, champ);
			donnees = champ === 'devis' ? { devis: texte } : { objet: texte };
		}
		await tx.avenant.update({ where: { id: avenantId }, data: donnees });
		return { chantierId: lot.chantierId };
	});
}

/** Suppression libre : le numéro reste pris, les lettres déjà générées restent (pas de clé étrangère). */
export async function supprimerAvenant(avenantId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDe(avenantId), async (tx, lot) => {
		if (!lot.avenants.some((a) => a.id === avenantId)) throw new ErreurMetier(AVENANT_DISPARU);
		verifierEngage(
			lot.montantHtInitial.toString(),
			montantsAvenants({ avenants: lot.avenants.filter((a) => a.id !== avenantId) }),
			SUPPRESSION_NEGATIVE,
		);
		await tx.avenant.delete({ where: { id: avenantId } });
		return { chantierId: lot.chantierId };
	});
}
