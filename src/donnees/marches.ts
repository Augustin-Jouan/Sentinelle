import { sommeAvenants } from '@/domaine/avenants';
import { certificatPossible } from '@/domaine/certificats';
import { formatEuros, htEngage, totalArrondi, ttcEngage } from '@/domaine/montants';
import { manquesPourGenerer, type Manque } from '@/domaine/regles';
import { adresseArtisan } from './artisans';
import { versSaisieDate } from './chantiers';
import { prisma } from './prisma';

export type ArtisanOption = {
	id: string; nom: string; commune: string; actif: boolean;
	adresse: string; cp: string;
	adresseComplete: string; interlocuteur: string; telephone: string;
};

export type LotVue = {
	id: string; ordre: number; numero: string | null; designation: string;
	nature: 'GRE_A_GRE' | 'SOUS_TRAITANCE'; artisanId: string | null; entreprise: string | null;
	commune: string | null; artisanArchive: boolean; htInitial: string; tauxTva: string;
	retenueGarantie: string; exemplaires: number; dateSignature: string; corpsEtat: string;
	/** Somme signée des avenants ; engagé = initial + avenants (spec § 5). */
	sommeAvenants: string; htEngage: string; ttcEngage: string; manques: Manque[];
	/** Triés par numéro ; `date` au format des champs de saisie (AAAA-MM-JJ). */
	avenants: { id: string; numero: number; devis: string; montantHt: string; date: string }[];
	/** `dernier` : le dernier acompte du lot s'il est un certificat (lui seul se corrige). */
	certificat: { possible: boolean; dernier: { id: string; numero: number } | null };
};

export type VueMarches = {
	chantierId: string; dateSignatureChantier: string; lots: LotVue[]; artisans: ArtisanOption[];
	totalHtTexte: string; totalTvaTexte: string; totalTtcTexte: string;
};

/** Le dernier acompte du lot, s'il est un certificat : lui seul se corrige. */
function dernierCertificat(acomptes: { id: string; numero: number; manuel: boolean }[]): { id: string; numero: number } | null {
	const d = acomptes.at(-1);
	return d && !d.manuel ? { id: d.id, numero: d.numero } : null;
}

export async function lireVueMarches(chantierId: string): Promise<VueMarches | null> {
	const [c, artisans] = await Promise.all([
		prisma.chantier.findUnique({
			where: { id: chantierId },
			include: { lots: { orderBy: { ordre: 'asc' }, include: {
				artisan: true,
				avenants: { orderBy: { numero: 'asc' } },
				acomptes: { orderBy: { numero: 'asc' }, select: { id: true, numero: true, manuel: true } },
			} } },
		}),
		prisma.artisan.findMany({ orderBy: { nom: 'asc' } }),
	]);
	if (!c) return null;
	const lots: LotVue[] = c.lots.map((l) => {
		const ht = l.montantHtInitial.toString();
		const tva = l.tauxTva.toString();
		const somme = sommeAvenants(l.avenants.map((a) => ({ montantHt: a.montantHt.toString() })));
		return {
			id: l.id, ordre: l.ordre, numero: l.numero, designation: l.designation, nature: l.nature,
			artisanId: l.artisanId, entreprise: l.artisan?.nom ?? null, commune: l.artisan?.commune ?? null,
			artisanArchive: l.artisan ? !l.artisan.actif : false,
			htInitial: ht, tauxTva: tva, retenueGarantie: l.retenueGarantie.toString(), exemplaires: l.exemplaires,
			dateSignature: versSaisieDate(l.dateSignature), corpsEtat: l.corpsEtat,
			sommeAvenants: somme.toFixed(), htEngage: htEngage(ht, somme).toFixed(), ttcEngage: ttcEngage(ht, tva, somme).toFixed(),
			manques: manquesPourGenerer({ artisanId: l.artisanId, montantHtInitial: ht, maitreOuvrage: c.maitreOuvrage, adresseChantier: c.adresse }),
			avenants: l.avenants.map((a) => ({
				id: a.id, numero: a.numero, devis: a.devis, montantHt: a.montantHt.toString(), date: versSaisieDate(a.date),
			})),
			certificat: {
				possible: certificatPossible({ artisanId: l.artisanId, htEngage: htEngage(ht, somme) }),
				dernier: dernierCertificat(l.acomptes),
			},
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
			adresse: a.adresse, cp: a.cp,
			adresseComplete: adresseArtisan(a), interlocuteur: a.interlocuteur, telephone: a.telephone,
		})),
		totalHtTexte: formatEuros(totalHt),
		totalTvaTexte: formatEuros(totalTtc.minus(totalHt)),
		totalTtcTexte: formatEuros(totalTtc),
	};
}
