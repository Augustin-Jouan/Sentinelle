# Sentinelle Marchés — Sous-projet 2 : Planning

Date : 2026-09-29 · Statut : design validé, en attente de relecture de la spec

Référence visuelle et fonctionnelle : `docs/maquette/sentinelle-marches.html` (écran `#v-planning`,
lignes 2388-2445 ; styles du Gantt lignes 1352-1716 et des documents lignes 1717-1765 ; modèle et
règles lignes 5190-5330 ; rendu et gestes lignes 5330-6240 ; planning imprimable et visa lignes
6280-6400 et 6443-6475).

Ce document prolonge la spec du Socle (`2026-09-29-socle-design.md`), dont il reprend l'architecture,
les conventions (`Resultat<T>`, `ErreurMetier`, `ChampEnLigne`, chaîne objet JSON → gabarit React →
Playwright, empreinte `{ type, contenu }`, versions figées) et les contraintes globales du plan
(versions épinglées, jamais `prisma migrate reset` ni `prisma migrate dev`).

## 1. Contexte et objectif

Le chargé d'affaire bâtit le planning prévisionnel du chantier dans un diagramme de Gantt en semaines,
l'imprime sur une seule feuille pour les entreprises et fait signer une feuille de visa qui les engage
sur ce planning. Le sous-projet livre :

- l'onglet **Planning** du chantier : Gantt interactif avec **tous les gestes de la maquette** ;
- les **fermetures** de chantier (congés) ;
- le choix de la **couleur** d'un lot ;
- le **planning prévisionnel** imprimable, figé et versionné, toujours sur **une seule feuille** ;
- la **feuille de visa**, figée, versionnée et **rattachée à une version du planning**.

### Critères de réussite

- Un chargé d'affaire trace, déplace, allonge et enchaîne des périodes à la souris et au clavier comme
  dans la maquette ; retarder une période repousse ses suites, y compris dans d'autres lots.
- Deux collègues qui modifient en même temps des périodes différentes du même planning ne perdent
  rien.
- Le planning imprimé tient sur une page A4 paysage, quel que soit le nombre de lots ou de semaines.
- On sait exactement quelle version du planning chaque feuille de visa fait signer.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Interactivité | Parité complète avec la maquette (gestes, sélection multiple, clavier, flèches de dépendance, zoom, outils main/cible, lots masqués) |
| Documents | Planning et visa figés et versionnés comme les marchés ; le visa est construit depuis une version du planning et la nomme |
| Architecture du Gantt | Composant React maison ; règles pures partagées navigateur/serveur ; le serveur fait foi et applique la cascade sous verrou |
| Bibliothèque de Gantt | Aucune (jours au lieu de semaines ISO, pas de fermetures pleine hauteur ni d'impression sur une feuille, licences) |
| Lots masqués | Préférence d'affichage de chaque personne, dans le navigateur ; sans effet sur les données ni sur l'impression |
| Temps réel | Non : le planning renvoyé après chaque geste et le chargement de la page suffisent |
| Annulation (Ctrl+Z) | Non, comme la maquette |

## 3. Architecture

Ajouts à l'arborescence du Socle :

```
src/
  domaine/
    semaines.ts     semaines ISO : lundi d'une semaine, semaine d'une date, rang absolu, mois d'une semaine
    planning.ts     cascade (repousser), recalage d'une période liée, boucles, étendue de l'axe,
                    vraie période des travaux, colonnes et mois, pas des numéros de semaine
    couleurs.ts     palette des 9 couleurs (annexe A) et validation d'une clé
  donnees/
    planning.ts     lecture du planning d'un chantier ; opérations sous verrou (créer, déplacer,
                    modifier, lier, supprimer ; fermetures ; couleur)
  actions/
    planning.ts     Server Actions : session → Zod → donnees/planning → planning complet renvoyé
  documents/
    batir.ts        + construirePlanning, construireVisa (purs)
    donnees.ts      + construireDonneesPlanning, construireDonneesVisa
    gabarits/       + PlanningPrevisionnel, VisaPlanning
    pdf.ts          + option « une seule feuille » (§ 7)
  composants/
    planning/       Gantt (grille, barres, flèches SVG, fermetures), barre d'outils, panneau du lot,
                    fenêtre Fermetures, gestion des gestes (Pointer Events) et du clavier
  app/(app)/chantiers/[id]/planning/page.tsx
```

- `domaine/planning.ts` est **la seule implémentation** des règles du planning. Le composant
  l'appelle pour afficher le résultat d'un geste avant la réponse du serveur ; `donnees/planning.ts`
  l'appelle pour produire ce qui est enregistré. Même entrée, même résultat.
- Le composant tient l'état du planning côté client (périodes, fermetures, couleurs, sélection,
  geste en cours). À chaque réponse d'une action, il remplace périodes, fermetures et couleurs par le
  planning renvoyé ; la sélection est conservée pour les périodes qui existent encore.

## 4. Modèle de données

### Nouvelles tables

```
Periode   id, lotId → Lot (onDelete Cascade), intitule (≤ 120, défaut ""), debut (date, un lundi),
          duree (entier 1-104, en semaines), dependDeId → Periode? (onDelete SetNull), creeLe
Fermeture id, chantierId → Chantier (onDelete Cascade), libelle (≤ 60, défaut "Congés"),
          debut (date, un lundi), duree (entier 1-52)
```

- `debut` est la **date du lundi** de la semaine ISO. Une contrainte `CHECK (EXTRACT(ISODOW FROM
  debut) = 1)` l'impose en base ; une semaine qui n'existe pas (semaine 53 d'une année qui n'en a que
  52) ne peut pas s'écrire. Les écrans et les documents affichent semaine et année ISO.
- Index sur `Periode(lotId)`, `Periode(dependDeId)` et `Fermeture(chantierId)`.
- Supprimer un lot supprime ses périodes (cascade) ; les périodes d'autres lots qui en dépendaient
  sont détachées (`SetNull`) et restent à leur place.
- Les périodes d'un lot s'affichent triées par `debut`, puis `creeLe`.

### Modifications du Socle

- **`Lot.couleur`** (déjà présent, défaut `noir`) devient modifiable ; seules les 9 clés de l'annexe A
  sont acceptées.
- **`TypeDocument`** reçoit `PLANNING` et `VISA_PLANNING`.
- **`Document.serie`** (texte, obligatoire) : l'identifiant du lot pour un marché, `RECAPITULATIF`,
  `PLANNING` ou `VISA` pour les documents du chantier entier. L'unicité devient
  `(chantierId, serie, version)` et remplace l'index `(chantierId, lotId, version) NULLS NOT DISTINCT`,
  qui ne laissait de place qu'à une seule série sans lot. La migration remplit
  `serie = COALESCE("lotId", 'RECAPITULATIF')` pour les lignes existantes avant de poser la
  contrainte. `lotId` reste (clé étrangère `RESTRICT` des marchés).
- **`Document.sourceId`** → `Document?` (`onDelete Restrict`) : pour un visa, la version du planning
  dont il est issu ; nul pour les autres types.
- `documents/generer.ts`, `documents/etats.ts` et le verrou consultatif passent de `(chantierId,
  lotId)` à `(chantierId, serie)` : `pg_advisory_xact_lock(hashtext(chantierId), hashtext(serie))`.
- La migration s'écrit avec `prisma migrate diff`, s'applique avec `prisma migrate deploy` et se
  vérifie sans écart (contraintes globales du plan du Socle).

## 5. Règles du planning

Toutes dans `domaine/planning.ts` et `domaine/semaines.ts`, en TypeScript pur, testées par Vitest.

### Semaines

- Semaines ISO 8601 (lundi, semaine 1 = celle du premier jeudi). 2026 compte 53 semaines.
- Une période couvre `duree` semaines entières à partir de son lundi ; sa dernière semaine est
  `rang(debut) + duree − 1`.
- Libellé d'un mois de l'axe : le mois du **lundi** de la semaine, abrégé comme la maquette
  (`janv.`, `févr.`, `mars`, `avr.`, `mai`, `juin`, `juil.`, `août`, `sept.`, `oct.`, `nov.`, `déc.`)
  suivi de l'année sur deux chiffres (`avr.-26`).

### Dépendances et cascade

- Une période peut dépendre d'**une** autre période du même chantier (dans n'importe quel lot) : lien
  fin → début.
- **Contrainte :** une période liée commence au plus tôt la semaine qui suit la dernière semaine de
  celle dont elle dépend.
- **Repousser :** après tout changement de début ou de durée d'une période, chaque période qui en
  dépend et ne respecte plus la contrainte est avancée à la première semaine permise, et ainsi de suite
  en chaîne (dans tous les lots). Une suite qui respecte déjà la contrainte ne bouge pas : avancer une
  période **ne ramène pas** ses suites (comme la maquette).
- **Recalage (différence avec la maquette) :** une période liée qu'on place avant la fin de celle dont
  elle dépend est recalée sur la première semaine permise. Dans la maquette, elle passait devant et le
  lien affiché devenait faux.
- **Déplacement de groupe :** toutes les périodes sélectionnées bougent du même nombre de semaines,
  puis le recalage et la cascade s'appliquent à l'ensemble ; le résultat ne dépend pas de l'ordre de la
  sélection.
- **Boucles interdites :** on ne peut lier A à B si B dépend déjà, directement ou non, de A. Le
  sélecteur de dépendance du panneau ne propose ni la période elle-même ni ses suites.
- **Supprimer** une période détache celles qui en dépendaient ; elles restent à leur place.
- Le résultat d'une opération indique combien de périodes **autres que celles visées** ont été
  décalées, pour le message (« 3 périodes décalées à la suite. »).
- Une opération dont le résultat placerait une période au-delà de la dernière semaine de 2100 est
  refusée en entier.

### Fermetures

- Une fermeture vaut pour tout le chantier : une bande sur toute la hauteur du planning, à l'écran et
  à l'impression.
- Elle ne repousse ni ne raccourcit aucune période.

### Étendue de l'axe

- De la première à la dernière semaine couverte par les périodes **et** les fermetures, élargie pour
  ne jamais couper un mois : on recule jusqu'à la première semaine dont le lundi est dans le même mois,
  on avance jusqu'à la dernière (règle `etendue` de la maquette).
- Sans période ni fermeture : 52 semaines à partir de la semaine de la date de signature prévue du
  chantier, ou de la semaine en cours si elle est vide, élargies de même.

### Vraie période des travaux

- De la première semaine de la première période à la dernière semaine de la dernière période ; les
  fermetures ne comptent pas. Nulle s'il n'y a aucune période.
- C'est elle, et non l'étendue de l'axe, que porte la phrase du visa (différence avec la maquette,
  dont la phrase reprenait l'axe élargi aux mois et comptait les fermetures).

### Couleurs

- Palette de l'annexe A. Un lot créé depuis les lots de base garde la couleur de l'annexe A du Socle ;
  un lot ajouté à la main garde le défaut `noir` jusqu'à ce qu'on la change.

## 6. Écran Planning

Nouvel onglet **Planning** du chantier, entre Marchés et Documents, avec le même bandeau de contexte.
Tout le monde peut modifier, comme le reste de l'application ; un chantier terminé reste modifiable,
comme au Socle.

### Barre d'outils

- À gauche : résumé (« 13 lots · 24 périodes ») et état de la sélection (« 3 périodes sélectionnées —
  ← → pour décaler, Maj = 4 semaines, Suppr, Échap »), annoncé aux lecteurs d'écran.
- À droite :
  - menu **Lots affichés** (cases à cocher, « Tout afficher ») ;
  - outils **Main** (faire glisser la vue) et **Cible** (tracer) ;
  - bouton **Aujourd'hui** ;
  - densité **Compacte / Normale / Large** (32, 46 et 68 px par semaine) ;
  - boutons **Fermetures**, **Feuille de visa**, **Planning imprimable**.
- Outil, densité et lots masqués sont des préférences de la personne : gardées dans le `localStorage`
  du navigateur (par chantier pour les lots masqués), lues avec `try/catch`, l'écran fonctionnant sans.
  Par défaut : outil Cible, densité Normale, tous les lots affichés.

### Grille

- En-tête collé en haut : ligne des mois, ligne des numéros de semaine ; la semaine en cours est
  signalée sur toute la hauteur.
- Colonne des lots collée à gauche : pastille de couleur, désignation, entreprise dessous (ou « — »).
  Un clic sur le lot ouvre son panneau.
- Une ligne **Fermetures** en tête de la grille et des bandes hachurées sur toute la hauteur.
- Une ligne par lot affiché, dans l'ordre du chantier, avec ses barres (couleur du lot, intitulé).
- Flèches de dépendance fin → début en SVG au-dessus des pistes, entre lots compris ; une flèche vers
  ou depuis un lot masqué n'est pas dessinée.
- À l'ouverture, la vue se cadre sur la semaine en cours si elle tombe dans l'étendue, sinon sur la
  première période.

### Gestes (parité avec la maquette)

| Geste | Outil | Effet |
|---|---|---|
| Glisser dans le vide d'une piste | Cible | Trace une nouvelle période sur ce lot (durée = semaines couvertes) |
| Glisser une barre | Cible | La déplace (et tout le groupe si elle fait partie d'une sélection multiple) |
| Glisser le bord droit d'une barre (8 px) | Cible | L'allonge ou la raccourcit (1 semaine minimum) |
| Clic sur une barre | Tous | La sélectionne seule et ouvre le panneau de son lot |
| Maj, Ctrl ou Cmd + clic sur une barre | Tous | L'ajoute à la sélection ou l'en retire |
| Maj + glisser dans le vide | Cible | Cadre de sélection : sélectionne les barres touchées |
| Glisser n'importe où | Main | Fait défiler la vue ; un clic net sur une barre la sélectionne |
| ← / → | — | Décale la sélection d'une semaine (Maj : 4 semaines) |
| Suppr / Retour arrière | — | Supprime la sélection (une période : directement ; plusieurs : après confirmation) |
| Échap | — | Ferme le panneau ou l'aperçu ouvert, sinon vide une sélection multiple |

- Pendant un glisser, une pastille près du curseur donne la semaine visée et la durée
  (« S18 2026 · 3 sem. »), et les suites se décalent à l'écran en direct.
- Les raccourcis clavier ne réagissent pas quand le focus est dans un champ, un menu, ou qu'une
  fenêtre (aperçu, confirmation) est ouverte.
- Un geste qui ne change rien (clic sans mouvement, retour au point de départ) n'envoie rien.
- Les gestes utilisent les Pointer Events avec capture du pointeur ; l'écran est pensé pour la souris.
  Sur écran tactile, on consulte, on fait défiler et on utilise le panneau, sans gestes de tracé.

### Panneau du lot

- Couleur : les 9 pastilles de la palette.
- Liste des périodes du lot : intitulé, semaine, année, durée, « commence après » (sélecteur groupé
  par lot, avec « — rien, date libre — »), bouton de suppression. Les champs s'enregistrent au blur
  (`ChampEnLigne`), le sélecteur au changement.
- Bouton **Ajouter** : une période d'une semaine qui commence après la dernière période du lot, ou au
  début de l'étendue si le lot n'en a pas.

### Fenêtre Fermetures

- Tableau libellé / semaine / année / durée, enregistrement au blur, suppression ; bouton **Ajouter**
  (« Congés », 2 semaines, à la semaine en cours). Note : « Les congés et fermetures barrent toute la
  hauteur du planning : ils valent pour tous les lots. »

### Enregistrement

Chaque geste terminé ou champ quitté appelle une Server Action qui porte une **intention** :

| Action | Entrée |
|---|---|
| `creerPeriode` | `lotId`, `debut`, `duree`, `intitule?` |
| `deplacerPeriodes` | `chantierId`, `[{ id, debut }]` (déplacement seul, en groupe, flèches) |
| `modifierPeriode` | `id`, un champ parmi `intitule`, `debut`, `duree` |
| `lierPeriode` | `id`, `dependDeId` ou `null` |
| `supprimerPeriodes` | `chantierId`, `ids` |
| `enregistrerFermeture` | `chantierId`, `id?`, `libelle`, `debut`, `duree` |
| `supprimerFermeture` | `id` |
| `changerCouleurLot` | `lotId`, `couleur` |

Côté serveur, `donnees/planning.ts`, dans une transaction :

1. verrouille la ligne du chantier (`SELECT 1 FROM "Chantier" WHERE id = … FOR UPDATE`, comme
   `ajouterLot` au Socle) ;
2. relit tout le planning du chantier (lots, périodes, fermetures) ;
3. vérifie que chaque période, lot ou fermeture visé appartient à ce chantier ;
4. applique l'opération de `domaine/planning.ts` (recalage, cascade, contrôle des boucles) ;
5. écrit seulement les lignes qui ont changé ;
6. renvoie `Resultat<{ planning: PlanningVue; message?: string }>` avec le planning complet à jour.

Côté navigateur :

- pendant le geste, l'écran montre le résultat calculé localement par la même règle ;
- à la réponse, l'état est remplacé par le planning renvoyé (ce qui fait aussi apparaître les
  changements des collègues), et le message éventuel s'affiche ;
- en cas d'échec, l'état revient au dernier planning renvoyé par le serveur et l'erreur s'affiche ;
- les actions d'un même navigateur partent une par une (Next.js) : deux gestes rapides arrivent dans
  l'ordre.

La page revalide aussi `/chantiers/[id]/documents` pour l'état « modifié » du planning.

## 7. Documents

### Planning prévisionnel (`PLANNING`, série `PLANNING`)

**Parcours :** « Planning imprimable » ouvre l'aperçu plein écran de la feuille construite à partir
des données actuelles, puis **Générer le PDF** crée une version. Condition : au moins une période
(« Aucune période : rien à imprimer. »).

**Contenu** (schéma Zod dans `documents/schemas.ts`) :

```
{
  entete: { coordination, maitreOuvrage, projet, adresseChantier },
  axe: {
    premierLundi: 'AAAA-MM-JJ',
    semaines: [{ numero, annee }],            // une par colonne
    mois: [{ libelle: 'avr.-26', nbSemaines }]
  },
  fermetures: [{ colonne, duree }],           // rognées à l'axe
  lignes: [{                                  // tous les lots, ordre du chantier
    entreprise: 'NOM' | '—', lot: 'désignation',
    couleur: 'cle',
    barres: [{ colonne, duree, intitule }]
  }],
  periodeTravaux: { debut: { semaine, annee }, fin: { semaine, annee } }
}
```

- `coordination` = nom du chargé d'affaire ; `projet` = nature des travaux ; `adresseChantier` =
  adresse, CP et commune joints par « – » ; « — » pour une valeur vide.
- Les lots sans période ont leur ligne (vide), comme dans la maquette.
- La couleur est stockée par sa clé ; le gabarit lit la palette (annexe A).

**Cadre** (hors empreinte, comme au Socle) : en-tête SOCOREVE des Paramètres et date de génération.
Le titre imprimé est « PLANNING PRÉVISIONNEL en date du 29.09.2026 » (format de la maquette). Si rien
n'a changé depuis la dernière version, on retrouve cette version avec sa date d'origine.

**Mise en page** (reprise de `buildPagePlanning` et des styles `.sheet-doc`, `.doc-entete`,
`table.d-gantt`, `.d-bar` de la maquette) : colonnes ENTREPRISES et LOTS, puis la piste qui occupe
toute la largeur restante ; barres et fermetures positionnées en pourcentage de la piste ; note de bas
de page (annexe C). Pas de colonne Téléphone.

**Une seule feuille, toujours.** `htmlVersPdf` reçoit l'option `uneSeuleFeuille` ; après
`setContent`, et avant `page.pdf`, du code de l'application (pas du gabarit) s'exécute dans la page
par `page.evaluate` :

1. il mesure la largeur de la piste, calcule `pas = max(1, ceil(13 px / largeur d'une semaine))`
   (fonction pure de `domaine/planning.ts`) et masque les numéros de semaine dont le rang n'est pas
   un multiple de `pas` ; la grille garde toutes ses colonnes ;
2. il mesure la hauteur de la feuille et, si elle dépasse la zone imprimable A4 paysage, `page.pdf`
   reçoit `scale = zone imprimable / hauteur` (minimum 0,4 ; au-delà, génération refusée avec
   « Trop de lots pour une seule feuille. »).

Ces réglages ne font pas partie du contenu : l'empreinte ne change pas.

**Fichier :** `<REF>-Planning-v<N>.pdf` (règles de nom du Socle).

### Feuille de visa (`VISA_PLANNING`, série `VISA`)

**Source :** le JSON de la **dernière version générée du planning**, jamais les données actuelles :
le visa liste exactement ce que ce planning montrait.

**Contenu :**

```
{
  entete: { … },                                   // repris du planning source
  planning: { version, date: 'JJ.MM.AAAA' },       // version et date de génération de la source
  periodeTravaux: { debut, fin },                  // repris du planning source
  lignes: [{ entreprise, lot }]                    // repris du planning source, même ordre
}
```

- Phrase : « Planning prévisionnel des travaux sur la période de la Semaine 15 de 2026 à la Semaine 8
  de 2027 (version 3 du 12.05.2026) ».
- Tableau : Liste des entreprises / Lots / Signature / Date, une ligne par lot ; note de bas de page
  (annexe C). A4 paysage comme dans la maquette (`.sheet-doc`), une page ; au-delà de la page, la génération est refusée (« Trop de lots pour
  une seule feuille. ») — improbable avec moins de 40 lots.
- `Document.sourceId` = la version du planning. Le numéro de version fait partie du contenu : un
  nouveau planning appelle un nouveau visa.

**Aperçu :**

- aucune version du planning : l'aperçu l'explique et propose **Générer le planning d'abord** ;
- planning « modifié » depuis sa dernière version : bandeau « Le planning a changé depuis la v3 : ce
  visa portera sur la v3. » avec **Générer le planning d'abord** et **Générer le visa sur la v3** ;
- sinon : **Générer le PDF**.

**Fichier :** `<REF>-VisaPlanning-v<N>.pdf`.

### Génération

Même chaîne qu'au Socle (`documents/generer.ts`) : construire l'objet une fois → empreinte → PDF hors
transaction → relecture pour vérifier que les données n'ont pas changé pendant le rendu (pour le visa :
que la dernière version du planning est toujours la même) → insertion sous verrou de la série.
Un seul créneau Chromium par génération, mesures comprises.

### États et page Documents

- **Planning** : « à produire » (aucune version), « à jour » (empreinte actuelle = dernière version),
  « modifié » (sinon), comme le récapitulatif.
- **Visa** : « à produire », « à jour » (sa source est la dernière version du planning), « périmé »
  (« sur le planning v2 — v3 disponible »).
- La page Documents ajoute deux cartes « chantier entier », **Planning** et **Visa du planning**, à
  côté du Récapitulatif, avec la dernière version (lecture seule) et l'historique.

## 8. Gestion des erreurs

Mécanique du Socle : `ErreurMetier` → `Resultat` en échec → message à l'écran ; toute autre erreur est
journalisée sans données et affichée comme erreur générique.

| Cas | Message |
|---|---|
| Durée hors 1-104, année hors 2000-2100, intitulé > 120 caractères | message Zod explicite par champ (`refine`) |
| Début qui n'est pas un lundi | recalé sur le lundi de sa semaine ISO (pas d'erreur) |
| Lien qui ferait une boucle | « Ce lien créerait une boucle : <intitulé> dépend déjà de cette période. » |
| Cascade au-delà de 2100 | « Ce déplacement pousserait des périodes au-delà de 2100. » |
| Période, lot ou fermeture supprimé entre-temps | « Cette période n'existe plus. » (ou lot, fermeture) + planning à jour renvoyé |
| Élément d'un autre chantier | refus (« Élément introuvable. ») |
| Couleur hors palette | « Couleur inconnue. » |
| Planning sans période | « Aucune période : rien à imprimer. » |
| Données changées pendant le rendu | message du Socle (« Les données ont changé pendant la génération… ») |
| Feuille impossible à faire tenir | « Trop de lots pour une seule feuille. » |

## 9. Tests

- **Vitest, domaine :**
  - semaines ISO : lundi d'une semaine, semaine d'une date, années à 53 semaines (2026, 2032),
    passage d'année (semaine 52/53 → semaine 1), mois d'une semaine ;
  - cascade : chaîne, branches, suites dans d'autres lots, suite déjà conforme qui ne bouge pas,
    avancer sans ramener, recalage d'une période liée placée trop tôt, déplacement de groupe
    indépendant de l'ordre, compte des périodes décalées, refus au-delà de 2100 ;
  - boucles : lien direct et indirect refusés ; options de dépendance sans la période ni ses suites ;
  - suppression qui détache ;
  - étendue élargie aux mois, cas sans période (date de signature, puis semaine en cours) ;
  - vraie période des travaux (fermetures exclues) ; colonnes et mois ; calcul de `pas`.
- **Vitest, documents :**
  - objets planning et visa construits depuis la fixture PERRIER **égaux à une référence
    enregistrée** ; schémas Zod respectés ;
  - empreinte indépendante de la date et des Paramètres ;
  - intitulé contenant du HTML échappé ;
  - PDF du planning d'**une page** pour PERRIER et pour un cas extrême (30 lots, 104 semaines, noms
    d'entreprise de 40 caractères) ; PDF du visa d'une page ;
  - textes de l'annexe C présents.
- **Intégration (vraie base) :**
  - deux `deplacerPeriodes` simultanés sur des périodes différentes : les deux sont conservés ;
  - la cascade est enregistrée, y compris entre lots ;
  - boucle refusée sans écriture ; période supprimée qui détache ses suites ; lot supprimé qui emporte
    ses périodes et détache les liens venant d'autres lots ;
  - élément d'un autre chantier refusé ;
  - migration : les documents existants reçoivent la bonne `serie`, les séries marché, récapitulatif,
    planning et visa coexistent ;
  - visa rattaché à sa version du planning, puis « périmé » après une nouvelle version ;
  - génération du planning abandonnée si une période change pendant le rendu.
- **Playwright E2E :**
  1. ouvrir le Planning de PERRIER ;
  2. tracer une période avec l'outil Cible ;
  3. déplacer « Fondations et soubassements » d'une semaine plus tard et voir « Élévation RDC »
     repoussée ;
  4. sélectionner deux périodes (Maj + clic) et les décaler avec → ;
  5. ajouter une fermeture ;
  6. changer la couleur d'un lot ;
  7. générer le planning puis le visa ;
  8. modifier une période : planning « modifié », visa « périmé » dans Documents.

## 10. Hors périmètre

- Annulation (Ctrl+Z) et historique des modifications du planning.
- Liens autres que fin → début, décalages (lag) sur les liens, précision au jour.
- Fermetures qui repoussent ou allongent les périodes.
- Mise à jour en temps réel entre collègues.
- Export du planning en tableur ; planning sur plusieurs feuilles.
- Gestes tactiles de tracé et de déplacement.

## Annexe A — Palette

Reprise de `COULEURS` de la maquette (couleurs du .ods d'origine) :

| Clé | Nom | Fond | Texte |
|---|---|---|---|
| noir | Noir | #2f3438 | #ffffff |
| orange | Orange | #d1741a | #ffffff |
| vert-clair | Vert clair | #7cae3f | #17210d |
| bleu-fonce | Bleu foncé | #1f4e79 | #ffffff |
| vert-fonce | Vert foncé | #2e6b4f | #ffffff |
| jaune | Jaune | #dcb320 | #211a00 |
| rouge | Rouge | #b8302c | #ffffff |
| violet | Violet | #7a4092 | #ffffff |
| bleu-clair | Bleu clair | #4a9ac9 | #0a1b24 |

## Annexe B — Planning de démonstration (fixture PERRIER)

Repris de `PLAN_DEMO`, `CHAINE_DEMO` et `appliquePlanDemo` de la maquette (lignes 3028-3070) ; pour
le développement et les tests uniquement, jamais en production.

- Fermetures : « Congés d'été », semaine 31 de 2026, 2 semaines ; « Congés de Noël », semaine 52 de
  2026, 2 semaines.
- Périodes (intitulé, semaine, année, durée), par lot :

| Lot | Couleur | Périodes |
|---|---|---|
| TERRASSEMENT — V.R.D. | noir | Accès et plateforme S15-2026 1 ; Terrassements finaux S42-2026 2 |
| GROS ŒUVRE | noir | Fondations et soubassements S16-2026 3 ; Élévation RDC S20-2026 4 ; Plancher intermédiaire S25-2026 2 ; Élévation étage S28-2026 3 ; Appuis et seuils S38-2026 1 |
| CHARPENTE | vert-clair | Montage charpente S33-2026 2 |
| COUVERTURE | bleu-fonce | Couverture et gouttières S36-2026 2 |
| MENUISERIES EXTÉRIEURES | vert-fonce | Pose des menuiseries S38-2026 2 ; Réglages de fin de chantier S8-2027 1 |
| ENDUIT EXTÉRIEUR | orange | Dégrossi des façades S41-2026 2 |
| PLÂTRERIE — ISOLATION | jaune | Isolation périphérique S43-2026 2 ; Plafonds et cloisons S46-2026 3 |
| PLOMBERIE — CHAUFFAGE — V.M.C. | rouge | Réseaux avant doublage S40-2026 1 ; Pose des appareils S48-2026 2 |
| ÉLECTRICITÉ | rouge | Passage des réseaux S40-2026 1 ; Appareillage S49-2026 2 |
| CARRELAGE — FAÏENCE | violet | Chape S50-2026 1 ; Carrelage et faïence S2-2027 3 |
| ESCALIER | vert-fonce | Fourniture et pose S3-2027 1 |
| MENUISERIES INTÉRIEURES | vert-fonce | Pose des portes S5-2027 2 |
| PEINTURE | bleu-clair | Peintures S7-2027 3 |

- Chaîne de dépendances (chaque période commence après la précédente) : Accès et plateforme →
  Fondations et soubassements → Élévation RDC → Plancher intermédiaire → Élévation étage → Montage
  charpente → Couverture et gouttières → Pose des menuiseries → Isolation périphérique → Plafonds et
  cloisons → Chape → Carrelage et faïence → Pose des portes → Peintures. Les dates respectent déjà la
  chaîne : rien ne bouge au chargement (vérifié par un test).

## Annexe C — Textes imprimés

- En-tête commun : bloc SOCOREVE (Paramètres) à gauche ; à droite « Coordination : », « Maître
  d'ouvrage : », « Projet : », « Adresse du chantier : ».
- Planning, titre : « PLANNING PRÉVISIONNEL en date du JJ.MM.AAAA » ; colonnes « ENTREPRISES »,
  « LOTS ».
- Planning, note : « Les entreprises sont tenues d'évacuer leurs déchets après chaque intervention.
  Tout retard non signalé engage la responsabilité de l'entreprise dans les conditions prévues au
  marché. »
- Visa, titre : « VISA DU PLANNING » ; colonnes « Liste des entreprises », « Lots », « Signature »,
  « Date ».
- Visa, note : « Par sa signature, l'entreprise reconnaît avoir pris connaissance du planning
  prévisionnel et s'engage sur les périodes qui la concernent. »
