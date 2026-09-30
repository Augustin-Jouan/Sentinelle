import type { Nature } from './regles';

export function slugifier(s: string): string {
	return s
		.replace(/Œ/g, 'OE').replace(/œ/g, 'oe').replace(/Æ/g, 'AE').replace(/æ/g, 'ae')
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toUpperCase();
}

/** `Lot02`, `Lot` sans numéro, `ST` en sous-traitance. */
const prefixeLot = (nature: Nature, numero: string | null) => (nature === 'SOUS_TRAITANCE' ? 'ST' : `Lot${numero ? slugifier(numero) : ''}`);

export function nomFichierMarche(p: { reference: string; numero: string | null; designation: string; nature: Nature; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Marche-v${p.version}.pdf`;
}

export function nomFichierAvenant(p: { reference: string; numero: string | null; designation: string; nature: Nature; numeroAvenant: number; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Avenant${String(p.numeroAvenant).padStart(2, '0')}-v${p.version}.pdf`;
}

export function nomFichierCertificat(p: { reference: string; numero: string | null; designation: string; nature: Nature; numeroCertificat: number; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Certificat${String(p.numeroCertificat).padStart(2, '0')}-v${p.version}.pdf`;
}

export function nomFichierCompteRendu(reference: string, numero: number, version: number): string {
	return `${slugifier(reference)}-CompteRendu${String(numero).padStart(2, '0')}-v${version}.pdf`;
}

export function nomFichierRecap(reference: string, version: number): string {
	return `${slugifier(reference)}-RecapMarches-v${version}.pdf`;
}

export function nomFichierPlanning(reference: string, version: number): string {
	return `${slugifier(reference)}-Planning-v${version}.pdf`;
}

export function nomFichierVisa(reference: string, version: number): string {
	return `${slugifier(reference)}-VisaPlanning-v${version}.pdf`;
}

export function nomFichierTableur(reference: string): string {
	return `${slugifier(reference)}-RecapMarches.xlsx`;
}

/** `filename` en ASCII pour les vieux clients, `filename*` encodé pour les autres. */
export function enTeteTelechargement(nomFichier: string): string {
	const ascii = nomFichier.replace(/[^\x20-\x7e]|["\\]/g, '_').replace(/_+/g, '_');
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`;
}
