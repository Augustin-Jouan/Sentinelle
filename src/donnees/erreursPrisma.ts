import { Prisma } from '@/generated/prisma/client';

/** Violation d'une contrainte d'unicité. */
export function estDoublon(e: unknown): boolean {
	return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}
