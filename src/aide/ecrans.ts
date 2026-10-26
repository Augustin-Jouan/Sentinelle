/**
 * Le guide, partie « Quoi fait quoi » : chaque écran, sa capture (`public/guide/<id>.webp`, pastilles rouges
 * numérotées) et la légende de chaque pastille, dans l'ordre : le repère n est `reperes[n - 1]`.
 * Les captures se refont par `npm run aide:captures` (e2e/aide/captures.ts), qui vérifie qu'elles posent autant
 * de pastilles que ce fichier a de légendes.
 */
export type IdEcran =
	| 'connexion'
	| 'mot-de-passe'
	| 'accueil'
	| 'selecteur'
	| 'compte'
	| 'nouveau'
	| 'entete'
	| 'marches'
	| 'lot'
	| 'avenants'
	| 'apercu-marche'
	| 'apercu-recap'
	| 'planning'
	| 'planning-lot'
	| 'fermetures'
	| 'apercu-planning'
	| 'apercu-visa'
	| 'documents'
	| 'certificat'
	| 'compte-rendu'
	| 'pv'
	| 'artisans'
	| 'fiche-artisan'
	| 'comptes'
	| 'nouveau-compte'
	| 'mot-de-passe-provisoire'
	| 'parametres';

export type Repere = { element: string; role: string };
export type Ecran = { id: IdEcran; titre: string; intro: string; reperes: Repere[] };
export type Partie = { titre: string; ecrans: Ecran[] };

export const PARTIES_ECRANS: Partie[] = [
	{
		titre: 'Connexion',
		ecrans: [
			{
				id: 'connexion',
				titre: 'Connexion',
				intro: "La page d'entrée, sans compte ouvert.",
				reperes: [
					{ element: 'Adresse e-mail', role: 'Celle de votre compte, créé par un administrateur.' },
					{ element: 'Mot de passe', role: "Le mot de passe provisoire reçu de l'administrateur, puis le vôtre." },
					{ element: 'Ouvrir mes chantiers', role: "Se connecter. Il n'y a pas de « mot de passe oublié » : demandez une réinitialisation à un administrateur." },
				],
			},
			{
				id: 'mot-de-passe',
				titre: 'Changer de mot de passe',
				intro: 'Demandée à la première connexion, ou depuis Mon compte.',
				reperes: [
					{ element: 'Mot de passe actuel', role: 'Le provisoire à la première connexion.' },
					{ element: 'Nouveau mot de passe', role: '12 caractères au moins.' },
					{ element: 'Confirmation', role: 'Le même, une seconde fois.' },
					{ element: 'Enregistrer', role: "Change le mot de passe et ouvre l'application." },
				],
			},
		],
	},
	{
		titre: 'Accueil et navigation',
		ecrans: [
			{
				id: 'accueil',
				titre: 'Accueil — Mes chantiers',
				intro: 'La liste de vos chantiers, et la barre du haut, présente sur tous les écrans.',
				reperes: [
					{ element: 'Logo', role: "Revient à l'accueil, depuis n'importe quel écran." },
					{ element: 'Maison', role: "Revient aussi à l'accueil." },
					{ element: 'Sélecteur de chantier', role: "Ouvre directement un chantier, sans repasser par l'accueil (voir l'écran suivant)." },
					{ element: 'Artisans', role: 'Le référentiel des entreprises ; le chiffre est leur nombre.' },
					{ element: 'Thème', role: 'Passe en clair ou en sombre. Réglage personnel.' },
					{ element: 'Mon compte', role: 'Vos initiales : mot de passe, déconnexion, et pour un administrateur Paramètres et Comptes.' },
					{ element: 'Nouveau chantier', role: "Ouvre le formulaire de création d'un chantier." },
					{ element: 'Chiffres clés', role: 'Chantiers en cours, montant total des marchés engagés, lots sans entreprise, documents produits.' },
					{ element: 'Recherche', role: 'Filtre les cartes par référence, client ou commune.' },
					{ element: 'Trier par', role: "Change l'ordre des cartes." },
					{ element: 'Masquer les terminés', role: 'Cache les chantiers terminés ; décochez pour les revoir.' },
					{ element: "Carte d'un chantier", role: 'Client, construction, adresse, nombre de lots, total TTC des marchés. Un clic ouvre le chantier.' },
					{ element: 'Terminer', role: 'Marque le chantier terminé (devient « Rouvrir »). Il reste consultable et modifiable.' },
					{ element: 'Supprimer', role: "Supprime le chantier, seulement s'il n'a encore aucun document. Définitif." },
					{ element: 'Carte « Nouveau chantier »', role: 'Même effet que le bouton 7.' },
				],
			},
			{
				id: 'selecteur',
				titre: 'Sélecteur de chantier',
				intro: 'Le menu « Affichage » / « Chantier ouvert » de la barre du haut, déplié.',
				reperes: [
					{ element: 'Tous les chantiers', role: "Revient à l'accueil ; le chiffre compte tous les chantiers." },
					{ element: 'Un chantier en cours', role: 'Ouvre ce chantier ; à droite, son nombre de lots.' },
					{ element: 'Terminés', role: 'Les chantiers terminés, rangés à part.' },
					{ element: '+ Nouveau chantier', role: 'Ouvre le formulaire de création.' },
				],
			},
			{
				id: 'compte',
				titre: 'Menu Mon compte',
				intro: "Le menu qui s'ouvre sur vos initiales.",
				reperes: [
					{ element: 'Votre compte', role: "Nom, rôle (Maître d'œuvre ou Administrateur) et e-mail." },
					{ element: "Aide — guide d'utilisation", role: 'Ce guide.' },
					{ element: 'Changer mon mot de passe', role: 'Choisir un nouveau mot de passe (12 caractères au moins).' },
					{ element: 'Paramètres', role: "Administrateurs : coordonnées de l'entreprise imprimées sur les documents." },
					{ element: 'Comptes', role: 'Administrateurs : créer, bloquer, réinitialiser les comptes.' },
					{ element: 'Se déconnecter', role: 'Ferme la session sur ce navigateur.' },
				],
			},
		],
	},
	{
		titre: 'Chantier',
		ecrans: [
			{
				id: 'nouveau',
				titre: 'Nouveau chantier',
				intro: "Le formulaire de création, rempli ici avec l'exemple.",
				reperes: [
					{ element: 'Nom du client', role: "Seul champ obligatoire. Imprimé comme maître d'ouvrage sur tous les documents." },
					{ element: 'Adresse actuelle du client', role: "Là où lui écrire aujourd'hui ; en construction neuve, ce n'est pas le chantier." },
					{ element: 'Il habite déjà sur le chantier', role: "Rénovation, extension : recopie l'adresse du chantier dans celle du client." },
					{ element: 'Nature des travaux', role: "Ex. « Construction d'une maison individuelle — 120 m² »." },
					{ element: 'Adresse du chantier', role: 'Avec le code postal et la commune juste dessous.' },
					{ element: 'Référence dossier', role: 'Unique ; elle commence le nom de chaque fichier. Vide : elle reprend le nom du client.' },
					{ element: "Chargé d'affaire", role: "Son nom s'imprime sur le récapitulatif, le planning, les comptes rendus et les PV." },
					{ element: 'Type de mission', role: "Complète : factures des marchés de gré à gré adressées à l'agence. Partielle : au maître d'ouvrage." },
					{ element: 'Signature prévue', role: 'Date « Fait le » des marchés par défaut, et date du récapitulatif.' },
					{ element: 'Partir des 13 lots de base', role: 'Ajoute les 13 lots habituels, sans entreprise ni montant.' },
					{ element: 'Extrait du marché', role: "Montre en direct comment vos saisies s'imprimeront, et le nom du futur fichier." },
					{ element: 'Remplir avec un exemple', role: 'Charge un chantier fictif pour essayer.' },
					{ element: 'Créer le chantier', role: "Crée le chantier et ouvre son onglet Marchés. « Annuler » revient à l'accueil." },
				],
			},
			{
				id: 'entete',
				titre: 'Panneau En-tête du chantier',
				intro: "S'ouvre d'un clic sur le bandeau gris du chantier (Client, Construction, Située…).",
				reperes: [
					{ element: "Champs de l'en-tête", role: "Les mêmes que pour un nouveau chantier ; chacun s'enregistre quand on le quitte." },
					{ element: 'Type de mission', role: 'Complète ou partielle.' },
					{ element: "Chargé d'affaire", role: 'Change le responsable du chantier.' },
					{ element: 'Marquer terminé', role: 'Clôt le chantier (devient « Rouvrir le chantier »).' },
				],
			},
		],
	},
	{
		titre: 'Marchés',
		ecrans: [
			{
				id: 'marches',
				titre: 'Onglet Marchés',
				intro: 'La table des lots du chantier.',
				reperes: [
					{ element: 'Chantier ouvert', role: 'Le chantier affiché ; cliquez pour passer à un autre.' },
					{ element: 'Onglet Marchés', role: 'Les lots, les entreprises et les montants. Le chiffre : nombre de lots.' },
					{ element: 'Onglet Planning', role: 'Le planning des travaux. Le chiffre : nombre de périodes.' },
					{ element: 'Onglet Documents', role: 'Tous les documents du chantier. Le chiffre : nombre de documents produits.' },
					{ element: 'Ajouter un lot', role: 'Ajoute un lot en fin de liste et ouvre son panneau.' },
					{ element: 'Exporter le récap', role: "Ouvre l'aperçu du récapitulatif des marchés." },
					{ element: 'Générer les marchés manquants', role: "Produit le marché de chaque lot qui n'en a pas, et liste ceux qui ne peuvent pas l'être." },
					{ element: 'En-tête du chantier', role: "Client, construction, adresse, mission, signature. Un clic l'ouvre pour le modifier." },
					{ element: 'Recherche', role: 'Filtre les lots par désignation, entreprise ou numéro.' },
					{ element: 'Trier par', role: "Ordre d'affichage : chantier, lot, entreprise, montant, à attribuer." },
					{ element: 'N° et désignation', role: 'Modifiables directement dans le tableau.' },
					{ element: 'Étiquette avenant', role: 'Le lot a des avenants (montant engagé différent du marché signé).' },
					{ element: 'Entreprise', role: 'Nom et commune, ou « à attribuer ». Un clic sur la ligne ouvre le panneau du lot.' },
					{ element: 'Montant HT', role: 'Montant initial du marché, modifiable.' },
					{ element: 'TVA', role: 'Taux de TVA du lot, en %.' },
					{ element: 'Montant TTC', role: 'Montant engagé, avenants compris. Saisir un TTC recalcule le HT initial.' },
					{ element: 'Totaux', role: 'HT, TVA et TTC de tout le chantier, quel que soit le filtre.' },
				],
			},
			{
				id: 'lot',
				titre: 'Panneau du lot',
				intro: "S'ouvre d'un clic sur une ligne du tableau des lots.",
				reperes: [
					{ element: 'Gré à gré / Sous-traitance', role: 'Choisit le modèle de marché imprimé (et 3 ou 2 exemplaires).' },
					{ element: 'Entreprise attribuée', role: 'Menu avec recherche par nom ou commune ; Entrée choisit le premier résultat.' },
					{ element: 'Voir la fiche', role: "Ouvre la fiche de l'entreprise dans le référentiel, pour corriger ses coordonnées." },
					{ element: 'Coordonnées', role: "Lues dans le référentiel au moment de l'impression." },
					{ element: 'Montant initial HT', role: 'Le montant signé.' },
					{ element: 'Avenants', role: 'Somme des avenants du lot.' },
					{ element: 'Montant actuel TTC', role: 'Avenants compris. Le modifier recalcule le montant initial HT.' },
					{ element: 'Retenue de garantie', role: 'Taux en %, et le montant calculé à côté.' },
					{ element: 'Signé le', role: "Date « Fait le » du marché ; vide, c'est la date prévue du chantier." },
					{ element: 'Ouvrir le marché', role: 'Aperçu du marché, pour le compléter et le générer.' },
					{ element: 'Certificat de paiement', role: 'Établit le certificat suivant de ce lot.' },
					{ element: 'PV de réception', role: 'Ouvre le PV de ce lot (page Documents).' },
					{ element: 'Supprimer le lot', role: "Impossible dès qu'un document existe pour ce lot." },
				],
			},
			{
				id: 'avenants',
				titre: 'Panneau du lot — bloc Avenants',
				intro: 'Le bas du panneau du lot.',
				reperes: [
					{ element: 'Ajouter', role: "Crée l'avenant suivant, daté du jour, montant à saisir." },
					{ element: 'Devis', role: "Numéro du devis de l'entreprise." },
					{ element: 'Montant HT', role: 'Positif : plus-value ; négatif : moins-value.' },
					{ element: 'Date', role: 'Date imprimée sur la lettre.' },
					{ element: 'Ouvrir la lettre', role: 'Aperçu de la lettre « AVENANT N° 01 », à générer.' },
					{ element: 'Supprimer', role: "Retire l'avenant (après confirmation) ; son numéro n'est pas réutilisé." },
				],
			},
			{
				id: 'apercu-marche',
				titre: "Aperçu d'un marché",
				intro: "S'ouvre par « Ouvrir le marché ». Les lettres d'avenant s'ouvrent dans le même aperçu.",
				reperes: [
					{ element: 'Titre', role: "Le lot et l'entreprise du document." },
					{ element: "D'où vient chaque donnée", role: 'Colonne de gauche : chaque valeur imprimée et sa source (chantier, lot, référentiel).' },
					{ element: 'La feuille', role: "Le document tel qu'il sera imprimé." },
					{ element: 'Zone bleue', role: "Se remplit directement sur la feuille (ici la clause particulière) ; le bleu ne s'imprime pas." },
					{ element: 'Version', role: 'Données actuelles, ou une version déjà générée (lecture seule).' },
					{ element: 'Générer le PDF', role: 'Crée la version suivante et télécharge le PDF. Rien de changé : la dernière version est téléchargée.' },
					{ element: 'Fermer', role: "Ferme l'aperçu sans rien créer (Échap aussi)." },
				],
			},
			{
				id: 'apercu-recap',
				titre: 'Aperçu du récapitulatif des marchés',
				intro: "S'ouvre par « Exporter le récap » (onglet Marchés) ou depuis la carte Récap des marchés (onglet Documents).",
				reperes: [
					{ element: 'En-tête', role: "Client, construction, adresses, mission, chargé d'affaire, date." },
					{ element: 'Tableau des lots', role: 'Chaque lot : entreprise, montant TTC engagé (avenants compris), TVA, coordonnées.' },
					{ element: 'Version', role: 'Revoir une version déjà exportée.' },
					{ element: 'Générer le PDF', role: 'Crée la version « Récap des marchés » (visible dans Documents) et télécharge le PDF.' },
					{ element: 'Fermer', role: 'Ferme sans rien créer.' },
				],
			},
		],
	},
	{
		titre: 'Planning',
		ecrans: [
			{
				id: 'planning',
				titre: 'Onglet Planning',
				intro: 'Le planning des travaux, une ligne par lot.',
				reperes: [
					{ element: 'Fermetures', role: 'Congés et fermetures du chantier.' },
					{ element: 'Feuille de visa', role: 'Feuille à faire signer aux entreprises, tirée du dernier planning imprimé.' },
					{ element: 'Planning imprimable', role: 'Aperçu du planning sur une feuille A4, à générer.' },
					{ element: 'Résumé', role: 'Nombre de périodes et semaines couvertes.' },
					{ element: 'Lots affichés', role: 'Masquer ou réafficher des lots.' },
					{ element: 'Outil Main', role: 'Faire glisser la vue.' },
					{ element: 'Outil Cible', role: 'Tracer, déplacer, allonger les périodes (par défaut).' },
					{ element: "Aujourd'hui", role: 'Revient à la semaine en cours.' },
					{ element: 'Densité', role: 'Largeur des semaines : Compacte, Normale, Large.' },
					{ element: 'Mois et semaines', role: "L'axe du temps, en semaines numérotées." },
					{ element: 'Ligne Fermetures', role: 'Les fermetures, hachurées sur toute la hauteur.' },
					{ element: 'Lot', role: 'Couleur, désignation, entreprise et téléphone. Un clic ouvre le panneau du lot.' },
					{ element: 'Période', role: 'Une barre par période : glisser pour déplacer, bord droit pour allonger.' },
					{ element: 'Lien', role: 'Flèche « commence après » entre deux périodes.' },
				],
			},
			{
				id: 'planning-lot',
				titre: 'Planning — panneau du lot',
				intro: "S'ouvre d'un clic sur le nom d'un lot ou sur une de ses barres.",
				reperes: [
					{ element: 'Couleur du lot', role: '9 couleurs, la même pour une même famille de lots.' },
					{ element: 'Ajouter', role: "Ajoute une période d'une semaine après la dernière." },
					{ element: 'Intitulé', role: 'Nom de la période, imprimé dans la barre.' },
					{ element: 'Semaine, année, durée', role: 'Début et durée en semaines, au clavier.' },
					{ element: 'Commence après', role: "Lie la période à la fin d'une autre : elle sera repoussée si l'autre recule." },
					{ element: 'Supprimer', role: 'Retire la période.' },
				],
			},
			{
				id: 'fermetures',
				titre: 'Planning — fenêtre Fermetures',
				intro: "S'ouvre par le bouton « Fermetures ».",
				reperes: [
					{ element: 'Ajouter', role: 'Nouvelle fermeture (« Congés », 2 semaines).' },
					{ element: 'Libellé, semaine, année, durée', role: 'Modifiables au clavier ; enregistrés en quittant le champ.' },
					{ element: 'Supprimer', role: 'Retire la fermeture.' },
				],
			},
			{
				id: 'apercu-planning',
				titre: 'Aperçu du planning imprimable',
				intro: "S'ouvre par « Planning imprimable ».",
				reperes: [
					{ element: 'La feuille', role: "Le « PLANNING PRÉVISIONNEL » sur une A4 paysage, tel qu'il sera imprimé." },
					{ element: 'Générer le PDF', role: 'Crée la version du planning et la télécharge.' },
					{ element: 'Fermer', role: 'Ferme sans rien créer.' },
				],
			},
			{
				id: 'apercu-visa',
				titre: 'Aperçu de la feuille de visa',
				intro: "S'ouvre par « Feuille de visa », une fois un planning généré.",
				reperes: [
					{ element: 'La feuille', role: 'Période des travaux, version du planning, et une ligne par entreprise à signer.' },
					{ element: 'Générer le PDF', role: 'Crée la feuille de visa et la télécharge.' },
					{ element: 'Fermer', role: 'Ferme sans rien créer.' },
				],
			},
		],
	},
	{
		titre: 'Documents',
		ecrans: [
			{
				id: 'documents',
				titre: 'Onglet Documents',
				intro: 'Tous les documents du chantier : en haut ceux du chantier entier, dessous une ligne par lot.',
				reperes: [
					{ element: 'Compteur', role: 'Nombre de documents et date du dernier.' },
					{ element: 'Tout télécharger', role: 'Un ZIP de la dernière version de chaque document, rangé par dossier.' },
					{ element: 'Comptes rendus', role: 'Nouveau compte rendu, reprise du brouillon, correction du dernier.' },
					{ element: 'Récap des marchés', role: "Dernière version (cliquer sur la date l'ouvre) ; « Exporter à jour » en produit une nouvelle." },
					{ element: 'Planning', role: 'Dernière version imprimée ; réimprimer après des changements.' },
					{ element: 'Feuille de visa', role: 'Produire la feuille à faire signer.' },
					{ element: 'Générer les manquants', role: 'Produit tous les marchés qui manquent.' },
					{ element: 'Tous les lots', role: "Prépare les PV de réception de tous les lots d'un coup." },
					{ element: 'Marché à jour', role: 'Bleu : version et date ; un clic ouvre la version. Pastille « modifié » : à régénérer.' },
					{ element: 'Marché à produire', role: "Pointillés : pas encore produit ; un clic ouvre l'aperçu." },
					{ element: 'Avenant', role: "Numéro et montant ; « à éditer » tant que la lettre n'est pas générée." },
					{ element: 'Certificats', role: "« + » établit le certificat suivant ; les certificats émis s'alignent à gauche." },
					{ element: 'Réception', role: 'Ouvre le PV du lot. Orangé : réserves à lever ou réception différée.' },
				],
			},
			{
				id: 'certificat',
				titre: "Aperçu d'un certificat de paiement",
				intro: "S'ouvre par « Certificat de paiement » (panneau du lot) ou « + » (colonne Certificats).",
				reperes: [
					{ element: 'Marché et avenants', role: 'Repris du lot : montant HT, avenants, totaux HT, TVA, TTC.' },
					{ element: "Mois de l'acompte", role: 'Mois en cours par défaut.' },
					{ element: 'Acomptes précédents', role: 'Avant le premier certificat : saisir les acomptes versés hors Sentinelle.' },
					{ element: 'Travaux réalisés HT (cumul)', role: 'La seule saisie obligatoire : le cumul depuis le début du chantier.' },
					{ element: 'Caution bancaire', role: 'OUI : pas de retenue de garantie. Enregistré sur le lot pour les certificats suivants.' },
					{ element: 'Générer le PDF', role: 'Émet le certificat et télécharge le PDF.' },
					{ element: 'Fermer', role: 'Abandonne les saisies (sauf la caution).' },
				],
			},
			{
				id: 'compte-rendu',
				titre: 'Brouillon de compte rendu',
				intro: "S'ouvre par « Nouveau compte rendu » ou « Reprendre le brouillon » (onglet Documents).",
				reperes: [
					{ element: 'Rédacteur et portable', role: "Le chargé d'affaire par défaut." },
					{ element: 'Date', role: "Date du compte rendu (aujourd'hui par défaut)." },
					{ element: 'Prochain RDV', role: 'Date et heure, imprimées en rouge.' },
					{ element: 'Convocation', role: 'Un clic fait tourner D → C → P → A → E (légende juste au-dessus).' },
					{ element: 'Avancement', role: "Texte libre sur l'état du chantier." },
					{ element: 'Coordination', role: "Une rubrique par lot (« LOT : »), les vides ne s'impriment pas ; **texte** surligne." },
					{ element: 'Repartir des lots', role: 'Remet la coordination de départ (un intitulé par lot).' },
					{ element: 'Abandonner le brouillon', role: 'Supprime le brouillon.' },
					{ element: 'Enregistrer', role: 'Fige le compte rendu et télécharge son PDF.' },
					{ element: 'Fermer', role: 'Ferme ; le brouillon est conservé (« Reprendre le brouillon »).' },
				],
			},
			{
				id: 'pv',
				titre: "Aperçu d'un PV de réception",
				intro: "S'ouvre par « + Réception » ou « Tous les lots » (onglet Documents), ou « PV de réception » (panneau du lot).",
				reperes: [
					{ element: 'Procès-verbal pour', role: 'Choisir le lot, ou « Tous les lots attribués — une page chacun ».' },
					{ element: 'Date de réception', role: "Aujourd'hui par défaut ; commune à tous les PV du chantier." },
					{ element: "Maître d'œuvre", role: "Le chargé d'affaire par défaut." },
					{ element: "Représentant de l'entreprise", role: "L'interlocuteur de la fiche artisan par défaut." },
					{ element: 'Décision', role: 'Sans réserves, avec réserves ou différée.' },
					{ element: 'Réserves', role: 'Avec réserves : une réserve par ligne, et le délai pour les lever.' },
					{ element: 'Générer le PDF', role: 'Émet le PV (ou « Générer les N PV » pour tous les lots).' },
					{ element: 'Fermer', role: 'Ferme ; les saisies restent enregistrées.' },
				],
			},
		],
	},
	{
		titre: 'Artisans',
		ecrans: [
			{
				id: 'artisans',
				titre: 'Référentiel des artisans',
				intro: 'Le référentiel commun des entreprises (bouton Artisans de la barre du haut).',
				reperes: [
					{ element: 'Ajouter une entreprise', role: 'Nouvelle fiche dans le référentiel.' },
					{ element: 'Recherche', role: "Par entreprise, commune ou interlocuteur, sans souci d'accents." },
					{ element: 'Nombre', role: 'Entreprises affichées.' },
					{ element: 'Une entreprise', role: 'Coordonnées imprimées sur les marchés, le récap, les comptes rendus et les PV.' },
					{ element: 'Modifier', role: 'Corrige la fiche ; les prochains documents porteront les nouvelles coordonnées.' },
					{ element: 'Supprimer', role: "Archive l'entreprise : elle quitte les menus d'attribution mais reste sur les documents. « Réactiver » la fait revenir." },
				],
			},
			{
				id: 'fiche-artisan',
				titre: "Fiche d'une entreprise",
				intro: "S'ouvre par « Ajouter une entreprise » ou « Modifier ».",
				reperes: [
					{ element: 'Raison sociale', role: "Obligatoire et unique : c'est le nom imprimé sur le marché." },
					{ element: 'Adresse, code postal, commune', role: 'Imprimés sur les marchés et le récap.' },
					{ element: 'Interlocuteur et téléphone', role: 'Repris sur le récap, les comptes rendus et les PV.' },
					{ element: 'Courriel', role: 'Facultatif.' },
					{ element: 'Ajouter / Enregistrer', role: 'Enregistre la fiche. « Annuler » ferme sans rien changer.' },
				],
			},
		],
	},
	{
		titre: 'Administration',
		ecrans: [
			{
				id: 'comptes',
				titre: 'Comptes',
				intro: 'Réservé aux administrateurs (Mon compte › Comptes).',
				reperes: [
					{ element: 'Nouveau compte', role: 'Crée un compte et donne son mot de passe provisoire.' },
					{ element: 'Compte', role: 'Nom et e-mail.' },
					{ element: 'Portable', role: "Imprimé sur les comptes rendus de ce chargé d'affaire." },
					{ element: 'Rôle', role: 'Passer administrateur ou utilisateur.' },
					{ element: 'Bloquer', role: "Empêche toute connexion et ferme ses sessions ; « Débloquer » rend l'accès." },
					{ element: 'Réinitialiser le mot de passe', role: "Nouveau mot de passe provisoire, en cas d'oubli." },
				],
			},
			{
				id: 'nouveau-compte',
				titre: 'Comptes — nouveau compte',
				intro: "S'ouvre par « Nouveau compte ». Choisissez aussi le rôle : Utilisateur ou Administrateur.",
				reperes: [
					{ element: 'Nom', role: "Prénom et nom, imprimés comme chargé d'affaire." },
					{ element: 'E-mail', role: "L'identifiant de connexion." },
					{ element: 'Créer le compte', role: 'Crée le compte et affiche son mot de passe provisoire.' },
				],
			},
			{
				id: 'mot-de-passe-provisoire',
				titre: 'Comptes — mot de passe provisoire',
				intro: "S'affiche après la création d'un compte ou une réinitialisation.",
				reperes: [
					{ element: 'Mot de passe provisoire', role: 'Affiché une seule fois. À transmettre à la personne, qui le changera à sa première connexion.' },
					{ element: 'Copier', role: 'Copie le mot de passe.' },
				],
			},
			{
				id: 'parametres',
				titre: "Paramètres de l'entreprise",
				intro: "Réservé aux administrateurs (Mon compte › Paramètres). À droite, un aperçu montre l'en-tête tel qu'il sera imprimé.",
				reperes: [
					{ element: 'Entreprise', role: 'Raison sociale et activité, en tête des marchés et du récapitulatif.' },
					{ element: 'Coordonnées', role: "Adresse, téléphone, fax (imprimé s'il est rempli), e-mail, site." },
					{ element: 'Mentions légales', role: 'RCS, code APE, n° de TVA intracommunautaire, sur les certificats de paiement.' },
					{ element: 'Signature', role: 'Ville de signature des documents (« Fait à … »).' },
				],
			},
		],
	},
];

/** Tous les écrans, à plat. */
export const ECRANS: Ecran[] = PARTIES_ECRANS.flatMap((p) => p.ecrans);

export function ecran(id: IdEcran): Ecran {
	const e = ECRANS.find((x) => x.id === id);
	if (!e) throw new Error(`Écran du guide inconnu : ${id}`);
	return e;
}
