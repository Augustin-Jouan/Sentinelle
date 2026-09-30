import type { SaisiesReception, SaisiesReceptionCommunes, SourceReception } from '@/documents/reception';
import { COORDONNEES_SOCOREVE } from './compteRendu';

export const PV_SOURCE: SourceReception = {
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT', mission: 'COMPLETE' },
	lot: { id: 'l2', numero: '02', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', retenueGarantie: '5' },
	societe: COORDONNEES_SOCOREVE,
};

export const PV_SAISIES: SaisiesReception = {
	decision: 'AVEC_RESERVES', dateEffet: '', reserves: 'Reprise des joints de la cuisine\n\n  Nettoyage du chantier  ',
	delai: '30 jours', motifs: '', representant: 'Mikaël REBOURS',
};

export const PV_COMMUN: SaisiesReceptionCommunes = { date: '2026-10-12', signataire: '', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' };
