'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ErreurMetier } from '@/domaine/erreurs';
import { marquerMotDePasseChange } from '@/donnees/comptes';
import { executer, type Resultat } from './executer';

export async function changerMotDePasseAction(ancien: string, nouveau: string, confirmation: string): Promise<Resultat> {
	return executer({ motDePasseProvisoireAccepte: true }, async (u) => {
		if (nouveau.length < 12) throw new ErreurMetier('Le nouveau mot de passe doit faire au moins 12 caractères.', 'nouveau');
		if (nouveau !== confirmation) throw new ErreurMetier('Les deux saisies du nouveau mot de passe diffèrent.', 'confirmation');
		try {
			await auth.api.changePassword({
				body: { currentPassword: ancien, newPassword: nouveau, revokeOtherSessions: true },
				headers: await headers(),
			});
		} catch {
			throw new ErreurMetier('Mot de passe actuel incorrect.', 'ancien');
		}
		await marquerMotDePasseChange(u.id);
		return null;
	});
}

export async function deconnexionAction(): Promise<void> {
	await auth.api.signOut({ headers: await headers() });
	redirect('/connexion');
}
