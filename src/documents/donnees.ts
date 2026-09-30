import { lireParametres } from '@/donnees/parametres';
import { prisma } from '@/donnees/prisma';
import { ErreurMetier } from '@/domaine/erreurs';
import { batirMarche, batirPlanning, batirRecap, batirVisa, type SourceChantier, type SourceLot, type SourceParametres, type SourcePlanning } from './batir';
import { donneesDocumentSchema, type DonneesMarche, type DonneesPlanning, type DonneesRecap, type DonneesVisa } from './schemas';
import { SERIES } from './series';

const includeChantier = {
	chargeAffaire: true,
	lots: { orderBy: { ordre: 'asc' as const }, include: { artisan: true, avenants: { orderBy: { numero: 'asc' as const } } } },
};

type ChantierLu = NonNullable<Awaited<ReturnType<typeof lireChantierBrut>>>;

function lireChantierBrut(where: { id: string }) {
	return prisma.chantier.findUnique({ where, include: includeChantier });
}

function versSources(c: ChantierLu): { chantier: SourceChantier; lots: SourceLot[] } {
	return {
		chantier: {
			reference: c.reference, maitreOuvrage: c.maitreOuvrage, adresseClient: c.adresseClient,
			natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune,
			mission: c.mission, dateSignaturePrevue: c.dateSignaturePrevue, chargeAffaire: c.chargeAffaire.name,
		},
		lots: c.lots.map((l) => ({
			id: l.id, numero: l.numero, designation: l.designation, nature: l.nature,
			montantHtInitial: l.montantHtInitial.toString(), tauxTva: l.tauxTva.toString(),
			retenueGarantie: l.retenueGarantie.toString(), exemplaires: l.exemplaires,
			corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere,
			dateSignature: l.dateSignature, artisanId: l.artisanId,
			artisan: l.artisan && {
				nom: l.artisan.nom, adresse: l.artisan.adresse, cp: l.artisan.cp, commune: l.artisan.commune,
				interlocuteur: l.artisan.interlocuteur, telephone: l.artisan.telephone,
			},
			avenants: l.avenants.map((a) => ({
				id: a.id, numero: a.numero, devis: a.devis, montantHt: a.montantHt.toString(), date: a.date, objet: a.objet,
			})),
		})),
	};
}

export async function lireSources(chantierId: string): Promise<{ chantier: SourceChantier; lots: SourceLot[]; parametres: SourceParametres }> {
	const [c, parametres] = await Promise.all([lireChantierBrut({ id: chantierId }), lireParametres()]);
	if (!c) throw new ErreurMetier('Chantier introuvable.');
	return { ...versSources(c), parametres };
}

export async function construireDonneesMarche(lotId: string, maintenant = new Date()): Promise<{ chantierId: string; chantier: SourceChantier; lot: SourceLot; donnees: DonneesMarche }> {
	const { chantierId } = await prisma.lot.findUniqueOrThrow({ where: { id: lotId }, select: { chantierId: true } });
	const { chantier, lots, parametres } = await lireSources(chantierId);
	const lot = lots.find((l) => l.id === lotId)!;
	return { chantierId, chantier, lot, donnees: batirMarche(chantier, lot, parametres, maintenant) };
}

export async function construireDonneesRecap(chantierId: string, maintenant = new Date()): Promise<{ chantier: SourceChantier; donnees: DonneesRecap }> {
	const { chantier, lots, parametres } = await lireSources(chantierId);
	return { chantier, donnees: batirRecap(chantier, lots, parametres, maintenant) };
}

export async function lireSourcePlanning(chantierId: string): Promise<{ source: SourcePlanning; parametres: SourceParametres }> {
	const [{ chantier, parametres }, c] = await Promise.all([
		lireSources(chantierId),
		prisma.chantier.findUniqueOrThrow({
			where: { id: chantierId },
			select: {
				lots: {
					orderBy: { ordre: 'asc' },
					select: {
						designation: true, couleur: true,
						artisan: { select: { nom: true } },
						periodes: { orderBy: [{ debut: 'asc' }, { creeLe: 'asc' }], select: { intitule: true, debut: true, duree: true } },
					},
				},
				fermetures: { orderBy: [{ debut: 'asc' }, { id: 'asc' }], select: { debut: true, duree: true } },
			},
		}),
	]);
	return {
		source: {
			chantier,
			lots: c.lots.map((l) => ({ designation: l.designation, entreprise: l.artisan?.nom ?? null, couleur: l.couleur, periodes: l.periodes })),
			fermetures: c.fermetures,
		},
		parametres,
	};
}

export async function construireDonneesPlanning(chantierId: string, maintenant = new Date()): Promise<{ chantier: SourceChantier; donnees: DonneesPlanning }> {
	const { source, parametres } = await lireSourcePlanning(chantierId);
	return { chantier: source.chantier, donnees: batirPlanning(source, parametres, maintenant) };
}

export async function derniereVersionPlanning(chantierId: string): Promise<{ id: string; version: number; empreinte: string; donnees: DonneesPlanning } | null> {
	const d = await prisma.document.findFirst({
		where: { chantierId, serie: SERIES.PLANNING },
		orderBy: { version: 'desc' },
		select: { id: true, version: true, empreinte: true, donnees: true },
	});
	if (!d) return null;
	const donnees = donneesDocumentSchema.parse(d.donnees);
	if (donnees.type !== 'PLANNING') throw new Error('Série PLANNING : type de document inattendu.');
	return { id: d.id, version: d.version, empreinte: d.empreinte, donnees };
}

/** Le visa liste exactement ce que la dernière version générée du planning montrait. */
export async function construireDonneesVisa(chantierId: string, maintenant = new Date()): Promise<{ chantier: SourceChantier; source: { id: string; version: number }; donnees: DonneesVisa }> {
	const [{ chantier, parametres }, source] = await Promise.all([lireSources(chantierId), derniereVersionPlanning(chantierId)]);
	if (!source) throw new ErreurMetier("Aucune version du planning : générez d'abord le planning.");
	return { chantier, source: { id: source.id, version: source.version }, donnees: batirVisa(source, parametres, maintenant) };
}
