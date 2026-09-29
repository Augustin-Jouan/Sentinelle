import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { ErreurMetier } from '@/domaine/erreurs';
import { prisma } from './prisma';

export function initialesDe(nom: string): string {
	return nom.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0].toUpperCase()).join('');
}

/** Même algorithme que Better Auth, pour que la connexion vérifie ce hash. */
export async function hacherMotDePasse(motDePasse: string): Promise<string> {
	return (await auth.$context).password.hash(motDePasse);
}

/** Crée l'utilisateur et son identifiant « credential » (e-mail + mot de passe). */
export async function creerCompteAvecMotDePasse(p: {
	email: string;
	nom: string;
	role: 'admin' | 'user';
	motDePasse: string;
	doitChangerMotDePasse: boolean;
}): Promise<string> {
	const email = p.email.trim().toLowerCase();
	if (await prisma.utilisateur.findUnique({ where: { email } })) {
		throw new ErreurMetier('Un compte existe déjà avec cet e-mail.', 'email');
	}
	const hash = await hacherMotDePasse(p.motDePasse);
	const id = randomUUID();
	await prisma.utilisateur.create({
		data: {
			id,
			email,
			name: p.nom.trim(),
			emailVerified: true,
			role: p.role,
			initiales: initialesDe(p.nom),
			doitChangerMotDePasse: p.doitChangerMotDePasse,
			comptes: { create: { id: randomUUID(), accountId: id, providerId: 'credential', password: hash } },
		},
	});
	return id;
}
