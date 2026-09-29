import type { SourceArtisan, SourceChantier, SourceLot, SourceParametres } from '@/documents/batir';

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Mêmes valeurs que PARAMETRES_PAR_DEFAUT, recopiées pour que la fixture ne charge pas le client Prisma.
export const PERRIER_PARAMETRES: SourceParametres = {
	raisonSociale: 'S.A.S SOCOREVE',
	libelleActivite: 'Société Construction Rénovation Vente',
	adresse: '71 rue du Général Patton',
	cp: '44110',
	ville: 'Châteaubriant',
	telephone: '02 40 81 40 26',
	fax: null,
	villeSignature: 'Châteaubriant',
};

export const PERRIER_CHANTIER: SourceChantier = {
	reference: 'PERRIER — Louisfert',
	maitreOuvrage: 'M. et Mme PERRIER',
	adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
	natureTravaux: "Construction d'une maison individuelle — 142 m² + garage",
	adresse: 'Le Haut Bois',
	cp: '44110',
	commune: 'LOUISFERT',
	mission: 'COMPLETE',
	dateSignaturePrevue: jour('2026-04-03'),
	chargeAffaire: 'Augustin Jouan',
};

/** Fiches reprises de ARTISANS_SEED (maquette). */
export const PERRIER_ARTISANS: Record<string, SourceArtisan> = {
	'GILLOT TP': { nom: 'GILLOT TP', adresse: '175 rue de la Grée Saint Jacques', cp: '44540', commune: "VALLONS-DE-L'ERDRE", interlocuteur: '', telephone: '' },
	'CONSTRUCTIONS REBOURS': { nom: 'CONSTRUCTIONS REBOURS', adresse: 'Z.I. du Pigeon Blanc', cp: '35640', commune: 'MARTIGNÉ-FERCHAUD', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38' },
	'CHARPENTE ET CONSTRUCTIONS BOIS': { nom: 'CHARPENTE ET CONSTRUCTIONS BOIS', adresse: '14 rue de la Gare', cp: '44520', commune: 'ISSÉ', interlocuteur: 'Alcime CONAND', telephone: '06-62-75-58-70' },
	'AM COUVERTURE': { nom: 'AM COUVERTURE', adresse: 'Z.I. Le Champ Jubin', cp: '44590', commune: 'DERVAL', interlocuteur: 'Stéphane BIORET', telephone: '02-28-50-46-95' },
	'ISSÉ MENUISERIE': { nom: 'ISSÉ MENUISERIE', adresse: '6 rue de la Brosse', cp: '44520', commune: 'ISSÉ', interlocuteur: 'David BRÉAUD', telephone: '06-75-84-89-60' },
	'PLÂTRERIE DELAUNAY': { nom: 'PLÂTRERIE DELAUNAY', adresse: '11 impasse de la Vallée du Don', cp: '44520', commune: 'MOISDON-LA-RIVIÈRE', interlocuteur: 'Guillaume DELAUNAY', telephone: '06-89-26-28-88' },
	'MENUISERIES DU DON': { nom: 'MENUISERIES DU DON', adresse: '1 rue des Forges de Gravotel', cp: '44520', commune: 'MOISDON-LA-RIVIÈRE', interlocuteur: 'Fabien GABILLARD', telephone: '06-62-81-55-41' },
	MATELEC: { nom: 'MATELEC', adresse: '14 Croquemais', cp: '44590', commune: 'DERVAL', interlocuteur: 'David MATHELIER', telephone: '06-52-51-50-85' },
	'CMP PLUMEJEAU': { nom: 'CMP PLUMEJEAU', adresse: '1 bis rue du Dolmen', cp: '44520', commune: 'LA MEILLERAYE-DE-BRETAGNE', interlocuteur: 'Cyrille PLUMEJEAU', telephone: '06-70-77-43-14' },
	'MD CARRELAGE': { nom: 'MD CARRELAGE', adresse: 'Le Puits Blanc', cp: '44170', commune: 'NOZAY', interlocuteur: 'Mickaël DUCHESNE', telephone: '06-88-71-57-57' },
	"LA DÉCO'TECH": { nom: "LA DÉCO'TECH", adresse: '6 boulevard de la République', cp: '44110', commune: 'CHÂTEAUBRIANT', interlocuteur: 'Catherine ADRON', telephone: '06-79-82-71-28' },
	'PASSION BOIS': { nom: 'PASSION BOIS', adresse: "65 rue d'Ancenis", cp: '44110', commune: 'CHÂTEAUBRIANT', interlocuteur: 'Julien HALOPEAU', telephone: '06-89-23-14-72' },
};

export const CLAUSE_LOT_02 = 'Les réservations pour les fluides sont à la charge du présent lot.';
export const TRAVAUX_ESCALIER = "Fourniture et pose d'un escalier quart tournant en chêne.";

const lot = (numero: string | null, designation: string, entreprise: string | null, ht: string, o: Partial<SourceLot> = {}): SourceLot => ({
	id: designation,
	numero,
	designation,
	nature: 'GRE_A_GRE',
	montantHtInitial: ht,
	tauxTva: '20',
	retenueGarantie: '5',
	exemplaires: 3,
	corpsEtat: '',
	travaux: '',
	clauseParticuliere: '',
	dateSignature: null,
	artisanId: entreprise,
	artisan: entreprise ? PERRIER_ARTISANS[entreprise] : null,
	...o,
});

/** Les 13 lots de PERRIER dans la maquette, sans les avenants des lots 02 et 05. */
export const PERRIER_LOTS: SourceLot[] = [
	lot('01', 'TERRASSEMENT — V.R.D.', 'GILLOT TP', '18400'),
	lot('02', 'GROS ŒUVRE', 'CONSTRUCTIONS REBOURS', '96250', { dateSignature: jour('2026-04-03'), clauseParticuliere: CLAUSE_LOT_02 }),
	lot('03', 'CHARPENTE', 'CHARPENTE ET CONSTRUCTIONS BOIS', '21900'),
	lot('04', 'COUVERTURE', 'AM COUVERTURE', '27480'),
	lot('05', 'MENUISERIES EXTÉRIEURES', 'ISSÉ MENUISERIE', '34150', { dateSignature: jour('2026-04-10') }),
	lot('06', 'PLÂTRERIE — ISOLATION', 'PLÂTRERIE DELAUNAY', '29700'),
	lot('07', 'MENUISERIES INTÉRIEURES', 'MENUISERIES DU DON', '16250'),
	lot('08', 'ÉLECTRICITÉ', 'MATELEC', '14900'),
	lot('09', 'PLOMBERIE — CHAUFFAGE — V.M.C.', 'CMP PLUMEJEAU', '23800'),
	lot('10', 'CARRELAGE — FAÏENCE', 'MD CARRELAGE', '12600'),
	lot('11', 'PEINTURE', "LA DÉCO'TECH", '9450'),
	lot(null, 'ESCALIER', 'PASSION BOIS', '6800', { nature: 'SOUS_TRAITANCE', exemplaires: 2, travaux: TRAVAUX_ESCALIER }),
	lot('12', 'ENDUIT EXTÉRIEUR', null, '0'),
];
