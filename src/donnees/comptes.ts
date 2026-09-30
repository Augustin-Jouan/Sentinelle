import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { genererMotDePasse } from '@/auth/motDePasse';
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

export async function marquerMotDePasseChange(utilisateurId: string): Promise<void> {
	await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { doitChangerMotDePasse: false } });
}

export type CompteListe = {
	id: string;
	nom: string;
	email: string;
	/** Portable, imprimé sur les comptes rendus du chargé d'affaire ; '' s'il n'est pas saisi. */
	telephone: string;
	role: 'admin' | 'user';
	bloque: boolean;
	doitChangerMotDePasse: boolean;
};

export async function listerComptes(): Promise<CompteListe[]> {
	const lignes = await prisma.utilisateur.findMany({ orderBy: { name: 'asc' } });
	return lignes.map((u) => ({
		id: u.id,
		nom: u.name,
		email: u.email,
		telephone: u.telephone ?? '',
		role: u.role === 'admin' ? 'admin' : 'user',
		bloque: Boolean(u.banned),
		doitChangerMotDePasse: u.doitChangerMotDePasse,
	}));
}

/** Le mot de passe provisoire n'est renvoyé qu'ici, pour être montré une seule fois à l'admin. */
export async function creerCompte(p: { email: string; nom: string; role: 'admin' | 'user' }): Promise<{ id: string; motDePasse: string }> {
	if (!p.nom.trim()) throw new ErreurMetier('Le nom est obligatoire.', 'nom');
	if (!/^\S+@\S+\.\S+$/.test(p.email.trim())) throw new ErreurMetier('Adresse e-mail invalide.', 'email');
	const motDePasse = genererMotDePasse();
	const id = await creerCompteAvecMotDePasse({ ...p, motDePasse, doitChangerMotDePasse: true });
	return { id, motDePasse };
}

export async function reinitialiserMotDePasse(utilisateurId: string): Promise<string> {
	const motDePasse = genererMotDePasse();
	const hash = await hacherMotDePasse(motDePasse);
	await prisma.$transaction([
		prisma.compte.updateMany({ where: { userId: utilisateurId, providerId: 'credential' }, data: { password: hash } }),
		prisma.utilisateur.update({ where: { id: utilisateurId }, data: { doitChangerMotDePasse: true } }),
		prisma.session.deleteMany({ where: { userId: utilisateurId } }),
	]);
	return motDePasse;
}

/** Banned + révocation des sessions dans la même transaction (getSession ne lit pas banned). */
export async function bloquerCompte(utilisateurId: string, parId: string): Promise<void> {
	if (utilisateurId === parId) throw new ErreurMetier('Vous ne pouvez pas bloquer votre propre compte.');
	await prisma.$transaction([
		prisma.utilisateur.update({ where: { id: utilisateurId }, data: { banned: true } }),
		prisma.session.deleteMany({ where: { userId: utilisateurId } }),
	]);
}

export async function debloquerCompte(utilisateurId: string): Promise<void> {
	await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { banned: false, banReason: null, banExpires: null } });
}

export async function changerRole(utilisateurId: string, role: 'admin' | 'user', parId: string): Promise<void> {
	if (utilisateurId === parId && role !== 'admin') {
		throw new ErreurMetier('Vous ne pouvez pas retirer votre propre rôle administrateur.');
	}
	await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { role } });
}

export async function modifierTelephone(utilisateurId: string, valeur: string): Promise<void> {
	const t = valeur.trim();
	if (t.length > 120) throw new ErreurMetier('120 caractères au plus.', 'telephone');
	await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { telephone: t || null } });
}
