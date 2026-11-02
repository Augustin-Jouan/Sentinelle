# L'interface de Sentinelle

Le style de l'interface vit dans trois feuilles et dans les briques. La maquette
(`docs/maquette/sentinelle-marches.html`) en a donné l'identité ; elle ne génère plus rien et ne juge plus
l'app (voir `docs/maquette/LISEZMOI.md`).

## Où vit le style

`src/app/globals.css` est l'entrée unique, dans cet ordre :

1. **`src/styles/jetons.css`** : l'identité, un jeton par ligne, `light-dark(clair, sombre)`. Couleurs,
   rondeurs, ombres. Changer une couleur, c'est changer une ligne ici, pour les deux thèmes à la fois.
2. **`src/styles/theme.css`** : le vocabulaire Tailwind, réduit aux jetons (`@theme inline`). Les palettes, les
   tailles et les ombres par défaut de Tailwind sont retirées : `bg-red-500` ou `text-sm` ne produisent rien.
3. **`src/styles/base.css`** : polices, éléments nus (`body`, titres, focus), verrou de défilement des surcouches.
4. **`src/composants/planning/planning.css`** : le Gantt, la seule exception (plus bas).

Puis **les briques** (`src/composants/briques/`) : chacune possède son style, dans des tables de variantes
typées. Les composants métier assemblent des briques et n'ajoutent que de la mise en page. Un composant
n'importe jamais de CSS.

## Le vocabulaire

| Famille | Utilitaires |
|---|---|
| Fonds | `bg-paper` (la page), `bg-surface` (en-têtes, barres), `bg-raise` (cartes, champs) |
| Texte | `text-ink`, `text-ink-2`, `text-muted`, `text-faint` |
| Filets | `border-rule`, `border-rule-strong` |
| Accent | `accent`, `accent-2` (survol, texte sur fond pâle), `accent-soft`, `on-accent` (texte sur aplat), `focus` |
| Danger, alerte | `danger`, `danger-soft` ; `alerte`, `alerte-soft`, `alerte-trait` (réserves à suivre) |
| Divers | `idle-soft` (survol neutre), `band`, `bar-ring` (Gantt), `voile` (avec une opacité : `bg-voile/42`) |
| Tailles de texte | `text-9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `22`, `24`, `40` : la taille en pixels. L'interligne s'hérite. Sur un téléphone, `9`, `10` et `11` valent 11, 11 et 12 px (jetons `--t-*` de `jetons.css`). |
| Rondeurs | `rounded-xs` (5 px), `rounded-sm` (9 px), `rounded-md` (14 px), `rounded-lg` (18 px) |
| Ombres | `shadow-ombre`, `shadow-ombre-h` (menus, panneaux), `shadow-ombre-toast` |
| Polices | `font-sans` (Figtree), `font-titre` (Outfit), `font-mono` (Spline Sans Mono) |
| Divers | `tracking-capitales`, `animate-monte`, point de rupture `max-etroit:` (60 rem), `paysage:` (moins de 30 rem de haut : un téléphone couché) |

`src/composants/briques/typo.ts` nomme les trois assemblages qui reviennent partout : `CHIFFRES`
(`font-mono tabular-nums`), `SURTITRE` (petites capitales), `CLE` (clé discrète d'un couple clé-valeur).

Deux variantes sont redéfinies :

- `hover:` vaut `&:hover:not(:disabled)`, sans l'enveloppe `@media (hover: hover)` de Tailwind : un contrôle
  désactivé ne réagit pas au survol ;
- `dark:` suit `data-theme` sur `<html>` (l'interrupteur de la barre), sinon le thème du système.

Navigateurs : `light-dark()` demande Chrome 123, Firefox 120 ou Safari 17.5. C'est un outil interne, il n'y a
pas de repli.

## Les règles

- **`className` d'une brique = placement seulement** : marges (`m*-`, `-m*-`), place dans un flex ou une
  grille (`self-`, `justify-self-`, `place-self-`, `order-`, `col-`, `row-`, `basis-`, `grow`, `shrink`,
  `flex-1`, `flex-none`, `flex-auto`, `flex-initial`), largeurs (`w-`, `min-w-`, `max-w-`) et `align-`. Un préfixe
  de variante (`max-etroit:`) est permis devant. `src/composants/briques/briques.test.ts` le vérifie.
- **Jamais de valeur arbitraire** pour une couleur, une taille de texte, une police ou une ombre (`bg-[#…]`,
  `text-[13px]`, `font-[…]`, `shadow-[…]`). Une géométrie arbitraire (`leading-[1.45]`, `w-[1%]`) se tolère à
  un ou deux endroits ; à la troisième brique, elle devient un jeton.
- **Une apparence ne se recrée pas hors de sa brique** : pas de `<button className="rounded-sm border
  bg-raise…">` dans un écran. Un parent ne stylise jamais un enfant par un sélecteur descendant : une surcharge
  contextuelle devient une variante nommée (`<Bouton variante="surCarte">`).
- **Les états passent par ARIA ou `data-*`** : `aria-invalid` (saisie refusée, message relié par
  `aria-describedby`), `aria-busy` (en cours), `disabled` ou `aria-disabled`, `aria-checked`, `aria-selected`.
- **Deux classes qui posent la même propriété ne se côtoient jamais** dans un `cx(…)` : on écrit
  `actif ? 'text-accent' : 'text-muted'`. L'ordre des utilitaires dans la feuille ne doit jamais trancher.
- **Tableaux** (`<Tableau variante="plain" | "mini" | "lots" | "dm">`) : les cellules restent du HTML. Leurs
  écarts passent par des attributs : `data-droite`, `data-saisie`, `data-actions`, `data-vide`,
  `data-premiere` ; sur la ligne, `data-ouvert` et `data-inactif`. Un attribut absent s'écrit `undefined`,
  jamais `false`. Avec `cartes`, chaque ligne devient une carte en étroit (Marchés, Artisans, Documents, Fermetures) : `data-cle` pose un
  libellé au-dessus d'une valeur, `data-manque` retire une cellule vide, `data-hors-carte` une cellule que la
  carte tait ; l'écran place ses cellules par des utilitaires `max-etroit:`. Le HTML reste le même. L'en-tête n'y
  est plus lu que par les lecteurs d'écran : une action posée dans un `<th>` doit avoir sa place visible en étroit
  (Documents). WebKit (VoiceOver) retire la sémantique d'un tableau dont on change le `display` : en cartes, les
  lignes et cellules portent `role="row"`, `"cell"`, `"columnheader"`, `"rowheader"` (`role="table"` vient de la brique).
- **Surcouches** : `data-surcouche="panneau" | "menu" | "confirmation" | "apercu"`, `data-ouvert`,
  `data-verrou-defilement` (fige la page), `data-bloque-clavier`. Échap ne ferme que la plus haute ; les
  sélecteurs sont dans `src/composants/briques/surcouches.ts`.
- **Téléphone (`max-etroit:`)** : rien ne déborde de l'écran à 320 px (une rangée d'actions passe à la ligne, une
  grille s'écrit `minmax(min(24rem,100%),1fr)`). Une saisie fait au moins 16 px en étroit (`TACTILE` dans
  `Champ.tsx`, la `Recherche`, celle des menus) : en dessous,
  Safari sur iPhone zoome la page à chaque saisie. Tout ce qui se
  touche fait au moins 44 px en étroit (`max-etroit:min-h-11` dans `Bouton`, les menus, les onglets, les saisies) ;
  une pastille plus petite à l'œil agrandit sa zone par un `after:` (l'avatar du compte). Ce qui ne sert qu'à la
  souris (outils Main et Cible du planning, consigne « Maj + clic ») se cache par
  `pointer-coarse:not-any-pointer-fine:` : un écran tactile sans souris ni trackpad branché. Les onglets du chantier se
  partagent la largeur, sans icône. Couché (`paysage:`), rien ne colle : l'en-tête part avec la page, un panneau et un
  aperçu défilent d'un bloc.
- **Une feuille d'aperçu n'est jamais mise en page pour l'écran** : on doit y voir ce qui sortira de l'imprimante.
  Elle garde sa largeur réelle (`base.css` lève le `max-width: 100 %` de `CSS_DOCUMENTS` et l'empêche de se serrer
  en élément flex) et, plus large que le cadre, `CadreApercu` la réduit d'un bloc par `transform: scale` (jamais par
  `zoom`, qui recalcule la mise en page et déplace des lignes). Ses saisies et ses cases rapetissent avec elle : sur un
  téléphone, on pince pour zoomer, et Safari zoome de lui-même sur la saisie touchée. Aucune règle d'écran ne
  modifie le dessin d'une feuille ; seules les actions de l'aperçu (au-dessus) suivent les règles du téléphone.
- **Un élément ou deux ?** Une saisie n'existe qu'une fois : quand il lui faut un autre élément en étroit (la
  désignation d'un lot, `<input>` qui devient un `<textarea>` ajusté), `useEtroit()` (`briques/etroit.ts`) le dit au
  composant, et `ChampEnLigne` garde le focus si l'élément change pendant la saisie. Une action, elle, peut être rendue
  à deux endroits quand la mise en page la déplace (le thème : la barre sur ordinateur, le menu du compte en étroit ;
  les actions de Documents) : une seule place est affichée à la fois, les deux libellés diffèrent, et ce qui la décide
  (condition, texte) n'est écrit qu'une fois.
- **Tests de bout en bout** : rôles, libellés, puis `data-testid`. Jamais une classe de style, sauf `g-*` (le
  Gantt) et les classes des feuilles imprimables.

## L'exception : `planning.css`

Le Gantt (`.gantt`, `g-*`) et le tableau des périodes (`table.periodes`) gardent une feuille à eux : des états
croisés (`.gantt.outil-main.est-saisi .g-piste`), le survol d'une ligne qui colore la colonne figée, des
`z-index` empilés, la largeur d'une semaine en variable (`--sem-w`). En utilitaires, ce serait illisible. La
feuille n'utilise que les jetons, et elle est importée dans la couche `components` : sous les utilitaires.

Un autre composant ne reçoit sa propre feuille qu'à la même condition : un état ou une géométrie que les
utilitaires rendraient illisibles. La décision est écrite dans le message de commit. La barre d'outils, les
panneaux et les boutons du planning restent, eux, des briques.

## La vitrine et le banc visuel

- **`/vitrine`** montre chaque brique, ses variantes et ses états, avec des contenus du métier. Elle n'existe
  qu'en développement ou sur le serveur du banc (`E2E=1`), et ne lit aucune donnée.
- **Le banc visuel** (`npm run test:visuel`) capture chaque écran de `e2e/visuel/ecrans.ts` et chaque section de
  la vitrine, en clair et en sombre. Il compare ces captures à leurs références (`e2e/visuel/references/`), à
  1 % de pixels près. Il a sa propre base (les 4 chantiers de la maquette, `prisma/demo/maquette.ts`). Ne
  jamais le lancer en même temps que `npm run test:e2e` : les deux remettent la même base à zéro.
- Seule la semaine en cours du Gantt est masquée : « aujourd'hui » vient du serveur, pas de l'horloge figée du
  navigateur.

## Le guide d'utilisation (page Aide)

- **`/aide`** (Écran par écran) et **`/aide/comment-faire`**, ouverts par « Aide — guide d'utilisation » dans le
  menu Mon compte. Réservés aux comptes connectés, comme les captures (`public/guide/`).
- Le texte vit dans `src/aide/` : `ecrans.ts` (chaque écran et la légende de chaque pastille, dans l'ordre),
  `taches.ts` (les tâches pas à pas, au format décrit dans `blocs.ts`). `src/aide/contenu.test.ts` vérifie
  les captures, les liens internes et qu'aucun numéro entouré ne dépasse les pastilles de la capture qui précède.
- **Après un changement d'écran** : `npm run aide:captures` refait les 27 captures sur la base du banc visuel
  (jamais en même temps que `test:e2e` ou `test:visuel`), puis relire les images modifiées. Le parcours échoue
  si un repère ne se trouve plus ou si un écran n'a plus autant de pastilles que de légendes.

## Recettes

### Ajouter un écran

1. Composer des briques ; les utilitaires ne servent qu'à la mise en page de l'écran.
2. Sélecteurs E2E par rôle, libellé ou `data-testid`.
3. Si l'écran est central, l'ajouter à `ECRANS` dans `e2e/visuel/ecrans.ts`, lancer
   `npm run visuel:references`, relire la capture.

### Ajouter un état ou une variante

1. Dans la brique : une entrée de sa table de variantes, ou une prop d'état rendue par ARIA ou `data-*`.
2. Dans `src/composants/briques/vitrine/Vitrine.tsx`, dans la section de la brique.
3. `npm run visuel:references`, puis relire les PNG modifiés dans la revue du PR.

### Changer l'identité

Une couleur, une rondeur, une ombre : une ligne de `src/styles/jetons.css`, ses deux valeurs (clair, sombre).
Puis `npm run visuel:references` et la relecture des PNG.
