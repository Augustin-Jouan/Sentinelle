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
 * `SELECT … FOR UPDATE` sur la ligne du lot, puis relecture du lot, de ses avenants et de ses acomptes
 * sous ce verrou. Deux écritures simultanées sur le même lot passent l'une après l'autre.
 */
export async function sousVerrouLot<T>(lotId: string, operation: (tx: Tx, lot: LotVerrouille) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Lot" WHERE id = ${lotId} FOR UPDATE`;
		if (!verrou.length) throw new ErreurMetier('Lot introuvable.');
		return operation(tx, await tx.lot.findUniqueOrThrow({ where: { id: lotId }, include: INCLURE }));
	});
}

/** Les montants en texte : le `Decimal` de Prisma n'est pas celui de decimal.js. */
export function montantsAvenants(lot: { avenants: { numero: number; montantHt: { toString(): string } }[] }): { numero: number; montantHt: string }[] {
	return lot.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt.toString() }));
}
