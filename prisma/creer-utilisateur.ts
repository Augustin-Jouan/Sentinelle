/**
 * Crée un compte avec un mot de passe choisi (l'écran admin, lui, impose un mot de passe provisoire).
 * Usage : npx tsx prisma/creer-utilisateur.ts <email> <nom> <user|admin> <motDePasse> [--changer-mot-de-passe]
 * Placé dans prisma/ pour être disponible dans l'image « outils » (service de migration).
 */
import 'dotenv/config';
import { creerCompteAvecMotDePasse } from '../src/donnees/comptes';
import { prisma } from '../src/donnees/prisma';

const LONGUEUR_MIN = 12; // même minimum que Better Auth (src/auth.ts)

async function main() {
	const args = process.argv.slice(2);
	const doitChangerMotDePasse = args.includes('--changer-mot-de-passe');
	const [email, nom, role, motDePasse] = args.filter((a) => !a.startsWith('--'));
	if (!email || !nom || !role || !motDePasse) {
		throw new Error('Usage : npx tsx prisma/creer-utilisateur.ts <email> <nom> <user|admin> <motDePasse> [--changer-mot-de-passe]');
	}
	if (role !== 'user' && role !== 'admin') throw new Error('Le rôle doit être « user » ou « admin ».');
	if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new Error('Adresse e-mail invalide.');
	if (!nom.trim()) throw new Error('Le nom est obligatoire.');
	if (motDePasse.length < LONGUEUR_MIN) throw new Error(`Le mot de passe doit faire au moins ${LONGUEUR_MIN} caractères.`);

	await creerCompteAvecMotDePasse({ email, nom, role, motDePasse, doitChangerMotDePasse });
	console.log(`Compte ${role} créé : ${email.trim().toLowerCase()}`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
