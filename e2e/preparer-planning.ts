import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';
import { PERRIER_ARTISANS, PERRIER_CHANTIER, PERRIER_LOTS } from '../tests/fixtures/perrier';
import { insererPlanningPerrier } from '../tests/integration/planningPerrier';

/** Un chantier PERRIER avec le planning de l'annexe B par fichier E2E : les parcours ne se gênent pas.
 * Même insertion que `insererPerrier` (tests d'intégration), sans vider la base ni créer d'utilisateur. */
const REFERENCES = ['PLANNING — Écran', 'PLANNING — Gestes', 'PLANNING — Documents'];

async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
	const artisans: Record<string, string> = {};
	for (const a of Object.values(PERRIER_ARTISANS)) {
		artisans[a.nom] = (await prisma.artisan.upsert({ where: { nom: a.nom }, create: a, update: {} })).id;
	}
	const { chargeAffaire: _nom, reference: _ref, ...chantier } = PERRIER_CHANTIER;
	for (const reference of REFERENCES) {
		const c = await prisma.chantier.create({ data: { ...chantier, reference, chargeAffaireId: admin.id, creeParId: admin.id } });
		const lots: Record<string, string> = {};
		for (const [i, l] of PERRIER_LOTS.entries()) {
			const cree = await prisma.lot.create({ data: {
				chantierId: c.id, ordre: i + 1, numero: l.numero, designation: l.designation, nature: l.nature,
				artisanId: l.artisan ? artisans[l.artisan.nom] : null, montantHtInitial: l.montantHtInitial,
				tauxTva: l.tauxTva, retenueGarantie: l.retenueGarantie, exemplaires: l.exemplaires,
				corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere, dateSignature: l.dateSignature,
			} });
			lots[l.designation] = cree.id;
		}
		await insererPlanningPerrier({ chantierId: c.id, lots });
	}
	console.log(`Planning E2E : ${REFERENCES.length} chantiers PERRIER prêts.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
