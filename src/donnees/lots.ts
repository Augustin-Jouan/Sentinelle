import Decimal from 'decimal.js';
import { HT_INFERIEUR_AVENANTS, sommeAvenants, verifierEngage } from '@/domaine/avenants';
import { ErreurMetier } from '@/domaine/erreurs';
import { htDepuisTtc, lireNombreFr } from '@/domaine/montants';
import { exemplairesParDefaut, type Nature } from '@/domaine/regles';
import { versDateCalendaire } from './chantiers';
import { estCleEtrangere } from './erreursPrisma';
import { prisma } from './prisma';
import { montantsAvenants, sousVerrouLot, verrouillerChantier } from './verrouLot';

export const CHAMPS_LOT = [
	'numero', 'designation', 'montantHt', 'montantTtc', 'tauxTva', 'retenueGarantie',
	'dateSignature', 'corpsEtat', 'travaux', 'clauseParticuliere',
] as const;
export type ChampLot = (typeof CHAMPS_LOT)[number];

const LIMITES: Partial<Record<ChampLot, [number, string]>> = {
	numero: [10, 'Le numéro est limité à 10 caractères.'],
	designation: [120, 'La désignation est limitée à 120 caractères.'],
	corpsEtat: [120, "Le corps d'état est limité à 120 caractères."],
	travaux: [300, 'Les travaux sont limités à 300 caractères.'],
	clauseParticuliere: [600, 'La clause particulière est limitée à 600 caractères.'],
};

function texte(champ: ChampLot, valeur: string): string {
	const t = valeur.trim();
	const limite = LIMITES[champ];
	if (limite && t.length > limite[0]) throw new ErreurMetier(limite[1], champ);
	return t;
}

function montantPositif(valeur: string, champ: ChampLot): Decimal {
	const m = lireNombreFr(valeur);
	if (m.isNegative() && !m.isZero()) throw new ErreurMetier('Le montant ne peut pas être négatif.', champ);
	return m;
}

function taux(valeur: string, champ: ChampLot): string {
	const t = lireNombreFr(valeur);
	if (t.lessThan(0) || t.greaterThan(100)) throw new ErreurMetier('Le taux doit être compris entre 0 et 100.', champ);
	return t.toFixed(2);
}

export async function modifierChampLot(lotId: string, champ: ChampLot, valeur: string): Promise<{ chantierId: string }> {
	// Les montants dépendent des avenants : lus et écrits sous le verrou du lot (spec § 5).
	if (champ === 'montantHt' || champ === 'montantTtc') {
		const saisi = montantPositif(valeur, champ);
		return sousVerrouLot(lotId, async (tx, lot) => {
			const avenants = montantsAvenants(lot);
			let ht: Decimal;
			if (champ === 'montantHt') {
				ht = saisi.toDecimalPlaces(8);
				verifierEngage(ht, avenants, HT_INFERIEUR_AVENANTS);
			} else {
				ht = htDepuisTtc(saisi, lot.tauxTva.toString(), sommeAvenants(avenants));
			}
			await tx.lot.update({ where: { id: lotId }, data: { montantHtInitial: ht.toFixed() } });
			return { chantierId: lot.chantierId };
		});
	}

	const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
	let donnees: Record<string, unknown>;
	switch (champ) {
		case 'numero':
			donnees = { numero: texte(champ, valeur) || null };
			break;
		case 'designation': {
			const d = texte(champ, valeur);
			if (!d) throw new ErreurMetier('La désignation est obligatoire.', champ);
			donnees = { designation: d };
			break;
		}
		case 'tauxTva':
			donnees = { tauxTva: taux(valeur, champ) };
			break;
		case 'retenueGarantie':
			donnees = { retenueGarantie: taux(valeur, champ) };
			break;
		case 'dateSignature':
			donnees = { dateSignature: versDateCalendaire(valeur) };
			break;
		default:
			donnees = { [champ]: texte(champ, valeur) };
	}
	await prisma.lot.update({ where: { id: lotId }, data: donnees });
	return { chantierId: lot.chantierId };
}

/** Sous verrou du chantier : deux ajouts simultanés ne se disputent pas le même `ordre`. */
export async function ajouterLot(chantierId: string): Promise<string> {
	return prisma.$transaction(async (tx) => {
		await verrouillerChantier(tx, chantierId);
		const dernier = await tx.lot.aggregate({ where: { chantierId }, _max: { ordre: true } });
		const lot = await tx.lot.create({
			data: { chantierId, ordre: (dernier._max.ordre ?? 0) + 1, designation: 'Nouveau lot', exemplaires: exemplairesParDefaut('GRE_A_GRE') },
		});
		return lot.id;
	});
}

export const LOT_AVEC_DOCUMENTS = 'Ce lot a déjà des documents générés : il ne peut plus être supprimé.';

/** Un document (marché, lettre, certificat, PV) interdit la suppression, même inséré pendant qu'elle s'exécute. */
export async function supprimerLot(lotId: string): Promise<{ chantierId: string }> {
	const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId }, include: { _count: { select: { documents: true } } } });
	if (lot._count.documents > 0) throw new ErreurMetier(LOT_AVEC_DOCUMENTS);
	try {
		await prisma.lot.delete({ where: { id: lotId } });
	} catch (e) {
		if (estCleEtrangere(e)) throw new ErreurMetier(LOT_AVEC_DOCUMENTS);
		throw e;
	}
	return { chantierId: lot.chantierId };
}

export async function attribuerArtisan(lotId: string, artisanId: string | null): Promise<{ chantierId: string }> {
	const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId } });
	if (artisanId && artisanId !== lot.artisanId) {
		const artisan = await prisma.artisan.findUnique({ where: { id: artisanId } });
		if (!artisan) throw new ErreurMetier('Entreprise introuvable.');
		if (!artisan.actif) throw new ErreurMetier('Cette entreprise est archivée.');
	}
	await prisma.lot.update({ where: { id: lotId }, data: { artisanId } });
	return { chantierId: lot.chantierId };
}

/** Change le gabarit imprimé ; la série de versions du marché reste la même (spec § 4). */
export async function changerNature(lotId: string, nature: Nature): Promise<{ chantierId: string }> {
	const lot = await prisma.lot.update({ where: { id: lotId }, data: { nature, exemplaires: exemplairesParDefaut(nature) } });
	return { chantierId: lot.chantierId };
}
