# Sentinelle Marchés — Sous-projet 1 : Socle

- **Date :** 2026-09-29 (révisée après audit le même jour)
- **Statut :** à valider
- **Référence :** maquette fonctionnelle `docs/maquette/sentinelle-marches.html` (lire les notes en tête de fichier)

## 1. Contexte et objectif

Sentinelle est un outil interne de SOCOREVE (maître d'œuvre, Châteaubriant) utilisé par les chargés
d'affaire. Pour chaque chantier de maison individuelle, on saisit une seule fois l'en-tête (client,
adresse, mission) et les lots (entreprise + montant) ; l'application produit les documents papier du
chantier, fidèles aux modèles Word/ODS existants.

Une maquette HTML autonome (données en `localStorage`, comptes fictifs) a validé l'ergonomie et les
gabarits. L'objectif est d'en faire une vraie application : comptes réels, données partagées entre
collègues, PDF et exports réellement produits.

### Découpage en sous-projets

Chaque sous-projet a sa propre spec, son plan et une livraison utilisable :

1. **Socle** (ce document) : comptes, chantiers, artisans, lots, marchés (gré à gré et
   sous-traitance) en PDF, récapitulatif PDF + tableur, déploiement VPS.
2. **Planning** : Gantt interactif, fermetures, planning imprimable sur une feuille, feuille de visa.
3. **Suivi financier** : avenants, certificats de paiement.
4. **Suivi de chantier** : comptes rendus, PV de réception, page Documents complète, « Tout télécharger » (ZIP).

### Critères de réussite du Socle

- Un chargé d'affaire se connecte, crée un chantier depuis les 13 lots de base, attribue les
  entreprises, saisit les montants et imprime des marchés et un récapitulatif identiques aux modèles
  de la maquette. La fidélité se mesure selon le § 10.
- Tous les collègues voient les mêmes données.
- Un marché généré est figé : on peut toujours retrouver le PDF exact d'une version.
- L'application tourne sur le VPS, en HTTPS, avec une sauvegarde nocturne dont la restauration a été
  testée.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Interface | Tailwind CSS + shadcn/ui ; `cmdk` pour la recherche d'artisan |
| Base de données | PostgreSQL 17 + Prisma ; montants en `Decimal` |
| Écritures | Server Actions + validation Zod |
| Authentification | Better Auth, e-mail + mot de passe, inscription publique désactivée, comptes créés par l'admin |
| Visibilité | Tout utilisateur voit et modifie tous les chantiers **et le référentiel artisans** |
| Rôles | `ADMIN` (comptes, paramètres) et `UTILISATEUR` |
| PDF | Gabarits React rendus en HTML côté serveur puis imprimés par Playwright (Chromium) |
| Tableur | ExcelJS |
| Tests | Vitest (domaine, documents) + Playwright (parcours) |
| Hébergement | VPS, Docker Compose : app + Postgres + Caddy (HTTPS) + sauvegarde |
| Données initiales | Référentiel artisans (`ARTISANS_SEED`), paramètres et premier admin ; PERRIER seulement en fixture de dev/test |
| Documents | Figés à la génération (copie JSON + PDF + version) |
| Coordonnées SOCOREVE | Un seul jeu de coordonnées, dans la page « Paramètres » modifiable par l'admin, lu par tous les gabarits |
| Ordre des lots | Ordre de saisie, jamais modifié ; tri et recherche d'affichage seulement (comme la maquette) |
| Langue | Interface, code, modèles et commentaires en français |

## 3. Architecture

Une seule application Next.js, organisée en couches :

```
src/
  domaine/      Règles métier en TypeScript pur (ni Prisma, ni React)
    montants.ts   ttcInitial, htEngage, ttcEngage, htDepuisTtc, arrondis, formatage €
    regles.ts     exemplaires par défaut, destinataire des factures, date « Fait le »,
                  corps d'état par défaut, conditions de génération
    recherche.ts  normalisation sans accents, recherche d'artisan (nom, commune)
    empreinte.ts  sérialisation stable + SHA-256
    fichiers.ts   slugification et noms de fichiers
    lotsDeBase.ts constante des 13 lots de base (annexe A)
  donnees/      Client Prisma et fonctions de lecture par entité
  actions/      Server Actions : Zod → session/rôle → Prisma → revalidatePath
  documents/
    gabarits/     MarcheGreAGre, MarcheSousTraitance, Recapitulatif (+ composant Zone)
    donnees.ts    construireDonneesMarche, construireDonneesRecap
    pdf.ts        navigateur Playwright partagé, HTML → PDF
    tableur.ts    export ExcelJS du récapitulatif
    documents.css feuilles fidèles aux modèles (reprise des styles .sheet de la maquette)
    ressources/   logo SOCOREVE, polices embarquées
  composants/   Interface (shadcn/ui, tableau des lots, menu d'artisan…)
  app/          Routes et pages
```

### Circulation des données

- Les pages serveur lisent via `donnees/` et passent les données aux composants client.
- Toute modification passe par une Server Action, puis revalidation de la page.
- Les calculs de montants n'existent **qu'à un seul endroit**, dans `domaine/montants.ts`. L'écran, les
  gabarits et l'export tableur l'appellent tous.

### Principes

- **Montants :** `Decimal` Prisma et `decimal.js` ; jamais de `number` JavaScript dans un calcul
  d'argent. L'arrondi au centime se fait seulement à l'affichage et dans l'objet document.
- **Saisie :** enregistrement quand on quitte le champ, sans bouton « Enregistrer ». En cas d'édition
  simultanée du même champ, c'est la dernière saisie qui gagne (accepté pour une petite équipe).
- **PDF :** une seule instance Chromium, lancée au premier besoin puis réutilisée, avec au plus 2
  générations simultanées (voir § 8, « Versions et concurrence »).

## 4. Modèle de données

Seules les entités du Socle sont présentes. Tâches, avenants, acomptes, comptes rendus et réceptions
arriveront avec leurs sous-projets.

```
Utilisateur   id, email (unique), nom, initiales, telephone?, role (ADMIN | UTILISATEUR), actif,
              doitChangerMotDePasse
              + tables techniques Better Auth (Session, Compte, Verification)

Parametres    singleton (id = 1) : raisonSociale, formeJuridique, adresse, cp, ville,
              telephone, fax?, villeSignature

Artisan       id, nom (unique), adresse, cp, commune, interlocuteur, telephone, email, actif

Chantier      id, reference (obligatoire, unique), maitreOuvrage, adresseClient, natureTravaux,
              adresse, cp, commune, mission (COMPLETE | PARTIELLE),
              dateSignaturePrevue?, termine, chargeAffaireId → Utilisateur,
              creeLe, creeParId → Utilisateur

Lot           id, chantierId → Chantier (ON DELETE CASCADE), ordre, numero? (vide pour la
              sous-traitance), designation, nature (GRE_A_GRE | SOUS_TRAITANCE),
              artisanId? → Artisan, montantHtInitial Decimal(18,8), tauxTva Decimal(5,2),
              retenueGarantie Decimal(5,2), exemplaires, corpsEtat, travaux, clauseParticuliere,
              couleur, dateSignature?
              unique (chantierId, ordre)

Document      id, chantierId → Chantier, lotId? → Lot (ON DELETE RESTRICT),
              type (MARCHE_GRE_A_GRE | MARCHE_SOUS_TRAITANCE | RECAPITULATIF),
              version, donnees Json, empreinte, pdf Bytes, nomFichier, creeLe, creeParId → Utilisateur
              unique (chantierId, lotId, type, version) NULLS NOT DISTINCT
```

### Choix notables

- **Un lot référence son artisan par identifiant** (la maquette le faisait par nom). Renommer une
  entreprise ne demande plus de mettre à jour les lots.
- **Le chargé d'affaire est un utilisateur.**
- **Référence de chantier obligatoire et unique.** Elle sert aussi de base aux noms de fichiers.
- **Ordre des lots :** `ordre` est attribué à la création (max + 1) et n'est jamais modifié.
- **Unicité des versions :** `lotId` est nul pour le récapitulatif, et Postgres considère par défaut
  deux `NULL` comme distincts. La contrainte est donc créée par une migration SQL avec
  `NULLS NOT DISTINCT` (Postgres 15 et plus).
- **« À régénérer » est calculé, jamais stocké.** On compare l'empreinte des données actuelles à celle
  de la dernière version.
- **Changer la nature d'un lot** (gré à gré ↔ sous-traitance) change le type du document : une nouvelle
  série de versions commence, l'ancienne reste consultable et n'est jamais régénérée.
- **`couleur`** est persistée dès le Socle pour le planning, mais aucun écran du Socle ne la modifie.

### Valeurs par défaut (reprises de la maquette)

- Nature `GRE_A_GRE`, TVA 20 %, retenue de garantie 5 %.
- Exemplaires : 2 en sous-traitance, 3 sinon. Changer la nature remet cette valeur par défaut.
- Nouveau chantier : les 13 lots de base (annexe A) sont recopiés dans le chantier sans entreprise
  ni montant. Ils sont ajoutés par défaut et désactivables par un interrupteur. Ce sont une constante
  du code, pas des données en base.
- Paramètres à l'installation : S.A.S SOCOREVE, « Société Construction Rénovation Vente »,
  71 rue du Général Patton, 44110 Châteaubriant, tél. 02 40 81 40 26, sans fax, ville de signature
  Châteaubriant. L'admin les corrige dans la page Paramètres.

## 5. Règles métier du Socle

### Montants

- `htDepuisTtc(ttc, taux, avenantsHt) = ttc / (1 + taux / 100) − avenantsHt`. `avenantsHt` vaut 0
  dans le Socle ; la signature est déjà prête pour le sous-projet 3.
- Un HT résultant négatif est refusé avec un message.
- `montantHtInitial` est stocké en `Decimal(18,8)` pour qu'un TTC saisi soit retrouvé exactement. On
  n'arrondit au centime qu'à l'affichage et dans l'objet document.
- Le **marché** imprime le montant **initial** (`ttcInitial`). Le **tableau**, les **totaux** et le
  **récapitulatif** portent le montant **engagé** (`htEngage`, `ttcEngage`), égal à l'initial dans le
  Socle.
- Pourcentages imprimés sans décimales inutiles : « 5 % » et non « 5,00 % ».

### Marché de gré à gré

- **Destinataire des factures :** « au Maître d'Ouvrage » en mission partielle, « à SOCOREVE » en
  mission complète.
- **Exemplaires :** « Fait en triple exemplaire » (ou « double » selon `exemplaires`).

### Marché de sous-traitance

- Les factures sont **toujours** adressées « à SOCOREVE », quelle que soit la mission.
- « Fait en double exemplaire » (texte du modèle ; `exemplaires` vaut 2).

### Communes aux deux marchés

- **Date « Fait le » :** date de signature du lot, sinon date de signature prévue du chantier,
  sinon date du jour de génération. Format `jj.mm.aaaa`. La ville vient de
  `Parametres.villeSignature`.
- **Corps d'état vide :** on imprime la désignation du lot en minuscules.
- **Coordonnées de l'entreprise :** lues dans le référentiel artisans au moment de la génération,
  puis figées dans le document.

### Conditions pour générer un marché

Il faut une entreprise attribuée, un montant HT supérieur à 0, un client et une adresse de chantier.
C'est volontairement plus strict que la maquette, qui n'exigeait que l'entreprise. Le bouton désactivé
nomme ce qui manque, et les tests s'alignent sur ces conditions.

### Divers

- **Adresse du client :** la case « le client habite déjà à cette adresse » recopie l'adresse du
  chantier dans l'adresse actuelle du client.
- **Recherche d'artisan :** sur le nom et la commune, insensible aux accents et à la casse ; Entrée
  choisit le premier résultat.
- **Artisan inactif :** il n'est plus proposé dans le menu d'attribution. S'il est déjà attribué à un
  lot, il reste affiché (avec la mention « archivée ») et son marché reste générable.

## 6. Écrans

Le style de la maquette est repris : palette « bleu de plan », polices Figtree, Outfit et Spline
Sans Mono, thème clair et sombre.

- **Connexion** (`/connexion`) : e-mail et mot de passe ; ni inscription ni mot de passe oublié en
  libre-service. Si `doitChangerMotDePasse` est vrai, l'utilisateur est redirigé vers le changement de
  mot de passe avant tout autre écran.
- **Mes chantiers** (`/chantiers`) :
  - liste (référence, client, commune, chargé d'affaire, total TTC engagé), recherche, « Masquer
    les terminés » ;
  - formulaire **Nouveau chantier** identique à la maquette, avec l'interrupteur « Partir des 13 lots
    de base » activé par défaut.
- **Chantier** (`/chantiers/[id]`) : un en-tête (client, adresse, mission, bouton « Terminé ») et
  deux onglets.
  - **Marchés** :
    - **tableau des lots** : n°, désignation, HT, TVA et TTC modifiables directement ; la colonne
      Entreprise affiche le nom et la commune, ou « à attribuer ». Saisir un TTC recalcule le HT
      initial via `htDepuisTtc`. Un clic sur la ligne ouvre le panneau du lot ;
    - recherche dans les lots et menu **« Trier par »** (ordre du chantier, lot, entreprise, montant,
      à attribuer). Le tri ne change que l'affichage ; les totaux portent toujours sur tout le
      chantier, ce qui est signalé quand un filtre est actif ;
    - ajout et suppression de lots ; totaux HT, TVA et TTC ;
    - **panneau du lot**, comme dans la maquette : nature (gré à gré ou sous-traitance), entreprise
      (menu avec recherche, coordonnées du référentiel en lecture), HT, TVA, TTC, retenue de garantie
      (taux + montant calculé), exemplaires (affichés), date de signature (avec rappel de la date
      du chantier par défaut) et un bouton d'ouverture du marché ;
    - boutons « Générer les marchés manquants » et « Exporter le récap » (xlsx).
  - **Documents** (piste B de la maquette, réduite au Socle) :
    - carte « Récapitulatif » en haut, puis un tableau par entreprise avec une colonne **Marché** ;
    - états d'une case : **à produire** (pointillé), **à jour** (bleu, s'ouvre), **modifié depuis la
      génération** (bleu avec une pastille « modifié »). L'orangé reste réservé aux réserves des PV
      (sous-projet 4) ;
    - une légende sous le tableau explique ces états ;
    - versions précédentes consultables.
- **Aperçu d'un document** (surcouche plein écran) :
  - feuille fidèle au modèle ; le **corps d'état, les travaux et la clause particulière se saisissent
    sur la feuille**, dans les zones bleues ;
  - bouton « Générer le PDF » ;
  - une version figée se rouvre en lecture seule, avec un bandeau (§ 7, « Consultation ») ;
  - le défilement de la page derrière est bloqué.
- **Artisans** (`/artisans`) : recherche, ajout, modification, désactivation ; accessible à tous les
  utilisateurs.
- **Paramètres** (`/parametres`, admin) : coordonnées de SOCOREVE.
- **Comptes** (`/admin/comptes`, admin) : créer un compte, désactiver, réinitialiser le mot de passe,
  changer le rôle.

## 7. Documents et PDF

### Chemin d'un document

1. `construireDonneesMarche(lotId)` / `construireDonneesRecap(chantierId)` lisent la base et
   produisent un objet JSON complet et autonome : textes, montants arrondis et formatés, coordonnées
   de l'entreprise et de SOCOREVE. Le marché fige le **montant initial**, la TVA et la retenue ; le
   récapitulatif fige les **montants engagés**.
2. L'**empreinte** est le SHA-256 de la sérialisation stable de cet objet.
3. Le **gabarit React** reçoit cet objet et rien d'autre (aucun accès à la base, aucun calcul). Il
   déclare son format de page : A4 paysage, marge 10 mm, pour les deux marchés et le récapitulatif.
4. `pdf.ts` rend le gabarit en HTML (`renderToStaticMarkup`), injecte `documents.css`, le logo et les
   polices embarqués, puis Playwright produit le PDF (`page.setContent` → `page.pdf`, sans en-tête ni
   pied de page Playwright).

### Zones et empreinte

- Une zone bleue enregistre au blur le champ du lot correspondant (corps d'état, travaux, clause).
- « Générer le PDF » enregistre d'abord la zone qui a le focus, puis reconstruit l'objet et son
  empreinte. Une saisie en cours n'est donc jamais perdue ni exclue du document.

### Générer

- Si l'empreinte est identique à celle de la dernière version de la série, on ne crée rien et on
  renvoie cette version.
- Sinon, la version n+1 est créée (voir § 8, « Versions et concurrence »).
- **Marché :** généré depuis l'aperçu du lot, le panneau du lot ou « Générer les marchés manquants ».
- **Récapitulatif :** la carte « Récapitulatif » de l'onglet Documents ouvre l'aperçu de la feuille,
  puis « Générer le PDF » crée un Document `RECAPITULATIF` versionné (JSON + PDF).

### Noms de fichiers

`slugifier` retire les accents, remplace tout ce qui n'est ni lettre ni chiffre par un tiret et met
en majuscules (comme `nomFichierRecap` dans la maquette). `<REF>` est la référence du chantier.

- Marché de gré à gré : `<REF>-Lot<NN>-<DESIGNATION>-Marche-v<N>.pdf`
- Marché de sous-traitance (sans numéro) : `<REF>-ST-<DESIGNATION>-Marche-v<N>.pdf`
- Récapitulatif : `<REF>-RecapMarches-v<N>.pdf` ; export tableur : `<REF>-RecapMarches.xlsx`

### Modes du gabarit

Le composant `<Zone cle="…">` lit le mode dans un contexte :

- **édition** : zone `contenteditable="plaintext-only"` teintée de bleu, enregistrée au blur ; la
  feuille n'est jamais reconstruite pendant la frappe ;
- **lecture** : texte, pour une copie figée ;
- **impression** : texte neutre, pour le rendu côté serveur.

### Sécurité du rendu

- Les textes des zones sont stockés en texte brut et réinjectés **échappés**, jamais comme du HTML.
- Le Chromium de génération n'a **aucun accès réseau** : toute requête sortante est bloquée
  (`page.route` → abort). Logo, polices et CSS sont injectés dans la page.

### Consultation

- Le téléchargement renvoie les **octets du PDF stocké**.
- L'aperçu d'une version figée rend sa copie JSON avec le gabarit courant. Un bandeau l'indique :
  « Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel. »

### Actions groupées

- **Générer les marchés manquants :** génère **l'un après l'autre** un marché pour chaque lot qui
  remplit les conditions et n'en a pas encore, puis affiche la liste des lots ignorés avec leur
  raison (« Lot 07 : pas d'entreprise »).
- **Exporter le récap (xlsx) :** depuis l'onglet Marchés, produit à la volée depuis
  `construireDonneesRecap`, sans être stocké.

### Mise en forme

- `documents.css` est une CSS dédiée aux couleurs fixes, reprise des styles `.sheet` de la maquette,
  sans Tailwind.
- Logo (`LOGO_SOCOREVE` de la maquette) et polices sont embarqués dans l'application et dans l'image
  Docker.

## 8. Gestion des erreurs

- **Server Actions :** elles renvoient `{ ok: true, … }` ou `{ ok: false, erreur }` (message en
  français) et ne lèvent jamais d'exception jusqu'à l'interface. Les erreurs Zod sont rapportées champ
  par champ.
- **Échec d'enregistrement d'un champ :** le champ passe en rouge et garde la saisie.
- **Suppressions protégées :**
  - un lot ayant au moins un document ne se supprime pas (`Document.lotId` en `RESTRICT`) ;
  - un artisan utilisé se désactive ;
  - un chantier se marque terminé et ne se supprime pas depuis l'interface.

### Versions et concurrence

- Le PDF est produit **hors transaction**, avec un délai maximum de 30 s.
- L'insertion se fait ensuite dans une transaction qui **verrouille la série** (chantierId, lotId,
  type) par un verrou consultatif Postgres, relit la dernière version, compare l'empreinte et insère
  `version = max + 1`.
- Un échec de Playwright ne crée **aucune ligne** ; un message clair est affiché et l'échec est
  journalisé **sans HTML, sans montant ni nom de client**.
- Au-delà de 2 générations simultanées sur le serveur, la demande est refusée immédiatement
  (« Génération en cours, réessayez dans quelques secondes »).

### Comptes et sécurité

- Chaque action et chaque route de téléchargement vérifie la session ; les actions d'administration
  vérifient en plus le rôle `ADMIN`.
- Un utilisateur `actif = false` ne peut pas se connecter et toute requête de sa part est refusée ;
  sa désactivation révoque ses sessions.
- Création de compte ou réinitialisation par l'admin : mot de passe provisoire, `doitChangerMotDePasse`
  passe à vrai, sessions révoquées. Le mot de passe provisoire n'est jamais journalisé.
- Limitation du nombre de tentatives de connexion (rate limit de Better Auth).
- Cookies de session `HttpOnly`, `Secure`, `SameSite=Lax`.

## 9. Déploiement et exploitation

- **`docker-compose.yml` :**
  - `app` : Next.js `standalone` + Chromium + polices, avec un healthcheck HTTP ;
  - `db` : Postgres 17, volume persistant ;
  - `caddy` : HTTPS automatique, domaine canonique (redirection des autres noms), HSTS ;
  - `sauvegarde` : `pg_dump` chaque nuit, chiffré, écrit hors du volume Postgres **et copié hors du
    VPS** (stockage distant), rotation 14 jours.
- **Au démarrage :** `prisma migrate deploy` ; s'il échoue, l'application ne démarre pas. Puis seed
  idempotent :
  - référentiel artisans et paramètres, seulement s'ils sont vides ;
  - premier admin (depuis les variables d'environnement) **seulement s'il n'existe aucun admin** ; le
    seed n'écrase jamais un mot de passe.
- **Restauration :** une procédure écrite (`docs/exploitation/restauration.md`) est rejouée une fois,
  sur une base vierge, avant la mise en production.
- **Secrets :** dans `.env` sur le VPS, jamais versionnés ; un `.env.example` est versionné.
- **Développement :** Postgres via Docker Compose, `next dev` en local.

## 10. Tests

- **Vitest, domaine :**
  - aller-retour TTC → HT → TTC au centime près (TVA 5,5 %, 10 %, 20 %), refus d'un HT négatif,
    totaux ;
  - exemplaires, destinataire des factures (gré à gré selon la mission, sous-traitance toujours
    SOCOREVE), date « Fait le » (trois cas), corps d'état par défaut, conditions de génération ;
  - recherche sans accents ; noms de fichiers ;
  - stabilité de l'empreinte.
- **Vitest, documents (mesure de la fidélité) :**
  - l'objet JSON construit à partir de la fixture PERRIER est **égal à une référence enregistrée**,
    pour un marché de gré à gré, un marché de sous-traitance et le récapitulatif ;
  - chaque PDF généré fait **exactement une page A4 paysage** (`pageCount === 1`) ;
  - un texte de zone contenant du HTML ressort échappé.
- **Playwright E2E :**
  1. se connecter (et changer le mot de passe provisoire) ;
  2. créer un chantier avec les lots de base ;
  3. attribuer une entreprise et saisir un TTC ;
  4. générer le marché de gré à gré ;
  5. modifier le lot et vérifier l'état « modifié » ;
  6. générer la v2 ;
  7. passer un lot en sous-traitance et générer son marché ;
  8. générer le récapitulatif et exporter le tableur ;
  9. simuler un échec de Playwright et vérifier qu'aucune ligne `Document` n'est créée.
- **Base de test :** Postgres dédié (conteneur), remis à zéro avant chaque suite.

## 11. Hors périmètre du Socle

- Planning, feuille de visa, fermetures, édition de la couleur d'un lot (sous-projet 2).
- Avenants, certificats de paiement, caution bancaire (sous-projet 3).
- Comptes rendus, PV de réception, « Tout télécharger » en ZIP (sous-projet 4).
- Réordonnancement manuel des lots.
- Mot de passe oublié en libre-service, connexion Microsoft 365, import des données de la maquette.

## Annexe A — Les 13 lots de base

Constante du code (`domaine/lotsDeBase.ts`), reprise de `LOTS_BASE` dans la maquette :

| N° | Désignation | Nature | Couleur |
|---|---|---|---|
| 01 | TERRASSEMENT — V.R.D. | gré à gré | noir |
| 02 | GROS ŒUVRE | gré à gré | noir |
| 03 | CHARPENTE | gré à gré | vert-clair |
| 04 | COUVERTURE | gré à gré | bleu-fonce |
| 05 | MENUISERIES EXTÉRIEURES | gré à gré | vert-fonce |
| 06 | PLÂTRERIE — ISOLATION | gré à gré | jaune |
| 07 | MENUISERIES INTÉRIEURES | gré à gré | vert-fonce |
| 08 | ÉLECTRICITÉ | gré à gré | rouge |
| 09 | PLOMBERIE — CHAUFFAGE — V.M.C. | gré à gré | rouge |
| 10 | CARRELAGE — FAÏENCE | gré à gré | violet |
| 11 | PEINTURE | gré à gré | bleu-clair |
| — | ESCALIER | sous-traitance | vert-fonce |
| 12 | ENDUIT EXTÉRIEUR | gré à gré | orange |

## Annexe B — Données de départ et fixtures

- **Référentiel artisans :** les 73 fiches de `ARTISANS_SEED` de la maquette (nom, adresse, CP,
  commune, interlocuteur, téléphone ; e-mail vide), toutes actives.
- **Fixture PERRIER** (développement et tests uniquement) : le chantier PERRIER de la maquette
  réduit au Socle (en-tête et lots avec entreprise, montants, TVA, retenue, corps d'état, travaux,
  clause), sans avenants, planning, acomptes, comptes rendus ni réceptions.
