# Sentinelle Marchés — Interface : des briques Tailwind, la maquette comme référence

Date : 2026-10-01 · Statut : design validé en conversation, spec à relire

Point de départ : la branche `fix/refont-front` (plan `docs/superpowers/plans/2026-10-01-conformite-maquette.md`),
qui reproduit `docs/maquette/sentinelle-marches.html` trait pour trait. Ce document en change le contrat de
maintenance, pas le rendu.

## 1. Contexte et objectif

`fix/refont-front` a rendu l'app identique à la maquette :

- le CSS de la maquette est copié tel quel par `scripts/extraire-css-maquette.mjs` dans `src/app/maquette.css`
  (1 584 lignes), qu'un test interdit d'éditer à la main ;
- les écrans reprennent son balisage, avec environ 230 classes réparties dans une quarantaine de fichiers TSX
  (`btn` × 84, `btn-sm` et `btn-primary` × 27…) ;
- un banc Playwright exige que 10 écrans de l'app soient identiques aux mêmes écrans de la maquette.

Le rendu est bon. C'est le contrat qui bloque :

1. **L'UI ne peut pas évoluer dans l'app.** Toute retouche visuelle passe d'abord par le HTML de la maquette,
   puis par l'extracteur, puis par l'écran, puis par une capture PNG à faire correspondre.
2. **Deux CSS se marchent dessus.** Tailwind est encore là, en conflit avec la maquette : la classe `.block`,
   le preflight. `src/app/maquette-ajouts.css` contient des rustines contre le preflight. Il y a deux jeux de
   jetons pour les mêmes couleurs : ceux de la maquette et ceux de shadcn dans `globals.css`. Le thème sombre
   est écrit quatre fois.
3. **La conformité au pixel est trop stricte pour un logiciel vivant.** Les états d'erreur, les documents et
   les rôles n'existent pas dans la maquette.
4. **Personne ne maintient un design system ici : on maintient le miroir d'un HTML.** Les composants
   (`Panneau`, `MenuDeroulant`…) encapsulent le comportement mais répètent les classes de la maquette. Aucun
   composant `Bouton` n'existe.

**On garde** l'identité : palette « bleu de plan » claire et sombre, Figtree, Outfit et Spline Sans Mono,
densités, textes, enchaînements.

**On change** la façon de la porter :

- Tailwind devient le seul langage de style ;
- de vrais composants, les **briques**, possèdent leur style ;
- la maquette devient une référence : elle ne génère plus rien et ne juge plus au pixel près.

### Critères de réussite

- Un nouvel écran, ou un écart métier (un état, une variante), se fait **sans toucher
  `sentinelle-marches.html`**, et le résultat reste reconnaissable comme la maquette.
- Pendant toute la migration, le banc strict actuel reste vert : 10 écrans comparés à la maquette, avec 1 % de
  tolérance. La migration ne change pas le rendu.
- À la fin, il ne reste ni `maquette.css`, ni `maquette-ajouts.css`, ni `heritage.css`, ni extracteur, ni
  couche shadcn. Le style vit dans les jetons, le thème Tailwind, les briques et un seul fichier d'exception
  (`planning.css`).
- La page `/vitrine` montre chaque brique avec toutes ses variantes et tous ses états, en clair et en sombre.
  Le banc la capture.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Langage de style | Utilitaires Tailwind dans les composants |
| Variantes | Tables de variantes typées écrites à la main, plus un utilitaire `cx()`. Ni `class-variance-authority` ni `tailwind-merge` |
| `className` d'une brique | Placement seulement (marges, place dans un flex ou une grille, largeur), gardé par un test statique |
| Ce que Tailwind exprime mal | Utilitaires par défaut. Exception : **un** fichier CSS rangé à côté d'un composant complexe, dans la couche `components`, avec les jetons seulement. Aujourd'hui, seul le Gantt (`planning.css`) est concerné |
| Jetons | Un seul jeu, avec le vocabulaire de la maquette (`paper`, `ink`, `rule`, `accent`…), exposé à Tailwind. Les palettes par défaut de Tailwind sont retirées |
| Thème sombre | `light-dark(clair, sombre)` sur chaque jeton ; `data-theme` pilote `color-scheme`. Navigateurs requis : Chrome 123, Firefox 120, Safari 17.5 ou plus récents |
| Tailles de texte | Nommées d'après leur valeur en pixels (`text-13`). Ce sont les 13 tailles de la maquette, aucune autre |
| Référence vivante | Page `/vitrine` dans l'app, réservée aux comptes connectés, en 404 en production hors banc |
| Banc visuel | En deux temps : comparé à la maquette pendant la migration, puis à l'app elle-même (non-régression) |
| Migration | Écran par écran. Chaque commit garde le banc strict vert et supprime les règles devenues mortes |
| Sélecteurs E2E | Par rôles et libellés, à défaut `data-testid`. Jamais une classe de style, sauf `g-*` (Gantt) et les feuilles imprimables |
| Branche | `refonte/briques`, créée depuis `fix/refont-front` |

## 3. Fondation : jetons et thème

### Fichiers

```
src/app/globals.css       entrée unique : Tailwind, puis les fichiers ci-dessous, dans l'ordre
src/styles/jetons.css     :root, un jeton par ligne : light-dark(clair, sombre)
src/styles/theme.css      @theme inline (expose les jetons), variantes hover et dark
src/styles/base.css       @layer base : @font-face, body, h1–h3, :focus-visible, mouvement réduit
src/styles/heritage.css   l'ancien maquette.css + maquette-ajouts.css, figé, importé layer(components)
src/composants/planning/planning.css   le Gantt (étape 3), importé layer(components) par globals.css
```

Tout le CSS est importé depuis `globals.css`. Un composant n'importe jamais de CSS : la documentation de
Next 16 prévient qu'une feuille globale importée par un composant n'est pas retirée quand on change de route.

### Couches

On garde les couches de Tailwind : `theme`, `base` (preflight), `components`, `utilities`. L'héritage est
importé dans `components` :

- il reste **au-dessus du preflight**, comme le `maquette.css` actuel, non classé dans une couche. Les écrans
  pas encore migrés ne bougent pas ;
- il passe **sous les utilitaires**. Une règle restée dans l'héritage ne peut donc jamais écraser un composant
  migré.

`planning.css` partage la couche `components`, sans conflit possible : les règles du Gantt y sont
*déplacées*, pas copiées.

> Vérifié avec Tailwind 4.3.3 : une déclaration `@layer theme, base, heritage, components, utilities;` est
> supprimée par l'optimiseur. On ne s'appuie donc pas sur une couche personnalisée.

### Jetons (`jetons.css`)

```css
:root { color-scheme: light dark; }
:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']  { color-scheme: dark; }
:root {
	--paper: light-dark(#eceef0, #14202b);
	/* … un jeton par ligne, valeurs reprises des deux blocs de maquette.css … */
	--ombre: 0 1px 2px light-dark(rgba(16, 22, 25, 0.04), rgba(0, 0, 0, 0.40)), …;
}
```

- Les jetons de la maquette sont repris sous leur nom, avec leurs deux valeurs :
  - surfaces : `paper`, `surface`, `raise` ;
  - texte : `ink`, `ink-2`, `muted`, `faint` ;
  - filets : `rule`, `rule-strong` ;
  - accent : `accent`, `accent-2`, `accent-soft`, `on-accent`, `focus` ;
  - danger : `danger`, `danger-soft` ;
  - divers : `idle-soft`, `band`, `bar-ring` ;
  - ombres : `ombre`, `ombre-h` ;
  - rayons : `r-xs`, `r-sm`, `r`, `r-lg` ;
  - planning : `sem-w`.
- Les couleurs écrites en dur dans l'interface deviennent des jetons :
  - l'alerte orangée de `.dm-case.est-alerte` donne `alerte`, `alerte-soft` et `alerte-trait` ;
  - le voile des surcouches (`rgba(10, 14, 16, …)` sous `.scrim` et `.ask`) donne `voile`, utilisé avec
    l'opacité de Tailwind (`bg-voile/50`, `bg-voile/42`).
- Le dessin du sigle garde ses couleurs figées : c'est une illustration, pas de l'interface.
- `SCRIPT_THEME` et `basculerTheme()` (`theme.ts`) ne changent pas. Ils posent `data-theme`, qui pilote
  désormais `color-scheme`.
- Effet de bord assumé : en sombre, les contrôles natifs (sélecteur de date, barres de défilement) passent
  aussi en sombre. Le banc tourne en clair.

### Thème Tailwind (`theme.css`)

```css
@theme inline {
	--color-*: initial;        /* plus de bg-red-500 : seulement l'identité */
	--color-paper: var(--paper);  /* … un par jeton de couleur … */
	--text-*: initial;
	--text-9: 0.5625rem; --text-10: 0.625rem; --text-11: 0.6875rem; --text-12: 0.75rem; --text-13: 0.8125rem;
	--text-14: 0.875rem; --text-15: 0.9375rem; --text-16: 1rem; --text-17: 1.0625rem; --text-18: 1.125rem;
	--text-22: 1.375rem; --text-24: 1.5rem; --text-40: 2.5rem;
	--radius-*: initial;
	--radius-xs: var(--r-xs); --radius-sm: var(--r-sm); --radius-md: var(--r); --radius-lg: var(--r-lg);
	--shadow-*: initial;
	--shadow-ombre: var(--ombre); --shadow-ombre-h: var(--ombre-h);
	--font-sans: 'Figtree', system-ui, sans-serif;
	--font-titre: 'Outfit', 'Figtree', sans-serif;
	--font-mono: 'Spline Sans Mono', ui-monospace, monospace;
	--breakpoint-*: initial;
	--breakpoint-etroit: 60rem;   /* le seul point de rupture de la maquette → max-etroit: */
}
@custom-variant hover (&:hover);   /* comme la maquette : pas d'enveloppe @media (hover: hover) */
@custom-variant dark { … }          /* la définition actuelle de globals.css, inchangée */
```

- **Espacements** : la grille de Tailwind (`0.25rem`) reste telle quelle. Les valeurs de la maquette tombent
  dessus (`0.4375rem` → `p-1.75`, `0.8125rem` → `px-3.25`, vérifié).
- **Valeurs isolées** : une valeur arbitraire de géométrie ou de rythme (`leading-[1.45]`, `tracking-[0.08em]`,
  `rounded-[3px]`) est permise quand elle n'apparaît qu'à un ou deux endroits. Dès qu'une valeur est utilisée
  dans trois briques ou plus, elle devient un jeton du thème. **Jamais de valeur arbitraire pour une couleur,
  une taille de texte, une police ou une ombre** : c'est l'identité, et elle passe toujours par un jeton
  (test statique, § 4).
- Les chiffres s'écrivent `font-mono tabular-nums` : c'est la classe `.num` de la maquette.

### Ce qui disparaît à l'étape 1

- les jetons shadcn et leur `@theme inline` dans `globals.css` ;
- `components.json` ;
- `tw-animate-css`, la dépendance et son import, puisque rien ne l'utilise ;
- `scripts/extraire-css-maquette.mjs`, le script `maquette:css` et `src/app/maquette.test.ts`. Le test de la
  classe `block` devient sans objet une fois `.block` migré ; d'ici là, il est conservé dans le test de
  l'héritage.

## 4. Composants

### Deux niveaux

**1. Les briques, dans `src/composants/briques/`.** Elles ne savent rien du métier et sont les seules à porter
l'apparence de base.

| Brique | Remplace (classes de la maquette) |
|---|---|
| `Bouton` | `btn`, `btn-sm`, `btn-primary`, `btn-ghost`, `btn-danger`, `btn-ico`, `a.btn` |
| `Pastille` | `pill`, `pill-fini`, `pill-actif`, `pill-modif` |
| `Surtitre` | `eyebrow` |
| `Carte` | le cadre des cartes (`chantier`, `dm-carte`…) : fond `raise`, filet, `rounded-md`, `shadow-ombre` |
| `Bloc` | `block`, `block-head`, `block-body` |
| `Champ`, `ChampMontant`, `GroupeChamps` | `field`, `fgroup`, `fieldset`, `grid-2`, `frow`, `hint`, `erreur`, `text-input`, `money-input`, `form-wrap`, `form-actions` |
| `Interrupteur`, `Recherche` | `switch`, `search` (les composants existants, restylés) |
| `Tableau` (variantes `plain`, `mini`, `lots`) | `table.plain`, `plain-mini`, `table.lots`, `table-frame`, `cell-*`, `ta-r`, `empty-row`, `totals` |
| `Vide`, `CleValeur` | `empty-list`, `vide-mini`, `kv`, `champ-kv` |
| `Onglet` | `nav-o` et son compteur `count` |
| `Ecran`, `BarreOutils` | `screen`, `topbar`, `page-title`, `topbar-actions`, `body-pad`, `toolbar` |
| `Panneau`, `MenuDeroulant`, `Confirmation`, `Toasts` | `panel`, `scrim`, `dd-*`, `ask-*`, `toast` (logique conservée, balisage restylé) |
| `Icones`, `Sigle`, `cx` | `icones.tsx`, `Sigle.tsx`, et l'utilitaire de jonction de classes |

Le dossier `src/composants/maquette/` disparaît : son contenu migre dans `briques/`, avec sa logique et ses
tests intacts (`menu.ts`, `nomPanneau.ts`, `preference.ts`, `theme.ts` et leurs `*.test.ts`). La liste
ci-dessus peut s'affiner pendant l'étape 2, mais toute brique ajoutée suit les règles ci-dessous.

**2. Les composants métier**, qui restent où ils sont : `CarteChantier`, `TableauLots`, `PanneauLot`,
`BandeauChantier`, `BarreNavigation`, `Planning`, `TableauDocuments`… Ils assemblent des briques et utilisent
des utilitaires pour leur propre mise en page. Ils ne recréent jamais l'apparence d'une brique : pas de
`<button className="rounded-sm border bg-raise px-3…">`.

### Règles d'API d'une brique

- Les props sont en français. Les variantes sont des unions de chaînes typées, chacune décrite dans une table
  du fichier :

  ```tsx
  const VARIANTE = {
  	normal:   'bg-raise border-rule-strong hover:bg-idle-soft hover:border-muted',
  	primaire: 'bg-accent border-accent text-on-accent font-medium hover:bg-accent-2 hover:border-accent-2',
  	fantome:  'bg-transparent border-transparent text-muted hover:bg-idle-soft hover:text-ink',
  	danger:   'bg-raise border-rule-strong text-danger hover:bg-danger-soft hover:border-danger',
  } as const;

  type PropsBouton = {
  	variante?: keyof typeof VARIANTE;
  	taille?: 'normal' | 'sm';
  	icone?: React.ReactNode;
  	/** Réduit à l'icône (ex-.btn-ico) : le libellé passe par aria-label et title. */
  	seulIcone?: boolean;
  	enCours?: boolean;
  	/** Rend un lien Next (ex-a.btn). */
  	href?: string;
  	/** Placement seulement. */
  	className?: string;
  };
  ```

- **Les états sont des props, rendues par des attributs ARIA ou `data-*`**, et le style s'y accroche :
  - `enCours` → `aria-busy`, et la brique est désactivée ;
  - `erreur` → `aria-invalid`, avec le message relié par `aria-describedby` ;
  - `desactive` → `disabled`, ou `aria-disabled` pour un lien.

  Exemples : `aria-invalid:border-danger`, `disabled:opacity-50`. Les états propres à l'app (bouton
  désactivé, saisie refusée, enregistrement en cours) cessent d'être des rustines de `maquette-ajouts.css`.
- **Une surcharge contextuelle de la maquette devient une variante nommée.** Exemple : `.chantier-actions .btn`
  (« dans une carte cliquable, on rend un contour au bouton ») devient `variante="surCarte"`. Le parent ne
  stylise jamais un enfant par un sélecteur descendant.
- **`className` sert au placement, et à rien d'autre.** Les préfixes admis sont les marges (`m*-`, `-m*-`),
  les propriétés d'enfant de flex ou de grille (`self-`, `justify-self-`, `place-self-`, `order-`, `col-`,
  `row-`, `basis-`, `grow`, `shrink`, `flex-1`, `flex-none`) et les largeurs (`w-`, `min-w-`, `max-w-`). Les
  préfixes de variantes (`max-etroit:`…) sont permis devant ces utilitaires. Tout le reste est refusé.
- `cx(...classes)` joint les chaînes et ignore `false`, `null` et `undefined`. Pas de fusion de conflits : la
  règle de placement suffit à n'en créer aucun.

### Garde-fou statique

Un test Vitest (`src/composants/briques/briques.test.ts`) parcourt `src/**/*.tsx`, sauf `src/documents/` (les
feuilles imprimables, hors périmètre). Il fait deux vérifications :

- **Placement seulement.** Pour chaque élément JSX dont le nom est une brique exportée de `briques/`, il lit
  `className` quand c'est une chaîne littérale ou un gabarit, et échoue sur tout utilitaire hors de la liste
  admise ci-dessus.
- **Identité par jetons.** Il échoue sur toute valeur arbitraire de couleur, de taille de texte, de police ou
  d'ombre (`bg-[#…]`, `text-[13px]`, `font-[…]`, `shadow-[…]`…) dans un `className`, briques comprises.

Le message nomme le fichier, l'élément et la classe.

### L'exception : le Gantt

Environ 335 lignes de CSS denses : états croisés (`.gantt.outil-main.est-saisi .g-bar`), survol de ligne vers
la colonne figée, `z-index` empilés, variable `--sem-w`. Elles passent dans
`src/composants/planning/planning.css`, importé par `globals.css` dans `layer(components)` :

- les jetons seulement : ni couleur, ni ombre en dur, sauf celles de la maquette déjà propres au Gantt, qui y
  restent identiques ;
- les classes `g-*` restent, et les sélecteurs E2E du planning qui les visent ne bougent pas ;
- la barre d'outils, les panneaux et les boutons du planning utilisent les briques, comme partout ailleurs.

Un autre composant ne peut recevoir son propre fichier CSS que s'il remplit la même condition : un état ou une
géométrie que les utilitaires rendraient illisibles. La décision est écrite dans le commit.

## 5. Migration

### Étape 1 : la fondation, sans changer le rendu

1. Créer `jetons.css`, `theme.css` et `base.css` (§ 3). Fusionner `maquette.css` et `maquette-ajouts.css` dans
   `heritage.css`. Les blocs de jetons partent dans `jetons.css`. De la section BASE, seules les règles
   d'éléments partent dans `base.css` (`*`, `body`, `button`/`input`/…, `:focus-visible`, mouvement réduit,
   `h1`–`h3`). `.num` et `.eyebrow`, encore utilisées par les écrans, restent dans l'héritage jusqu'à leur
   migration.
2. Supprimer la couche shadcn, `components.json`, `tw-animate-css`, l'extracteur, son script et son test.
3. Supprimer les règles de l'héritage dont la classe racine n'apparaît nulle part dans `src/` : écrans propres
   à la maquette, `.app`, démonstration… Par définition, le rendu ne change pas.
4. Figer la liste des sélecteurs restants dans `src/styles/heritage.selecteurs.txt`, et écrire les deux tests
   de l'héritage (ci-dessous).

Critère : banc strict vert, `npm test`, `npm run test:int` et `npm run test:e2e` verts.

### Étape 2 : les briques et la vitrine

Écrire les briques du § 4 et la page `/vitrine` (§ 6). Aucun écran n'est touché à cette étape. Les références
de la vitrine sont capturées et soumises à l'utilisateur pour un contrôle à l'œil, face à la maquette.

### Étape 3 : les écrans, un par un

Un commit par écran, dans cet ordre :

1. connexion et mot de passe ;
2. barre de navigation, menu du compte, sélecteur de chantier ;
3. accueil « Mes chantiers » (synthèse, cartes) ;
4. nouveau chantier ;
5. Marchés : bandeau du chantier, tableau des lots, panneau du lot ;
6. Documents : cartes, tableau, aperçus (`CadreApercu`, `ChampsMarche`, `MenuVersions`) ;
7. Planning : le Gantt passe dans `planning.css`, puis barre d'outils, fenêtre des fermetures, panneau du lot ;
8. Artisans ;
9. Comptes et Paramètres.

Pour chaque écran :

- le balisage à classes de la maquette est remplacé par des briques et des utilitaires ;
- les `style={{}}` en ligne de l'écran deviennent des utilitaires, sauf les valeurs calculées (position d'une
  barre, couleur d'un lot) ;
- les sélecteurs E2E de l'écran passent sur les rôles et libellés, ou sur `data-testid` à défaut ;
- les règles de l'héritage devenues mortes sont supprimées dans le même commit (le test l'exige) ;
- le banc strict, les tests unitaires et les tests E2E restent verts.

Commencer par les écrans les plus simples rode les briques avant les Marchés et le Planning.

### Les deux tests de l'héritage (`src/styles/heritage.test.ts`)

Ils lisent `heritage.css` avec postcss, sélecteur par sélecteur (une règle à plusieurs sélecteurs compte pour
plusieurs).

- **Aucun nouveau sélecteur.** Chaque sélecteur de `heritage.css` doit figurer dans `heritage.selecteurs.txt`.
  Une suppression passe ; un ajout ou un renommage échoue. On ne peut plus rafistoler l'héritage au lieu de
  migrer.
- **Aucune règle morte.** Chaque classe citée par un sélecteur (`.chantier-actions .btn` en cite deux, les
  classes d'état `is-on` et `est-*` comprises) doit encore apparaître dans `src/**/*.{ts,tsx}` comme classe
  entière : `btn` ne compte pas comme présent dans `btn-sm`. Quand un écran migré cesse d'utiliser
  `btn-ghost`, le test exige la suppression de la règle. L'héritage maigrit au rythme de la migration. Les
  sélecteurs sans classe (`table thead th`) en sont exemptés.
- Le test actuel de la classe `block` (pas d'utilitaire Tailwind `block` mélangé à d'autres classes) migre ici
  et disparaît avec `.block`.

### Étape 4 : la fin de l'héritage et la bascule du banc

Quand `heritage.css` est vide, on supprime le fichier, sa liste et ses tests, puis on bascule le banc (§ 6).

### Si un écran ne passe pas le banc

- **Écart de 1 ou 2 pixels dû au preflight** (marge d'un `<p>`, rembourrage d'un `input`, `img` en bloc,
  taille d'un titre) : on le corrige dans la brique, jamais par un masque.
- **Vrai désaccord**, quand la maquette avait elle-même un défaut que la brique corrige : on le décrit dans le
  message de commit et on l'ajoute au banc comme masque explicite, avec sa raison en commentaire. Ces masques
  disparaissent à la bascule.

## 6. Banc visuel et vitrine

### La vitrine

- C'est la route `src/app/(app)/vitrine/page.tsx`. Elle passe par `exigerPage()`, comme toute page de
  `(app)`, et `gardes.test.ts` la couvre déjà. Elle appelle `notFound()` en production, sauf si `E2E=1`
  (serveur du banc). Elle ne lit aucune donnée.
- Elle a une section par brique. Chaque section montre toutes les variantes, toutes les tailles et tous les
  états portés par des props (normal, désactivé, en cours, erreur, vide), avec des contenus réalistes tirés du
  métier : lots, montants, entreprises. Le survol n'est pas capturé.
- Les surcouches (`Panneau`, `Confirmation`) sont rendues ouvertes dans un cadre qui les contient. Un parent
  muni d'un `transform` devient le bloc conteneur de ses descendants `fixed`, donc aucune prop n'est réservée
  à la vitrine. Une surcouche qui bloque le défilement de la page, ou qui ne s'ouvre que sur un clic
  (`MenuDeroulant`), est montrée derrière un bouton : le banc clique dessus avant de capturer, comme pour les
  écrans.
- Règle : ajouter une brique ou une variante oblige à l'ajouter à la vitrine, et la capture du banc le
  vérifie.

### Le banc pendant la migration (étapes 1 à 3)

- `e2e/conformite/` est inchangé pour les 10 écrans : références capturées sur la maquette, comparaison de
  l'app avec `maxDiffPixelRatio: 0.01`.
- Il gagne les captures de la vitrine : une par section, en clair et en sombre, nommées
  `vitrine-<section>-<clair|sombre>.png`. Elles ne sont produites que pour la cible `app`, puisque la maquette
  n'a pas de vitrine. Leurs références viennent de l'app dès l'étape 2.

### La bascule (étape 4)

- Les références des 10 écrans sont régénérées depuis l'app. Les images restent quasi identiques, puisqu'elles
  passent déjà à 1 %.
- Tout ce qui sert à capturer la maquette est supprimé :
  - `CONFORMITE_CIBLE` ;
  - `policesLocales` et les routes `fonts.googleapis.com` ;
  - la branche « maquette » de `preparer` et `seConnecterSur` ;
  - le script `conformite:references`.
- Les masques d'écarts (menu du compte avec son masque de taille fixe, champ du chargé d'affaire, pied de la
  connexion) sont retirés. Seuls restent les masques de ce qui varie d'un jour à l'autre (`.g-auj`,
  `.g-sems .auj`), et seulement s'ils sont encore utiles avec l'horloge figée.
- Les renommages :
  - `e2e/conformite/` → `e2e/visuel/` ;
  - `playwright.conformite.config.ts` → `playwright.visuel.config.ts` ;
  - scripts `test:visuel`, `visuel:references`, `visuel:serveur`.
- Le jeu de données des 4 chantiers (`prisma/demo/maquette.ts`, `e2e/conformite/preparer-maquette.ts`) est
  conservé : c'est le décor des captures, pas la maquette.

### Après la bascule

Un changement visuel voulu se fait en trois temps :

1. modifier la brique ou l'écran ;
2. lancer `npm run visuel:references` ;
3. ouvrir la revue du PR, qui montre les PNG modifiés.

La maquette n'est plus ouverte.

## 7. Contrat de maintenance

- **`docs/interface.md`**, une page qui explique :
  - où vit le style : `jetons.css`, puis `theme.css`, puis les briques ;
  - le vocabulaire des jetons et des tailles ;
  - la règle de `className` ;
  - l'exception `planning.css` et la condition pour en créer une autre ;
  - la vitrine et le banc ;
  - deux recettes :
    - **ajouter un écran** : des briques, des utilitaires de mise en page, et une capture au banc si l'écran
      est central ;
    - **ajouter un état ou une variante** : dans la brique (table de variantes ou prop d'état), puis dans la
      vitrine, puis régénérer les références.
- **`docs/maquette/LISEZMOI.md`** : la maquette est la référence d'identité d'origine. Elle ne génère plus rien
  et ne se modifie plus pour faire évoluer l'app. Ses notes d'en-tête restent valables pour le métier.
- Le **README** pointe vers `docs/interface.md`.
- La **mémoire de l'assistant** : la note « la maquette est le front » est remplacée par la nouvelle règle
  (briques et Tailwind font foi, la maquette sert de référence).

## 8. Risques et parades

| Risque | Parade |
|---|---|
| Le preflight change un écran dès qu'une rustine de l'héritage part | Le banc strict à chaque commit ; correction dans la brique, jamais par un masque (§ 5) |
| L'héritage passe sous les utilitaires à l'étape 1 et change l'élément `FeuilleUnique` (`mode-impression shrink-0 shadow-md`), le seul qui mêle aujourd'hui une classe de la maquette et des utilitaires | Le banc l'attrape. Si l'écart est réel, la feuille passe en utilitaires dès l'étape 1 |
| `light-dark()` n'existe pas sur un vieux navigateur : couleurs invalides | Prérequis accepté (navigateurs de 2024 ou plus récents) pour un outil interne ; noté dans `docs/interface.md` |
| Ordre des couches : une couche personnalisée serait supprimée par l'optimiseur | L'héritage et `planning.css` vont dans la couche `components` de Tailwind (vérifié) |
| `hover:` de Tailwind 4 enveloppé dans `@media (hover: hover)` | `@custom-variant hover (&:hover)` (vérifié) |
| Sélecteurs E2E cassés par la disparition des classes | Migrés dans le commit de l'écran ; le Gantt garde ses `g-*` |
| Le comportement des surcouches régresse pendant le restylage (Échap, focus, `data-bloque-clavier`, `role="dialog"`) | Logique et tests existants conservés tels quels ; E2E des parcours |
| `/vitrine` exposée en production | `notFound()` hors banc, plus `exigerPage()` ; aucune donnée lue |

## 9. Tests

- **Unitaires (Vitest)**
  - `cx()` ;
  - le garde-fou statique (§ 4) : placement seulement pour `className` d'une brique, identité par jetons
    partout ;
  - les deux tests de l'héritage et celui de `block`, supprimés avec l'héritage ;
  - `/vitrine` : elle appelle `notFound()` hors banc en production et n'importe ni `prisma` ni `@/donnees` ;
  - les tests existants inchangés : `menu`, `nomPanneau`, `preference`, `carteActions`, `fileActions`,
    `geometrie`, `gardes`…
- **Intégration** : inchangés, puisque le métier ne bouge pas.
- **E2E** : tous verts à chaque commit, avec des sélecteurs par rôle, libellé ou `data-testid` ; `g-*` pour le
  Gantt ; classes des feuilles imprimables pour les documents.
- **Visuel**
  - pendant la migration : 10 écrans comparés strictement à la maquette, et la vitrine en clair et en sombre ;
  - après la bascule : les mêmes captures, comparées à leurs propres références.
- **Thème** : l'E2E existant « le thème choisi tient au rechargement » reste vert. La vitrine en sombre couvre
  l'identité sombre de chaque brique.

## 10. Hors périmètre

- Les feuilles imprimables et les PDF : `src/documents/styles.ts` (`CSS_DOCUMENTS`) et `src/documents/gabarits/`
  restent une chaîne CSS en couleurs fixes, que Chromium consomme telle quelle.
- Le métier : actions serveur, validations, données, Prisma.
- Tout changement de rendu volontaire. Ce sera le premier usage du nouveau contrat, une fois la migration
  terminée.
- Le travail sur l'affichage mobile au-delà du point de rupture `etroit` existant.
