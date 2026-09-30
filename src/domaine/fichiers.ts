import type { Nature } from './regles';

export function slugifier(s: string): string {
	return s
		.replace(/Œ/g, 'OE').replace(/œ/g, 'oe').replace(/Æ/g, 'AE').replace(/æ/g, 'ae')
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toUpperCase();
}

export function nomFichierMarche(p: { reference: string; numero: string | null; designation: string; nature: Nature; version: number }): string {
	const prefixe = p.nature === 'SOUS_TRAITANCE' ? 'ST' : `Lot${p.numero ? slugifier(p.numero) : ''}`;
	return `${slugifier(p.reference)}-${prefixe}-${slugifier(p.designation)}-Marche-v${p.version}.pdf`;
}

export function nomFichierRecap(reference: string, version: number): string {
	return `${slugifier(reference)}-RecapMarches-v${version}.pdf`;
}

export function nomFichierTableur(reference: string): string {
	return `${slugifier(reference)}-RecapMarches.xlsx`;
}

/** `filename` en ASCII pour les vieux clients, `filename*` encodé pour les autres. */
export function enTeteTelechargement(nomFichier: string): string {
	const ascii = nomFichier.replace(/[^\x20-\x7e]|["\\]/g, '_').replace(/_+/g, '_');
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`;
}
