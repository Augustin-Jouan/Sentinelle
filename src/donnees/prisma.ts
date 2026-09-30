import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

function creerClient() {
	return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}

/** Un seul client par processus, y compris sous le rechargement à chaud de `next dev`. */
export const prisma = globalPourPrisma.prisma ?? creerClient();
if (process.env.NODE_ENV !== 'production') globalPourPrisma.prisma = prisma;
