import { Prisma } from '@/generated/prisma/client';

/** Violation d'une contrainte d'unicité. */
export function estDoublon(e: unknown): boolean {
	return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** Violation d'une clé étrangère (ligne encore référencée, ou référence vers une ligne absente). */
export function estCleEtrangere(e: unknown): boolean {
	return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003';
}
