import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/auth';

export type UtilisateurConnecte = {
	id: string;
	nom: string;
	email: string;
	role: 'admin' | 'user';
	doitChangerMotDePasse: boolean;
};

/** Lue une fois par requête. Un compte banned est traité comme déconnecté (getSession ne le refuse pas). */
export const utilisateurConnecte = cache(async (): Promise<UtilisateurConnecte | null> => {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return null;
	const u = session.user as typeof session.user & {
		role?: string | null;
		doitChangerMotDePasse?: boolean | null;
		banned?: boolean | null;
	};
	if (u.banned) return null;
	return {
		id: u.id,
		nom: u.name,
		email: u.email,
		role: u.role === 'admin' ? 'admin' : 'user',
		doitChangerMotDePasse: Boolean(u.doitChangerMotDePasse),
	};
});

/** Garde des pages : connexion, puis mot de passe provisoire, puis rôle. */
export async function exigerPage(opts: { admin?: boolean } = {}): Promise<UtilisateurConnecte> {
	const u = await utilisateurConnecte();
	if (!u) redirect('/connexion');
	if (u.doitChangerMotDePasse) redirect('/mot-de-passe');
	if (opts.admin && u.role !== 'admin') redirect('/chantiers');
	return u;
}
