# Sentinelle Marchés — Sous-projet 1 : Socle

- **Date :** 2026-09-29
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
  de la maquette.
- Tous les collègues voient les mêmes données.
- Un marché généré est figé : on peut toujours retrouver le PDF exact d'une version.
- L'application tourne sur le VPS, en HTTPS, avec une sauvegarde nocturne.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Interface | Tailwind CSS + shadcn/ui ; `cmdk` pour la recherche d'artisan |
| Base de données | PostgreSQL 17 + Prisma ; montants en `Decimal` |
| Écritures | Server Actions + validation Zod |
| Authentification | Better Auth, e-mail + mot de passe, inscription publique désactivée, comptes créés par l'admin |
| Visibilité | Tout utilisateur voit et modifie tous les chantiers |
| Rôles | `ADMIN` (comptes, paramètres) et `UTILISATEUR` |
| PDF | Gabarits React rendus en HTML côté serveur puis imprimés par Playwright (Chromium) |
| Tableur | ExcelJS |
| Tests | Vitest (domaine, documents) + Playwright (parcours) |
| Hébergement | VPS, Docker Compose : app + Postgres + Caddy (HTTPS) + sauvegarde |
| Données initiales | Référentiel artisans (`ARTISANS_SEED`) et 13 lots de base (`LOTS_BASE`) de la maquette ; PERRIER seulement en fixture de dev/test |
| Documents | Figés à la génération (copie JSON + PDF + version) |
| Coordonnées SOCOREVE | Unifiées dans une page « Paramètres de l'entreprise » modifiable par l'admin |
| Langue | Interface, code, modèles et commentaires en français |

## 3. Architecture

Une seule application Next.js, organisée en couches :

```
src/
  domaine/      Règles métier en TypeScript pur (ni Prisma, ni React)
    montants.ts   ttcInitial, htEngage, ttcEngage, htDepuisTtc, arrondis, formatage €
    regles.ts     exemplaires par défaut, destinataire des factures
    recherche.ts  normalisation sans accents, recherche d'artisan (nom, commune)
    empreinte.ts  sérialisation stable + SHA-256
  donnees/      Client Prisma et fonctions de lecture par entité
  actions/      Server Actions : Zod → session/rôle → Prisma → revalidatePath
  documents/
    gabarits/     MarcheGreAGre, MarcheSousTraitance, Recapitulatif (+ composant Zone)
    donnees.ts    construireDonneesMarche, construireDonneesRecap
    pdf.ts        navigateur Playwright partagé, HTML → PDF
    tableur.ts    export ExcelJS du récapitulatif
    documents.css feuilles fidèles aux modèles (reprise des styles .sheet de la maquette)
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
  d'argent. L'arrondi au centime se fait à l'affichage et à la construction des données de document.
- **Saisie :** enregistrement quand on quitte le champ, sans bouton « Enregistrer ». En cas d'édition
  simultanée du même champ, c'est la dernière saisie qui gagne (accepté pour une petite équipe).
- **PDF :** une seule instance Chromium, lancée au premier besoin puis réutilisée, avec au plus 2
  générations simultanées.

## 4. Modèle de données

Seules les entités du Socle sont présentes. Tâches, avenants, acomptes, comptes rendus et réceptions
arriveront avec leurs sous-projets.

```
Utilisateur   id, email (unique), nom, initiales, telephone?, role (ADMIN | UTILISATEUR), actif
              + tables techniques Better Auth (Session, Compte, Verification)

Parametres    ligne unique : raisonSociale, formeJuridique, adresse, cp, ville,
              telephone, fax?, villeSignature

Artisan       id, nom (unique), adresse, cp, commune, interlocuteur, telephone, email, actif

Chantier      id, reference, maitreOuvrage, adresseClient, natureTravaux,
              adresse, cp, commune, mission (COMPLETE | PARTIELLE),
              dateSignaturePrevue?, termine, chargeAffaireId → Utilisateur,
              creeLe, creeParId → Utilisateur

Lot           id, chantierId, ordre, numero? (vide pour la sous-traitance), designation,
              nature (GRE_A_GRE | SOUS_TRAITANCE), artisanId? → Artisan,
              montantHtInitial Decimal(18,8), tauxTva Decimal(5,2), retenueGarantie Decimal(5,2),
              exemplaires, corpsEtat, travaux, clauseParticuliere, couleur, dateSignature?

Document      id, chantierId, lotId?, type (MARCHE_GRE_A_GRE | MARCHE_SOUS_TRAITANCE | RECAPITULATIF),
              version, donnees Json, empreinte, pdf Bytes, creeLe, creeParId → Utilisateur
              unique (chantierId, lotId, type, version)
```

### Choix notables

- **Un lot référence son artisan par identifiant** (la maquette le faisait par nom). Renommer une
  entreprise ne demande plus de mettre à jour les lots.
- **Le chargé d'affaire est un utilisateur.**
- **Unicité des versions :** `lotId` est nul pour le récapitulatif, et Postgres considère deux `NULL`
  comme distincts. L'unicité est donc garantie par une migration SQL (`NULLS NOT DISTINCT`, Postgres
  15 et plus), en plus de la contrainte Prisma.
- **« À régénérer » est calculé, jamais stocké.** On compare l'empreinte des données actuelles à celle
  de la dernière version.
- **`montantHtInitial` garde 8 décimales** pour qu'un TTC saisi soit retrouvé exactement :
  HT = TTC ÷ (1 + TVA). Dans le Socle, le montant engagé est égal au montant initial (les avenants
  viendront au sous-projet 3, `htEngage` est déjà la fonction à appeler).

### Valeurs par défaut (reprises de la maquette)

- Nature `GRE_A_GRE`, TVA 20 %, retenue de garantie 5 %.
- Exemplaires : 2 en sous-traitance, 3 sinon.
- Nouveau chantier : 13 lots de base (numéro, désignation, nature, couleur) sans entreprise ni
  montant, ajoutés par défaut et désactivables par un interrupteur.

## 5. Règles métier du Socle

- **Montants :**
  - le marché imprime le montant **initial** ;
  - le tableau, les totaux et le récapitulatif portent le montant **engagé** (égal à l'initial dans
    le Socle) ;
  - saisir un TTC recalcule le HT initial.
- **Factures :** en mission partielle, elles sont adressées au maître d'ouvrage ; en mission
  complète, à SOCOREVE.
- **Adresse du client :** la case « le client habite déjà à cette adresse » recopie l'adresse du
  chantier dans l'adresse actuelle du client.
- **Recherche d'artisan :** sur le nom et la commune, insensible aux accents et à la casse ; Entrée
  choisit le premier résultat ; les artisans inactifs sont exclus.

## 6. Écrans

Le style de la maquette est repris : palette « bleu de plan », polices Figtree, Outfit et Spline
Sans Mono, thème clair et sombre.

- **Connexion** (`/connexion`) : e-mail et mot de passe ; ni inscription ni mot de passe oublié en
  libre-service.
- **Mes chantiers** (`/chantiers`) :
  - liste (référence, client, commune, chargé d'affaire, total TTC engagé), recherche, « Masquer
    les terminés » ;
  - formulaire **Nouveau chantier** identique à la maquette, avec l'interrupteur « Partir des 13 lots
    de base » activé par défaut.
- **Chantier** (`/chantiers/[id]`) : un en-tête (client, adresse, mission, bouton « Terminé ») et
  deux onglets.
  - **Marchés** :
    - tableau des lots (n°, lot, entreprise, HT, TVA, TTC) : TTC modifiable, attribution de
      l'entreprise par menu de recherche, ajout, suppression et réordonnancement des lots, totaux HT,
      TVA et TTC ;
    - **panneau du lot** : nature, TVA, retenue, exemplaires, corps d'état, travaux, date de
      signature ;
    - boutons « Générer les marchés manquants » et « Exporter le récap » (xlsx).
  - **Documents** (piste B de la maquette, réduite au Socle) :
    - carte « Récapitulatif » en haut, puis un tableau par entreprise avec une colonne **Marché** ;
    - états d'une case : à produire (pointillé), à jour (bleu, s'ouvre), à régénérer (orangé) ;
    - versions précédentes consultables.
- **Aperçu d'un document** (surcouche plein écran) :
  - feuille fidèle au modèle, zones bleues modifiables sur la feuille ;
  - bouton « Générer le PDF » ;
  - un document figé se rouvre en lecture seule ;
  - le défilement de la page derrière est bloqué.
- **Artisans** (`/artisans`) : recherche, ajout, modification, désactivation.
- **Paramètres** (`/parametres`, admin) : coordonnées de SOCOREVE.
- **Comptes** (`/admin/comptes`, admin) : créer un compte (mot de passe provisoire), désactiver,
  réinitialiser le mot de passe, changer le rôle.

## 7. Documents et PDF

### Chemin d'un document

1. `construireDonneesMarche(lotId)` / `construireDonneesRecap(chantierId)` lisent la base et
   produisent un objet JSON complet et autonome : textes, montants arrondis et formatés, coordonnées
   SOCOREVE issues de `Parametres`.
2. L'**empreinte** est le SHA-256 de la sérialisation stable de cet objet.
3. Le **gabarit React** reçoit cet objet et rien d'autre (aucun accès à la base, aucun calcul). Il
   déclare son format de page (A4 portrait ou paysage, comme dans la maquette).
4. `pdf.ts` rend le gabarit en HTML (`renderToStaticMarkup`), injecte `documents.css` et les polices
   embarquées, puis Playwright produit le PDF (`page.setContent` → `page.pdf`).

### Générer

- Si l'empreinte est identique à celle de la dernière version, on ne crée rien et on renvoie cette
  version.
- Sinon, la version n+1 (copie JSON, empreinte, PDF, auteur) est créée dans une transaction.
- Nom du fichier : `<CLIENT>-Lot<NN>-<DESIGNATION>-Marche-v<N>.pdf` (sans accents ni espaces).

### Conditions pour générer un marché

- Une entreprise attribuée et un montant supérieur à 0.
- Le client et l'adresse du chantier renseignés.
- À défaut, le bouton est désactivé et indique ce qui manque.

### Modes du gabarit

Le composant `<Zone cle="…">` lit le mode dans un contexte :

- **édition** : zone `contenteditable` teintée de bleu, enregistrée quand on la quitte ; la feuille
  n'est jamais reconstruite pendant la frappe ;
- **lecture** : texte, pour une copie figée ;
- **impression** : texte neutre, pour le rendu côté serveur.

### Consultation

- Le téléchargement renvoie toujours le **PDF stocké**.
- La vue à l'écran en lecture rend la copie figée avec le gabarit actuel.

### Actions groupées

- **Générer les marchés manquants :** génère un marché pour chaque lot complet qui n'en a pas encore,
  puis affiche la liste des lots ignorés avec leur raison.
- **Exporter le récap (xlsx) :** produit à la volée depuis `construireDonneesRecap`, sans être stocké.

### Mise en forme

- `documents.css` est une CSS dédiée aux couleurs fixes, reprise des styles `.sheet` de la maquette,
  sans Tailwind.
- Les polices sont embarquées dans l'image Docker.

## 8. Gestion des erreurs

- **Server Actions :** elles renvoient `{ ok: true, … }` ou `{ ok: false, erreur }` (message en
  français) et ne lèvent jamais d'exception jusqu'à l'interface. Les erreurs Zod sont rapportées champ
  par champ.
- **Échec d'enregistrement d'un champ :** le champ passe en rouge et garde la saisie.
- **Suppressions protégées :**
  - un lot ayant au moins un document ne se supprime pas ;
  - un artisan utilisé se désactive ;
  - un chantier se marque terminé et ne se supprime pas depuis l'interface.
- **Génération PDF :** délai maximum de 30 s. En cas d'échec, aucune version n'est créée, un message
  clair est affiché et le détail est journalisé.
- **Sécurité :**
  - chaque action et chaque route de téléchargement vérifie la session ;
  - les actions d'administration vérifient en plus le rôle `ADMIN` ;
  - désactiver un compte révoque ses sessions.

## 9. Tests

- **Vitest, domaine :**
  - aller-retour TTC → HT → TTC au centime près (TVA 5,5 %, 10 %, 20 %) et totaux ;
  - exemplaires et destinataire des factures ;
  - recherche sans accents ;
  - stabilité de l'empreinte.
- **Vitest, documents :**
  - données construites à partir de la fixture PERRIER comparées à une référence enregistrée ;
  - un marché généré tient sur une seule page.
- **Playwright E2E :**
  1. se connecter ;
  2. créer un chantier avec les lots de base ;
  3. attribuer une entreprise et saisir un TTC ;
  4. générer le marché ;
  5. modifier le lot et vérifier l'état « à régénérer » ;
  6. générer la v2 ;
  7. exporter le récap.
- **Base de test :** Postgres dédié (conteneur), remis à zéro avant chaque suite.

## 10. Déploiement

- **`docker-compose.yml` :**
  - `app` : Next.js `standalone` + Chromium + polices ;
  - `db` : Postgres 17, volume persistant ;
  - `caddy` : HTTPS automatique ;
  - `sauvegarde` : `pg_dump` chaque nuit, rotation 14 jours.
- **Au démarrage :** `prisma migrate deploy`, puis seed idempotent (artisans, lots de base,
  paramètres, premier compte admin depuis les variables d'environnement).
- **Secrets :** dans `.env` sur le VPS, jamais versionnés ; un `.env.example` est versionné.
- **Développement :** Postgres via Docker Compose, `next dev` en local.

## 11. Hors périmètre du Socle

- Planning, feuille de visa, fermetures (sous-projet 2).
- Avenants, certificats de paiement, caution bancaire (sous-projet 3).
- Comptes rendus, PV de réception, « Tout télécharger » en ZIP (sous-projet 4).
- Mot de passe oublié en libre-service, connexion Microsoft 365, import des données de la maquette.
