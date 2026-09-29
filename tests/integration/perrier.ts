import { prisma } from '@/donnees/prisma';
import { PERRIER_ARTISANS, PERRIER_CHANTIER, PERRIER_LOTS } from '../fixtures/perrier';
import { creerParametresTest, creerUtilisateurTest } from './aide';

/** Charge la fixture PERRIER en base. Renvoie les ids des lots indexés par désignation. */
export async function insererPerrier() {
	await creerParametresTest();
	const u = await creerUtilisateurTest({ nom: PERRIER_CHANTIER.chargeAffaire });
	const idsArtisans: Record<string, string> = {};
	for (const a of Object.values(PERRIER_ARTISANS)) idsArtisans[a.nom] = (await prisma.artisan.create({ data: a })).id;
	const { chargeAffaire: _nom, ...chantier } = PERRIER_CHANTIER;
	const c = await prisma.chantier.create({ data: { ...chantier, chargeAffaireId: u.id, creeParId: u.id } });
	const lots: Record<string, string> = {};
	for (const [i, l] of PERRIER_LOTS.entries()) {
		const cree = await prisma.lot.create({ data: {
			chantierId: c.id, ordre: i + 1, numero: l.numero, designation: l.designation, nature: l.nature,
			artisanId: l.artisan ? idsArtisans[l.artisan.nom] : null, montantHtInitial: l.montantHtInitial,
			tauxTva: l.tauxTva, retenueGarantie: l.retenueGarantie, exemplaires: l.exemplaires,
			corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere, dateSignature: l.dateSignature,
		} });
		lots[l.designation] = cree.id;
	}
	return { chantierId: c.id, utilisateurId: u.id, lots, artisans: idsArtisans };
}
