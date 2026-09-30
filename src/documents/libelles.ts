export type TypeDocument =
	| 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' | 'RECAPITULATIF' | 'PLANNING' | 'VISA_PLANNING'
	| 'AVENANT' | 'CERTIFICAT_PAIEMENT' | 'COMPTE_RENDU' | 'PV_RECEPTION';

export const LIBELLES_TYPES: Record<TypeDocument, string> = {
	MARCHE_GRE_A_GRE: 'Gré à gré',
	MARCHE_SOUS_TRAITANCE: 'Sous-traitance',
	RECAPITULATIF: 'Récapitulatif',
	PLANNING: 'Planning',
	VISA_PLANNING: 'Visa du planning',
	AVENANT: 'Avenant',
	CERTIFICAT_PAIEMENT: 'Certificat de paiement',
	COMPTE_RENDU: 'Compte rendu',
	PV_RECEPTION: 'PV de réception',
};

export const TITRES_TYPES: Record<TypeDocument, string> = {
	MARCHE_GRE_A_GRE: 'Marché de travaux de gré à gré',
	MARCHE_SOUS_TRAITANCE: 'Marché de sous-traitance',
	RECAPITULATIF: 'Récapitulatif des marchés',
	PLANNING: 'Planning prévisionnel',
	VISA_PLANNING: 'Feuille de visa du planning',
	AVENANT: 'Avenant',
	CERTIFICAT_PAIEMENT: 'Certificat de paiement',
	COMPTE_RENDU: 'Compte rendu de chantier',
	PV_RECEPTION: 'Procès-verbal de réception',
};
