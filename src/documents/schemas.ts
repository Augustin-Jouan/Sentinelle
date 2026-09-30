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

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const entier = z.number().int();
const semaineAnnee = z.object({ semaine: entier, annee: entier });
const periodeTravauxSchema = z.object({ debut: semaineAnnee, fin: semaineAnnee });

export const entetePlanningSchema = z.object({
	coordination: texte,
	maitreOuvrage: texte,
	projet: texte,
	adresseChantier: texte,
});

export const contenuPlanningSchema = z.object({
	entete: entetePlanningSchema,
	axe: z.object({
		premierLundi: iso,
		/** Une par colonne, dans l'ordre. */
		semaines: z.array(z.object({ numero: entier, annee: entier })),
		mois: z.array(z.object({ libelle: texte, nbSemaines: entier })),
	}),
	/** Colonnes comptées depuis la première semaine de l'axe. */
	fermetures: z.array(z.object({ colonne: entier, duree: entier })),
	/** Tous les lots, dans l'ordre du chantier, y compris ceux sans période. */
	lignes: z.array(z.object({
		entreprise: texte,
		lot: texte,
		/** Clé de la palette : le gabarit lit la couleur. */
		couleur: texte,
		barres: z.array(z.object({ colonne: entier, duree: entier, intitule: texte })),
	})),
	periodeTravaux: periodeTravauxSchema,
});

export const contenuVisaSchema = z.object({
	entete: entetePlanningSchema,
	/** Version et date de génération du planning source. */
	planning: z.object({ version: entier, date }),
	periodeTravaux: periodeTravauxSchema,
	/** Composée ici : le gabarit ne formate rien. */
	phrase: texte,
	lignes: z.array(z.object({ entreprise: texte, lot: texte })),
});

/** Montants en TTC, déjà formatés ; chacun arrondi au centime séparément (spec § 5). */
export const contenuAvenantSchema = z.object({
	entete: entetePlanningSchema,
	/** « Châteaubriant, le 12 mai 2026 » : la date de l'avenant. */
	lieuDate: texte,
	numero: texte,
	entreprise: texte,
	lot: texte,
	sens: z.enum(['plus-value', 'moins-value']),
	objet: texte,
	montants: z.object({
		marcheInitial: texte,
		devis: z.object({ numero: texte, montant: texte }),
		difference: texte,
		nouveauMontant: texte,
	}),
});

/** Montants déjà formatés ; `''` pour une ligne vide (lignes de complément, ou cumul pas encore saisi dans l'aperçu). */
export const contenuCertificatSchema = z.object({
	numero: texte,
	maitreOuvrage: texte,
	objet: texte,
	adresseChantier: texte,
	lotNumero: texte,
	lot: texte,
	titulaire: texte,
	marcheHt: texte,
	avenants: z.array(z.object({ libelle: texte, montant: texte })),
	totalHt: texte,
	totalTva: texte,
	totalTtc: texte,
	/** « Juillet 2026 ». */
	mois: texte,
	precedents: z.array(z.object({ numero: texte, montant: texte })),
	precedentsHt: texte,
	precedentsTva: texte,
	precedentsTtc: texte,
	realise: texte,
	presentHt: texte,
	presentTva: texte,
	presentTtc: texte,
	mandate: texte,
	caution: z.enum(['OUI', 'NON']),
	retenue: texte,
	/** « 30/09/2026 ». */
	faitLe: texte,
	/** Les valeurs d'où viennent les montants, figées avec le certificat (spec § 6). */
	valeurs: z.object({
		htInitial: texte,
		tauxTva: texte,
		tauxRetenue: texte,
		caution: z.boolean(),
		avenants: z.array(z.object({ numero: entier, montantHt: texte })),
		precedents: z.array(z.object({ numero: entier, montantHt: texte, manuel: z.boolean() })),
		cumul: texte.nullable(),
		mois: texte,
		date: texte,
	}),
});

/** En-tête SOCOREVE du certificat : figé avec le document, exclu de l'empreinte (comme le cadre des autres documents). */
export const societeSchema = z.object({
	adresseLigne: texte,
	contactLigne: texte,
	rcsLigne: texte,
	tvaLigne: texte,
	villeSignature: texte,
});

export const donneesDocumentSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('MARCHE_GRE_A_GRE'), contenu: contenuMarcheGreAGreSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('MARCHE_SOUS_TRAITANCE'), contenu: contenuMarcheSousTraitanceSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('RECAPITULATIF'), contenu: contenuRecapSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('PLANNING'), contenu: contenuPlanningSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('VISA_PLANNING'), contenu: contenuVisaSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('AVENANT'), contenu: contenuAvenantSchema, cadre: cadreSchema }),
	z.object({ type: z.literal('CERTIFICAT_PAIEMENT'), contenu: contenuCertificatSchema, societe: societeSchema }),
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
export type EntetePlanning = z.infer<typeof entetePlanningSchema>;
export type ContenuPlanning = z.infer<typeof contenuPlanningSchema>;
export type ContenuVisa = z.infer<typeof contenuVisaSchema>;
export type ContenuAvenant = z.infer<typeof contenuAvenantSchema>;
export type ContenuCertificat = z.infer<typeof contenuCertificatSchema>;
export type Societe = z.infer<typeof societeSchema>;
export type DonneesPlanning = Extract<DonneesDocument, { type: 'PLANNING' }>;
export type DonneesVisa = Extract<DonneesDocument, { type: 'VISA_PLANNING' }>;
export type DonneesAvenant = Extract<DonneesDocument, { type: 'AVENANT' }>;
export type DonneesCertificat = Extract<DonneesDocument, { type: 'CERTIFICAT_PAIEMENT' }>;
