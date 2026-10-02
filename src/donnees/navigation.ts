import { prisma } from './prisma';

export type ChantierNavigation = { id: string; reference: string; termine: boolean; lots: number; periodes: number; documents: number };
export type VueNavigation = { chantiers: ChantierNavigation[]; artisans: number };

/** Ce que la barre montre partout : le sélecteur de chantier (renderPicker) et les compteurs des onglets (renderRail). */
export async function lireNavigation(): Promise<VueNavigation> {
	const [chantiers, lots, artisans] = await Promise.all([
		prisma.chantier.findMany({
			orderBy: { creeLe: 'desc' },
			select: { id: true, reference: true, termine: true, _count: { select: { lots: true, documents: true } } },
		}),
		prisma.lot.findMany({ select: { chantierId: true, _count: { select: { periodes: true } } } }),
		prisma.artisan.count(),
	]);
	const periodes = new Map<string, number>();
	for (const l of lots) periodes.set(l.chantierId, (periodes.get(l.chantierId) ?? 0) + l._count.periodes);
	return {
		chantiers: chantiers.map((c) => ({
			id: c.id, reference: c.reference, termine: c.termine,
			lots: c._count.lots, periodes: periodes.get(c.id) ?? 0, documents: c._count.documents,
		})),
		artisans,
	};
}
