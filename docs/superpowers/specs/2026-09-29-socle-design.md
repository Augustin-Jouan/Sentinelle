# Sentinelle Marchés — Sous-projet 1 : Socle

- **Date :** 2026-09-29 (révisée après deux audits le même jour)
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
   sous-traitance) en PDF, récapitulatif PDF, déploiement VPS.
2. **Planning** : Gantt interactif, fermetures, planning imprimable sur une feuille, feuille de visa.
3. **Suivi financier** : avenants, certificats de paiement.
4. **Suivi de chantier** : comptes rendus, PV de réception, page Documents complète, « Tout télécharger » (ZIP).

### Critères de réussite du Socle

- Un chargé d'affaire se connecte, crée un chantier depuis les 13 lots de base, attribue les
  entreprises, saisit les montants et imprime des marchés et un récapitulatif conformes aux modèles
  de la maquette (textes corrigés selon l'annexe C). La conformité se mesure selon le § 10.
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
| Authentification | Better Auth : e-mail + mot de passe, inscription fermée, plugin admin (champs de rôle et de blocage, refus de connexion d'un compte bloqué) ; comptes écrits directement en base par l'application |
| Visibilité | Tout utilisateur voit et modifie tous les chantiers **et le référentiel artisans** |
| Rôles | `admin` (comptes, paramètres) et `user` |
| PDF | Gabarits React rendus en HTML côté serveur puis imprimés par Playwright (Chromium) |
| Tableur | Aucun : retiré le 20/10/2026, le récapitulatif n'existe qu'en PDF (voir « Exporter le récap », § 7) |
| Tests | Vitest (domaine, documents) + Playwright (parcours) |
| Hébergement | VPS, Docker Compose, **une seule réplique** de l'app : app + Postgres + Caddy (HTTPS) + sauvegarde |
| Sauvegarde | `pg_dump` chiffré par `age`, envoyé par `rclone` vers OVHcloud Object Storage |
| Données initiales | Référentiel artisans (`ARTISANS_SEED`), paramètres et premier admin ; PERRIER seulement en fixture de dev/test |
| Documents | Figés à la génération (copie JSON + PDF + version), une seule série de versions par lot |
| Coordonnées SOCOREVE | Un seul jeu de coordonnées (71 rue du Général Patton), dans la page « Paramètres » modifiable par l'admin, lu par tous les gabarits |
| Textes des marchés | Ceux des modèles de la maquette, **fautes de frappe corrigées** (annexe C) |
| Ordre des lots | Ordre de saisie, jamais modifié ; tri et recherche d'affichage seulement (comme la maquette) |
| Langue | Interface, code, modèles et commentaires en français |

## 3. Architecture

Une seule application Next.js, organisée en couches :

```
src/
  domaine/      Règles métier en TypeScript pur (ni Prisma, ni React)
    montants.ts   ttcInitial, htEngage, ttcEngage, htDepuisTtc, arrondis, formatage € et %
    regles.ts     exemplaires par défaut, destinataire des factures, date « Fait le »,
                  corps d'état par défaut, conditions de génération
    recherche.ts  normalisation sans accents, recherche d'artisan (nom, commune)
    empreinte.ts  sérialisation stable + SHA-256
    fichiers.ts   slugification et noms de fichiers
    lotsDeBase.ts constante des 13 lots de base (annexe A)
  donnees/      Client Prisma et fonctions d'accès par entité (lecture et écriture), testables hors
                de Next. Elles ne vérifient pas les droits (tout le monde voit tout dans le Socle) :
                la session et le rôle sont contrôlés dans actions/. Elles reçoivent l'identifiant de
                l'utilisateur seulement quand elles l'enregistrent (auteur d'un document)
  actions/      Server Actions : session/rôle → Zod → appel de donnees/ → revalidatePath
  documents/
    schemas.ts    types + schémas Zod des objets de document (§ 7)
    batir.ts      construction pure des objets à partir des données lues (testable sans base)
    gabarits/     MarcheGreAGre, MarcheSousTraitance, Recapitulatif (+ composant Zone)
    donnees.ts    construireDonneesMarche, construireDonneesRecap (lecture en base puis batir)
    generer.ts    enchaînement construire → empreinte → PDF → enregistrer
    pdf.ts        navigateur Playwright partagé, HTML → PDF
    styles.ts     CSS des feuilles (reprise des styles .sheet de la maquette), partagée écran / PDF
  composants/   Interface (shadcn/ui, tableau des lots, menu d'artisan…)
  app/          Routes et pages
```

### Circulation des données

- Les pages serveur lisent via `donnees/` et passent les données aux composants client.
- Toute modification passe par une Server Action, puis revalidation de la page.
- Les calculs de montants n'existent **qu'à un seul endroit**, dans `domaine/montants.ts`. L'écran, les
  objets de document l'appellent tous.

### Principes

- **Montants :** `Decimal` Prisma et `decimal.js` ; jamais de `number` JavaScript dans un calcul
  d'argent. L'arrondi au centime se fait seulement à l'affichage et dans l'objet document.
- **Saisie :** enregistrement quand on quitte le champ, sans bouton « Enregistrer ». En cas d'édition
  simultanée du même champ par deux personnes, c'est la dernière écriture reçue qui gagne (accepté pour
  une petite équipe). Dans un même navigateur, l'ordre des saisies est garanti : Next.js envoie les
  Server Actions d'un client une par une, la deuxième attendant la fin de la première.
- **PDF :** une seule instance Chromium par processus, lancée au premier besoin puis réutilisée, avec
  au plus 2 générations simultanées. Cette limite n'est tenue que parce que l'app tourne en **une seule
  réplique** ; passer à plusieurs répliques demanderait une file d'attente partagée.

## 4. Modèle de données

Seules les entités du Socle sont présentes. Tâches, avenants, acomptes, comptes rendus et réceptions
arriveront avec leurs sous-projets.

```
Utilisateur   (table user de Better Auth, nommée Utilisateur)
              id, email (unique), emailVerified, name, image?, createdAt, updatedAt,
              role ('admin' | 'user'), banned, banReason?, banExpires?   ← plugin admin
              initiales, telephone?, doitChangerMotDePasse             ← champs ajoutés
              + tables techniques Better Auth (Session, Compte, Verification)

Parametres    singleton (id = 1) : raisonSociale, libelleActivite, adresse, cp, ville,
              telephone, fax?, email?, villeSignature

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
              version, donnees Json ({ contenu, cadre }), empreinte, pdf Bytes, nomFichier,
              creeLe, creeParId → Utilisateur
              unique (chantierId, lotId, version) NULLS NOT DISTINCT
```

### Choix notables

- **Un lot référence son artisan par identifiant** (la maquette le faisait par nom). Renommer une
  entreprise ne demande plus de mettre à jour les lots.
- **Le chargé d'affaire est un utilisateur.** Son nom est imprimé sur le récapitulatif.
- **Référence de chantier obligatoire et unique.** Elle sert aussi de base aux noms de fichiers.
- **Ordre des lots :** `ordre` est attribué à la création (max + 1) et n'est jamais modifié.
- **Séries de versions :** une série est identifiée par `(chantierId, lotId)` : une série de marchés
  par lot, et une série de récapitulatifs par chantier (`lotId` nul). Le **type est porté par chaque
  version** : si la nature d'un lot change, la version suivante est simplement d'un autre type, dans
  la même série. L'historique affiche le type de chaque version.
- **Unicité des versions :** Postgres considère par défaut deux `NULL` comme distincts. La contrainte
  est donc créée par une migration SQL avec `NULLS NOT DISTINCT` (Postgres 15 et plus).
- **« Modifié depuis la génération » est calculé, jamais stocké.** On compare l'empreinte de
  `{ type, contenu }` actuels à celle de la dernière version de la série (§ 7).
- **Blocage d'un compte :** on utilise le champ `banned` du plugin admin de Better Auth (le plugin
  refuse alors la connexion), et non un champ `actif` maison. L'application pose `banned` et supprime
  les sessions elle-même.
- **`couleur`** est persistée dès le Socle pour le planning, mais aucun écran du Socle ne la modifie.

### Valeurs par défaut (reprises de la maquette)

- Nature `GRE_A_GRE`, TVA 20 %, retenue de garantie 5 %.
- Exemplaires : 2 en sous-traitance, 3 sinon. Changer la nature remet cette valeur par défaut.
- Nouveau chantier : les 13 lots de base (annexe A) sont recopiés dans le chantier sans entreprise
  ni montant. Ils sont ajoutés par défaut et désactivables par un interrupteur. Ce sont une constante
  du code, pas des données en base.
- Paramètres à l'installation : raison sociale « S.A.S SOCOREVE », activité « Société Construction
  Rénovation Vente », 71 rue du Général Patton, 44110 Châteaubriant, tél. 02 40 81 40 26, sans fax,
  e-mail contact@socoreve-chateaubriant.fr, ville de signature Châteaubriant. L'admin les corrige dans
  la page Paramètres.

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
- **Total du récapitulatif :** somme des TTC de ligne **déjà arrondis au centime**, pour que la colonne
  imprimée tombe juste.

### Formats imprimés (repris de la maquette)

| Donnée | Marché de gré à gré | Marché de sous-traitance | Récapitulatif |
|---|---|---|---|
| Montant | `115 500,00 €` | `115 500,00 €` | `115 500,00 €`, ou `—` si nul |
| TVA | `20,00 %` (toujours 2 décimales) | `20 %` (décimales seulement si utiles) | `20,00 %` |
| Retenue de garantie | `5` (décimales seulement si utiles) | `5` (imprimée deux fois) | — |
| Complément de la retenue | `95` (= 100 − retenue) | — | — |
| Exemplaires | `triple` / `double` / nombre | texte fixe « double » | — |
| Date | `jj.mm.aaaa` | `jj.mm.aaaa` | `jj.mm.aaaa` |

Tous ces textes sont produits par `domaine/` et rangés dans l'objet document ; **le gabarit ne calcule
ni ne formate rien**.

### Marché de gré à gré

- **Destinataire des factures :** « au Maître d'Ouvrage » en mission partielle, « à SOCOREVE » en
  mission complète.

### Marché de sous-traitance

- Les factures sont **toujours** adressées « à SOCOREVE », quelle que soit la mission.

### Communes aux deux marchés

- **En-tête SOCOREVE :** raison sociale, activité, adresse, CP, ville et téléphone, lus dans
  `Parametres`. Le fax ne s'imprime que s'il est renseigné. L'e-mail n'est pas imprimé sur les
  marchés.
- **Date « Fait le » :** date de signature du lot, sinon date de signature prévue du chantier,
  sinon date du jour de génération. La ville vient de `Parametres.villeSignature`.
- **Corps d'état vide :** on imprime la désignation du lot en minuscules.
- **Coordonnées de l'entreprise :** lues dans le référentiel artisans au moment de la génération,
  puis figées dans le document.

### Récapitulatif

- **Date :** date de signature prévue du chantier, sinon date du jour de génération.

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
    - boutons « Générer les marchés manquants » et « Exporter le récap » (aperçu du récapitulatif, § 7).
  - **Documents** (piste B de la maquette, réduite au Socle) :
    - carte « Récapitulatif » en haut, puis un tableau par entreprise avec une colonne **Marché** ;
    - états d'une case : **à produire** (pointillé), **à jour** (bleu, s'ouvre), **modifié depuis la
      génération** (bleu avec une pastille « modifié »). L'orangé reste réservé aux réserves des PV
      (sous-projet 4) ;
    - une légende sous le tableau explique ces états ;
    - la case ouvre la dernière version ; l'historique liste toutes les versions de la série avec
      leur type (gré à gré ou sous-traitance), leur date et leur auteur.
- **Aperçu d'un document** (surcouche plein écran) :
  - feuille fidèle au modèle ; le **corps d'état, les travaux et la clause particulière se saisissent
    sur la feuille**, dans les zones bleues ;
  - bouton « Générer le PDF » ;
  - une version figée se rouvre en lecture seule, avec un bandeau (§ 7, « Consultation ») ;
  - le défilement de la page derrière est bloqué.
- **Artisans** (`/artisans`) : recherche, ajout, modification, désactivation ; accessible à tous les
  utilisateurs.
- **Paramètres** (`/parametres`, admin) : coordonnées de SOCOREVE.
- **Comptes** (`/admin/comptes`, admin) : créer un compte, bloquer ou débloquer, réinitialiser le mot
  de passe, changer le rôle. Le mot de passe provisoire s'affiche une seule fois (§ 8).

## 7. Documents et PDF

### Schéma des objets de document

Chaque objet est défini dans `documents/schemas.ts` par un type TypeScript et un schéma Zod. Il se
compose de deux parties :

- **`contenu`** : tout ce qui dépend du chantier, du lot et de l'entreprise. **Seuls `type` et
  `contenu` entrent dans l'empreinte** : changer la nature d'un lot (gré à gré ↔ sous-traitance) change
  donc l'empreinte, même si les textes se ressemblent.
- **`cadre`** : l'en-tête SOCOREVE (lu dans `Parametres`) et la date de génération. Il est figé avec
  le document mais ne compte pas dans l'empreinte : modifier les paramètres ou changer de jour ne
  marque aucun document comme modifié.

Tous les textes y sont déjà formatés (§ 5, « Formats imprimés »). Les champs :

```
Cadre (commun)
  entete { raisonSociale, libelleActivite, adresseLigne, telephone, fax? }
  villeSignature, dateGeneration (jj.mm.aaaa)

DonneesMarcheGreAGre.contenu
  maitreOuvrage, adresseClient, entreprise, adresseEntreprise, natureTravaux,
  adresseChantier, lotTexte ("02 — GROS ŒUVRE"), montantTtcTexte, tvaTexte,
  destinataireFactures, retenueTexte, complementRetenueTexte, exemplairesTexte,
  clauseParticuliere, dateSignature? (jj.mm.aaaa, null si aucune date saisie)

DonneesMarcheSousTraitance.contenu
  maitreOuvrage, entreprise, adresseEntreprise, corpsEtat, travaux, natureTravaux,
  adresseChantier, montantTtcTexte, tvaTexte, retenueTexte, dateSignature?

DonneesRecap.contenu
  maitreOuvrage, natureTravaux, adresseChantier, cpCommune, adresseClient, mission,
  chargeAffaire, dateSignature?,
  lignes[] { numero, designation, entreprise?, montantTtc?, montantTtcTexte, tauxTva, tvaTexte,
             adresse, cp, commune, interlocuteur, telephone },
  nombreLots, totalLibelle ("Total marchés — 13 lots"), totalTtc, totalTtcTexte
  (montantTtc, tauxTva et totalTtc : valeurs décimales brutes)
```

Le gabarit imprime `contenu.dateSignature` si elle existe, sinon `cadre.dateGeneration`.

### Générer

`documents/generer.ts` enchaîne, dans cet ordre :

1. enregistrer la zone qui a le focus (côté client, avant l'appel) ;
2. construire l'objet **une seule fois** (`construireDonneesMarche` ou `construireDonneesRecap`) ;
3. calculer l'empreinte de `{ type, contenu }` ;
4. si elle est identique à celle de la dernière version de la série, ne rien créer et renvoyer cette
   version ;
5. rendre le PDF **à partir de cet objet** ;
6. relire la base et recalculer l'empreinte : si les données ont changé pendant le rendu, abandonner ce
   PDF (« Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour. »)
   plutôt que d'en faire la dernière version ;
7. enregistrer **ce même objet**, son empreinte et le PDF (§ 8, « Versions et concurrence »). L'objet
   relu à l'étape 6 ne sert qu'à comparer : le JSON stocké est exactement celui qui a produit le PDF.

- **Marché :** généré depuis l'aperçu du lot, le panneau du lot ou « Générer les marchés manquants ».
  Le type (gré à gré ou sous-traitance) suit la nature actuelle du lot.
- **Récapitulatif :** la carte « Récapitulatif » de l'onglet Documents ouvre l'aperçu de la feuille,
  puis « Générer le PDF » crée une version `RECAPITULATIF` (JSON + PDF).

### Rendu

- Le **gabarit React** reçoit l'objet et rien d'autre (aucun accès à la base, aucun calcul). Il
  déclare son format de page : A4 paysage, marge 10 mm, pour les deux marchés et le récapitulatif.
- `pdf.ts` rend le gabarit en HTML (`renderToStaticMarkup`, importé dynamiquement), injecte la CSS des
  feuilles et les polices embarquées, puis Playwright produit le PDF (`page.setContent` → `page.pdf`, sans en-tête ni
  pied de page Playwright).
- Les textes fixes des modèles sont ceux de la maquette, corrigés selon l'annexe C.

### Zones

- Une zone bleue enregistre au blur le champ du lot correspondant (corps d'état, travaux, clause).
- Le composant `<Zone cle="…">` reçoit le mode et le rappel de saisie **par ses props**. Les gabarits
  n'ont ni hook, ni contexte, ni directive `'use client'` : Next.js 16 refuse le contexte React dans le
  rendu serveur (vérifié par un essai), et le même gabarit sert à l'écran et au PDF.
  - **édition** : zone `contenteditable="plaintext-only"` teintée de bleu ; la feuille n'est jamais
    reconstruite pendant la frappe ;
  - **lecture** : texte, pour une copie figée ;
  - **impression** : texte neutre, pour le rendu côté serveur.

### Sécurité du rendu

- Les textes des zones sont stockés en texte brut et réinjectés **échappés**, jamais comme du HTML.
- Le Chromium de génération n'a **aucun accès réseau** : toute requête sortante est bloquée
  (`route` → abort). Polices et CSS sont injectées dans la page.

### Noms de fichiers

`slugifier` retire les accents, remplace tout ce qui n'est ni lettre ni chiffre par un tiret et met
en majuscules (comme `nomFichierRecap` dans la maquette). `<REF>` est la référence du chantier.

- Marché de gré à gré : `<REF>-Lot<NN>-<DESIGNATION>-Marche-v<N>.pdf`
- Marché de sous-traitance (sans numéro) : `<REF>-ST-<DESIGNATION>-Marche-v<N>.pdf`
- Récapitulatif : `<REF>-RecapMarches-v<N>.pdf`

### Consultation

- Le téléchargement renvoie les **octets du PDF stocké**.
- L'aperçu d'une version figée rend sa copie JSON avec le gabarit courant. Un bandeau l'indique :
  « Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel. »

### Actions groupées

- **Générer les marchés manquants :** génère **l'un après l'autre** un marché pour chaque lot qui
  remplit les conditions et n'en a pas encore, puis affiche la liste des lots ignorés avec leur
  raison (« Lot 07 : pas d'entreprise »).
- **Exporter le récap :** depuis l'onglet Marchés, ouvre l'aperçu du récapitulatif par-dessus l'écran
  (données actuelles, comme la carte « Récap des marchés » de l'onglet Documents) ; « Générer le PDF » y crée la
  version et la télécharge, Fermer ne crée rien. L'export tableur (xlsx) a été retiré le 20/10/2026.

### Mise en forme

- La CSS des feuilles (`styles.ts`) est dédiée, aux couleurs fixes, reprise des styles `.sheet` de la
  maquette, sans Tailwind.
- Les polices sont embarquées dans l'application et dans l'image Docker.
- Pas de logo : les marchés et le récapitulatif de la maquette n'en ont pas. `LOGO_SOCOREVE` servira au
  compte rendu (sous-projet 4).

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

- Le PDF est produit **hors transaction**, avec un délai maximum de 30 s. Une génération dont les
  données ont changé pendant le rendu est abandonnée (§ 7, étape 6) : un PDF périmé ne passe jamais
  devant une version à jour.
- L'insertion se fait ensuite dans une transaction qui **verrouille la série** (chantierId, lotId)
  par un verrou consultatif Postgres, relit la dernière version, compare l'empreinte (si une version
  identique vient d'être créée entre-temps, on la renvoie) et insère `version = max + 1`.
- Un échec de Playwright ne crée **aucune ligne** ; un message clair est affiché et l'échec est
  journalisé **sans HTML, sans montant ni nom de client**.
- Au-delà de 2 générations simultanées, la demande est refusée immédiatement (« Génération en cours,
  réessayez dans quelques secondes »).

### Comptes et sécurité

- **Better Auth :**
  - `emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 }` ;
  - les comptes (création, réinitialisation, blocage) sont écrits directement en base par
    l'application, avec le hachage de Better Auth et `emailVerified = true`. Un essai l'a montré :
    `createUser` du plugin laisse `emailVerified` à faux et `banUser` exige une session admin, alors
    que la connexion, la session et le refus d'un compte bloqué fonctionnent avec ces écritures. Un
    test d'intégration le vérifie ;
  - limitation des tentatives de connexion (rate limit intégré) ;
  - cookies de session `HttpOnly`, `Secure`, `SameSite=Lax`.
- Chaque action et chaque route de téléchargement vérifie la session ; les actions d'administration
  vérifient en plus le rôle `admin`.
- Un compte bloqué (`banned`) ne peut plus se connecter et ses sessions sont révoquées.
- **Mot de passe provisoire** (création de compte ou réinitialisation) :
  - généré par le serveur : 16 caractères aléatoires ;
  - **affiché une seule fois** à l'admin, dans une fenêtre avec un bouton « Copier » ; jamais stocké en
    clair ni journalisé ;
  - `doitChangerMotDePasse` passe à vrai et les sessions existantes sont révoquées ;
  - le nouveau mot de passe choisi par l'utilisateur fait au moins 12 caractères.

## 9. Déploiement et exploitation

- **`docker-compose.yml`** (une seule réplique de `app`) :
  - `app` : Next.js `standalone` + Chromium + polices, avec un healthcheck HTTP ;
  - `db` : Postgres 17, volume persistant ;
  - `caddy` : HTTPS automatique, domaine canonique (redirection des autres noms), HSTS ;
  - `sauvegarde` : tâche nocturne (voir ci-dessous).
- **Au démarrage :** `prisma migrate deploy` ; s'il échoue, l'application ne démarre pas. Puis seed
  idempotent :
  - référentiel artisans et paramètres, seulement s'ils sont vides ;
  - premier admin (depuis les variables d'environnement) **seulement s'il n'existe aucun admin** ; le
    seed n'écrase jamais un mot de passe.
- **Secrets :** dans `.env` sur le VPS, jamais versionnés ; un `.env.example` est versionné.
- **Développement :** Postgres via Docker Compose, `next dev` en local.

### Sauvegarde

- Chaque nuit : `pg_dump -Fc`, chiffré avec **`age`** (seule la clé **publique** est sur le VPS ; la
  clé **privée** est conservée hors du VPS, dans le gestionnaire de mots de passe de l'admin).
- Le fichier chiffré est écrit hors du volume Postgres, puis envoyé par **`rclone`** vers un bucket
  **OVHcloud Object Storage** (compatible S3).
- Rotation : 14 sauvegardes nocturnes, en local comme sur le bucket.
- Un échec de sauvegarde est journalisé et le healthcheck de la tâche passe en erreur.

### Test de restauration

La procédure est écrite dans `docs/exploitation/restauration.md` et rejouée une fois avant la mise en
production : télécharger la dernière sauvegarde depuis OVH, la déchiffrer avec la clé privée, la
restaurer dans un Postgres vierge. Le test est réussi si :

- `prisma migrate status` ne signale aucune migration manquante ;
- le nombre de chantiers, de lots, d'artisans et de documents est identique à la base d'origine ;
- un PDF téléchargé depuis la base restaurée a le même SHA-256 que dans la base d'origine.

## 10. Tests

- **Vitest, domaine :**
  - aller-retour TTC → HT → TTC au centime près (TVA 5,5 %, 10 %, 20 %), refus d'un HT négatif,
    total du récap égal à la somme des lignes arrondies ;
  - formats imprimés du § 5 (TVA `20,00 %` sur le gré à gré et `20 %` sur la sous-traitance,
    retenue `5`, complément `95`, exemplaires) ;
  - destinataire des factures (gré à gré selon la mission, sous-traitance toujours SOCOREVE), date
    « Fait le » (trois cas), corps d'état par défaut, conditions de génération ;
  - recherche sans accents ; noms de fichiers ;
  - stabilité de l'empreinte.
- **Vitest, documents (mesure de la conformité) :**
  - l'objet construit à partir de la fixture PERRIER est **égal à une référence enregistrée**, pour
    un marché de gré à gré (lot 02), un marché de sous-traitance (escalier) et le récapitulatif ;
  - chaque objet respecte son schéma Zod ;
  - l'empreinte ne change pas quand on modifie `Parametres` ni quand la date du jour change ;
  - chaque PDF généré fait **exactement une page A4 paysage** (`pageCount === 1`) ;
  - un texte de zone contenant du HTML ressort échappé ;
  - les textes corrigés de l'annexe C sont présents et les anciennes formulations absentes.
- **Playwright E2E :**
  1. se connecter (et changer le mot de passe provisoire) ;
  2. créer un chantier avec les lots de base ;
  3. attribuer une entreprise et saisir un TTC ;
  4. générer le marché de gré à gré ;
  5. modifier le lot et vérifier l'état « modifié » ;
  6. générer la v2 ;
  7. passer ce lot en sous-traitance, générer la v3 et vérifier que l'historique montre les deux
     types ;
  8. ouvrir « Exporter le récap » depuis l'onglet Marchés, générer le récapitulatif et le retrouver en v1 dans Documents ;
  9. l'échec de Playwright sans ligne `Document` est vérifié par un test d'intégration (en injectant
     une fonction d'impression qui échoue) : le provoquer depuis le navigateur demanderait un
     interrupteur de test dans le code de production.
- **Base de test :** Postgres dédié (conteneur), remis à zéro avant chaque suite.

## 11. Hors périmètre du Socle

- Planning, feuille de visa, fermetures, édition de la couleur d'un lot (sous-projet 2).
- Avenants, certificats de paiement, caution bancaire (sous-projet 3).
- Comptes rendus, PV de réception, « Tout télécharger » en ZIP (sous-projet 4).
- Réordonnancement manuel des lots.
- Plusieurs répliques de l'application.
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
- **Fixture PERRIER** (développement et tests uniquement), tirée de la fonction `seed()` de la
  maquette et réduite au Socle :
  - chantier : référence « PERRIER — Louisfert », client « M. et Mme PERRIER », adresse actuelle
    « 12 rue de la Barre, 44110 CHÂTEAUBRIANT », nature « Construction d'une maison individuelle —
    142 m² + garage », chantier « Le Haut Bois, 44110 LOUISFERT », mission complète, signature prévue
    le 03.04.2026, chargé d'affaire : l'utilisateur de test « Augustin Jouan » ;
  - les 13 lots de la maquette avec leurs entreprises et montants HT (dont l'escalier en
    sous-traitance chez PASSION BOIS et le lot 12 sans entreprise ni montant), et les dates de
    signature des lots 02 et 05 ;
  - **sans** les avenants des lots 02 et 05, ni planning, documents, acomptes, comptes rendus ou
    réceptions ;
  - corps d'état, travaux et clause vides partout (pour tester les valeurs par défaut), **sauf** une
    clause particulière sur le lot 02 et des travaux sur l'escalier (pour tester les zones). Leurs
    textes sont fixés dans la fixture.

## Annexe C — Corrections des textes des modèles

Les textes fixes sont repris de la maquette, avec ces corrections (demandées par l'utilisateur) :

| Modèle | Texte de la maquette | Texte imprimé |
|---|---|---|
| Sous-traitance | « avant le mois 5ème jour du mois suivant » | « avant le 5ème jour du mois suivant » |
| Sous-traitance | « sera déduits du présent marché » | « sera déduit du présent marché » |
| Sous-traitance | « Les travaux sous-traiter sans accord » | « Les travaux sous-traités sans accord » |
| Sous-traitance | « les situations, seront réglées » | « les situations seront réglées » |
| Sous-traitance | « à 60 jour maximum » | « à 60 jours maximum » |
| Sous-traitance | « dans le cas ou le client cesserait » | « dans le cas où le client cesserait » |
| Les deux marchés | « tous les différents découlant du présent contrat » | « tous les différends découlant du présent contrat » |
