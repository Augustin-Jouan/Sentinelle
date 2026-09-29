import { z } from 'zod';

const texte = z.string();
const date = z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/);

/** En-tête SOCOREVE et date de génération : figés avec le document, exclus de l'empreinte. */
export const cadreSchema = z.object({
	entete: z.object({
		raisonSociale: texte,
		libelleActivite: texte,
		adresseLigne: texte,
		telephone: texte,
		fax: texte.nullable(),
	}),
	villeSignature: texte,
	dateGeneration: date,
});

export const contenuMarcheGreAGreSchema = z.object({
	maitreOuvrage: texte,
	adresseClient: texte,
	entreprise: texte,
	adresseEntreprise: texte,
	natureTravaux: texte,
	adresseChantier: texte,
	lotTexte: texte,
	montantTtcTexte: texte,
	tvaTexte: texte,
	destinataireFactures: texte,
	retenueTexte: texte,
	complementRetenueTexte: texte,
	exemplairesTexte: texte,
	clauseParticuliere: texte,
	/** null : aucune date saisie, le cadre porte la date de génération. */
	dateSignature: date.nullable(),
});

export const contenuMarcheSousTraitanceSchema = z.object({
	maitreOuvrage: texte,
	entreprise: texte,
	adresseEntreprise: texte,
	corpsEtat: texte,
	travaux: texte,
	natureTravaux: texte,
	adresseChantier: texte,
	montantTtcTexte: texte,
	tvaTexte: texte,
	retenueTexte: texte,
	dateSignature: date.nullable(),
});

export const ligneRecapSchema = z.object({
	numero: texte,
	designation: texte,
	entreprise: texte.nullable(),
	/** Valeur décimale brute (pour le tableur), null si le lot n'a pas de montant. */
	montantTtc: texte.nullable(),
	montantTtcTexte: texte,
	tauxTva: texte,
	tvaTexte: texte,
	adresse: texte,
	cp: texte,
	commune: texte,
	interlocuteur: texte,
	telephone: texte,
});

export const contenuRecapSchema = z.object({
	maitreOuvrage: texte,
	natureTravaux: texte,
	adresseChantier: texte,
	cpCommune: texte,
	adresseClient: texte,
	mission: texte,
	chargeAffaire: texte,
	dateSignature: date.nullable(),
	lignes: z.array(ligneRecapSchema),
	nombreLots: z.number().int(),
	/** « Total marchés — 13 lots » : l'accord est fait ici, pas dans le gabarit. */
	totalLibelle: texte,
	totalTtc: texte,
	totalTtcTexte: texte,
});

export const donneesDocumentSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('MARCHE_GRE_A_GRE'), contenu: contenuMarcheGreAGreSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('MARCHE_SOUS_TRAITANCE'), contenu: contenuMarcheSousTraitanceSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('RECAPITULATIF'), contenu: contenuRecapSchema, cadre: cadreSchema }),
]);

export type Cadre = z.infer<typeof cadreSchema>;
export type ContenuMarcheGreAGre = z.infer<typeof contenuMarcheGreAGreSchema>;
export type ContenuMarcheSousTraitance = z.infer<typeof contenuMarcheSousTraitanceSchema>;
export type LigneRecap = z.infer<typeof ligneRecapSchema>;
export type ContenuRecap = z.infer<typeof contenuRecapSchema>;
export type DonneesDocument = z.infer<typeof donneesDocumentSchema>;
export type DonneesMarcheGreAGre = Extract<DonneesDocument, { type: 'MARCHE_GRE_A_GRE' }>;
export type DonneesMarcheSousTraitance = Extract<DonneesDocument, { type: 'MARCHE_SOUS_TRAITANCE' }>;
export type DonneesRecap = Extract<DonneesDocument, { type: 'RECAPITULATIF' }>;
export type DonneesMarche = DonneesMarcheGreAGre | DonneesMarcheSousTraitance;
