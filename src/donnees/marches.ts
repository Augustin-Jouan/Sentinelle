import { formatEuros, htEngage, totalArrondi, ttcEngage } from '@/domaine/montants';
import { manquesPourGenerer, type Manque } from '@/domaine/regles';
import { adresseArtisan } from './artisans';
import { versSaisieDate } from './chantiers';
import { prisma } from './prisma';

export type ArtisanOption = {
	id: string; nom: string; commune: string; actif: boolean;
	adresseComplete: string; interlocuteur: string; telephone: string;
};

export type LotVue = {
	id: string; ordre: number; numero: string | null; designation: string;
	nature: 'GRE_A_GRE' | 'SOUS_TRAITANCE'; artisanId: string | null; entreprise: string | null;
	commune: string | null; artisanArchive: boolean; htInitial: string; tauxTva: string;
	retenueGarantie: string; exemplaires: number; dateSignature: string; corpsEtat: string;
	htEngage: string; ttcEngage: string; manques: Manque[];
};

export type VueMarches = {
	chantierId: string; dateSignatureChantier: string; lots: LotVue[]; artisans: ArtisanOption[];
	totalHtTexte: string; totalTvaTexte: string; totalTtcTexte: string;
};

export async function lireVueMarches(chantierId: string): Promise<VueMarches> {
	const [c, artisans] = await Promise.all([
		prisma.chantier.findUniqueOrThrow({
			where: { id: chantierId },
			include: { lots: { orderBy: { ordre: 'asc' }, include: { artisan: true } } },
		}),
		prisma.artisan.findMany({ orderBy: { nom: 'asc' } }),
	]);
	const lots: LotVue[] = c.lots.map((l) => {
		const ht = l.montantHtInitial.toString();
		const tva = l.tauxTva.toString();
		return {
			id: l.id, ordre: l.ordre, numero: l.numero, designation: l.designation, nature: l.nature,
			artisanId: l.artisanId, entreprise: l.artisan?.nom ?? null, commune: l.artisan?.commune ?? null,
			artisanArchive: l.artisan ? !l.artisan.actif : false,
			htInitial: ht, tauxTva: tva, retenueGarantie: l.retenueGarantie.toString(), exemplaires: l.exemplaires,
			dateSignature: versSaisieDate(l.dateSignature), corpsEtat: l.corpsEtat,
			htEngage: htEngage(ht).toFixed(), ttcEngage: ttcEngage(ht, tva).toFixed(),
			manques: manquesPourGenerer({ artisanId: l.artisanId, montantHtInitial: ht, maitreOuvrage: c.maitreOuvrage, adresseChantier: c.adresse }),
		};
	});
	const totalHt = totalArrondi(lots.map((l) => l.htEngage));
	const totalTtc = totalArrondi(lots.map((l) => l.ttcEngage));
	return {
		chantierId,
		dateSignatureChantier: versSaisieDate(c.dateSignaturePrevue),
		lots,
		artisans: artisans.map((a) => ({
			id: a.id, nom: a.nom, commune: a.commune, actif: a.actif,
			adresseComplete: adresseArtisan(a), interlocuteur: a.interlocuteur, telephone: a.telephone,
		})),
		totalHtTexte: formatEuros(totalHt),
		totalTvaTexte: formatEuros(totalTtc.minus(totalHt)),
		totalTtcTexte: formatEuros(totalTtc),
	};
}
