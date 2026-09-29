type Type = 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' | 'RECAPITULATIF';

export const LIBELLES_TYPES: Record<Type, string> = {
	MARCHE_GRE_A_GRE: 'Gré à gré',
	MARCHE_SOUS_TRAITANCE: 'Sous-traitance',
	RECAPITULATIF: 'Récapitulatif',
};

export const TITRES_TYPES: Record<Type, string> = {
	MARCHE_GRE_A_GRE: 'Marché de travaux de gré à gré',
	MARCHE_SOUS_TRAITANCE: 'Marché de sous-traitance',
	RECAPITULATIF: 'Récapitulatif des marchés',
};
