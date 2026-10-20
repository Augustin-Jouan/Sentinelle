# Sentinelle Marchés — Sous-projet 4 : Suivi de chantier

Date : 2026-09-30 · Statut : design validé section par section, spec à relire

Référence visuelle et fonctionnelle : `docs/maquette/sentinelle-marches.html` (notes en tête, § 3 à
§ 7 ; compte rendu : styles lignes 1281-1337 et 1689-1699, mécanique de saisie et feuille lignes
6514-6830 ; procès-verbal de réception : styles lignes 1918-1947, modèle et feuille lignes 7205-7460 ;
page Documents lignes 2446-2462 et 4590-4830 ; logo `LOGO_SOCOREVE` ligne 6520).

Ce document prolonge les specs du Socle (`2026-09-29-socle-design.md`), du Planning
(`2026-09-29-planning-design.md`) et du Suivi financier (`2026-09-30-suivi-financier-design.md`),
dont il reprend l'architecture et les conventions : `Resultat<T>`, `ErreurMetier`, `ChampEnLigne`,
chaîne objet JSON → gabarit React sans hook → Playwright, empreinte `{ type, contenu }`, versions
figées, séries par `Document.serie`, verrou du lot `sousVerrouLot`, génération « lecture → rendu hors
transaction → revérification sous verrou → insertion », jamais `prisma migrate reset` ni
`prisma migrate dev`.

**Prérequis :** le plan du Suivi financier (`docs/superpowers/plans/2026-09-30-suivi-financier.md`)
est entièrement exécuté. Ce sous-projet s'appuie sur ce qu'il livre : `LOGO_SOCOREVE`
(`src/documents/gabarits/logo.ts`), `imprimerPortrait`, la mise à l'échelle « une feuille » en
portrait (`htmlVersPdf({ paysage: false, uneSeuleFeuille: true, tropLong })`, `TROP_DE_LIGNES`),
`sousVerrouLot` (`src/donnees/verrouLot.ts`), `DONNEES_CHANGEES`, les colonnes Avenants et
Certificats de `TableauDocuments`, `serieAvenant` et `serieCertificat`.

## 1. Contexte et objectif

Pendant les travaux, le chargé d'affaire tient la réunion de chantier hebdomadaire et en diffuse le
**compte rendu** ; à la fin, il réceptionne chaque entreprise par un **procès-verbal de réception**,
avec ou sans réserves. Il doit aussi pouvoir remettre d'un coup tous les papiers du chantier.

La maquette a validé le compte rendu (fac-similé de « COMPTE RENDU DE CHANTIER.doc »), le PV
(fac-similé de « 3- PV de réception.ods ») et la page Documents « piste B ». Ce sous-projet en fait de
vraies données partagées et des PDF figés, termine la page Documents (colonne Réception, carte Comptes
rendus) et livre « Tout télécharger ».

### Critères de réussite

- Un compte rendu se rédige sur la feuille, se reprend après fermeture (par soi ou un collègue),
  s'enregistre en PDF figé ; le suivant repart de la coordination et des convocations du précédent.
- Seul le dernier compte rendu se corrige, en nouvelle version du même numéro.
- Un PV se prépare lot par lot ou pour tous les lots d'un coup, s'imprime une page par lot, et refuse
  un « avec réserves » sans réserves ou un « différé » sans motif.
- La page Documents montre, pour chaque entreprise, où en est sa réception ; l'orangé signale des
  réserves non levées, ou une réception différée tant qu'un PV ultérieur ne l'a pas remplacée.
- « Tout télécharger » remet une archive ZIP rangée avec la dernière version de chaque document.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Stockage | Tables métier `CompteRendu` et `Reception`, champs communs du PV sur `Chantier` ; PDF par la chaîne `Document` + `serie` |
| Brouillon du compte rendu | En base, un par chantier, partagé entre collègues, enregistré à la frappe champ par champ |
| Numéro du compte rendu | Calculé une fois à la création du brouillon (plus grand numéro enregistré + 1, sinon 1), jamais saisi |
| Correction d'un compte rendu | Seul le dernier enregistré (plus grand numéro) se corrige : même numéro, nouvelle version ; les saisies de correction vivent dans l'aperçu |
| Rédacteur | Le chargé d'affaire du chantier et le portable de son compte, préremplis, modifiables sur la feuille, figés à l'enregistrement |
| Brouillon du PV | En base : une ligne `Reception` par lot, les champs communs sur `Chantier` |
| Versions du PV | Une série par lot `RECEPTION:<lotId>` ; chaque PV émis est une version, la dernière fait foi ; pas d'état « modifié » |
| Levée des réserves | Une date sur la réception du lot ; pas de document ; la case repasse en bleu |
| Formats | A4 portrait avec logo ; compte rendu sur une ou plusieurs pages ; PV sur une page par lot (mise à l'échelle « une feuille ») |
| « Tous les lots » | Un document par lot, puis un PDF assemblé (pdf-lib) pour l'impression, non stocké |
| « Tout télécharger » | ZIP construit à la demande (fflate) : dernière version de chaque série |
| Verrous | Compte rendu : `FOR UPDATE` sur sa ligne ; enregistrement et correction : `FOR UPDATE` sur le chantier ; réception d'un lot : `sousVerrouLot` |
| Versions | Règle du Socle : pas de nouvelle version si l'empreinte n'a pas changé |

## 3. Architecture

```
src/
  domaine/
    compteRendu.ts    coordination (intitulés, rubriques vides, surlignage), convocations,
                      coordination de base, texte du rendez-vous, numéro suivant (règles pures)
    reception.ts      décisions, validation du PV, état de la case Réception (règles pures)
    archive.ts        arborescence et noms des fichiers du ZIP, doublons (règles pures)
    fichiers.ts       + nomFichierCompteRendu, nomFichierReception, nomFichierArchive
  donnees/
    comptesRendus.ts  brouillon (création unique, champs, convocations), enregistrement, correction
    receptions.ts     brouillon du lot, champs communs, génération (un lot ou tous), levée
    archive.ts        lecture des dernières versions, construction du ZIP
  actions/
    comptesRendus.ts, receptions.ts     Server Actions
  documents/
    batir.ts          + batirCompteRendu, batirReception
    gabarits/         CompteRendu.tsx, ProcesVerbalReception.tsx
    series.ts         + serieCompteRendu(id), serieReception(lotId)
    etats.ts          + comptes rendus, case Réception, versions des PV dans l'historique
  composants/
    ApercuCompteRendu.tsx   brouillon, lecture, correction
    ApercuReception.tsx     un lot ou tous, menu « Procès-verbal pour »
    TableauDocuments.tsx    + carte Comptes rendus, colonne Réception, « Tout télécharger »
    PanneauLot.tsx          + bouton « PV de réception »
  app/api/chantiers/[id]/
    archive/route.ts        GET : le ZIP
    receptions-pdf/route.ts GET ?documents=… : les PV assemblés
```

Les règles de mise en forme de la coordination n'existent qu'une fois, dans `src/domaine/` :
l'aperçu les appelle à la frappe, le gabarit à la génération.

## 4. Modèle de données

### Nouvelles tables

```prisma
enum StatutCompteRendu {
  BROUILLON
  ENREGISTRE
}

enum DecisionReception {
  SANS_RESERVES
  AVEC_RESERVES
  DIFFEREE
}

model CompteRendu {
  id           String            @id @default(cuid())
  chantierId   String
  chantier     Chantier          @relation(fields: [chantierId], references: [id], onDelete: Cascade)
  statut       StatutCompteRendu @default(BROUILLON)
  numero       Int
  date         DateTime          @db.Date
  rdvDate      DateTime?         @db.Date
  rdvHeure     String?           // 'HH:MM'
  avancement   String            @default("")
  coordination String            @default("")
  redacteur    String            @default("")
  portable     String            @default("")
  convocations Json              @default("{}")   // { [lotId]: 'D' | 'C' | 'P' | 'A' | 'E' }
  creeLe       DateTime          @default(now())

  @@index([chantierId])
}

model Reception {
  id               String            @id @default(cuid())
  lotId            String            @unique
  lot              Lot               @relation(fields: [lotId], references: [id], onDelete: Cascade)
  decision         DecisionReception @default(SANS_RESERVES)
  dateEffet        DateTime?         @db.Date
  reserves         String            @default("")
  delai            String            @default("")
  motifs           String            @default("")
  representant     String            @default("")
  reservesLeveesLe DateTime?         @db.Date
}
```

Écrit à la main dans la migration `20261003000000_suivi_chantier` :

- index unique partiel `CompteRendu (chantierId) WHERE statut = 'BROUILLON'` : au plus un brouillon
  par chantier ;
- index unique partiel `CompteRendu (chantierId, numero) WHERE statut = 'ENREGISTRE'` ;
- `CHECK` : `numero BETWEEN 1 AND 999` ; `rdvHeure ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'` ;
  `rdvHeure IS NULL OR rdvDate IS NOT NULL` ;
- `Parametres.siteWeb` rempli à `socoreve-chateaubriant.com` pour la ligne existante.

Zod applique les mêmes règles avant l'écriture ; `convocations` est validé par
`z.record(z.string(), z.enum(['D','C','P','A','E']))`.

### Modifications des sous-projets précédents

- `Chantier` + `receptionDate DateTime? @db.Date`, `receptionSignataire String @default("")`,
  `contratMoeDate DateTime? @db.Date`, `receptionMaitreOeuvre String @default("")`,
  `comptesRendus CompteRendu[]`.
- `Lot` + `reception Reception?`.
- `Parametres` + `siteWeb String @default("socoreve-chateaubriant.com")`, modifiable par l'admin dans
  la page Paramètres (facultatif, comme l'e-mail).
- `Utilisateur.telephone` (déjà en base, modifiable nulle part) : colonne **Portable** de la page
  Comptes de l'admin, enregistrée comme les autres champs.
- `enum TypeDocument` + `COMPTE_RENDU`, `PV_RECEPTION` ; `LIBELLES_TYPES` (« Compte rendu »,
  « PV de réception ») et `TITRES_TYPES` (« Compte rendu de chantier », « Procès-verbal de
  réception »).
- Séries : `CR:<compteRenduId>` (`Document.lotId` nul) et `RECEPTION:<lotId>` (`Document.lotId` =
  le lot). Un marché reste « un document dont la `serie` est l'id du lot » (Suivi financier, § 4).
- Supprimer un lot reste soumis à la règle du Socle : un lot qui a un PV ne se supprime plus ; sa
  ligne `Reception` part avec lui (`Cascade`). Les convocations d'un lot supprimé sont ignorées.
- `viderBase` (tests) vide les nouvelles tables.
- `pdf-lib` passe des dépendances de développement aux dépendances ; `fflate` est ajouté.

## 5. Compte rendu de chantier

### Brouillon

- **Créer** : « Nouveau compte rendu » (carte Comptes rendus de la page Documents). Si un brouillon
  existe déjà, le bouton devient « Reprendre le brouillon » et l'ouvre. Deux créations simultanées
  n'en font qu'un : l'index unique partiel refuse la seconde insertion, qui relit et ouvre le
  brouillon existant.
- **Valeurs initiales**, depuis le dernier compte rendu enregistré (plus grand numéro) :
  - numéro : le sien + 1 ; 1 s'il n'y en a pas. Il est **fixé à la création** et ne se saisit ni
    dans le brouillon ni en correction : il s'affiche sur la feuille en texte ;
  - coordination : la sienne ; sinon la **coordination de base** : une ligne « `DÉSIGNATION` : »
    par lot, dans l'ordre de saisie, séparées par une ligne vide, puis « MAÎTRE D'OUVRAGE : » ;
  - convocations : les siennes, pour les lots qui existent encore ; un lot sans lettre vaut D ;
  - date : le jour de la création ; prochain rendez-vous : vide ; avancement : vide ;
  - rédacteur et portable : nom et téléphone du chargé d'affaire du chantier.
- **Saisie** (champ par champ, `ChampEnLigne`, sous `FOR UPDATE` sur la ligne du brouillon) :
  date, date et heure du prochain rendez-vous, avancement, coordination, rédacteur, portable.
- **Convocations** : un clic sur la lettre d'un lot la fait tourner D → C → P → A → E → D ;
  l'écriture relit les convocations sous verrou et ne change que ce lot.
- **Repartir des lots** : remplace la coordination par la coordination de base, après confirmation
  (« Remplacer la coordination par les seuls intitulés des lots ? Le texte saisi sera perdu. »).
- **Abandonner le brouillon** : le supprime, après confirmation.
- Les lots, entreprises, interlocuteurs et téléphones affichés sont ceux du moment, lus à chaque
  ouverture.

### Règles de la coordination et de l'avancement

- Un **intitulé** est une ligne dont le début, en majuscules (lettres, chiffres, espaces et
  `. , / ' ’ - – — ( )`), contient au moins trois lettres majuscules consécutives et se termine par
  « : ». Le texte qui suit le « : » sur la même ligne reste sur la ligne de l'intitulé.
- Les lignes qui suivent un intitulé forment sa rubrique ; les lignes vides sont ignorées.
- Une rubrique sans texte (ni après le « : », ni dessous) ne s'imprime pas.
- `**texte**` s'imprime surligné en jaune ; à l'écran, les `**` restent visibles.
- Exemples : « GROS ŒUVRE : » est un intitulé ; « DU 12 : prévoir » n'en est pas un (deux lettres) ;
  « GROS ŒUVRE : **reprise** du mur » est un intitulé suivi de texte surligné.

### Feuille « COMPTE RENDU DE CHANTIER » (`COMPTE_RENDU`, série `CR:<id>`)

Fac-similé de la maquette (`renderCr`), A4 portrait, **une ou plusieurs pages** (marges de 10 mm,
`imprimerPortrait`) :

- en-tête encadré : logo ; adresse, CP et ville, « Tél. », « Email : », « Site : » (Paramètres) ;
  « COMPTE RENDU DE CHANTIER » ;
- « Suivi des travaux effectué par {rédacteur} — Portable : {portable} » (la partie portable est
  omise s'il est vide) ;
- bloc chantier : « RÉFÉRENCE CHANTIER : » nature des travaux en majuscules (« m² » gardé) puis
  l'adresse « adresse – CP – commune » ; « MAÎTRE D'OUVRAGE : » ; « N° du Compte – Rendu : » ;
  « Le : 06/10/2026 » ; « PROCHAIN RDV : mardi 13/10/2026 à 14h00 » en rouge (sans heure :
  « mardi 13/10/2026 » ; sans date : vide) ;
- « Légende : P = Présent / A = Absent / E = Excusé / C = Convoqué au prochain RDV / D = Diffusion »,
  la partie « C = Convoqué au prochain RDV » en rouge ;
- tableau : Lot (désignation) | Entreprise | Interlocuteur | Tél | Convocation, tous les lots dans
  l'ordre de saisie, « — » pour ce qui manque ; C en rouge gras ;
- « AVANCEMENT : » et « COORDINATION : » selon les règles ci-dessus ;
- pied : « SALUTATIONS » et le rédacteur ; « NB : Sans réactions écrites de votre part à la
  réception de ce document, l'ensemble des informations notées est considéré comme validé et
  accepté. »

**Fichier** : `<REF>-CompteRendu04-v1.pdf`.

### Enregistrer

`enregistrerCompteRendu(id)` :

1. relit le brouillon ; refuse s'il n'a ni avancement ni coordination imprimable ;
2. construit l'objet (lots, entreprises, interlocuteurs, téléphones, en-tête, rédacteur **figés**)
   et rend le PDF hors transaction ;
3. sous `FOR UPDATE` sur le chantier : relit le brouillon (disparu : « Ce brouillon n'existe
   plus. »), refait l'empreinte (différente : `DONNEES_CHANGEES`), vérifie que le numéro est libre
   (défense de course : l'index unique partiel des enregistrés donne le même message), passe le statut à `ENREGISTRE` et crée la version 1 de la série.

L'aperçu se ferme sur un toast « Compte rendu n° 04 enregistré. » avec le lien du PDF.

### Corriger

- « Dernier » = le compte rendu `ENREGISTRE` de plus grand numéro. Seul lui propose **Corriger le n° 04** (carte Comptes rendus, et
  bandeau de la lecture seule). La feuille se rouvre en édition avec ses valeurs ; les modifications
  vivent dans l'aperçu (fermer après une modification demande confirmation).
- `corrigerCompteRendu(id, saisies)` : sous `FOR UPDATE` sur le chantier, vérifie qu'il est toujours
  le dernier enregistré (sinon « Seul le dernier compte rendu se corrige. »), met la ligne à jour et
  crée la version suivante ; empreinte inchangée : pas de version (« Rien n'a changé depuis la
  version N »).
- La correction reprend les lots et entreprises **du moment** (comme un nouveau compte rendu) ; le
  brouillon en cours, s'il existe, n'est pas touché.
- Un compte rendu **n'a pas d'état « modifié »** : `etatsDocumentsChantier` ne reconstruit jamais son
  contenu.

## 6. Procès-verbal de réception

### Ouvrir

- Depuis la page Documents : case Réception d'un lot, lien « Nouveau PV » d'une case pleine, bouton
  « Tous les lots » de l'en-tête de colonne ; depuis le panneau du lot (écran Marchés) : bouton
  « PV de réception » si le lot a une entreprise, qui mène à la page Documents.
- Adresses : `?pv=<lotId>`, `?pv=tous`.
- Seuls les lots qui ont une entreprise sont « réceptionnables ». Aucun : « Attribuez d'abord une
  entreprise à un lot. »
- Menu « Procès-verbal pour » : chaque lot réceptionnable (« 02 — GROS ŒUVRE », entreprise), puis
  « Tous les lots attribués — une page chacun ».

### Brouillon

- À la première ouverture d'un lot, sa ligne `Reception` est créée : sans réserves, représentant =
  interlocuteur de l'entreprise.
- À la première ouverture d'un PV du chantier, les champs communs vides sont remplis une fois :
  date de réception = aujourd'hui, date du contrat de maîtrise d'œuvre = date de signature prévue du
  chantier, maître d'œuvre = nom du chargé d'affaire.
- Saisie champ par champ : champs du lot sous `sousVerrouLot` ; champs communs par une mise à jour
  d'une colonne de `Chantier`. Un champ commun changé sur une page se voit sur toutes les pages
  ouvertes.

### Feuille « PROCÈS-VERBAL DE RÉCEPTION » (`PV_RECEPTION`, série `RECEPTION:<lotId>`)

Fac-similé de la maquette (`pagePv`), A4 portrait, **une page** (mise à l'échelle « une feuille » en
portrait, `TROP_DE_LIGNES` au-delà) :

- en-tête : logo ; « adresse - CP VILLE » et « Tél. … – e-mail » (Paramètres) ; « PROCÈS-VERBAL DE
  RÉCEPTION DES TRAVAUX ENTREPRISE » ;
- « En date du : {date de réception} » ;
- cadre : « Maître d'ouvrage : » ; « Adresse des travaux : » adresse puis « CP – commune » ;
- « Je, soussigné {signataire, sinon le maître d'ouvrage} » + « représentant de {maître
  d'ouvrage} » si un signataire est saisi, « maître de l'ouvrage, » ;
- « assisté du maître d'œuvre SOCOREVE représenté par {maître d'œuvre} » ;
- « et en présence de l'entreprise {entreprise} », « représentée par {représentant} » ;
- « titulaire du lot {02 — GROS ŒUVRE} » (sous-traitance : la désignation seule) ;
- « des travaux exécutés pour mon compte à l'adresse ci-dessus, au titre du contrat de maîtrise
  d'œuvre {mission} du {date du contrat}, déclare que : », où {mission} vient de `Chantier.mission`
  (`COMPLETE` → « complète », `PARTIELLE` → « partielle ») ;
- trois cases, celle de la décision cochée (✕) :
  - « la réception est prononcée sans réserves, avec effet à la date du : {effet} » ;
  - « la réception est prononcée avec réserves (réserves mentionnées ci-après), avec effet à la date
    du : {effet} » ;
  - « la réception est différée pour les motifs suivants : {motifs} » ;
  les trois lignes s'impriment toujours ; la date d'effet ne se remplit que sur la ligne cochée « sans »
  ou « avec » (par défaut la date de réception), les motifs seulement si différée ; ailleurs, un blanc
  souligné ;
- **Tout ce qui suit s'imprime toujours**, quelle que soit la décision ; seules les valeurs propres à
  « avec réserves » restent en blanc sinon :
  - « NATURE DES RÉSERVES » entre deux traits pointillés, puis le cadre des réserves (une par ligne
    si avec réserves, vide sinon) ;
  - « Le maître d'œuvre et le maître de l'ouvrage conviennent que les travaux nécessaires pour lever
    les réserves mentionnées ci-dessus, seront exécutés dans un délai de {délai}, à compter de ce
    jour. » ({délai} : la saisie si avec réserves, un blanc souligné sinon) ;
  - « Pour garantir la levée de ces réserves, la retenue de garantie qui est de {taux} % sera
    restituée à l'entreprise soit après que le procès-verbal de levée de réserves soit signé par les
    deux parties soit dans un délai maximum de 6 mois après la levée de réserves comme indiqué sur le
    contrat de marché. », {taux} = `Lot.retenueGarantie` du lot, virgule décimale, sans zéro inutile
    (« 5 », « 2,5 ») ;
  - « Signature du maître de l'ouvrage » / « Signature de l'entreprise » / « Signature du maître
    d'œuvre » ;
- « CONSTAT DE LEVÉE DE RÉSERVES » entre deux traits pointillés, la phrase « Le maître de l'ouvrage
  et l'entreprise, ci-dessus désignés, constatent qu'il a été valablement remédié aux malfaçons,
  omissions, imperfections concernées. », puis « Fait à ____ » « le ____ » (blancs pour la main) et
  « Signature du maître de l'ouvrage ».

**Fichier** : `<REF>-Lot02-GROS-OEUVRE-Reception-v1.pdf` (`ST` en sous-traitance).

### Générer

- Un lot : **Générer le PDF**. Tous les lots : **Générer les 12 PV**.
- Contrôles, lot par lot : « avec réserves » sans réserves → « CONSTRUCTIONS REBOURS : précisez la
  nature des réserves. » ; « différée » sans motif → « … : précisez les motifs du report. » ; lot
  sans entreprise → « Ce lot n'a pas d'entreprise. » En « tous les lots », un seul refus bloque tout,
  et l'aperçu passe sur le lot en cause.
- Pour chaque lot : objet construit et PDF rendu hors transaction ; puis, sous `sousVerrouLot` (les
  lots verrouillés dans l'ordre de saisie, pour éviter tout interblocage) et avec la ligne du
  chantier relue, revérification de l'empreinte (`DONNEES_CHANGEES`), puis :
  - empreinte différente de la dernière version : nouvelle version de la série du lot, **et**
    `reservesLeveesLe` remis à nul dans la même transaction ;
  - empreinte identique : aucune version, **levée conservée** ; le lot compte parmi les
    « inchangés ».
- Toast : « PV de réception généré — CONSTRUCTIONS REBOURS. » ou « 10 PV générés, 2 inchangés. »
- Tous les lots : ouverture de `/api/chantiers/[id]/receptions-pdf?documents=<ids>` qui assemble la
  dernière version de chaque lot, une page par lot, dans l'ordre de saisie
  (`<REF>-Receptions.pdf`, non stocké). La route refuse un document qui n'est pas un PV du chantier.
- Le brouillon garde ses valeurs après génération.
- Un PV **n'a pas d'état « modifié »** : c'est un acte daté ; la case montre le dernier PV émis.

### Levée des réserves

- Quand le dernier PV d'un lot est « avec réserves » : **Réserves levées…** (date, aujourd'hui par
  défaut) enregistre `reservesLeveesLe` sous `sousVerrouLot`.
- Refus : dernier PV sans réserves ou absent → « Le dernier PV de ce lot n'a pas de réserves. » ;
  date antérieure à la date de réception du dernier PV → « La levée ne peut précéder la réception. »
- **Annuler la levée** remet la date à nul.
- Une réception **différée** n'a pas de levée : elle reste orangée jusqu'à ce qu'un PV ultérieur
  (sans ou avec réserves) la remplace.

## 7. Page Documents

- **En-tête** : sous le titre, « 23 documents · dernier le 06/10/2026 » (« Aucun document produit
  pour ce chantier. ») ; à droite, **Tout télécharger** (inactif, infobulle « Aucun document à
  télécharger », si le chantier n'a aucun document).
- **Cartes « chantier entier »**, dans cet ordre : Comptes rendus, Récapitulatif, Planning, Visa.
  - Comptes rendus : le dernier enregistré « n° 04 · 06/10/2026 » (s'ouvre en lecture seule) ; en
    dessous « Brouillon n° 05 en cours », sinon « Prochain : mardi 13/10 à 14h00 », sinon
    « Prochain rendez-vous non fixé », ou, sans compte rendu, « Le premier reprend les lots et les
    entreprises » ; boutons « Nouveau compte rendu » / « Reprendre le brouillon » et « Corriger le
    n° 04 » ; liste dépliable de tous les comptes rendus (numéro, date, versions, PDF).
- **Tableau par entreprise** : Lot | Marché | Avenants | Certificats | **Réception** | Historique.
  - Réception, pour un lot qui a une entreprise :

    | Dernier PV | Case |
    |---|---|
    | aucun | pointillé « + Réception » (ouvre le brouillon) |
    | sans réserves | bleu « Sans réserves · 12/10 » |
    | avec réserves, non levées | **orangé** « Avec réserves · 12/10 » + « Réserves levées… » |
    | avec réserves, levées | bleu « Réserves levées le 20/11 » + « Annuler la levée » |
    | différée | **orangé** « Différée · 12/10 » |

    Une case pleine ouvre le dernier PV en lecture seule ; un lien « Nouveau PV » ouvre le brouillon.
  - En-tête de colonne : « Tous les lots » quand au moins deux lots ont une entreprise.
  - Historique : les versions des PV s'ajoutent à celles du marché et des lettres d'avenant, marquées
    « PV ».
  - Légende : + « Orangé : réserves à lever ou réception différée. »
- Les aperçus du compte rendu (`?cr=brouillon`, `?cr=<id>`, `?corriger-cr=<id>`) et du PV
  (`?pv=<lotId>`, `?pv=tous`) s'ouvrent en plein écran sur cette page ; une version s'ouvre par
  `?version=<documentId>` comme les autres documents.

## 8. « Tout télécharger »

- `GET /api/chantiers/[id]/archive` : session requise (comme la route des PDF) ; `404` si le chantier
  n'existe pas ou n'a aucun document.
- **Nom** : `<REF>-Documents-2026-10-06.zip` (référence passée par `slugifier`, date du jour).
- **Contenu** : la dernière version de chaque série, sous son `nomFichier` :

  ```
  01 Marchés/
  02 Avenants/                  lettres des avenants existants (pas celles des avenants supprimés)
  03 Certificats de paiement/   un fichier par certificat
  04 Comptes rendus/
  05 Réceptions/
  06 Planning/                  planning et visa
  <REF>-RecapMarches-vN.pdf     s'il a été généré
  ```

  Deux fichiers de même nom dans un dossier : le second prend « (2) » avant l'extension. Les noms sont
  écrits en UTF-8 avec le drapeau UTF-8 du ZIP ; un test relit l'archive et retrouve « 01 Marchés/ ». Le brouillon du compte rendu
  n'est pas inclus.
- Construction en mémoire avec `fflate` (`zipSync`, PDF stockés sans recompression) ; en-tête
  `Content-Disposition` par `enTeteTelechargement`.

## 9. Gestion des erreurs

Mécanique du Socle : `ErreurMetier` → `Resultat` en échec → message à l'écran ; tout le reste est
journalisé sans données (ni texte du compte rendu, ni nom de client) et affiché comme erreur
générique.

| Cas | Réponse |
|---|---|
| Compte rendu sans avancement ni coordination imprimable | « Saisissez l'avancement ou la coordination avant d'enregistrer. » |
| Numéro déjà pris par un compte rendu enregistré | « Le compte rendu n° 5 existe déjà. » |
| Heure invalide, heure sans date | « Heure : saisissez HH:MM. » / « Saisissez d'abord la date du prochain rendez-vous. » |
| Correction d'un compte rendu qui n'est plus le dernier | « Seul le dernier compte rendu se corrige. » |
| Brouillon abandonné ou enregistré par un collègue | « Ce brouillon n'existe plus. » |
| Texte trop long | « L'avancement est limité à 5 000 caractères. » ; coordination 20 000 ; réserves et motifs 2 000 ; autres champs 120 |
| Avec réserves sans réserves, différée sans motif | « {ENTREPRISE} : précisez la nature des réserves. » / « … les motifs du report. » |
| Lot sans entreprise | « Ce lot n'a pas d'entreprise. » |
| Levée sans réserves à lever | « Le dernier PV de ce lot n'a pas de réserves. » |
| Levée antérieure au PV | « La levée ne peut précéder la réception. » |
| Données changées pendant la génération | `DONNEES_CHANGEES` (Suivi financier) |
| PV trop long pour une page | `TROP_DE_LIGNES` |

## 10. Tests

- **Vitest (domaine)** :
  - coordination : intitulé seul, intitulé suivi de texte, rubrique vide non imprimée, lignes vides
    ignorées, « DU 12 : » qui n'est pas un intitulé, surlignage à l'impression et à l'écran ;
  - coordination de base ; cycle des convocations ; lettre par défaut D ; convocations d'un lot
    supprimé ignorées ;
  - texte du rendez-vous : « mardi 13/10/2026 à 14h00 », sans heure, sans date ;
  - numéro suivant (plus grand enregistré + 1, sinon 1) ; validation du PV ; état de la case Réception (les cinq cas) ;
  - arborescence du ZIP, avenants supprimés exclus, doublons « (2) », nom de l'archive.
- **Vitest (documents)** :
  - compte rendu avec 300 lignes de coordination : plusieurs pages A4 portrait ;
  - PV avec 2 000 caractères de réserves : une page ;
  - une entreprise renommée après l'enregistrement ne change pas le compte rendu figé.
- **Intégration (base de test)** :
  - deux « Nouveau compte rendu » simultanés : un seul brouillon ;
  - deux changements de convocation simultanés sur deux lots : les deux sont gardés ;
  - enregistrement : numéro pris refusé ; brouillon enregistré par un collègue entre-temps refusé ;
  - le compte rendu suivant reprend coordination et convocations ;
  - correction du dernier : v2 et ligne à jour ; correction sans changement : pas de v2 ; correction
    d'un plus ancien refusée sous verrou ;
  - PV « tous les lots » : un lot invalide bloque tout, rien d'écrit ; deuxième génération sans
    changement : « inchangés » ; un nouveau PV au contenu changé efface la levée, une régénération sans changement la garde ;
    levée antérieure refusée ; levée refusée sur une différée ;
  - route d'assemblage : un document d'un autre chantier est refusé ;
  - archive : dossiers, dernières versions seulement, avenant supprimé exclu, récapitulatif PDF à la racine ;
  - migration dans un schéma à part (comme `migrationPlanning.int.test.ts`) : index partiels et
    `CHECK`, `siteWeb` rempli.
- **Playwright E2E** (chantier `SUIVI`, copie de la fixture PERRIER insérée par
  `e2e/preparer-suivi.ts`, enchaîné dans `e2e:serveur`) :
  1. Documents → Nouveau compte rendu : avancement « Fondations coulées », « GROS ŒUVRE : **reprise**
     du mur » dans la coordination, convocation de GROS ŒUVRE sur C ; recharger la page, reprendre
     le brouillon : tout est là ;
  2. enregistrer : `SUIVI-CompteRendu01-v1.pdf` ; la carte montre « n° 01 » ;
  3. nouveau compte rendu : n° 02, la coordination et la lettre C sont reprises ;
  4. abandonner le brouillon, corriger le n° 01 (avancement modifié) : v2 ;
  5. « Tous les lots » : PEINTURE en « avec réserves » sans réserves → message et aperçu sur
     PEINTURE ; saisir « Reprise des joints de la cuisine » : 12 PV générés, PDF assemblé de 12
     pages ;
  6. case PEINTURE orangée « Avec réserves » ; « Réserves levées… » : case bleue « Réserves levées
     le … » ;
  7. « Tout télécharger » : `SUIVI-Documents-<date>.zip` contient `04 Comptes rendus/`
     `SUIVI-CompteRendu01-v2.pdf`, 12 fichiers dans `05 Réceptions/`, sans tableur.

## 11. Hors périmètre

- Diffusion du compte rendu par e-mail aux entreprises.
- Document « PV de levée de réserves » imprimé.
- Signature électronique.
- Photos dans le compte rendu.
- Archive contenant toutes les versions.
- Modification de son propre portable par chaque utilisateur (l'admin le saisit dans Comptes ; il se
  corrige aussi sur la feuille du compte rendu).
