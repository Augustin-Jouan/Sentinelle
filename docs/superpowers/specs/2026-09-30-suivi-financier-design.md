# Sentinelle Marchés — Sous-projet 3 : Suivi financier

Date : 2026-09-30 · Statut : design validé, spec relue et corrigée après audit

Référence visuelle et fonctionnelle : `docs/maquette/sentinelle-marches.html` (notes en tête, § 5 et
§ 6 ; montant engagé lignes 3296-3302 et 4180-4200 ; avenants du panneau du lot lignes 4216-4260 et
4350-4400 ; lettre d'avenant lignes 1272-1279 et 6390-6440 ; certificat de paiement : styles lignes
1884-1917, modèle, calcul et feuille lignes 6894-7200, logo `LOGO_SOCOREVE` ligne 6520 ; page Documents
lignes 4600-4810).

Ce document prolonge la spec du Socle (`2026-09-29-socle-design.md`) et celle du Planning
(`2026-09-29-planning-design.md`), dont il reprend l'architecture et les conventions : `Resultat<T>`,
`ErreurMetier`, `ChampEnLigne`, chaîne objet JSON → gabarit React sans hook → Playwright, empreinte
`{ type, contenu }`, versions figées, séries de documents par `Document.serie` (Planning, § 4),
versions épinglées, jamais `prisma migrate reset` ni `prisma migrate dev`.

## 1. Contexte et objectif

Après la signature des marchés, le chargé d'affaire suit l'argent du chantier :

- les **avenants** : un devis complémentaire signé change le montant d'un lot, en plus-value ou en
  moins-value ; une lettre « AVENANT N° 02 » le fait signer au maître d'ouvrage ;
- les **certificats de paiement** : chaque mois, pour chaque entreprise, un certificat dit combien
  le maître d'ouvrage doit verser, à partir du cumul des travaux réalisés, des acomptes déjà versés
  et de la retenue de garantie (ou de la caution bancaire qui la remplace).

La maquette a validé les deux documents, le calcul du certificat (vérifié sur un vrai certificat
SOCOREVE) et la page Documents « piste B » (un tableau par entreprise : Marché / Avenants /
Certificats / Réception). Ce sous-projet en fait de vraies données partagées et des PDF figés.

### Critères de réussite

- Un avenant saisi dans le panneau du lot change aussitôt le montant engagé partout (tableau des
  marchés, total du chantier, récapitulatif PDF et tableur) ; le marché imprimé garde son montant
  initial.
- La lettre d'avenant se génère, se versionne et se retrouve comme un marché.
- Un certificat se fait en saisissant seulement le cumul réalisé, le mois et la date ; ses montants
  sont exacts au centime ; il se retrouve tel qu'il a été émis.
- Un chantier déjà en cours peut être repris : ses acomptes antérieurs se saisissent à la main et le
  premier certificat de l'application prend le bon numéro.
- On sait toujours quels papiers ont été émis : aucun numéro d'avenant n'est réutilisé, aucun PDF
  généré ne disparaît.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Stockage | Tables métier `Avenant` et `Acompte` ; PDF par la chaîne `Document` + `serie` du Socle et du Planning |
| Montant engagé | HT initial + somme des avenants, dès la saisie de l'avenant (pas de brouillon d'avenant) |
| Numéro d'avenant | Fixé à la création par un compteur du lot, **jamais réutilisé** ; suppression libre, les trous restent |
| Avenant supprimé | Ses lettres déjà générées restent consultables (« avenant supprimé ») |
| Acomptes antérieurs | Saisis à la main tant que le lot n'a aucun certificat, figés ensuite |
| Correction d'un certificat | Seul le dernier certificat d'un lot se corrige : même numéro, nouvelle version ; les précédents sont figés |
| Brouillon du certificat | Aucun : les trois saisies vivent dans l'aperçu ouvert |
| Caution bancaire | Oui/non propre au lot, basculée sur la feuille, gardée pour les certificats suivants |
| Arrondis | `Decimal`, au centime, **à chaque ligne**, demi-centime arrondi au-dessus (`ROUND_HALF_UP`, comme `arrondiCentime` du Socle) |
| Formats | Lettre d'avenant et certificat en A4 **portrait** (`htmlVersPdf(html, { paysage: false })`), une page, marges de 10 mm du Socle |
| Coordonnées SOCOREVE du certificat | Paramètres du Socle, complétés de RCS, APE, TVA intracommunautaire ; logo repris de la maquette |
| Verrou | Toute écriture d'avenant ou d'acompte d'un lot (création, modification, suppression, correction, caution) se fait sous `SELECT … FOR UPDATE` sur la ligne du lot, avec relecture sous verrou |
| Versions | Règle du Socle : pas de nouvelle version si l'empreinte n'a pas changé (« Rien n'a changé depuis la version N ») |

## 3. Architecture

```
src/
  domaine/
    avenants.ts       montant engagé avec avenants, montants de la lettre (règles pures)
    certificats.ts    calcul du certificat, numérotation, contrôles (règles pures)
  donnees/
    avenants.ts       lecture et écritures des avenants (compteur atomique du lot)
    acomptes.ts       acomptes manuels, caution, génération et correction sous verrou du lot
  actions/
    avenants.ts, certificats.ts     Server Actions
  documents/
    batir.ts          + batirAvenant, batirCertificat ; récapitulatif au montant engagé
    gabarits/         LettreAvenant.tsx, CertificatPaiement.tsx
    series.ts         + serieAvenant(id), serieCertificat(acompteId)
  composants/
    PanneauLot.tsx    + bloc Avenants, boutons Certificat
    ApercuCertificat.tsx   aperçu plein écran du certificat (saisies, calcul à la frappe)
    TableauDocuments.tsx   + colonnes Avenants et Certificats
    logo-socoreve.jpg repris de LOGO_SOCOREVE (maquette), inséré en data URI dans le HTML imprimé
```

Les règles de calcul n'existent qu'une fois, dans `src/domaine/` : l'aperçu les appelle à la frappe,
le serveur les rappelle à la génération. Le serveur ne fait jamais confiance aux montants envoyés
par l'écran : il ne reçoit que les saisies (cumul, mois, date) et recalcule tout.

## 4. Modèle de données

### Nouvelles tables

```prisma
model Avenant {
  id        String   @id @default(cuid())
  lotId     String
  lot       Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  numero    Int      // fixé à la création, jamais réutilisé
  devis     String   @default("")
  montantHt Decimal  @default(0) @db.Decimal(18, 2)   // signé : < 0 = moins-value
  date      DateTime @db.Date
  objet     String   @default("")
  creeLe    DateTime @default(now())

  @@unique([lotId, numero])
}

model Acompte {
  id             String    @id @default(cuid())
  lotId          String
  lot            Lot       @relation(fields: [lotId], references: [id], onDelete: Cascade)
  numero         Int
  montantHt      Decimal   @db.Decimal(18, 2)   // présent acompte HT (ou montant saisi pour un manuel)
  manuel         Boolean   @default(false)      // acompte antérieur à l'application, sans document
  cumulRealiseHt Decimal?  @db.Decimal(18, 2)   // certificat seulement
  mois           String?                        // 'AAAA-MM', certificat seulement
  date           DateTime? @db.Date             // « Fait le », certificat seulement
  creeLe         DateTime  @default(now())

  @@unique([lotId, numero])
}
```

Contraintes `CHECK` écrites à la main dans la migration : `numero >= 1` ; `montantHt > 0` pour tout
acompte ; pour un acompte non manuel, `cumulRealiseHt`, `mois` et `date` non nuls ; `mois` conforme à
`^(20[0-9]{2})-(0[1-9]|1[0-2])$`. Zod applique la même expression avant l'écriture.

### Modifications du Socle

- `Lot.dernierNumeroAvenant Int @default(0)` : compteur des avenants, incrémenté atomiquement
  (`UPDATE … SET dernierNumeroAvenant = dernierNumeroAvenant + 1 RETURNING`).
- `Lot.cautionBancaire Boolean @default(false)`.
- `Lot.avenants Avenant[]`, `Lot.acomptes Acompte[]`.
- `enum TypeDocument` + `AVENANT`, `CERTIFICAT_PAIEMENT` ; `LIBELLES_TYPES` (« Avenant »,
  « Certificat de paiement ») et `TITRES_TYPES` (« Avenant », « Certificat de paiement »).
- Séries : `AVENANT:<avenantId>` et `CERTIFICAT:<acompteId>` ; `Document.lotId` = le lot. Pas de clé
  étrangère vers l'avenant : ses documents lui survivent.
- **Un marché généré, c'est un document dont la `serie` est l'id du lot.** Avenants et certificats
  portent aussi `lotId` : `genererMarchesManquants` (qui compte aujourd'hui tout document ayant un
  `lotId`) et l'état du marché dans `etatsDocumentsChantier` filtrent sur `serie = lotId`, sinon un lot
  dont seul un avenant a été imprimé ne sortirait plus dans « générer les marchés manquants ».
- `Parametres` + `rcs`, `ape`, `tvaIntracommunautaire` (texte, modifiables par l'admin dans la page
  Paramètres), valeurs par défaut `328999503`, `4120A`, `FR47328999503`. La maquette imprimait
  `FR4732899950300027`, qui a cinq chiffres de trop : le numéro de TVA intracommunautaire français est
  « FR » + clé (47, calculée sur le SIREN) + SIREN, 13 caractères. À relire sur le KBIS avant la mise
  en service.
- `Parametres.email` passe à `contact@socoreve-chateaubriant.com` (valeur par défaut, et migration de
  la ligne existante si elle vaut encore l'ancienne valeur par défaut en `.fr`) : c'est l'adresse du
  certificat SOCOREVE.
- Supprimer un lot reste soumis à la règle du Socle sur ses documents ; ses avenants et acomptes
  partent avec lui (`Cascade`).

## 5. Avenants

### Règles

- **Montant engagé HT** = HT initial + somme des `montantHt` des avenants du lot ; **TTC engagé** =
  engagé HT × (1 + TVA). Les fonctions du Socle `htEngage`, `ttcEngage`, `htDepuisTtc` reçoivent
  enfin la somme des avenants (elles valaient 0 au Socle).
- Le montant engagé remplace l'initial dans : le tableau des marchés (colonne TTC), le panneau du lot,
  le total du chantier dans la liste des chantiers, le récapitulatif PDF et le tableur, et le « Total
  HT » du certificat. Le **marché imprimé** garde le montant initial (son empreinte ne change pas avec
  un avenant).
- **Saisie d'un TTC** (tableau ou panneau) : HT initial = TTC / (1 + TVA) − avenants. Résultat
  négatif : « Ce TTC est inférieur aux seuls avenants. », rien n'est écrit.
- **Avenant ou TTC, deux effets distincts sur le marché** : ajouter, modifier ou supprimer un avenant ne
  touche pas au HT initial, donc le marché reste « à jour » ; saisir un TTC réécrit le HT initial (le
  montant signé), donc le marché passe « modifié », comme au Socle.
- **Montant d'un avenant** : lu avec `lireNombreFr` (signe accepté), contrôlé sous le verrou du lot
  (deux moins-values simultanées ne peuvent pas rendre le lot négatif) ; illisible : « Montant :
  saisissez un nombre. » ; s'il rend le montant engagé HT négatif : « Cette moins-value rendrait le
  montant du lot négatif. » ; rien n'est écrit. Un montant nul est permis (ligne tout juste ajoutée).
- **Ajout** : numéro = `dernierNumeroAvenant + 1`, date du jour (Châteaubriant), montant 0, message
  « Avenant n° 03 ajouté — saisissez son montant. ».
- **Suppression** : libre, après confirmation « Supprimer l'avenant n° 02 ? Le montant du lot revient
  à 13 450,00 € HT. » (annexe A) Le numéro n'est jamais réattribué ; les lettres déjà générées restent.
- Un chantier terminé reste modifiable, comme au Socle.

### Saisie

Bloc **Avenants** du panneau du lot (maquette lignes 4376-4400) : tableau N° / Devis / Montant HT /
Date, chaque champ enregistré au blur (`ChampEnLigne`), boutons **Ouvrir** (la lettre) et
**Supprimer** ; bouton **Ajouter** ; note « Un montant négatif est une moins-value. Le marché imprimé
garde son montant d'origine ; c'est l'avenant qui porte la différence. » ; sans avenant : « Aucun
avenant. Le marché vaut son montant d'origine. ». Quand le lot a des avenants, le bloc Marché affiche
« Montant initial HT », la somme des avenants (« + 850,00 € » ou « − 300,00 € ») et « Montant actuel
TTC — avenants compris : le montant initial HT est recalculé ».

L'**objet** de l'avenant s'écrit sur la lettre, dans une zone bleue (mécanique des zones du Socle),
enregistrée au blur.

### Lettre « AVENANT N° 02 » (`AVENANT`, série `AVENANT:<id>`)

Fac-similé de « 4- AVENANT.doc » (maquette `buildDocAvenant`), A4 portrait. Contenu (schéma Zod) :

```
{
  entete: { coordination, maitreOuvrage, projet, adresseChantier },   // même bloc que le planning
  lieuDate: 'Châteaubriant, le 12 mai 2026',                            // date de l'avenant
  numero: '02',
  entreprise, lot,                                                      // désignation du lot
  sens: 'plus-value' | 'moins-value',
  objet,
  montants: {                                                           // textes formatés, en TTC
    marcheInitial,        // (HT initial + avenants de numéro inférieur encore présents) × (1 + TVA)
    devis: { numero, montant },   // |montant HT| × (1 + TVA)
    difference,           // idem devis
    nouveauMontant        // (HT initial + avenants de numéro ≤ celui-ci) × (1 + TVA)
  }
}
```

Chaque montant TTC est arrondi au centime séparément (le nouveau montant n'est pas la somme des
lignes arrondies, comme dans la maquette). Textes : « aux marchés travaux de l'entreprise X »,
« Réf/adresse chantier : … », « Travaux en plus-value, concernant le lot : … », « Montant du marché
initial : », « Montant du devis complémentaire n° … : », « Soit une plus-value de : », « Nouveau
montant du marché : », signatures « Le Maître de l'Ouvrage (signature précédée de la mention « Bon pour
accord ») » et « Le Maître d'Œuvre (cachet & signature) ».

**Condition de génération** : entreprise attribuée et montant non nul (manque « montant de
l'avenant », affiché comme les manques des marchés). **État** : « à produire », « à jour »,
« modifié » (empreinte actuelle ≠ dernière version : l'avenant, le lot ou un avenant antérieur a
changé). **Fichier** : `<REF>-Lot02-GROS-OEUVRE-Avenant02-v1.pdf` (`ST` au lieu de `Lot02` en
sous-traitance, comme les marchés).

## 6. Certificats de paiement

### Numérotation et acomptes antérieurs

- Les acomptes d'un lot sont numérotés 1, 2, 3… sans trou. Numéro du nouveau certificat = nombre
  d'acomptes du lot + 1.
- **Acomptes antérieurs** (`manuel`) : pour reprendre un chantier en cours. On les saisit (montant HT)
  dans le tableau « Acomptes précédents » de la feuille **tant que le lot n'a aucun certificat** :
  ajout (numéro suivant), modification, suppression (les suivants sont renumérotés). Chacune de ces
  écritures prend le verrou du lot, relit ses acomptes et vérifie sous verrou qu'aucun certificat
  n'existe ; la renumérotation se fait dans la même transaction. Dès qu'un certificat existe : « Des
  certificats existent : les acomptes antérieurs ne se modifient plus. »
- Un acompte manuel n'a pas de document ; il n'apparaît que comme acompte précédent et dans la
  colonne Certificats (« n° 01 · hors appli »).

### Saisies et calcul

Se saisissent sur la feuille : le **cumul des travaux réalisés HT**, le **mois** de l'acompte (mois
courant par défaut) et la date « **Fait à Châteaubriant le** » (jour courant par défaut), plus la
**caution bancaire** OUI/NON, enregistrée aussitôt sur le lot. Tout le reste vient du lot.

Calcul (`src/domaine/certificats.ts`), `r()` = arrondi au centime `ROUND_HALF_UP`, taux en % :

| Ligne | Formule |
|---|---|
| Montant du marché HT | HT initial (arrondi) |
| Avenant n HT | chacun, arrondi |
| Total HT | r(HT initial + Σ avenants) |
| TVA | r(Total HT × TVA) |
| Total TTC | Total HT + TVA |
| Acomptes précédents : Total HT | Σ acomptes précédents |
| … TVA | r(précédents HT × TVA) |
| … Total TTC | précédents HT + TVA |
| Montant du présent acompte HT | r(cumul − précédents HT) |
| Montant de la TVA | r(présent HT × TVA) |
| Montant du présent acompte TTC | présent HT + TVA |
| Dont retenue de garantie | 0 avec caution, sinon r(présent TTC × taux de retenue) |
| Montant total mandaté | présent TTC − retenue |

La maquette calculait en nombres flottants : un demi-centime exact (65,125 €) y tombait parfois en
dessous. L'application arrondit toujours au-dessus, comme `arrondiCentime` du Socle.

**Contrôles** : cumul vide → « Saisissez le montant des travaux réalisés. » ; présent acompte ≤ 0 →
« Le présent acompte doit être positif. » (génération refusée) ; cumul supérieur au total HT avenants
compris → avertissement à l'écran « Le cumul réalisé dépasse le montant total du marché avec ses
avenants. », non imprimé, non bloquant ; lot sans entreprise ou montant engagé nul → bouton
« Certificat de paiement » inactif.

### Génération et correction

- **Nouveau certificat** : `genererCertificat(lotId, { numeroAttendu, cumul, mois, date })`. Sous
  `SELECT … FOR UPDATE` sur le lot : relecture, contrôle que le numéro attendu est toujours le
  suivant (sinon « Un autre certificat a été enregistré entre-temps : rouvrez le certificat. », rien
  n'est écrit), calcul, insertion de l'`Acompte`, puis version 1 du document par la chaîne du Socle.
- **Correction** : seul le **dernier** acompte du lot, s'il n'est pas manuel, se rouvre en édition
  (bouton « Corriger le certificat n° 03 » du panneau du lot, ou depuis la page Documents), avec ses
  saisies. `corrigerCertificat(acompteId, { cumul, mois, date })` prend le verrou du lot, relit ses
  acomptes et vérifie **sous verrou** que celui-ci est toujours le dernier et n'est pas manuel (sinon
  « Seul le dernier certificat du lot peut être corrigé. », rien n'est écrit) ; il refait le calcul avec
  les acomptes précédents et le lot actuels, met à jour l'`Acompte` et enregistre une version de la
  même série. Si l'empreinte n'a pas changé, il n'y a pas de nouvelle version (règle du Socle :
  « Rien n'a changé depuis la version N : elle est téléchargée. »).
- Les autres certificats s'ouvrent en lecture seule, tels qu'émis. Un certificat **n'a pas d'état
  « modifié »** : c'est un acte de paiement, pas le reflet des données actuelles. `etatsDocumentsChantier`
  ne reconstruit donc jamais le contenu d'un certificat et ne compare pas son empreinte : la dernière
  version est en lecture seule, sans pastille « modifié » ni « Régénérer » ; seul « Corriger » (dernier
  numéro du lot) crée une version.
- Le document fige tout : marché, avenants (numéro et montant), TVA, taux de retenue, caution,
  acomptes précédents, cumul, mois, date, lot, entreprise, chantier.

### Feuille « CERTIFICAT DE PAIEMENT N° 03 » (`CERTIFICAT_PAIEMENT`, série `CERTIFICAT:<id>`)

Fac-similé du certificat SOCOREVE (maquette `renderCpSheet`), A4 portrait, une page :

- en-tête : logo SOCOREVE, adresse, téléphone, e-mail, RCS, APE, n° de TVA intracommunautaire (lus
  dans les Paramètres) ;
- cadre : Maître de l'Ouvrage, Objet du marché (nature des travaux + « adresse – CP – commune »),
  Lot n°, Titulaire ;
- cadre des montants : marché HT, « AVENANTS : » puis « Avenant n HT » (complété par des lignes vides
  jusqu'à 4), Total HT, TVA, Total TTC ;
- bande « État d'acompte n° 03 mois de Juillet 2026 » ;
- tableau « Acomptes précédents » N° / Montant HT (complété par des lignes vides jusqu'à 8), Total HT,
  TVA, Total TTC ;
- tableau « Titulaire » : travaux réalisés HT, acomptes précédents HT, présent acompte HT, TVA,
  présent acompte TTC, montant total mandaté, « Caution bancaire (OUI/NON) », dont retenue de
  garantie ;
- « Le Maître d'œuvre soussigné certifie qu'il peut être mandaté la somme de : 3 021,00 € » ;
- « Fait à Châteaubriant le : 30/09/2026 » ; « Le Maître d'œuvre ».

Au-delà de 4 avenants ou de 8 acomptes précédents, il n'y a plus de ligne vide : seules les lignes
réelles s'impriment, et la feuille reste sur une page (test : 10 avenants et 24 acomptes précédents
tiennent sur une page A4 portrait). Montants formatés par `formatEuros` du Socle. **Fichier** :
`<REF>-Lot02-GROS-OEUVRE-Certificat03-v1.pdf` (`ST` en sous-traitance).

### Aperçu du certificat

Plein écran, comme l'aperçu des marchés : zones bleues (cumul, acomptes antérieurs), champs mois et
date affichés sur la feuille à l'écran et imprimés en texte, bouton OUI/NON de la caution (une donnée
du lot, pas du brouillon : elle est enregistrée aussitôt et reste acquise même si l'on ferme sans
générer ; l'aperçu l'indique sous le bouton : « Enregistré sur le lot, vaut pour les certificats
suivants. ») ; montants
recalculés à la frappe par `src/domaine/certificats.ts` ; alerte du cumul sous la feuille ; bouton
**Générer le PDF** (ou « Générer la v2 » en correction) ; Échap ou **Fermer** : les saisies non
générées sont perdues. En lecture seule : **Télécharger le PDF**.

## 7. Page Documents

Le tableau de chaque entreprise devient **Lot | Marché | Avenants | Certificats | Historique** (la
colonne Réception arrivera avec le sous-projet 4) :

- **Avenants** : une case par avenant du lot, dans l'ordre des numéros — « n° 02 · v1 » en bleu
  (dernière version, lecture seule), pastille « modifié » et lien « Régénérer » (ouvre la lettre),
  pointillé « n° 03 à produire » (ouvre la lettre), « n° 04 · montant nul » en pointillé inactif.
- **Certificats** : une case par acompte — « n° 01 · hors appli » (gris, sans lien), « n° 03 · v2 »
  en bleu (lecture seule ; le dernier propose « Corriger » ; jamais de pastille « modifié ») ; un « + » ouvre un nouveau certificat
  (inactif avec la même condition que le panneau).
- **Historique** : versions du marché (comme au Socle) et versions des lettres d'avenants, lettres
  d'avenants supprimés comprises, marquées « avenant supprimé ». Les certificats restent dans leur
  colonne (chaque case donne accès à ses versions).

La légende ajoute : « Gris : acompte antérieur à l'application, saisi sans document. » Le
récapitulatif passe « modifié » dès qu'un avenant change un montant engagé.

## 8. Gestion des erreurs

Mécanique du Socle : `ErreurMetier` → `Resultat` en échec → message à l'écran ; tout le reste est
journalisé sans données (ni montant, ni nom de client) et affiché comme erreur générique.

| Cas | Réponse |
|---|---|
| Montant illisible (avenant, acompte, cumul) | « Montant : saisissez un nombre. » |
| Moins-value qui rend le lot négatif | « Cette moins-value rendrait le montant du lot négatif. » |
| TTC inférieur aux avenants | « Ce TTC est inférieur aux seuls avenants. » |
| Acompte antérieur alors qu'un certificat existe | « Des certificats existent : les acomptes antérieurs ne se modifient plus. » |
| Cumul manquant | « Saisissez le montant des travaux réalisés. » |
| Présent acompte ≤ 0 | « Le présent acompte doit être positif. » |
| Certificat enregistré par un collègue entre-temps | « Un autre certificat a été enregistré entre-temps : rouvrez le certificat. » |
| Correction d'un certificat qui n'est plus le dernier | « Seul le dernier certificat du lot peut être corrigé. » |
| Avenant ou acompte supprimé entre-temps | « Cet avenant n'existe plus. » / « Cet acompte n'existe plus. » |
| Lettre sans montant | manque « montant de l'avenant », génération refusée |

## 9. Tests

- **Vitest (domaine)** :
  - certificat de référence (annexe A), avec et sans caution ; demi-centime arrondi au-dessus ;
    présent acompte négatif refusé ; cumul au-delà du total signalé ;
  - montant engagé et `htDepuisTtc` avec avenants positifs et négatifs ; TTC inférieur aux avenants ;
  - montants de la lettre (annexe A) : le « marché initial » compte les seuls avenants antérieurs
    encore présents.
- **Intégration (base de test)** :
  - numéro d'avenant jamais réutilisé, y compris après suppression du dernier ; deux ajouts
    simultanés ont deux numéros ;
  - suppression d'un avenant : ses PDF restent, marqués « avenant supprimé » dans la vue Documents ;
  - acomptes manuels figés après le premier certificat ; renumérotation tant qu'aucun certificat ;
  - deux certificats simultanés sur un lot : un seul passe, l'autre reçoit le message, rien d'écrit ;
  - correction du dernier certificat → v2 et `Acompte` à jour ; correction d'un plus ancien refusée ;
  - récapitulatif et tableur au montant engagé ; marché « à jour » après ajout d'un avenant, mais
    « modifié » après saisie d'un TTC ; état « modifié » de la lettre quand un avenant antérieur change ;
  - « générer les marchés manquants » génère le marché d'un lot qui n'a qu'une lettre d'avenant et un
    certificat ;
  - un avenant ajouté après un certificat ne rend pas ce certificat « modifié » ;
  - correction sans changement : pas de v2 ; correction concurrente d'un certificat qui n'est plus le
    dernier : refusée sous verrou, rien d'écrit ; acomptes manuels écrits en même temps : numéros
    continus, aucun conflit d'unicité ;
  - `mois` `2026-13` refusé (Zod et `CHECK`) ;
  - lettre et certificat : une page A4 portrait ; 10 avenants et 24 acomptes précédents : une page.
- **Playwright E2E** (chantier `FINANCIER`, copie de la fixture PERRIER insérée avant le serveur E2E,
  comme les chantiers `PLANNING — …` du Planning) :
  PEINTURE (LA DÉCO'TECH) : HT initial 9 450,00 €, TVA 20 %, retenue 5 %.
  1. ajouter un avenant n° 01 de −300,00 € HT : le TTC du tableau passe de 11 340,00 € à 10 980,00 € ;
     le marché de PEINTURE reste « à jour » dans Documents ;
  2. écrire l'objet sur la lettre et générer la lettre :
     `FINANCIER-Lot11-PEINTURE-Avenant01-v1.pdf` ;
  3. saisir deux acomptes antérieurs de 2 000,00 € et 3 000,00 € HT, puis le certificat n° 03 avec
     cumul 7 000,00 € HT, caution OUI : total HT 9 150,00, précédents 5 000,00, présent acompte
     2 000,00 HT / 400,00 TVA / 2 400,00 TTC, retenue 0,00, **mandaté 2 400,00 €** ; télécharger
     `FINANCIER-Lot11-PEINTURE-Certificat03-v1.pdf` ;
  4. corriger le certificat n° 03 avec un cumul de 7 500,00 € : présent acompte 2 500,00 HT,
     mandaté 3 000,00 € ; v2 ;
  5. Documents : colonnes Avenants et Certificats, « n° 01 · hors appli », « n° 03 · v2 », sans
     pastille « modifié » sur le certificat.

## 10. Hors périmètre

- PV de réception, comptes rendus, « Tout télécharger » (sous-projet 4).
- Tableau de suivi des paiements par chantier, relances, décompte général définitif.
- Révision ou actualisation des prix.
- Brouillon de certificat conservé entre deux ouvertures.

## Annexe A — Cas de référence (calculés à la main)

La maquette indique un contrôle sur un vrai certificat (mandaté 3 013,82 €) sans en garder les
données : les cas ci-dessous sont calculés à la main et font foi jusqu'à ce qu'un vrai certificat
les remplace.

**Certificat** — lot CARRELAGE — FAÏENCE (MD CARRELAGE), HT initial 12 600,00 €, TVA 20 %, retenue
5 %, avenant n° 01 de + 850,00 € HT, acomptes antérieurs n° 1 = 3 000,00 € et n° 2 = 4 200,00 €,
cumul réalisé 9 850,00 € HT, certificat n° 03 :

| Ligne | Sans caution | Avec caution |
|---|---|---|
| Total HT / TVA / TTC | 13 450,00 / 2 690,00 / 16 140,00 | idem |
| Précédents HT / TVA / TTC | 7 200,00 / 1 440,00 / 8 640,00 | idem |
| Présent acompte HT / TVA / TTC | 2 650,00 / 530,00 / 3 180,00 | idem |
| Retenue de garantie | 159,00 | 0,00 |
| Montant total mandaté | 3 021,00 | 3 180,00 |

**Arrondi au demi-centime** — TVA 10 %, retenue 5 %, présent acompte HT 1 184,09 € : TVA 118,409 →
118,41 ; TTC 1 302,50 ; retenue 65,125 → **65,13** ; mandaté 1 237,37.

**Lettre** — même lot, avenant n° 01 de + 850,00 € puis n° 02 de − 300,00 € HT ; lettre n° 02 :
marché initial 16 140,00 € TTC ; devis complémentaire 360,00 € TTC ; « Soit une moins-value de
360,00 € TTC » ; nouveau montant 15 780,00 € TTC. Après suppression de l'avenant n° 01, la lettre
n° 02 devient « modifiée » (marché initial 15 120,00 € TTC, nouveau montant 14 760,00 € TTC).
