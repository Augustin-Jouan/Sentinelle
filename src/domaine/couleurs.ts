/** Palette du planning, reprise de COULEURS de la maquette (couleurs du .ods d'origine, spec Planning annexe A). */
export type Couleur = { cle: string; nom: string; fond: string; texte: string };

export const COULEURS: readonly Couleur[] = [
	{ cle: 'noir', nom: 'Noir', fond: '#2f3438', texte: '#ffffff' },
	{ cle: 'orange', nom: 'Orange', fond: '#d1741a', texte: '#ffffff' },
	{ cle: 'vert-clair', nom: 'Vert clair', fond: '#7cae3f', texte: '#17210d' },
	{ cle: 'bleu-fonce', nom: 'Bleu foncé', fond: '#1f4e79', texte: '#ffffff' },
	{ cle: 'vert-fonce', nom: 'Vert foncé', fond: '#2e6b4f', texte: '#ffffff' },
	{ cle: 'jaune', nom: 'Jaune', fond: '#dcb320', texte: '#211a00' },
	{ cle: 'rouge', nom: 'Rouge', fond: '#b8302c', texte: '#ffffff' },
	{ cle: 'violet', nom: 'Violet', fond: '#7a4092', texte: '#ffffff' },
	{ cle: 'bleu-clair', nom: 'Bleu clair', fond: '#4a9ac9', texte: '#0a1b24' },
];

export const estCouleur = (cle: string): boolean => COULEURS.some((c) => c.cle === cle);

export const couleurDe = (cle: string): Couleur => COULEURS.find((c) => c.cle === cle) ?? COULEURS[0];
