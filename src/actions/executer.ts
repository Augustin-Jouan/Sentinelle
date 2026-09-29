import { ZodError } from 'zod';
import { utilisateurConnecte, type UtilisateurConnecte } from '@/auth/session';
import { ErreurMetier } from '@/domaine/erreurs';

export type Resultat<T = null> =
	| { ok: true; donnees: T }
	| { ok: false; erreur: string; champs?: Record<string, string> };

/**
 * Enveloppe de toutes les Server Actions : session, mot de passe provisoire, rôle,
 * puis traduction des erreurs. Rien ne remonte jusqu'à l'interface sous forme d'exception.
 */
export async function executer<T>(
	opts: { admin?: boolean; motDePasseProvisoireAccepte?: boolean },
	fn: (u: UtilisateurConnecte) => Promise<T>,
): Promise<Resultat<T>> {
	const u = await utilisateurConnecte();
	if (!u) return { ok: false, erreur: 'Session expirée : reconnectez-vous.' };
	if (u.doitChangerMotDePasse && !opts.motDePasseProvisoireAccepte) {
		return { ok: false, erreur: "Changez d'abord votre mot de passe provisoire." };
	}
	if (opts.admin && u.role !== 'admin') return { ok: false, erreur: 'Action réservée aux administrateurs.' };
	try {
		return { ok: true, donnees: await fn(u) };
	} catch (e) {
		if (e instanceof ErreurMetier) {
			return { ok: false, erreur: e.message, champs: e.champ ? { [e.champ]: e.message } : undefined };
		}
		if (e instanceof ZodError) {
			const champs: Record<string, string> = {};
			for (const probleme of e.issues) champs[String(probleme.path[0] ?? '')] ??= probleme.message;
			return { ok: false, erreur: Object.values(champs)[0] ?? 'Saisie invalide.', champs };
		}
		// Ni message ni pile : ils peuvent contenir des données du chantier.
		console.error('[action] erreur inattendue', e instanceof Error ? e.name : typeof e);
		return { ok: false, erreur: 'Erreur inattendue, réessayez.' };
	}
}
