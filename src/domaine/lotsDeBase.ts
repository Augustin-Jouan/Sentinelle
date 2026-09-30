import type { Nature } from './regles';

export type LotDeBase = { numero: string | null; designation: string; nature: Nature; couleur: string };

/** Les 13 lots proposés d'office à la création d'un chantier (annexe A de la spec, `LOTS_BASE` de la maquette). */
export const LOTS_DE_BASE: readonly LotDeBase[] = [
	{ numero: '01', designation: 'TERRASSEMENT — V.R.D.', nature: 'GRE_A_GRE', couleur: 'noir' },
	{ numero: '02', designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', couleur: 'noir' },
	{ numero: '03', designation: 'CHARPENTE', nature: 'GRE_A_GRE', couleur: 'vert-clair' },
	{ numero: '04', designation: 'COUVERTURE', nature: 'GRE_A_GRE', couleur: 'bleu-fonce' },
	{ numero: '05', designation: 'MENUISERIES EXTÉRIEURES', nature: 'GRE_A_GRE', couleur: 'vert-fonce' },
	{ numero: '06', designation: 'PLÂTRERIE — ISOLATION', nature: 'GRE_A_GRE', couleur: 'jaune' },
	{ numero: '07', designation: 'MENUISERIES INTÉRIEURES', nature: 'GRE_A_GRE', couleur: 'vert-fonce' },
	{ numero: '08', designation: 'ÉLECTRICITÉ', nature: 'GRE_A_GRE', couleur: 'rouge' },
	{ numero: '09', designation: 'PLOMBERIE — CHAUFFAGE — V.M.C.', nature: 'GRE_A_GRE', couleur: 'rouge' },
	{ numero: '10', designation: 'CARRELAGE — FAÏENCE', nature: 'GRE_A_GRE', couleur: 'violet' },
	{ numero: '11', designation: 'PEINTURE', nature: 'GRE_A_GRE', couleur: 'bleu-clair' },
	{ numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', couleur: 'vert-fonce' },
	{ numero: '12', designation: 'ENDUIT EXTÉRIEUR', nature: 'GRE_A_GRE', couleur: 'orange' },
];
