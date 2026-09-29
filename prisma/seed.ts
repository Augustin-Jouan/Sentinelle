import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';
import { creerPremierAdmin, seedArtisans, seedParametres } from '../src/donnees/seed';

async function main() {
	const { ADMIN_EMAIL, ADMIN_NOM, ADMIN_MOT_DE_PASSE } = process.env;
	if (!ADMIN_EMAIL || !ADMIN_NOM || !ADMIN_MOT_DE_PASSE) {
		throw new Error('ADMIN_EMAIL, ADMIN_NOM et ADMIN_MOT_DE_PASSE sont requis.');
	}
	await seedParametres();
	const ajoutes = await seedArtisans();
	const admin = await creerPremierAdmin({ email: ADMIN_EMAIL, nom: ADMIN_NOM, motDePasse: ADMIN_MOT_DE_PASSE });
	console.log(`Seed : ${ajoutes} artisans ajoutés, premier admin ${admin === 'cree' ? 'créé' : 'déjà présent'}.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
