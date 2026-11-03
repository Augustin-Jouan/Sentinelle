import type { TypeDocument } from '@/documents/libelles';
import { LIBELLES_TYPES } from '@/documents/libelles';

export const PHRASE_INCORRECTE = 'La phrase de confirmation ne correspond pas.';
export const DOCUMENTS_CHANGES = 'La liste des documents a changé : rouvrez la suppression pour la vérifier.';
export const DEJA_SUPPRIME = 'Ce chantier a déjà été supprimé.';

export type DocumentSuppression = {
	id: string;
	type: TypeDocument;
	serie: string;
	nomFichier: string;
	version: number;
	creeLe: Date;
};

export type ResumeSuppression = {
	reference: string;
	documents: DocumentSuppression[];
	lots: number;
	periodes: number;
	fermetures: number;
	compteRenduEnBrouillon: boolean;
};

const ORDRE_TYPES = Object.keys(LIBELLES_TYPES) as TypeDocument[];

function normaliserPhrase(s: string): string {
	return s
		.toLowerCase()
		.replace(/\u2019/g, "'")
		.replace(/[\u00a0\u202f]/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

export function phraseSuppression(reference: string): string {
	return `je supprime ${reference}`;
}

export function phraseCorrespond(saisie: string, reference: string): boolean {
	return normaliserPhrase(saisie) === normaliserPhrase(phraseSuppression(reference));
}

function libelleTypeDocument(type: TypeDocument, n: number): string {
	switch (type) {
		case 'MARCHE_GRE_A_GRE':
			return n === 1 ? '1 marché de gré à gré' : `${n} marchés de gré à gré`;
		case 'MARCHE_SOUS_TRAITANCE':
			return n === 1 ? '1 marché de sous-traitance' : `${n} marchés de sous-traitance`;
		case 'RECAPITULATIF':
			return n === 1 ? '1 récapitulatif' : `${n} récapitulatifs`;
		case 'PLANNING':
			return n === 1 ? '1 planning' : `${n} plannings`;
		case 'VISA_PLANNING':
			return n === 1 ? '1 visa du planning' : `${n} visas du planning`;
		case 'AVENANT':
			return n === 1 ? '1 avenant' : `${n} avenants`;
		case 'CERTIFICAT_PAIEMENT':
			return n === 1 ? '1 certificat de paiement' : `${n} certificats de paiement`;
		case 'COMPTE_RENDU':
			return n === 1 ? '1 compte rendu' : `${n} comptes rendus`;
		case 'PV_RECEPTION':
			return n === 1 ? '1 PV de réception' : `${n} PV de réception`;
	}
}

function libelleLot(n: number): string {
	return n === 1 ? '1 lot' : `${n} lots`;
}

function libellePeriode(n: number): string {
	return n === 1 ? '1 période de planning' : `${n} périodes de planning`;
}

function libelleFermeture(n: number): string {
	return n === 1 ? '1 fermeture' : `${n} fermetures`;
}

export function decompteSuppression(resume: ResumeSuppression): string[] {
	const comptes = new Map<TypeDocument, number>();
	for (const type of ORDRE_TYPES) comptes.set(type, 0);
	for (const doc of resume.documents) {
		comptes.set(doc.type, (comptes.get(doc.type) ?? 0) + 1);
	}

	const lignes: string[] = [];
	for (const type of ORDRE_TYPES) {
		const n = comptes.get(type)!;
		if (n > 0) lignes.push(libelleTypeDocument(type, n));
	}
	if (resume.lots > 0) lignes.push(libelleLot(resume.lots));
	if (resume.periodes > 0) lignes.push(libellePeriode(resume.periodes));
	if (resume.fermetures > 0) lignes.push(libelleFermeture(resume.fermetures));
	if (resume.compteRenduEnBrouillon) lignes.push('1 compte rendu en brouillon');
	return lignes;
}

export function entreeJournalSuppression(par: string, chantier: string, documents: number) {
	return { par, chantier, documents };
}
