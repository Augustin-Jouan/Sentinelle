import { randomUUID } from 'node:crypto';
import { PARAMETRES_PAR_DEFAUT } from '@/donnees/parametres';
import { prisma } from '@/donnees/prisma';

export async function viderBase() {
	await prisma.$executeRawUnsafe(
		'TRUNCATE "Document", "Lot", "Chantier", "Artisan", "Parametres", "session", "compte", "verification", "utilisateur" RESTART IDENTITY CASCADE',
	);
}

export async function creerUtilisateurTest(p: { nom?: string; role?: 'admin' | 'user' } = {}) {
	return prisma.utilisateur.create({
		data: {
			id: randomUUID(),
			name: p.nom ?? 'Augustin Jouan',
			email: `${randomUUID()}@test.local`,
			emailVerified: true,
			role: p.role ?? 'user',
			initiales: 'AJ',
		},
	});
}

export async function creerParametresTest() {
	return prisma.parametres.create({ data: PARAMETRES_PAR_DEFAUT });
}
