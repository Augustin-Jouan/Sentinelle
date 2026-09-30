import { lundiIso } from '@/domaine/semaines';
import { prisma } from '@/donnees/prisma';
import { CHAINE_PERRIER, FERMETURES_PERRIER, PLAN_PERRIER } from '../fixtures/planningPerrier';

/** Écrit le planning de l'annexe B sur un chantier PERRIER déjà inséré. Renvoie les ids des périodes par intitulé. */
export async function insererPlanningPerrier(p: { chantierId: string; lots: Record<string, string> }) {
	const periodes: Record<string, string> = {};
	for (const ligne of PLAN_PERRIER) {
		const lotId = p.lots[ligne.lot];
		await prisma.lot.update({ where: { id: lotId }, data: { couleur: ligne.couleur } });
		for (const x of ligne.periodes) {
			const cree = await prisma.periode.create({ data: { lotId, intitule: x.intitule, debut: lundiIso(x.annee, x.semaine), duree: x.duree } });
			periodes[x.intitule] = cree.id;
		}
	}
	for (let i = 1; i < CHAINE_PERRIER.length; i++) {
		await prisma.periode.update({ where: { id: periodes[CHAINE_PERRIER[i]] }, data: { dependDeId: periodes[CHAINE_PERRIER[i - 1]] } });
	}
	const fermetures: string[] = [];
	for (const f of FERMETURES_PERRIER) {
		const cree = await prisma.fermeture.create({ data: { chantierId: p.chantierId, libelle: f.libelle, debut: lundiIso(f.annee, f.semaine), duree: f.duree } });
		fermetures.push(cree.id);
	}
	return { periodes, fermetures };
}
