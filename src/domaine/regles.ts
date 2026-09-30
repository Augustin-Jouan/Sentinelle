import Decimal from 'decimal.js';
import type { Valeur } from './montants';

export type Nature = 'GRE_A_GRE' | 'SOUS_TRAITANCE';
export type Mission = 'COMPLETE' | 'PARTIELLE';

export function exemplairesParDefaut(nature: Nature): number {
	return nature === 'SOUS_TRAITANCE' ? 2 : 3;
}

/** « Fait en triple exemplaire » */
export function exemplairesTexte(n: number): string {
	if (n === 2) return 'double';
	if (n === 3) return 'triple';
	return String(n);
}

/** Mission partielle : SOCOREVE ne suit pas le chantier, les factures vont au client. La sous-traitance facture toujours SOCOREVE. */
export function destinataireFactures(nature: Nature, mission: Mission): string {
	if (nature === 'GRE_A_GRE' && mission === 'PARTIELLE') return "au Maître d'Ouvrage";
	return 'à SOCOREVE';
}

const deux = (n: number) => String(n).padStart(2, '0');

/** Une colonne `@db.Date` arrive à minuit UTC : on la lit en UTC. */
export function formatDateCalendaire(date: Date | null | undefined): string | null {
	if (!date) return null;
	return `${deux(date.getUTCDate())}.${deux(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

/** Le jour qu'il est à Châteaubriant, pas à Greenwich. */
export function dateDuJourTexte(maintenant: Date): string {
	const parties = new Intl.DateTimeFormat('fr-FR', {
		timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
	}).formatToParts(maintenant);
	const v = (type: string) => parties.find((p) => p.type === type)?.value ?? '';
	return `${v('day')}.${v('month')}.${v('year')}`;
}

/** Date de signature du lot, sinon celle prévue pour le chantier ; `null` laisse le cadre porter la date du jour. */
export function dateSignatureMarche(dateLot: Date | null, dateChantier: Date | null): Date | null {
	return dateLot ?? dateChantier ?? null;
}

export function corpsEtatImprime(corpsEtat: string, designation: string): string {
	return corpsEtat.trim() || designation.toLowerCase();
}

export type Manque = 'entreprise' | 'montant' | 'client' | 'adresseChantier';

export const LIBELLES_MANQUES: Record<Manque, string> = {
	entreprise: "pas d'entreprise",
	montant: 'montant nul',
	client: 'client non renseigné',
	adresseChantier: 'adresse du chantier non renseignée',
};

export function manquesPourGenerer(p: {
	artisanId: string | null;
	montantHtInitial: Valeur;
	maitreOuvrage: string;
	adresseChantier: string;
}): Manque[] {
	const manques: Manque[] = [];
	if (!p.artisanId) manques.push('entreprise');
	if (!new Decimal(p.montantHtInitial).greaterThan(0)) manques.push('montant');
	if (!p.maitreOuvrage.trim()) manques.push('client');
	if (!p.adresseChantier.trim()) manques.push('adresseChantier');
	return manques;
}
