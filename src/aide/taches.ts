/**
 * Le guide, partie « Comment faire » : les tâches courantes, pas à pas. Les numéros entourés (①, ②…) sont ceux
 * des pastilles de la capture qui précède (src/aide/ecrans.ts) ; le format du texte est décrit dans blocs.ts.
 */
export type Tache = { id: string; titre: string; texte: string };
export type PartieTaches = { titre: string; intro?: string; taches: Tache[] };

export const PARTIES_TACHES: PartieTaches[] = [
	{
		titre: "Le cycle d'un chantier",
		intro: `
			Un chantier suit toujours le même chemin ; chaque étape a sa tâche plus bas.
			1. [Créer le chantier](#creer-un-chantier).
			2. [Attribuer chaque lot](#attribuer) à une entreprise, avec son montant.
			3. [Générer les marchés](#generer-un-marche) et les faire signer.
			4. [Exporter le récapitulatif](#exporter-le-recap) des marchés pour le client.
			5. [Tracer](#tracer-le-planning) et [imprimer le planning](#imprimer-le-planning), faire signer la feuille de visa.
			6. Au fil des travaux : [avenants](#ajouter-un-avenant), [certificats de paiement](#certificat), [comptes rendus](#compte-rendu).
			7. Réceptionner : [PV de réception](#pv), puis [levée des réserves](#lever-les-reserves).
			8. [Marquer le chantier terminé](#terminer-ou-supprimer).
		`,
		taches: [],
	},
	{
		titre: 'Démarrer',
		taches: [
			{
				id: 'premiere-connexion',
				titre: 'Se connecter la première fois',
				texte: `
					Votre compte est créé par un administrateur, qui vous transmet un mot de passe provisoire. Il n'y a ni inscription ni « mot de passe oublié » en libre-service.
					![connexion]
					1. Ouvrez l'adresse de Sentinelle que vous a donnée l'administrateur.
					2. Saisissez votre adresse e-mail ① et le mot de passe provisoire ②.
					3. Cliquez sur **Ouvrir mes chantiers** ③.
					Sentinelle vous demande aussitôt de choisir votre propre mot de passe :
					![mot-de-passe]
					1. Saisissez le mot de passe provisoire ①.
					2. Saisissez votre nouveau mot de passe ② (12 caractères au moins), puis le même une seconde fois ③.
					3. Cliquez sur **Enregistrer** ④ : l'accueil s'ouvre.
					Plus tard, pour changer de mot de passe : **Mon compte** (vos initiales, en haut à droite) › **Changer mon mot de passe**. Mot de passe oublié : demandez à un administrateur de le réinitialiser.
				`,
			},
			{
				id: 'ouvrir-un-chantier',
				titre: 'Retrouver et ouvrir un chantier',
				texte: `
					![accueil]
					1. Sur l'accueil, tapez une référence, un nom de client ou une commune dans la recherche ⑨.
					2. Cliquez sur la carte du chantier ⑫ : il s'ouvre sur l'onglet Marchés.
					Depuis n'importe quel écran, le sélecteur de chantier ③ ouvre directement un autre chantier, et le logo ① ou la maison ② ramène à l'accueil. Un chantier terminé n'apparaît pas ? Décochez **Masquer les terminés** ⑪.
				`,
			},
		],
	},
	{
		titre: 'Le chantier',
		taches: [
			{
				id: 'creer-un-chantier',
				titre: 'Créer un chantier',
				texte: `
					Sur l'accueil, cliquez sur **Nouveau chantier** (⑦ sur la capture de l'accueil), puis remplissez le formulaire :
					![nouveau]
					1. Saisissez le nom du client ①, le seul champ obligatoire — par exemple « M. et Mme MARTIN ».
					2. Saisissez son adresse actuelle ② ; en rénovation ou en extension, cochez plutôt **Il habite déjà sur le chantier** ③.
					3. Décrivez la nature des travaux ④ et saisissez l'adresse du chantier ⑤.
					4. Donnez une référence dossier ⑥ : unique, elle commence le nom de chaque fichier. Laissée vide, elle reprend le nom du client.
					5. Choisissez le chargé d'affaire ⑦, le type de mission ⑧ et la date de signature prévue ⑨.
					6. Laissez **Partir des 13 lots de base** ⑩ activé ; vous supprimerez ensuite les lots qui ne servent pas.
					7. Vérifiez sur l'extrait du marché ⑪ ce que vos saisies donneront à l'impression.
					8. Cliquez sur **Créer le chantier** ⑬ : il s'ouvre sur l'onglet Marchés.
					Pour essayer l'application sans rien saisir, **Remplir avec un exemple** ⑫ charge un chantier fictif.
				`,
			},
			{
				id: 'modifier-l-entete',
				titre: "Modifier l'en-tête du chantier",
				texte: `
					L'en-tête (client, adresses, mission, chargé d'affaire, signature) s'imprime sur tous les documents.
					1. Ouvrez le chantier et cliquez sur le bandeau gris de l'en-tête, en haut de l'onglet Marchés (⑧ sur la capture de l'onglet Marchés, plus bas).
					![entete]
					2. Corrigez les champs ①, le type de mission ② ou le chargé d'affaire ③. Chaque champ s'enregistre dès que vous le quittez.
					3. Fermez le panneau (Échap).
					Les documents déjà générés ne changent pas ; ceux qui doivent être refaits passent « modifié » dans l'onglet Documents.
				`,
			},
			{
				id: 'terminer-ou-supprimer',
				titre: 'Terminer ou supprimer un chantier',
				texte: `
					- **Terminer** : bouton **Terminer** de sa carte sur l'accueil (⑬), ou **Marquer terminé** ④ dans le panneau de l'en-tête. Le chantier quitte l'accueil tant que **Masquer les terminés** est coché ; **Rouvrir** le remet en cours. Il reste consultable et modifiable.
					- **Supprimer** : corbeille de sa carte sur l'accueil (⑭), seulement tant qu'aucun document n'a été généré. Sentinelle liste ce qui sera perdu et demande confirmation ; la suppression est définitive. Dès qu'un document existe, marquez plutôt le chantier terminé.
				`,
			},
		],
	},
	{
		titre: 'Les marchés',
		taches: [
			{
				id: 'attribuer',
				titre: 'Attribuer une entreprise et saisir le montant',
				texte: `
					![marches]
					1. Ouvrez le chantier sur l'onglet **Marchés** ②.
					2. Ajustez la liste des lots : numéro et désignation ⑪ se modifient directement dans le tableau, **Ajouter un lot** ⑤ en ajoute un en fin de liste.
					3. Cliquez sur la ligne du lot ⑬ : son panneau s'ouvre.
					![lot]
					4. Choisissez le modèle de marché : gré à gré ou sous-traitance ①.
					5. Dans **Entreprise attribuée** ②, tapez quelques lettres du nom ou de la commune ; Entrée choisit le premier résultat. L'entreprise n'est pas dans la liste ? Ajoutez-la d'abord au référentiel (voir [Ajouter ou corriger une entreprise](#entreprise)).
					6. Saisissez le montant initial HT ⑤ — ou le montant TTC ⑦, qui recalcule le HT.
					7. Réglez le taux de retenue de garantie ⑧ et, si le marché est déjà signé, sa date ⑨.
					8. Fermez le panneau (Échap). Les totaux du chantier (⑰ de l'onglet Marchés) se mettent à jour.
					Pour aller plus vite, le montant HT et le montant TTC (⑭ et ⑯ de l'onglet Marchés) se saisissent aussi directement dans le tableau. Un lot inutile se retire par **Supprimer le lot** ⑬, tant qu'aucun document n'existe pour lui.
				`,
			},
			{
				id: 'generer-un-marche',
				titre: 'Générer un marché',
				texte: `
					Il faut une entreprise, un montant HT supérieur à 0, un client et une adresse de chantier ; sinon le bouton indique ce qui manque.
					1. Dans le panneau du lot, cliquez sur **Ouvrir le marché** (⑩ de la capture précédente).
					![apercu-marche]
					2. Relisez la colonne de gauche ② : elle dit d'où vient chaque donnée. Une erreur se corrige à sa source — le chantier, le lot ou la fiche de l'entreprise.
					3. Écrivez directement dans les zones bleues de la feuille ④ : corps d'état, travaux, clause particulière. Le bleu ne s'imprime pas.
					4. Cliquez sur **Générer le PDF** ⑥ : Sentinelle crée la version suivante (v1, v2…) et télécharge le marché à faire signer.
					Pour tous les lots d'un coup, **Générer les marchés manquants** (⑦ de l'onglet Marchés) produit chaque marché qui n'existe pas encore, puis liste les lots ignorés et pourquoi. Pour revoir un marché déjà produit, choisissez sa version dans le menu **Version** ⑤.
				`,
			},
			{
				id: 'ajouter-un-avenant',
				titre: 'Ajouter un avenant',
				texte: `
					Un supplément ou une moins-value passe toujours par un avenant : saisir un nouveau montant TTC réécrirait le montant signé, et le marché passerait « modifié ».
					1. Ouvrez le panneau du lot et descendez jusqu'au bloc Avenants.
					![avenants]
					2. Cliquez sur **Ajouter** ① : l'avenant prend le numéro suivant et la date du jour.
					3. Saisissez le numéro du devis de l'entreprise ② et le montant HT ③ — négatif pour une moins-value. Corrigez la date ④ si besoin.
					4. Cliquez sur **Ouvrir la lettre** ⑤, écrivez l'objet de l'avenant dans la zone bleue, puis **Générer le PDF**. La lettre calcule l'ancien montant, la différence et le nouveau montant.
					Un avenant saisi par erreur se retire par **Supprimer** ⑥ ; son numéro n'est pas réutilisé.
				`,
			},
			{
				id: 'exporter-le-recap',
				titre: 'Exporter le récapitulatif des marchés',
				texte: `
					1. Dans l'onglet Marchés, cliquez sur **Exporter le récap** (⑥ de l'onglet Marchés).
					![apercu-recap]
					2. Relisez l'en-tête ① et le tableau des lots ② : entreprises, coordonnées et montants TTC engagés, avenants compris.
					3. Cliquez sur **Générer le PDF** ④ : la version est créée, visible dans l'onglet Documents, et le PDF téléchargé.
					**Fermer** ⑤ ne crée rien.
				`,
			},
		],
	},
	{
		titre: 'Le planning',
		taches: [
			{
				id: 'tracer-le-planning',
				titre: 'Tracer le planning',
				texte: `
					![planning]
					1. Ouvrez l'onglet **Planning** et vérifiez que l'outil Cible ⑦ est choisi.
					2. Pour créer une période, glissez la souris dans le vide de la ligne d'un lot ⑫, sur les semaines voulues ⑩. Le panneau du lot s'ouvre pour la nommer.
					3. Déplacez une période ⑬ en la faisant glisser ; allongez-la ou raccourcissez-la par son bord droit.
					4. Pour en décaler plusieurs : Maj + clic sur chacune (ou Maj + glisser un cadre dans le vide), puis flèches ← → — une semaine, ou quatre avec Maj. Suppr efface la sélection.
					5. Pour y voir plus clair, masquez des lots avec **Lots affichés** ⑤ ; **Aujourd'hui** ⑧ et **Densité** ⑨ règlent la vue. Ces réglages ne changent rien pour vos collègues.
					Pour régler un lot au clavier, cliquez sur son nom ⑫ :
					![planning-lot]
					1. Choisissez sa couleur ① — la même pour une même famille de lots.
					2. **Ajouter** ② crée une période d'une semaine après la dernière ; nommez-la ③.
					3. Réglez la semaine de début, l'année et la durée ④.
					4. Pour enchaîner deux périodes, choisissez dans **Commence après** ⑤ celle qui doit finir avant : si elle s'allonge ou recule, la suite est repoussée. Le lien apparaît en flèche sur le planning (⑭ de l'onglet Planning).
					5. **Supprimer** ⑥ retire une période.
					Les gestes de tracé se font à la souris ; sur tablette, passez par ce panneau.
				`,
			},
			{
				id: 'fermetures',
				titre: 'Ajouter des congés ou une fermeture',
				texte: `
					1. Dans l'onglet Planning, cliquez sur **Fermetures** (① de l'onglet Planning).
					![fermetures]
					2. Cliquez sur **Ajouter** ① : une fermeture « Congés » de 2 semaines est créée.
					3. Corrigez son libellé, sa semaine, son année et sa durée ②.
					La fermeture barre tout le planning (ligne Fermetures, ⑪ de l'onglet Planning) mais ne déplace aucune période : décalez les travaux vous-même si besoin.
				`,
			},
			{
				id: 'imprimer-le-planning',
				titre: 'Imprimer le planning et faire signer la feuille de visa',
				texte: `
					1. Dans l'onglet Planning, cliquez sur **Planning imprimable** (③ de l'onglet Planning).
					![apercu-planning]
					2. Vérifiez la feuille ①, puis cliquez sur **Générer le PDF** ②. Si les lots ne tiennent plus lisiblement sur une feuille, l'aperçu le signale et la génération est refusée.
					3. Cliquez ensuite sur **Feuille de visa** (② de l'onglet Planning).
					![apercu-visa]
					4. La feuille ① reprend le dernier planning généré et liste les entreprises. Cliquez sur **Générer le PDF** ② et faites-la signer.
					Si vous modifiez puis régénérez le planning, la feuille de visa devient « périmée » : produisez-en une nouvelle.
				`,
			},
		],
	},
	{
		titre: 'Le suivi du chantier',
		taches: [
			{
				id: 'certificat',
				titre: 'Établir un certificat de paiement',
				texte: `
					À chaque situation d'une entreprise, vous saisissez seulement le cumul des travaux réalisés : Sentinelle calcule l'acompte, la TVA, la retenue de garantie et le montant à mandater.
					1. Ouvrez le certificat depuis le panneau du lot (**Certificat de paiement**, ⑪ du panneau du lot) ou depuis l'onglet Documents (« + » de la colonne Certificats, ⑫ de l'onglet Documents).
					![certificat]
					2. Chantier commencé avant Sentinelle : avant le premier certificat du lot, saisissez les acomptes déjà versés ③.
					3. Saisissez le cumul des travaux réalisés HT ④, depuis le début du chantier. Corrigez le mois de l'acompte ② si besoin.
					4. Indiquez si l'entreprise a fourni une caution bancaire ⑤ : OUI supprime la retenue de garantie, et le choix vaut pour les certificats suivants.
					5. Vérifiez les montants, recalculés à chaque frappe, puis cliquez sur **Générer le PDF** ⑥.
					Le présent acompte doit être positif, sinon la génération est refusée. Une erreur sur le dernier certificat d'un lot ? **Corriger** (panneau du lot ou onglet Documents) rouvre la feuille avec ses saisies, et **Générer la v2** crée une nouvelle version.
				`,
			},
			{
				id: 'compte-rendu',
				titre: 'Rédiger un compte rendu de chantier',
				texte: `
					Chaque compte rendu repart du précédent : vous ne réécrivez que ce qui a changé depuis le dernier rendez-vous.
					1. Dans l'onglet **Documents**, carte Comptes rendus (③ de l'onglet Documents), cliquez sur **Nouveau compte rendu**.
					![compte-rendu]
					2. Vérifiez le rédacteur ① et la date ②, puis saisissez le prochain rendez-vous ③.
					3. Cliquez sur la lettre de chaque entreprise ④ jusqu'à la bonne : P présent, A absent, E excusé, C convoqué au prochain rendez-vous, D diffusion seulement.
					4. Écrivez l'avancement ⑤.
					5. Mettez à jour la coordination ⑥ : une rubrique par lot, sous un intitulé en majuscules terminé par deux-points (« GROS ŒUVRE : »). Une rubrique vide ne s'imprime pas ; un texte entre doubles astérisques (\\*\\*texte\\*\\*) s'imprime surligné.
					6. Cliquez sur **Enregistrer** ⑨ : le compte rendu est figé et son PDF téléchargé.
					Tout s'enregistre au fil de la saisie : **Fermer** ⑩ garde le brouillon, que vous retrouvez par **Reprendre le brouillon**. **Repartir des lots** ⑦ remet la coordination de départ ; **Abandonner le brouillon** ⑧ le supprime.
				`,
			},
			{
				id: 'pv',
				titre: 'Faire les PV de réception',
				texte: `
					1. Dans l'onglet **Documents**, cliquez sur **Tous les lots** (⑧ de l'onglet Documents) pour préparer tous les PV d'un coup, ou sur la case Réception d'un lot (⑬).
					![pv]
					2. Le menu **Procès-verbal pour** ① passe d'un lot à l'autre, ou à « Tous les lots attribués — une page chacun ».
					3. Vérifiez la date de réception ②, le maître d'œuvre ③ et le représentant de l'entreprise ④. La date est commune à tous les PV du chantier.
					4. Choisissez la décision ⑤ : sans réserves ; avec réserves, en saisissant une réserve par ligne et le délai pour les lever ⑥ ; ou différée, avec ses motifs.
					5. Cliquez sur **Générer le PDF** ⑦ — ou **Générer les N PV** pour tous les lots, qui sortent dans un seul PDF, une page par lot.
					En mode « tous les lots », une seule erreur (réserves ou motifs manquants) bloque tout, et l'aperçu se place sur le lot en cause.
				`,
			},
			{
				id: 'lever-les-reserves',
				titre: 'Lever les réserves',
				texte: `
					Une réception avec réserves reste orangée dans l'onglet Documents (case Réception, ⑬ de l'onglet Documents) jusqu'à leur levée.
					1. Dans la case Réception du lot, cliquez sur **Réserves levées…**.
					2. Indiquez la date de levée : aujourd'hui par défaut, jamais avant la réception.
					3. Cliquez sur **Enregistrer la levée** : la case passe en bleu.
					**Annuler la levée** revient en arrière. Une réception différée reste orangée jusqu'à ce qu'un nouveau PV la remplace.
				`,
			},
			{
				id: 'tout-telecharger',
				titre: 'Voir ce qui reste à produire et tout télécharger',
				texte: `
					![documents]
					- Une case en pointillés ⑩ n'est pas encore produite : un clic ouvre l'aperçu pour la produire.
					- Une case bleue ⑨ est à jour ; avec la pastille « modifié », les données ont changé depuis : un clic ouvre l'aperçu pour régénérer.
					- **Générer les manquants** ⑦ produit d'un coup tous les marchés qui manquent.
					- **Tout télécharger** ② donne un ZIP avec la dernière version de chaque document, rangée par dossier : marchés, avenants, certificats, comptes rendus, réceptions, planning.
				`,
			},
		],
	},
	{
		titre: 'Le référentiel des entreprises',
		taches: [
			{
				id: 'entreprise',
				titre: 'Ajouter ou corriger une entreprise',
				texte: `
					1. Cliquez sur **Artisans** dans la barre du haut (④ de l'accueil).
					![artisans]
					2. Cherchez l'entreprise ② par son nom, sa commune ou son interlocuteur.
					3. Elle existe : cliquez sur **Modifier** ⑤. Sinon : **Ajouter une entreprise** ①.
					![fiche-artisan]
					4. Saisissez la raison sociale ① — obligatoire et unique, c'est le nom imprimé sur le marché —, l'adresse ②, l'interlocuteur et son téléphone ③, et le courriel ④ si vous l'avez.
					5. Cliquez sur **Ajouter** ⑤ (**Enregistrer** pour une modification).
					Les prochains documents porteront les nouvelles coordonnées ; ceux déjà générés gardent les anciennes. Depuis un lot, **Voir la fiche** (③ du panneau du lot) ouvre directement la fiche de son entreprise.
					Une entreprise avec qui vous ne travaillez plus : **Supprimer** (⑥ du référentiel) l'archive. Elle quitte les menus d'attribution mais reste sur les documents déjà établis ; **Réactiver** la fait revenir.
				`,
			},
		],
	},
	{
		titre: 'Pour les administrateurs',
		intro: `
			Ces écrans s'ouvrent depuis le menu **Mon compte** (vos initiales, en haut à droite).
			![compte]
		`,
		taches: [
			{
				id: 'creer-un-compte',
				titre: 'Créer un compte pour un collègue',
				texte: `
					1. Ouvrez **Mon compte** › **Comptes** ⑤.
					![comptes]
					2. Cliquez sur **Nouveau compte** ①.
					![nouveau-compte]
					3. Saisissez le nom ① — imprimé comme chargé d'affaire — et l'e-mail ②, qui sera son identifiant.
					4. Cliquez sur **Créer le compte** ③.
					![mot-de-passe-provisoire]
					5. Copiez le mot de passe provisoire avec **Copier** ② : il ne s'affiche qu'une fois. Transmettez-le à la personne, qui le changera à sa première connexion.
					6. Dans la liste des comptes, renseignez son portable (③ de l'écran Comptes) : il s'imprime sur ses comptes rendus.
				`,
			},
			{
				id: 'reinitialiser-ou-bloquer',
				titre: 'Réinitialiser un mot de passe ou bloquer un compte',
				texte: `
					Sur l'écran **Comptes** (capture précédente) :
					- **Mot de passe oublié** : **Réinitialiser le mot de passe** ⑥ affiche un nouveau mot de passe provisoire, à transmettre de la même façon. Les sessions ouvertes de la personne sont fermées.
					- **Départ d'un collègue** : **Bloquer** ⑤ empêche toute connexion ; **Débloquer** rend l'accès. Un compte ne se supprime pas : les documents produits gardent leur auteur.
					- **Droits** : le rôle ④ fait passer un compte administrateur ou utilisateur.
				`,
			},
			{
				id: 'parametres',
				titre: "Modifier les coordonnées de l'entreprise",
				texte: `
					1. Ouvrez **Mon compte** › **Paramètres** ④.
					![parametres]
					2. Corrigez la raison sociale et l'activité ①, les coordonnées ②, les mentions légales des certificats ③ ou la ville de signature ④.
					Le changement vaut pour les documents générés ensuite ; aucun document existant ne passe « modifié ».
				`,
			},
		],
	},
	{
		titre: 'Bon à savoir',
		intro: `
			- **Pas de bouton Enregistrer** : un champ s'enregistre dès que vous le quittez (Tab, Entrée ou clic ailleurs). Si l'enregistrement échoue, le champ passe en rouge avec un message et garde votre saisie.
			- **Le bleu ne s'imprime pas** : sur une feuille, les zones bleues sont celles qu'on écrit ; tout le reste vient du chantier, du lot ou du référentiel.
			- **Un document généré est figé** : il garde les coordonnées et les montants du jour où il a été produit. Pour une version à jour, on régénère ; l'ancienne reste dans l'historique.
			- **Régénérer sans rien changer** ne crée pas de doublon : la dernière version est téléchargée.
			- **À plusieurs** : tout le monde voit les mêmes chantiers. Si deux personnes modifient le même champ au même moment, la dernière saisie l'emporte.
			- **« Génération en cours, réessayez dans quelques secondes »** : d'autres PDF sont en cours de production ; relancez juste après.
			- **Clavier** : Échap ferme le panneau, le menu ou l'aperçu ouvert.
			- **Navigateur** : Chrome, Edge, Firefox ou Safari, dans une version récente.
			- **Une question, un bug, une idée** : adressez-vous à votre administrateur.
		`,
		taches: [],
	},
];
