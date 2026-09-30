import { ErreurMetier } from '@/domaine/erreurs';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from './prisma';

export type Tx = Prisma.TransactionClient;

const INCLURE = {
	avenants: { orderBy: { numero: 'asc' as const } },
	acomptes: { orderBy: { numero: 'asc' as const } },
} satisfies Prisma.LotInclude;

export type LotVerrouille = Prisma.LotGetPayload<{ include: typeof INCLURE }>;

/**
 * Toute écriture qui dépend des avenants ou des acomptes d'un lot (spec § 2, « Verrou ») :
 * `SELECT … FOR NO KEY UPDATE` sur la ligne du lot, puis relecture du lot, de ses avenants et de ses acomptes
 * sous ce verrou. Deux écritures simultanées sur le même lot passent l'une après l'autre.
 */
export async function sousVerrouLot<T>(lotId: string, operation: (tx: Tx, lot: LotVerrouille) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Lot" WHERE id = ${lotId} FOR NO KEY UPDATE`;
		if (!verrou.length) throw new ErreurMetier('Lot introuvable.');
		return operation(tx, await tx.lot.findUniqueOrThrow({ where: { id: lotId }, include: INCLURE }));
	});
}

/**
 * « Tous les lots » (PV de réception) : une seule transaction, les lots verrouillés dans l'ordre de saisie
 * (`ORDER BY` avant `FOR NO KEY UPDATE`) pour que deux générations simultanées ne s'interbloquent pas.
 */
export async function sousVerrouLots<T>(lotIds: string[], operation: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Lot" WHERE id = ANY(${lotIds}) ORDER BY "chantierId", ordre FOR NO KEY UPDATE`;
		if (verrou.length !== new Set(lotIds).size) throw new ErreurMetier('Lot introuvable.');
		return operation(tx);
	}, { timeout: 20000 });
}

/**
 * Verrou de la ligne du chantier (planning, ajout d'un lot, enregistrement et correction d'un compte rendu).
 * `FOR NO KEY UPDATE`, comme pour les lots : les écritures sous ce verrou passent l'une après l'autre, mais une
 * insertion qui référence le chantier (un document, un compte rendu) n'attend pas — sinon, lot verrouillé d'un
 * côté et chantier de l'autre, PostgreSQL tuerait l'une des deux transactions (40P01).
 * Faux si le chantier n'existe pas : chaque appelant garde son message.
 */
export async function verrouillerChantier(tx: Tx, chantierId: string): Promise<boolean> {
	const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Chantier" WHERE id = ${chantierId} FOR NO KEY UPDATE`;
	return verrou.length > 0;
}

export async function sousVerrouChantier<T>(chantierId: string, operation: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		if (!(await verrouillerChantier(tx, chantierId))) throw new ErreurMetier('Chantier introuvable.');
		return operation(tx);
	});
}

/** Les montants en texte : le `Decimal` de Prisma n'est pas celui de decimal.js. */
export function montantsAvenants(lot: { avenants: { numero: number; montantHt: { toString(): string } }[] }): { numero: number; montantHt: string }[] {
	return lot.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt.toString() }));
}
