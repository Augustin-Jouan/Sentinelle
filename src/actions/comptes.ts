'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { bloquerCompte, changerRole, creerCompte, debloquerCompte, modifierTelephone, reinitialiserMotDePasse } from '@/donnees/comptes';
import { executer, type Resultat } from './executer';

const nouveauCompte = z.object({
	nom: z.string().trim().min(1, 'Le nom est obligatoire.'),
	email: z.email('Adresse e-mail invalide.'),
	role: z.enum(['admin', 'user']),
});

export async function creerCompteAction(saisie: { nom: string; email: string; role: string }): Promise<Resultat<{ motDePasse: string }>> {
	return executer({ admin: true }, async () => {
		const { motDePasse } = await creerCompte(nouveauCompte.parse(saisie));
		revalidatePath('/admin/comptes');
		return { motDePasse };
	});
}

export async function reinitialiserMotDePasseAction(utilisateurId: string): Promise<Resultat<{ motDePasse: string }>> {
	return executer({ admin: true }, async () => {
		const motDePasse = await reinitialiserMotDePasse(utilisateurId);
		revalidatePath('/admin/comptes');
		return { motDePasse };
	});
}

export async function bloquerCompteAction(utilisateurId: string, bloquer: boolean): Promise<Resultat> {
	return executer({ admin: true }, async (u) => {
		if (bloquer) await bloquerCompte(utilisateurId, u.id);
		else await debloquerCompte(utilisateurId);
		revalidatePath('/admin/comptes');
		return null;
	});
}

export async function changerRoleAction(utilisateurId: string, role: 'admin' | 'user'): Promise<Resultat> {
	return executer({ admin: true }, async (u) => {
		await changerRole(utilisateurId, z.enum(['admin', 'user']).parse(role), u.id);
		revalidatePath('/admin/comptes');
		return null;
	});
}

export async function modifierTelephoneAction(utilisateurId: string, valeur: string): Promise<Resultat> {
	return executer({ admin: true }, async () => {
		await modifierTelephone(z.string().parse(utilisateurId), z.string().max(200).parse(valeur));
		revalidatePath('/admin/comptes');
		return null;
	});
}
