import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';
import { creerPremierAdmin, seedArtisans, seedParametres } from '../src/donnees/seed';

async function main() {
	const { ADMIN_EMAIL, ADMIN_NOM, ADMIN_MOT_DE_PASSE } = process.env;
	await seedParametres();
	const ajoutes = await seedArtisans();
	if ((await prisma.utilisateur.count({ where: { role: 'admin' } })) > 0) {
		console.log(`Seed : ${ajoutes} artisans ajoutés, premier admin déjà présent.`);
		return;
	}
	if (!ADMIN_EMAIL || !ADMIN_NOM || !ADMIN_MOT_DE_PASSE) {
		throw new Error('ADMIN_EMAIL, ADMIN_NOM et ADMIN_MOT_DE_PASSE sont requis pour créer le premier admin.');
	}
	await creerPremierAdmin({ email: ADMIN_EMAIL, nom: ADMIN_NOM, motDePasse: ADMIN_MOT_DE_PASSE });
	console.log(`Seed : ${ajoutes} artisans ajoutés, premier admin créé.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
