import type { SaisiesCompteRendu, SourceCompteRendu } from '@/documents/compteRendu';
import type { SourceCoordonnees } from '@/documents/coordonnees';

export const COORDONNEES_SOCOREVE: SourceCoordonnees = {
	adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26',
	email: 'contact@socoreve-chateaubriant.com', siteWeb: 'socoreve-chateaubriant.com',
};

/** Deux lots de PERRIER : l'un attribué, l'autre pas. */
export const CR_SOURCE: SourceCompteRendu = {
	numero: 4,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lots: [
		{ id: 'l2', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38' },
		{ id: 'l12', designation: 'ENDUIT EXTÉRIEUR', entreprise: null, interlocuteur: '', telephone: '' },
	],
	societe: COORDONNEES_SOCOREVE,
};

export const CR_SAISIES: SaisiesCompteRendu = {
	date: '2026-10-06', rdvDate: '2026-10-13', rdvHeure: '14:00',
	avancement: 'Fondations **coulées**',
	coordination: 'GROS ŒUVRE : **reprise** du mur\n\nENDUIT EXTÉRIEUR :',
	redacteur: 'Augustin Jouan', portable: '06 12 34 56 78', convocations: { l2: 'C' },
};
