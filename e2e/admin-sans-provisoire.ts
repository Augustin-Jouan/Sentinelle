import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';

/**
 * Le seed impose au premier admin de changer son mot de passe d'amorçage (sécurité de la production). Les suites
 * de bout en bout et le banc visuel se connectent avec ce compte à chaque test : sur la base de test seulement,
 * on lève cette obligation. Le changement imposé reste couvert par comptes.spec.ts, sur un compte créé exprès.
 */
async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	await prisma.utilisateur.update({ where: { email: process.env.ADMIN_EMAIL }, data: { doitChangerMotDePasse: false } });
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
