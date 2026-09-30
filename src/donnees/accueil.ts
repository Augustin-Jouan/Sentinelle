import type { CarteChantier } from '@/domaine/accueil';
import { sommeAvenants } from '@/domaine/avenants';
import { totalArrondi, ttcEngage } from '@/domaine/montants';
import { versSaisieDate } from './chantiers';
import { prisma } from './prisma';

export async function lireAccueil(): Promise<CarteChantier[]> {
	const lignes = await prisma.chantier.findMany({
		orderBy: { creeLe: 'desc' },
		include: {
			chargeAffaire: { select: { name: true } },
			_count: { select: { documents: true } },
			lots: { select: {
				artisanId: true, montantHtInitial: true, tauxTva: true,
				avenants: { select: { montantHt: true } }, _count: { select: { periodes: true } },
			} },
		},
	});
	return lignes.map((c) => ({
		id: c.id, reference: c.reference, maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux,
		adresse: c.adresse, cp: c.cp, commune: c.commune, chargeAffaire: c.chargeAffaire.name,
		dateSignature: versSaisieDate(c.dateSignaturePrevue), termine: c.termine, creeLe: c.creeLe.toISOString(),
		lots: c.lots.length,
		attribues: c.lots.filter((l) => l.artisanId).length,
		periodes: c.lots.reduce((n, l) => n + l._count.periodes, 0),
		documents: c._count.documents,
		ttc: totalArrondi(c.lots.map((l) => ttcEngage(
			l.montantHtInitial.toString(), l.tauxTva.toString(),
			sommeAvenants(l.avenants.map((a) => ({ montantHt: a.montantHt.toString() }))),
		))).toFixed(2),
	}));
}
