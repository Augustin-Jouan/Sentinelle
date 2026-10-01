import 'dotenv/config';
import { fermerNavigateur } from '../src/documents/pdf';
import { prisma } from '../src/donnees/prisma';
import { creerPremierAdmin, seedArtisans, seedParametres } from '../src/donnees/seed';
import { construireDemo } from './demo/construire';
import { refusDemo } from './demo/garde';

/** Jeu de démonstration de la base de développement : vide les chantiers et les recrée. Jamais en production. */
async function main() {
	const refus = refusDemo(process.env.DATABASE_URL, process.env.NODE_ENV);
	if (refus) throw new Error(refus);
	const { ADMIN_EMAIL, ADMIN_NOM, ADMIN_MOT_DE_PASSE } = process.env;
	if (!ADMIN_EMAIL || !ADMIN_NOM || !ADMIN_MOT_DE_PASSE) throw new Error('ADMIN_EMAIL, ADMIN_NOM et ADMIN_MOT_DE_PASSE sont requis.');
	await seedParametres();
	await seedArtisans();
	await creerPremierAdmin({ email: ADMIN_EMAIL, nom: ADMIN_NOM, motDePasse: ADMIN_MOT_DE_PASSE });
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
	await construireDemo(admin.id);
	const [chantiers, documents] = await Promise.all([prisma.chantier.count(), prisma.document.count()]);
	console.log(`Démonstration : ${chantiers} chantiers, ${documents} documents. Le chantier TEST passe par toutes les fonctions.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	// Le navigateur des PDF reste ouvert entre deux rendus : sans le fermer, le script ne rend pas la main.
	.finally(() => Promise.all([fermerNavigateur(), prisma.$disconnect()]));
