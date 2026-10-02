# Sentinelle Marchés — Briques Tailwind : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** porter l'identité de la maquette par des jetons, le thème Tailwind et des briques React qui possèdent leur style, sans changer le rendu. La maquette devient une référence : elle ne génère plus rien et ne juge plus au pixel près.

**Architecture :**
- **Fondation.** `maquette.css` et `maquette-ajouts.css` sont figés en `src/styles/heritage.css`, importé dans la couche `components` de Tailwind : au-dessus du preflight, sous les utilitaires. Les jetons (`light-dark()`) et le thème Tailwind (palettes par défaut retirées) sont posés à côté. Deux tests et un script d'élagage obligent l'héritage à maigrir.
- **Briques.** Les briques (`src/composants/briques/`) sont créées et restylées : tables de variantes typées, `cx()`, états portés par ARIA ou `data-*`. Un garde-fou statique (API du compilateur TypeScript) n'autorise sur `className` d'une brique que le placement. Il interdit aussi toute couleur, taille de texte, police ou ombre arbitraire.
- **Écrans.** Ils migrent un par un sous le banc strict actuel (captures de la maquette, 1 %). Chaque commit supprime les règles d'héritage devenues mortes. À la fin, l'héritage est vide et le banc bascule en non-régression sur l'app, vitrine comprise.

**Tech Stack :** Next.js 16.3.7 (App Router), React 19.2.8, Tailwind CSS 4.3.3 (`@tailwindcss/postcss`), postcss 8.5, TypeScript 5 (son API sert au garde-fou), Vitest 5 (`react-dom/server` pour rendre les briques en environnement node), Playwright 1.63.

**Spec :** `docs/superpowers/specs/2026-10-01-briques-tailwind-design.md`. Lire aussi :
- `docs/superpowers/plans/2026-10-01-conformite-maquette.md` (écarts assumés 1 à 8, toujours valables) ;
- `AGENTS.md` (lire `node_modules/next/dist/docs/` avant d'écrire du code Next).

**Prérequis :**
- Branche `refonte/briques`, créée depuis `fix/refont-front`. La spec y est commitée (eb7555d).
- Base de test démarrée comme pour `npm run test:e2e` (`docker compose -f docker-compose.dev.yml up -d`, `.env.test`).
- `npm test`, `npm run test:int`, `npm run test:e2e` et `npm run test:conformite` verts avant de commencer.

**Comment ce plan a été écrit.** Chaque tâche a été réalisée en entier dans un worktree jetable avant d'être écrite ici. Elle a passé `tsc`, le lint, Vitest, les 29 à 31 E2E et le banc strict. Le code des blocs est ce code validé :
- un bloc de fichier entier **remplace** le fichier ;
- un bloc `diff` est un correctif unifié, relatif à l'état laissé par la tâche précédente. Il s'applique tel quel (copier le bloc dans un fichier, puis `git apply --3way fichier.patch`) ou à la main.

## Global Constraints

- **Navigateurs** : Chrome 123, Firefox 120 et Safari 17.5 ou plus récents (`light-dark()` sans repli). Tailwind 4.3.3 le laisse passer tel quel (vérifié).
- **Jamais de modification** de `docs/maquette/sentinelle-marches.html`, de `src/documents/styles.ts` ni de `src/documents/gabarits/**`.
- **Le métier ne change pas** : actions serveur, validations, données, Prisma, textes affichés (sauf ceux cités dans une tâche). Jamais `prisma migrate reset` ni `prisma migrate dev`.
- **Aucune nouvelle dépendance** : ni `class-variance-authority`, ni `tailwind-merge`, ni `clsx`. `tw-animate-css` est retiré à la Task 1.
- **Tout le CSS est importé depuis `src/app/globals.css`.** Un composant n'importe jamais de CSS.
- **`className` d'une brique = placement seulement.** Préfixes admis :
  - marges : `m*-`, `-m*-` ;
  - place dans un flex ou une grille : `self-`, `justify-self-`, `place-self-`, `order-`, `col-`, `row-`, `basis-`, `grow`, `shrink`, `flex-1`, `flex-none`, `flex-auto`, `flex-initial` ;
  - largeurs : `w-`, `min-w-`, `max-w-` ;
  - `align-`.

  Les préfixes de variantes (`max-etroit:`…) sont permis devant. Le test `src/composants/briques/briques.test.ts` le vérifie.
- **Jamais de valeur arbitraire pour une couleur, une taille de texte, une police ou une ombre** (`bg-[#…]`, `text-[13px]`, `font-[…]`, `shadow-[…]`). Une valeur arbitraire de géométrie (`leading-[1.45]`, `rounded-[4px]`, `w-[1%]`) est permise à un ou deux endroits ; à partir de trois briques, elle devient un jeton.
- **Une variante ou un état nouveau** s'ajoute dans la brique (table de variantes, ou prop d'état rendue par ARIA ou `data-*`), puis dans `/vitrine`.
- **`src/styles/heritage.css` ne gagne aucun sélecteur.** Il ne fait que maigrir : `npx tsx scripts/heritage.ts elaguer` après chaque écran migré.
- **Banc strict** (`npm run test:conformite`, `maxDiffPixelRatio: 0.01`) vert à chaque commit des Tasks 1 à 15. Ne jamais le lancer en même temps que `npm run test:e2e` : les deux remettent la même base à zéro.
- **Sélecteurs E2E** : rôles, libellés, puis `data-testid`. Jamais une classe de style, sauf `g-*` (Gantt) et les classes des feuilles imprimables (`.cp-somme`…).
- **Surcouches** : `data-surcouche="panneau" | "menu" | "confirmation" | "apercu"`, `data-ouvert` (présent quand elle est ouverte), `data-verrou-defilement` (présent quand elle fige la page). Plus aucun `querySelector` sur une classe de style.
- **`hover:`** est redéfini en `&:hover:not(:disabled)` : un contrôle désactivé ne réagit pas au survol. C'est l'intention de `.btn:disabled:hover` dans `maquette-ajouts.css`, sans l'enveloppe `@media (hover: hover)` de Tailwind 4.
- **Tout en français** : noms, commentaires, messages de commit. Un commit par tâche, terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Vérifications de fin de tâche** : `npx tsc --noEmit`, `npm run lint`, `npm test`. Puis, pour toute tâche qui touche un écran, `npm run test:e2e` puis `npm run test:conformite`, l'un après l'autre (chacun reconstruit l'app : 1 à 2 minutes avant le premier test). `npm run test:int` (le métier, inchangé) se lance aux Tasks 1 et 16.

## Review Focus

1. **Échap avec des surcouches empilées** : une confirmation sur un panneau, un menu ouvert dans un panneau ou dans un aperçu. Échap ne ferme que la plus haute. Avant ce plan, ce tri reposait sur des classes (`.ask.is-on`, `.dd.is-open`, `.panel.is-on`). Tests, Task 6 (`e2e/vitrine.spec.ts`) :
   - « Échap referme le menu ouvert dans le panneau, pas le panneau » ;
   - « Échap annule la confirmation ouverte sur le panneau, pas le panneau ».
2. **La page de derrière défile alors qu'une surcouche est ouverte** (panneau, confirmation ou aperçu), ou reste figée après sa fermeture. Le verrou passe de `html:has(.panel.is-on)` à `html:has([data-verrou-defilement])`. Test, Task 6 : « le panneau et la confirmation figent la page ; leur fermeture la libère ».
3. **Thème sombre** : un jeton sans valeur sombre, l'orangé des réserves, une brique qui pose une couleur claire en dur. Test, Task 6 : les captures de la vitrine en sombre, une par section et par surcouche.
4. **Choix segmenté au clavier** : « Type de mission » quitte des boutons radio natifs cachés (`display: none`, donc inaccessibles au clavier) pour des `role="radio"` focalisables. Tab puis Espace doit choisir. Test, Task 10 : « choisit la mission au clavier » (`e2e/chantiers.spec.ts`).
5. **Libellés longs** : une valeur de menu, un nom de chantier ou une désignation très longs doivent se tronquer (`truncate`), jamais pousser la mise en page. Test, Task 6 : « une valeur longue se tronque dans le bouton du menu, sans l’élargir » (`e2e/vitrine.spec.ts`), et la section « menus » de la vitrine capturée avec une valeur longue.

## Carte des fichiers

```
src/styles/
  jetons.css                 jetons de l'identité, un par ligne : light-dark(clair, sombre)        (T1)
  theme.css                  @theme inline : le vocabulaire Tailwind réduit à l'identité          (T1)
  base.css                   @font-face, @layer base : body, titres, focus, verrou de défilement  (T1)
  heritage.css               l'ancien CSS de la maquette, figé, qui ne fait que maigrir           (T1 → supprimé T16)
  heritage.selecteurs.txt    la liste figée de ses sélecteurs                                     (T1 → supprimé T16)
  heritage.ts / .test.ts     lire, élaguer, vérifier l'héritage                                   (T1 → supprimés T16)
scripts/heritage.ts          npx tsx scripts/heritage.ts elaguer | retirer | restes | figer       (T1 → supprimé T16)
src/composants/briques/      (ex-maquette/, renommé T2)
  cx.ts, typo.ts             jonction de classes ; CHIFFRES, SURTITRE, CLE                        (T2)
  Bouton, Pastille, Surtitre, Etiquette, LienAction; briques.test.ts (garde-fou)                  (T2)
  Champ (Champ, Saisie, ZoneTexte, GrilleChamps, GroupeChamps, ColonnesFormulaire,
         PiedFormulaire, Erreur, classesSaisie), ChoixSegmente; Interrupteur, Recherche restylés   (T3)
  Carte, Bloc, CleValeur, Vide, Tableau (CadreTableau, Tableau), BarreOutils,
  Onglet (BarreOnglets, Onglet); Ecran, Sigle restylés                                            (T4)
  surcouches.ts; Panneau, MenuDeroulant (+ MENU), Confirmation, Toasts restylés                    (T5)
  vitrine/Vitrine.tsx, vitrine/ouverte.ts                                                         (T6)
  EcranCentre (EcranCentre, FormulaireCentre)                                                     (T7)
  CadreApercu restylé (+ NoteApercu)                                                              (T12)
src/composants/documents/CaseDocument.tsx   la case d'un document (tons, tailles)                 (T12)
src/composants/planning/planning.css        le Gantt et le tableau des périodes (l'exception)     (T13)
src/app/(app)/vitrine/page.tsx              la vitrine                                            (T6)
e2e/vitrine.spec.ts                         surcouches empilées, verrou, troncature               (T6)
e2e/artisans.spec.ts                        fiche refusée, archivage et réactivation              (T14)
e2e/conformite/ → e2e/visuel/               le banc ; bascule en non-régression                   (T6, T13, T14, T15, T16)
docs/interface.md, docs/maquette/LISEZMOI.md, README.md                                          (T16)
```

## Conventions communes à toutes les tâches

- **Composer des classes** : `cx('a', condition && 'b', autre)`. Deux classes qui posent la même propriété ne coexistent jamais dans un même `cx` : on choisit l'une **ou** l'autre (`actif ? 'text-accent' : 'text-muted'`). L'ordre des utilitaires dans la feuille générée ne doit jamais trancher.
- **Cellules de tableau** (brique `Tableau`). Ces attributs passent par la brique, parce que ses sélecteurs descendants (`.x thead th`) battraient un utilitaire posé sur la cellule. Un attribut absent s'écrit `undefined`, jamais `false`.
  - `data-droite` : aligné à droite (ex-`.ta-r`) ;
  - `data-saisie` : cellule qui porte un champ, rembourrage horizontal nul (ex-`.is-editable`) ;
  - `data-actions` : boutons d'action, sans retour à la ligne, 0,375 rem entre deux boutons (ex-`.cell-actions`) ;
  - `data-vide` : ligne « aucun résultat » (ex-`tr.empty-row td`) ;
  - `data-premiere` : colonne « Lot et entreprise » du tableau Documents (ex-`.dm-lot`) ;
  - sur la ligne : `data-ouvert` (ex-`.is-open`) et `data-inactif` (ex-`.is-unassigned`, `.is-archived`).
- **Les blancs comptent.** Le banc compare au pixel. Une espace entre deux boutons en ligne (`{' '}`) existe là où la maquette en a une (Artisans), et nulle part ailleurs (Comptes). Un texte JSX coupé par un retour à la ligne perd son espace : garder la phrase sur une ligne.
- **Un `Surtitre` au-dessus d'un titre** : l'envelopper dans `<div className="flex flex-col">`. Sinon le `span` en ligne ajoute environ 4 px d'interligne (Task 5, `Panneau` ; Task 12, `CadreApercu`).
- **Pas d'utilitaire `block` tant que `.block` existe dans l'héritage** (Tasks 1 à 14). Le test de l'héritage le refuse. Utiliser `flow-root`, ou un `div`.
- **Collisions de noms.** Un type local qui porte le nom d'une brique est renommé :
  - `Saisie` (type du formulaire chantier) devient `Valeurs` ;
  - le type de domaine `Carte` devient `DonneesCarte` à l'import ;
  - la brique s'importe en `CarteBrique` dans `CartesDocuments`.
- **Correspondances d'unités** : la grille Tailwind vaut `0.25rem`.

  | rem | utilitaire |
  |---|---|
  | `0.0625rem` | `0.25` |
  | `0.1875rem` | `0.75` |
  | `0.3125rem` | `1.25` |
  | `0.4375rem` | `1.75` |
  | `0.5625rem` | `2.25` |
  | `0.6875rem` | `2.75` |
  | `0.8125rem` | `3.25` |

  Tailles de texte : `text-9` (0,5625 rem) … `text-40` (2,5 rem), d'après les pixels.
- **Si le banc échoue** : ouvrir `test-results/<écran>-…/<écran>-diff.png`.
  - Un écart de 1 ou 2 px dû au preflight (marge d'un `<p>`, rembourrage d'un `input`, interligne d'un `span`) se corrige dans la brique, jamais par un masque.
  - Un vrai désaccord, quand la maquette avait un défaut que la brique corrige, se décrit dans le message de commit et devient un masque explicite, commenté ; ces masques partent à la Task 16.
  - Deux causes déjà rencontrées : le surtitre en ligne (+4 px), et l'espace entre deux boutons (colonnes décalées de 4 px).
- **Après chaque migration d'écran** :

  ```bash
  npx tsx scripts/heritage.ts elaguer
  npx tsx scripts/heritage.ts restes <fichiers migrés>
  ```

  - `elaguer` retire de l'héritage les sélecteurs dont une classe n'apparaît plus dans aucune chaîne du code.
  - `restes` liste les classes de l'héritage encore écrites dans les fichiers migrés. Il ne doit rien afficher, sauf des faux positifs (voir plus bas).
  - Un mot peut survivre ailleurs que dans une classe : un nom de variante, un texte, un type d'`input`. Sa règle reste alors, bien que plus rien ne l'utilise : `npx tsx scripts/heritage.ts retirer <mot>…` la retire. Chaque tâche donne les mots à retirer et le nombre de sélecteurs attendu.
  - Faux positifs connus de `restes`, qui découpe les chaînes en mots :
    - `grand` : `.total-v.grand` jusqu'à la Task 11 ;
    - `num` : « numéro », puisque `\w` exclut « é » ;
    - `moins` : « au moins » ;
    - `erreur`, `compte`, `chantier` : dans des messages ;
    - `g-corps` : un id ;
    - `plain`, `dm`, `lots`, `kv` : des noms de variantes ;
    - `block` : `dark:block` dans `Sigle`.
  - Relire `git diff --stat src/styles/heritage.css` avant de commiter.

---

### Task 1 : la fondation (jetons, thème, base, héritage)

Le rendu ne change pas. La couche shadcn de `globals.css` et l'extracteur de la maquette disparaissent. Les jetons passent en `light-dark()`, le thème Tailwind est réduit à l'identité, et l'ancien CSS de la maquette est figé en héritage. La seule retouche visible est l'ombre de la feuille d'impression du planning (`FeuilleUnique`) : `shadow-md` n'existe plus une fois les ombres par défaut retirées, elle devient `shadow-ombre` (risque prévu par la spec, § 8).

**Files :**
- Create : `src/styles/jetons.css`, `src/styles/theme.css`, `src/styles/base.css`, `src/styles/heritage.ts`, `src/styles/heritage.test.ts`, `scripts/heritage.ts`
- Create (par commande) : `src/styles/heritage.selecteurs.txt`
- Rename + Modify : `src/app/maquette.css` → `src/styles/heritage.css` (le correctif le renomme)
- Modify : `src/app/globals.css`, `package.json`, `package-lock.json` (par `npm install`), `src/composants/planning/FeuilleUnique.tsx:35`
- Delete : `src/app/maquette-ajouts.css` (son contenu est à la fin de `heritage.css`), `src/app/maquette.test.ts`, `scripts/extraire-css-maquette.mjs`, `components.json`

**Interfaces :**
- Consumes : rien.
- Produces :
  - **Utilitaires Tailwind** (toutes les tâches suivantes n'utilisent que ceux-là) :
    - couleurs : `paper`, `surface`, `raise`, `ink`, `ink-2`, `muted`, `faint`, `rule`, `rule-strong`, `accent`, `accent-2`, `accent-soft`, `on-accent`, `focus`, `danger`, `danger-soft`, `alerte`, `alerte-soft`, `alerte-trait`, `idle-soft`, `band`, `bar-ring`, `voile` ;
    - textes : `text-9` à `text-40` (9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 24, 40) ;
    - rondeurs : `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg` ;
    - ombres : `shadow-ombre`, `shadow-ombre-h`, `shadow-ombre-toast` ;
    - polices : `font-sans`, `font-titre`, `font-mono` ;
    - divers : `tracking-capitales`, `animate-monte`, variante `max-etroit:` ;
    - variantes redéfinies : `hover:` (`&:hover:not(:disabled)`) et `dark:` (suit `data-theme`).
  - **`src/styles/heritage.ts`** : `FICHIER_HERITAGE`, `FICHIER_SELECTEURS`, `normaliser`, `classesDe`, `selecteursDe`, `fichiersSources`, `chainesDe`, `motsDesChaines`, `selecteursMorts`, `elaguer`, `correspond`, `lireHeritage`, `lireSelecteursFiges`.
  - **Script** : `npx tsx scripts/heritage.ts elaguer | retirer <classe|préfixe-*>… | restes <fichier>… | figer`.

- [ ] **Step 1 : écrire les tests de l'héritage**

Les outils (lire les classes d'un sélecteur, les chaînes d'un fichier, élaguer), puis les deux règles : aucun nouveau sélecteur, aucune règle morte. Le test « block » de l'ancien `maquette.test.ts` migre ici.

```ts
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	chainesDe, classesDe, correspond, elaguer, fichiersSources, lireHeritage, lireSelecteursFiges, motsDesChaines,
	normaliser, selecteursDe, selecteursMorts,
} from './heritage';

function fichierTemporaire(nom: string, contenu: string): string {
	const chemin = path.join(mkdtempSync(path.join(tmpdir(), 'heritage-')), nom);
	writeFileSync(chemin, contenu);
	return chemin;
}

describe('outils de l\'héritage', () => {
	it('normalise les blancs d\'un sélecteur', () => {
		expect(normaliser('table.lots\n\tthead   th')).toBe('table.lots thead th');
	});

	it('lit les classes d\'un sélecteur, états compris', () => {
		expect(classesDe('.chantier-actions .btn:hover')).toEqual(['chantier-actions', 'btn']);
		expect(classesDe(":root[data-theme='dark'] .dm-case.est-alerte")).toEqual(['dm-case', 'est-alerte']);
		expect(classesDe('table thead th')).toEqual([]);
	});

	it('compte un sélecteur par entrée, sans les images clés', () => {
		expect(selecteursDe('.a, .b .c { color: red } @keyframes k { from { opacity: 0 } to { opacity: 1 } }')).toEqual(['.a', '.b .c']);
	});

	it('lit les chaînes d\'un fichier, gabarits compris, sans le texte JSX', () => {
		const f = fichierTemporaire('a.tsx', "const x = <p className={`btn ${y ? 'is-on' : ''}`}>Le btn-texte</p>;\nconst z = \"dm-case\";");
		expect(chainesDe(f).filter(Boolean)).toEqual(['btn ', 'is-on', 'dm-case']);
		expect([...motsDesChaines([f])].sort()).toEqual(['btn', 'dm-case', 'is-on']);
	});

	it('un sélecteur meurt dès qu\'une de ses classes n\'est plus écrite', () => {
		const css = '.btn { } .chantier-actions .btn { } table thead th { }';
		expect(selecteursMorts(css, new Set(['btn']))).toEqual(['.chantier-actions .btn']);
	});

	it('élague sélecteurs, règles, @media et images clés devenus vides', () => {
		const css = '.a, .b { color: red } @media (max-width: 60rem) { .b { color: blue } } .c { animation: monte 1s } @keyframes monte { to { opacity: 1 } } @keyframes rise { to { opacity: 0 } }';
		const garde = elaguer(css, (s) => s !== '.b');
		expect(selecteursDe(garde)).toEqual(['.a', '.c']);
		expect(garde).not.toContain('@media');
		expect(garde).toContain('@keyframes monte');
		expect(garde).not.toContain('@keyframes rise');
	});

	it('reconnaît une classe exacte ou un préfixe', () => {
		expect(correspond('g-bar', ['g-*'])).toBe(true);
		expect(correspond('gantt', ['g-*'])).toBe(false);
		expect(correspond('lots', ['lots'])).toBe(true);
	});
});

describe('héritage de la maquette (src/styles/heritage.css)', () => {
	const css = lireHeritage();

	it('ne gagne aucun sélecteur : on migre vers une brique au lieu de le rafistoler', () => {
		const figes = lireSelecteursFiges();
		expect(selecteursDe(css).filter((s) => !figes.has(s))).toEqual([]);
	});

	it('ne garde aucune règle morte (npx tsx scripts/heritage.ts elaguer)', () => {
		expect(selecteursMorts(css, motsDesChaines(fichiersSources()))).toEqual([]);
	});

	// .block (le bloc de la maquette) et l'utilitaire Tailwind « block » portent le même nom : tant que l'héritage
	// garde .block, l'utilitaire collerait au premier le cadre du second.
	it('aucune chaîne ne mêle l\'utilitaire « block » à d\'autres classes tant que .block existe', () => {
		if (!selecteursDe(css).some((s) => classesDe(s).includes('block'))) return;
		const fautives = fichiersSources().flatMap((f) => chainesDe(f)
			.filter((c) => { const jetons = c.trim().split(/\s+/); return jetons.length > 1 && jetons.includes('block'); })
			.map((c) => `${f} : « ${c} »`));
		expect(fautives).toEqual([]);
	});
});
```

- [ ] **Step 2 : le lancer**

Run : `npx vitest run src/styles/heritage.test.ts`
Expected : FAIL, « Failed to resolve import "./heritage" ».

- [ ] **Step 3 : écrire les outils et le script**

`src/styles/heritage.ts` :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Rule } from 'postcss';
import ts from 'typescript';

/*
 * L'héritage de la maquette (heritage.css) ne fait que maigrir pendant la migration vers les briques :
 * aucun sélecteur nouveau (la liste figée), aucune règle morte (une classe que plus rien n'écrit).
 * Outils lus par heritage.test.ts et par scripts/heritage.ts. Ils disparaissent avec l'héritage.
 */

export const FICHIER_HERITAGE = path.join('src', 'styles', 'heritage.css');
export const FICHIER_SELECTEURS = path.join('src', 'styles', 'heritage.selecteurs.txt');

/** Un sélecteur sans ses blancs superflus : la liste figée ne dépend pas de la mise en forme. */
export function normaliser(selecteur: string): string {
	return selecteur.replace(/\s+/g, ' ').trim();
}

/** Les classes citées par un sélecteur : « .chantier-actions .btn:hover » → chantier-actions, btn. */
export function classesDe(selecteur: string): string[] {
	return [...selecteur.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

const dansKeyframes = (r: Rule) => r.parent?.type === 'atrule' && /keyframes$/.test((r.parent as AtRule).name);

/** Les sélecteurs d'une feuille, un par entrée (une règle à trois sélecteurs en donne trois) ; les images clés n'en sont pas. */
export function selecteursDe(css: string): string[] {
	const sortie: string[] = [];
	postcss.parse(css).walkRules((r) => {
		if (!dansKeyframes(r)) sortie.push(...r.selectors.map(normaliser));
	});
	return sortie;
}

/** Le code qui peut écrire une classe : src/**\/*.{ts,tsx}, sans les tests, le client Prisma, le CSS des feuilles imprimables ni src/styles. */
export function fichiersSources(dossier = 'src'): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' || chemin === path.join('src', 'styles') ? [] : fichiersSources(chemin);
		if (!/\.tsx?$/.test(e.name) || /\.test\.tsx?$/.test(e.name)) return [];
		return chemin === path.join('src', 'documents', 'styles.ts') ? [] : [chemin];
	});
}

/** Toutes les chaînes littérales d'un fichier : '…', "…", `…` (morceaux d'un gabarit compris). Le texte JSX n'en est pas. */
export function chainesDe(fichier: string): string[] {
	const sortie: string[] = [];
	const source = ts.createSourceFile(fichier, readFileSync(fichier, 'utf8'), ts.ScriptTarget.Latest, true,
		fichier.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
	const visiter = (n: ts.Node): void => {
		if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) sortie.push(n.text);
		else if (ts.isTemplateExpression(n)) sortie.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
		ts.forEachChild(n, visiter);
	};
	visiter(source);
	return sortie;
}

/** Les mots des chaînes littérales (« btn btn-sm » → btn, btn-sm) : une classe absente de cet ensemble n'est plus écrite nulle part. */
export function motsDesChaines(fichiers: string[]): Set<string> {
	return new Set(fichiers.flatMap(chainesDe).flatMap((c) => c.split(/[^\w-]+/)).filter(Boolean));
}

/** Un sélecteur est mort dès qu'une de ses classes n'est plus écrite. Les sélecteurs sans classe ne meurent jamais. */
export function selecteursMorts(css: string, mots: Set<string>): string[] {
	return selecteursDe(css).filter((s) => classesDe(s).some((c) => !mots.has(c)));
}

/**
 * Retire les sélecteurs que `garder` refuse, puis ce qu'ils laissent vide : règles, @media,
 * et @keyframes qu'aucune animation restante n'utilise.
 */
export function elaguer(css: string, garder: (selecteur: string) => boolean): string {
	const racine = postcss.parse(css);
	racine.walkRules((r) => {
		if (dansKeyframes(r)) return;
		const vivants = r.selectors.filter((s) => garder(normaliser(s)));
		if (!vivants.length) r.remove();
		else if (vivants.length < r.selectors.length) r.selectors = vivants;
	});
	for (let retire = true; retire;) {
		retire = false;
		racine.walkAtRules((a) => {
			if (a.name !== 'keyframes' && !a.nodes?.some((n) => n.type !== 'comment')) {
				a.remove();
				retire = true;
			}
		});
	}
	const animations = new Set<string>();
	racine.walkDecls(/^animation(-name)?$/, (d) => d.value.split(/[\s,]+/).forEach((m) => animations.add(m)));
	racine.walkAtRules(/keyframes$/, (a) => { if (!animations.has(a.params)) a.remove(); });
	return racine.toString();
}

/** « btn », ou un préfixe « g-* » : la classe correspond-elle à l'un des motifs ? */
export function correspond(classe: string, motifs: string[]): boolean {
	return motifs.some((m) => (m.endsWith('*') ? classe.startsWith(m.slice(0, -1)) : classe === m));
}

export const lireHeritage = () => readFileSync(FICHIER_HERITAGE, 'utf8');
export const lireSelecteursFiges = () => new Set(readFileSync(FICHIER_SELECTEURS, 'utf8').split('\n').filter(Boolean));
```

`scripts/heritage.ts` :

```ts
// L'héritage de la maquette (src/styles/heritage.css) pendant la migration vers les briques.
//   npx tsx scripts/heritage.ts elaguer             retire les sélecteurs dont une classe n'est plus écrite nulle part
//   npx tsx scripts/heritage.ts retirer lots 'g-*'  retire les sélecteurs qui citent ces classes (mot encore présent ailleurs, règle déplacée)
//   npx tsx scripts/heritage.ts restes <fichiers>   les classes de l'héritage encore écrites dans ces fichiers
//   npx tsx scripts/heritage.ts figer               fige la liste des sélecteurs (une seule fois, à la création)
import { existsSync, writeFileSync } from 'node:fs';
import {
	classesDe, correspond, elaguer, FICHIER_HERITAGE, FICHIER_SELECTEURS, fichiersSources, lireHeritage,
	lireSelecteursFiges, motsDesChaines, selecteursDe,
} from '../src/styles/heritage';

const [commande, ...args] = process.argv.slice(2);

/** Réécrit l'héritage ; la liste figée ne perd que ce qui a disparu, elle ne gagne jamais rien. */
function ecrire(css: string, avant: number) {
	writeFileSync(FICHIER_HERITAGE, css);
	const apres = selecteursDe(css);
	if (existsSync(FICHIER_SELECTEURS)) {
		const restants = new Set(apres);
		const liste = [...lireSelecteursFiges()].filter((s) => restants.has(s));
		writeFileSync(FICHIER_SELECTEURS, liste.join('\n') + '\n');
	}
	console.log(`${avant - apres.length} sélecteur(s) retiré(s), ${apres.length} restant(s).`);
}

const css = lireHeritage();
const avant = selecteursDe(css).length;

if (commande === 'elaguer') {
	const mots = motsDesChaines(fichiersSources());
	ecrire(elaguer(css, (s) => classesDe(s).every((c) => mots.has(c))), avant);
} else if (commande === 'retirer' && args.length) {
	ecrire(elaguer(css, (s) => !classesDe(s).some((c) => correspond(c, args))), avant);
} else if (commande === 'restes' && args.length) {
	const classes = new Set(selecteursDe(css).flatMap(classesDe));
	for (const f of args) {
		const vues = [...motsDesChaines([f])].filter((m) => classes.has(m));
		if (vues.length) console.log(`${f} : ${vues.sort().join(' ')}`);
	}
} else if (commande === 'figer') {
	const liste = [...new Set(selecteursDe(css))];
	writeFileSync(FICHIER_SELECTEURS, liste.join('\n') + '\n');
	console.log(`${liste.length} sélecteur(s) figé(s) dans ${FICHIER_SELECTEURS}.`);
} else {
	console.error('Usage : npx tsx scripts/heritage.ts elaguer | retirer <classe|préfixe-*>… | restes <fichier>… | figer');
	process.exitCode = 1;
}
```

- [ ] **Step 4 : poser les jetons, le thème et la base**

`src/styles/jetons.css` : les jetons de `:root` de la maquette, un par ligne. Les valeurs sombres viennent de ses deux blocs sombres, réunis par `light-dark()`. On y ajoute `alerte*` (écrit en dur sous `.dm-case.est-alerte` dans la maquette), `voile` et `ombre-toast`.

```css
/* L'identité « bleu de plan » de la maquette : un jeton par ligne, light-dark(clair, sombre).
   data-theme (posé par SCRIPT_THEME, changé par basculerTheme) choisit le thème ; sans lui, le système décide. */
:root { color-scheme: light dark; }
:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark'] { color-scheme: dark; }

:root {
	/* surfaces — en sombre, pas un noir neutre : l'ardoise prussienne du cyanotype */
	--paper: light-dark(#eceef0, #14202b);
	--surface: light-dark(#f6f8f9, #1b2a37);
	--raise: light-dark(#ffffff, #223442);
	/* texte */
	--ink: light-dark(#101619, #e9eff5);
	--ink-2: light-dark(#38424a, #c3d1dd);
	--muted: light-dark(#6b747c, #8fa4b5);
	--faint: light-dark(#97a0a7, #748a9d);
	/* filets */
	--rule: light-dark(#d0d5da, #2d4050);
	--rule-strong: light-dark(#b2bac1, #43596d);
	/* accent ; on-accent : le texte porté par un aplat d'accent */
	--accent: light-dark(#1c4e80, #6fb0e8);
	--accent-2: light-dark(#143a60, #9ccbf2);
	--accent-soft: light-dark(#dbe6f1, #1c3a52);
	--on-accent: light-dark(#ffffff, #0d1720);
	--focus: light-dark(#1c4e80, #6fb0e8);
	/* danger */
	--danger: light-dark(#8c1d18, #f08c84);
	--danger-soft: light-dark(#f7e2e0, #3d2226);
	/* alerte orangée : réserves à suivre (écrite en dur sous .dm-case.est-alerte dans la maquette) */
	--alerte: light-dark(#7a3d00, #f2c38a);
	--alerte-soft: light-dark(#fbeedd, #3d2e1c);
	--alerte-trait: #b35c00;
	/* divers */
	--idle-soft: light-dark(#e0e4e8, #27394a);
	--band: light-dark(rgba(16, 22, 25, 0.06), rgba(255, 255, 255, 0.06));
	/* liseré des barres du planning : il cerne aussi bien un lot clair qu'un lot noir */
	--bar-ring: light-dark(rgba(0, 0, 0, 0.22), rgba(255, 255, 255, 0.30));
	/* voile des surcouches, dosé par l'opacité de Tailwind (bg-voile/42, bg-voile/50) */
	--voile: rgb(10 14 16);
	/* rondeur ; les fac-similés imprimés gardent leurs angles vifs */
	--r-xs: 5px;
	--r-sm: 9px;
	--r: 14px;
	--r-lg: 18px;
	/* élévation — en sombre elle creuse plus qu'elle ne soulève. Les deux thèmes n'ont pas le même flou :
	   chaque couche garde sa géométrie et devient transparente dans l'autre thème. */
	--ombre: 0 1px 2px light-dark(rgba(16, 22, 25, 0.04), rgba(0, 0, 0, 0.40)), 0 6px 16px -4px light-dark(rgba(16, 22, 25, 0.10), rgba(0, 0, 0, 0.50));
	--ombre-h: 0 2px 4px light-dark(rgba(16, 22, 25, 0.05), transparent), 0 2px 6px light-dark(transparent, rgba(0, 0, 0, 0.50)), 0 14px 30px -8px light-dark(rgba(16, 22, 25, 0.18), rgba(0, 0, 0, 0.60));
	--ombre-toast: 0 4px 16px rgba(0, 0, 0, 0.18);
	/* planning : largeur d'une semaine (le Gantt la redéfinit selon la densité) */
	--sem-w: 26px;
}
```

`src/styles/theme.css` :

```css
/* Le vocabulaire Tailwind réduit à l'identité : plus de bg-red-500 ni de text-sm, seulement les jetons de jetons.css. */
@theme inline {
	--color-*: initial;
	--color-paper: var(--paper);
	--color-surface: var(--surface);
	--color-raise: var(--raise);
	--color-ink: var(--ink);
	--color-ink-2: var(--ink-2);
	--color-muted: var(--muted);
	--color-faint: var(--faint);
	--color-rule: var(--rule);
	--color-rule-strong: var(--rule-strong);
	--color-accent: var(--accent);
	--color-accent-2: var(--accent-2);
	--color-accent-soft: var(--accent-soft);
	--color-on-accent: var(--on-accent);
	--color-focus: var(--focus);
	--color-danger: var(--danger);
	--color-danger-soft: var(--danger-soft);
	--color-alerte: var(--alerte);
	--color-alerte-soft: var(--alerte-soft);
	--color-alerte-trait: var(--alerte-trait);
	--color-idle-soft: var(--idle-soft);
	--color-band: var(--band);
	--color-bar-ring: var(--bar-ring);
	--color-voile: var(--voile);

	/* Les 13 tailles de la maquette, nommées d'après leur valeur en pixels. Sans interligne : il s'hérite, comme dans la maquette. */
	--text-*: initial;
	--text-9: 0.5625rem;
	--text-10: 0.625rem;
	--text-11: 0.6875rem;
	--text-12: 0.75rem;
	--text-13: 0.8125rem;
	--text-14: 0.875rem;
	--text-15: 0.9375rem;
	--text-16: 1rem;
	--text-17: 1.0625rem;
	--text-18: 1.125rem;
	--text-22: 1.375rem;
	--text-24: 1.5rem;
	--text-40: 2.5rem;

	--radius-*: initial;
	--radius-xs: var(--r-xs);
	--radius-sm: var(--r-sm);
	--radius-md: var(--r);
	--radius-lg: var(--r-lg);

	--shadow-*: initial;
	--shadow-ombre: var(--ombre);
	--shadow-ombre-h: var(--ombre-h);
	--shadow-ombre-toast: var(--ombre-toast);

	--font-sans: 'Figtree', system-ui, sans-serif;
	--font-titre: 'Outfit', 'Figtree', sans-serif;
	--font-mono: 'Spline Sans Mono', ui-monospace, monospace;

	/* Les petites capitales des clés (« CLIENT », « TOTAL MARCHÉS HT ») */
	--tracking-capitales: 0.08em;

	/* Le seul point de rupture de la maquette : max-etroit: */
	--breakpoint-*: initial;
	--breakpoint-etroit: 60rem;

	/* L'entrée d'un message (ex-@keyframes rise) */
	--animate-monte: monte 0.2s ease;
	@keyframes monte {
		from { opacity: 0; transform: translateY(0.5rem); }
		to { opacity: 1; transform: none; }
	}
}

/* Comme la maquette : pas d'enveloppe @media (hover: hover). Un contrôle désactivé ne réagit pas au survol. */
@custom-variant hover (&:hover:not(:disabled));

/* Le thème suit l'interrupteur de la barre (data-theme), sinon le système — comme la maquette. */
@custom-variant dark {
	&:where([data-theme='dark'], [data-theme='dark'] *) { @slot; }
	@media (prefers-color-scheme: dark) { &:where(:root:not([data-theme='light']), :root:not([data-theme='light']) *) { @slot; } }
}
```

`src/styles/base.css` : les `@font-face` de l'ancien `globals.css`, et les règles d'éléments de la maquette. Le verrou de défilement s'accroche à `[data-verrou-defilement]`. Ses porteurs arrivent à la Task 5 ; d'ici là, `heritage.css` garde l'ancien verrou par classe.

```css
/* Les polices de la maquette, servies localement (public/polices, scripts/copier-polices.mjs). */
@font-face { font-family: 'Figtree'; font-weight: 400; font-display: swap; src: url('/polices/figtree-400.woff2') format('woff2'); }
@font-face { font-family: 'Figtree'; font-weight: 500; font-display: swap; src: url('/polices/figtree-500.woff2') format('woff2'); }
@font-face { font-family: 'Figtree'; font-weight: 600; font-display: swap; src: url('/polices/figtree-600.woff2') format('woff2'); }
@font-face { font-family: 'Outfit'; font-weight: 500; font-display: swap; src: url('/polices/outfit-500.woff2') format('woff2'); }
@font-face { font-family: 'Outfit'; font-weight: 600; font-display: swap; src: url('/polices/outfit-600.woff2') format('woff2'); }
@font-face { font-family: 'Outfit'; font-weight: 700; font-display: swap; src: url('/polices/outfit-700.woff2') format('woff2'); }
@font-face { font-family: 'Spline Sans Mono'; font-weight: 400; font-display: swap; src: url('/polices/spline-sans-mono-400.woff2') format('woff2'); }
@font-face { font-family: 'Spline Sans Mono'; font-weight: 500; font-display: swap; src: url('/polices/spline-sans-mono-500.woff2') format('woff2'); }
@font-face { font-family: 'Spline Sans Mono'; font-weight: 600; font-display: swap; src: url('/polices/spline-sans-mono-600.woff2') format('woff2'); }

/* Les règles d'éléments de la maquette, après le preflight de Tailwind. */
@layer base {
	/* Filet par défaut d'un élément bordé qui ne nomme pas sa couleur (la couche shadcn le posait déjà). */
	* { border-color: var(--rule); }

	body {
		margin: 0;
		background: var(--paper);
		color: var(--ink);
		font-family: 'Figtree', system-ui, -apple-system, sans-serif;
		font-size: 0.875rem;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}

	button, input, select, textarea { font: inherit; color: inherit; }

	:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	h1, h2, h3 {
		font-family: 'Outfit', 'Figtree', sans-serif;
		font-weight: 600;
		text-wrap: balance;
		margin: 0;
		letter-spacing: -0.005em;
	}

	/* Une surcouche ouverte (panneau, confirmation, aperçu) fige la page de derrière : la molette ne fait défiler qu'elle. */
	html:has([data-verrou-defilement]) { overflow: hidden; }

	@media (prefers-reduced-motion: reduce) {
		* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
	}
}
```

`src/app/globals.css` (remplace tout le fichier : la couche shadcn disparaît) :

```css
/* L'entrée unique du style. Tailwind, puis l'identité (jetons → thème → base), puis l'héritage de la maquette.
   Un composant n'importe jamais de CSS : la doc de Next 16 prévient qu'une feuille globale importée par un
   composant n'est pas retirée quand on change de route. */
@import 'tailwindcss';
@import '../styles/jetons.css';
@import '../styles/theme.css';
@import '../styles/base.css';
/* Au-dessus du preflight, sous les utilitaires : une règle restée là ne peut pas écraser une brique. */
@import '../styles/heritage.css' layer(components);
```

- [ ] **Step 5 : figer l'héritage**

Le correctif renomme `src/app/maquette.css` en `src/styles/heritage.css`. Il en retire :
- les jetons (partis dans `jetons.css`) ;
- les règles d'éléments (parties dans `base.css`) ;
- les règles qu'aucun code n'utilise (écrans propres à la maquette, `.app`, démonstration…).

Il ajoute en tête un commentaire, et à la fin le contenu vivant de `maquette-ajouts.css`.

```diff
diff --git a/src/app/maquette.css b/src/styles/heritage.css
similarity index 92%
rename from src/app/maquette.css
rename to src/styles/heritage.css
index 6dc0770..b82b258 100644
--- a/src/app/maquette.css
+++ b/src/styles/heritage.css
@@ -1,119 +1,8 @@
-/* GÉNÉRÉ par scripts/extraire-css-maquette.mjs depuis docs/maquette/sentinelle-marches.html.
-   Ne pas éditer : relancer le script. Les ajouts propres à l'app vont dans maquette-ajouts.css. */
-/* ============================================================
-   JETONS — palette bleu de plan
-   ============================================================ */
-:root {
-	--paper: #eceef0;
-	--surface: #f6f8f9;
-	--raise: #ffffff;
-	--ink: #101619;
-	--ink-2: #38424a;
-	--muted: #6b747c;
-	--faint: #97a0a7;
-	--rule: #d0d5da;
-	--rule-strong: #b2bac1;
-	--accent: #1c4e80;
-	--accent-2: #143a60;
-	--accent-soft: #dbe6f1;
-	/* texte porté par un aplat d'accent : blanc en clair, encre sombre sur le bleu pâle du thème sombre */
-	--on-accent: #ffffff;
-	--danger: #8c1d18;
-	--danger-soft: #f7e2e0;
-	--idle-soft: #e0e4e8;
-	--band: rgba(16, 22, 25, 0.06);
-	/* liseré des barres du planning : il doit cerner aussi bien un lot clair qu'un lot noir */
-	--bar-ring: rgba(0, 0, 0, 0.22);
-	--focus: #1c4e80;
-	/* Échelle de rondeur et d'élévation : la DA repose dessus, elle se règle ici.
-	   Les fac-similés imprimés gardent leurs angles vifs, ils imitent du papier. */
-	--r-xs: 5px;
-	--r-sm: 9px;
-	--r: 14px;
-	--r-lg: 18px;
-	--ombre: 0 1px 2px rgba(16, 22, 25, 0.04), 0 6px 16px -4px rgba(16, 22, 25, 0.10);
-	--ombre-h: 0 2px 4px rgba(16, 22, 25, 0.05), 0 14px 30px -8px rgba(16, 22, 25, 0.18);
-	--sem-w: 26px;
-}
-
-@media (prefers-color-scheme: dark) {
-	:root:not([data-theme='light']) {
-		/* pas un noir neutre : l'ardoise prussienne du cyanotype, négatif du bleu de plan */
-		--paper: #14202b;
-		--surface: #1b2a37;
-		--raise: #223442;
-		--ink: #e9eff5;
-		--ink-2: #c3d1dd;
-		--muted: #8fa4b5;
-		--faint: #748a9d;
-		--rule: #2d4050;
-		--rule-strong: #43596d;
-		--accent: #6fb0e8;
-		--accent-2: #9ccbf2;
-		--accent-soft: #1c3a52;
-		--on-accent: #0d1720;
-		--danger: #f08c84;
-		--danger-soft: #3d2226;
-		--idle-soft: #27394a;
-		--band: rgba(255, 255, 255, 0.06);
-		--bar-ring: rgba(255, 255, 255, 0.30);
-		--focus: #6fb0e8;
-		/* sur fond sombre une ombre ne se voit pas : elle creuse, elle ne soulève pas */
-		--ombre: 0 1px 2px rgba(0, 0, 0, 0.40), 0 6px 16px -4px rgba(0, 0, 0, 0.50);
-		--ombre-h: 0 2px 6px rgba(0, 0, 0, 0.50), 0 14px 30px -8px rgba(0, 0, 0, 0.60);
-	}
-}
-
-:root[data-theme='dark'] {
-	/* pas un noir neutre : l'ardoise prussienne du cyanotype, négatif du bleu de plan */
-	--paper: #14202b;
-	--surface: #1b2a37;
-	--raise: #223442;
-	--ink: #e9eff5;
-	--ink-2: #c3d1dd;
-	--muted: #8fa4b5;
-	--faint: #748a9d;
-	--rule: #2d4050;
-	--rule-strong: #43596d;
-	--accent: #6fb0e8;
-	--accent-2: #9ccbf2;
-	--accent-soft: #1c3a52;
-	--on-accent: #0d1720;
-	--danger: #f08c84;
-	--danger-soft: #3d2226;
-	--idle-soft: #27394a;
-	--band: rgba(255, 255, 255, 0.06);
-	--bar-ring: rgba(255, 255, 255, 0.30);
-	--focus: #6fb0e8;
-	--ombre: 0 1px 2px rgba(0, 0, 0, 0.40), 0 6px 16px -4px rgba(0, 0, 0, 0.50);
-	--ombre-h: 0 2px 6px rgba(0, 0, 0, 0.50), 0 14px 30px -8px rgba(0, 0, 0, 0.60);
-}
-
-/* ============================================================
-   BASE
-   ============================================================ */
-* { box-sizing: border-box; }
-
-body {
-	margin: 0;
-	background: var(--paper);
-	color: var(--ink);
-	font-family: 'Figtree', system-ui, -apple-system, sans-serif;
-	font-size: 0.875rem;
-	line-height: 1.5;
-	-webkit-font-smoothing: antialiased;
-}
-
-button, input, select, textarea { font: inherit; color: inherit; }
-
-:focus-visible {
-	outline: 2px solid var(--focus);
-	outline-offset: 2px;
-}
-
-@media (prefers-reduced-motion: reduce) {
-	* { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
-}
+/* L'HÉRITAGE de la maquette : l'ancien src/app/maquette.css, sans ses jetons ni ses règles d'éléments
+   (partis dans jetons.css et base.css), suivi de l'ancien maquette-ajouts.css. Importé dans la couche
+   components : au-dessus du preflight, sous les utilitaires. Il ne fait que maigrir — aucun sélecteur
+   nouveau (heritage.selecteurs.txt), aucune règle morte (heritage.test.ts) — et disparaît à la fin de la
+   migration. Après chaque écran migré : npx tsx scripts/heritage.ts elaguer */
 
 .num {
 	font-family: 'Spline Sans Mono', ui-monospace, monospace;
@@ -130,14 +19,6 @@ button, input, select, textarea { font: inherit; color: inherit; }
 	color: var(--muted);
 }
 
-h1, h2, h3 {
-	font-family: 'Outfit', 'Figtree', sans-serif;
-	font-weight: 600;
-	text-wrap: balance;
-	margin: 0;
-	letter-spacing: -0.005em;
-}
-
 /* ============================================================
    ÉCRANS
    ============================================================ */
@@ -995,7 +876,7 @@ html:has(.gen.is-on), html:has(.panel.is-on), html:has(.ask.is-on) { overflow: h
 	cursor: default;
 	border: 1px solid transparent;
 }
-.frow:hover, .frow.lit { background: var(--accent-soft); border-color: var(--accent); }
+.frow:hover { background: var(--accent-soft); border-color: var(--accent); }
 .frow dt { font-size: 0.75rem; color: var(--muted); }
 .frow dd { margin: 0; font-size: 0.8125rem; word-break: break-word; }
 .frow dd .num { font-size: 0.8125rem; }
@@ -1472,8 +1353,6 @@ tr.dm-inactif .dm-lot-d, tr.dm-inactif .dm-lot-e { color: var(--muted); }
 
 /* ---------- certificat de paiement — fac-similé du certificat SOCOREVE ---------- */
 
-.cp-alerte { margin: 0; padding: 0.5rem 0.625rem; border: 1px solid var(--danger); border-radius: var(--r-sm); background: var(--danger-soft); color: var(--danger); font-size: 0.75rem; }
-
 /* ---------- procès-verbal de réception — fac-similé de « 3- PV de réception.ods » ---------- */
 /* « .sheet hr » l'emporterait sans le double sélecteur */
 .doc-link:hover { text-decoration: underline; }
@@ -1514,7 +1393,6 @@ tr.dm-inactif .dm-lot-d, tr.dm-inactif .dm-lot-e { color: var(--muted); }
 /* ============================================================
    TOAST
    ============================================================ */
-.toast-zone { position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%); z-index: 90; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; pointer-events: none; }
 .toast {
 	background: var(--ink);
 	color: var(--paper);
@@ -1582,3 +1460,71 @@ tr.dm-inactif .dm-lot-d, tr.dm-inactif .dm-lot-e { color: var(--muted); }
    et « table.plain thead th » l'emportaient sur .ta-r, si bien que les en-têtes des colonnes
    chiffrées restaient calés à gauche pendant que leurs cellules s'alignaient à droite. */
 table thead th.ta-r, table tbody td.ta-r { text-align: right; }
+
+
+/* Barre temporaire pendant qu'on trace une période (planning) : elle ne capte pas la souris. */
+.g-bar.est-temp { pointer-events: none; }
+
+/* Saisie refusée par le serveur : le champ garde le texte et se voit en erreur (la maquette remettait l'ancienne valeur). */
+.text-input.est-erreur, .money-input.est-erreur, .field input.est-erreur { border-color: var(--danger); background: var(--danger-soft); }
+.field .erreur { font-size: 0.6875rem; color: var(--danger); }
+
+/* Message d'erreur d'un formulaire (connexion, mot de passe, création) : la maquette n'échouait jamais. */
+.erreur { margin: 0; font-size: 0.75rem; color: var(--danger); }
+
+/* Tailwind (preflight) annule la marge des <p> ; la maquette s'appuie sur celle du navigateur. */
+.login-tag, .login-foot { margin: 1em 0; }
+
+/* Tailwind (preflight) met le padding des input à 0 ; Chrome en laisse 1px sur type=search.
+   Sans ça, la barre de recherche Artisans (seul item haut du toolbar) est trop basse de 2px. */
+.search input { padding-block: 1px; }
+
+/* Pendant l'enregistrement d'une saisie. */
+.est-en-cours { opacity: 0.7; }
+
+/* Document modifié depuis sa dernière version, visa périmé : la pastille de la maquette, en accent. */
+.pill-modif { background: var(--accent-soft); color: var(--accent-2); margin-left: 0.25rem; }
+/* Acompte saisi hors de l'application : une case sans lien. */
+.dm-case.est-hors { background: var(--idle-soft); color: var(--muted); cursor: default; }
+/* Action secondaire sous une case (Corriger, Régénérer, Lever les réserves). */
+.dm-sous { display: flex; gap: 0.5rem; margin-top: 0.1875rem; }
+.dm-sous .dm-th-action { margin-left: 0; }
+
+/* Bouton désactivé : la maquette n'en avait pas. */
+.btn:disabled, .btn[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }
+.btn:disabled:hover { background: var(--raise); border-color: var(--rule-strong); }
+.btn-primary:disabled:hover { background: var(--accent); border-color: var(--accent); }
+
+/* Bandeau du chantier cliquable : il ouvre l'en-tête du chantier (écart 3). */
+button.context { width: 100%; margin: 0; padding: 0; border: 0; border-top: 1px solid var(--rule); border-radius: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
+button.context:hover { background: var(--idle-soft); }
+
+/* Lien d'une barre d'aperçu (« Télécharger le PDF » est un <a>). */
+a.btn { text-decoration: none; }
+
+/* Menu du compte : les entrées de l'app sont des liens et un formulaire (écart 1) — même dessin que les boutons de la maquette. */
+a.compte-item { display: block; text-decoration: none; color: inherit; }
+.compte-menu form { margin: 0; }
+.compte-menu form .compte-item { width: 100%; }
+
+/* Barre de navigation : l'app navigue par liens là où la maquette avait des boutons. */
+a.nav-marque, a.nav-ic, a.nav-b, a.nav-o { text-decoration: none; }
+
+/* La carte « Nouveau chantier » est un lien dans l'app (un bouton dans la maquette). */
+a.chantier-new { text-decoration: none; color: inherit; }
+
+/* Le TTC du panneau est en gras (style en ligne dans la maquette, que ChampEnLigne ne porte pas). */
+.champ-kv.est-gras { font-weight: 600; }
+/* Les liens-boutons du pied du panneau et des lignes d'avenant. */
+.panel-foot a.btn, .cell-actions a.btn { text-decoration: none; }
+/* Nature du marché : des libellés sans bouton radio, comme la maquette ; focus visible au clavier. */
+.radio-row label[role='radio']:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
+
+/* Écran Documents : les cases et actions sont des liens dans l'app (des boutons dans la maquette). */
+a.dm-case, a.dm-ajout, a.dm-carte-v, a.dm-th-action, a.doc-link { text-decoration: none; }
+span.dm-ajout[aria-disabled='true'] { opacity: 0.4; cursor: not-allowed; }
+
+/* Sous le titre d'un aperçu : ce qui empêche de générer (danger) ou une précision sur la version (discret). */
+.gen-note { margin: 0.375rem 0 0; font-size: 0.75rem; color: var(--danger); }
+.gen-note.est-info { color: var(--muted); }
+.gen-head a.btn { text-decoration: none; }
```

```bash
git rm -q src/app/maquette-ajouts.css src/app/maquette.test.ts scripts/extraire-css-maquette.mjs components.json
```

`package.json` perd le script `maquette:css` et la dépendance `tw-animate-css` :

```diff
diff --git a/package.json b/package.json
index 72e235a..a818eee 100644
--- a/package.json
+++ b/package.json
@@ -13,7 +13,6 @@
     "conformite:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 BETTER_AUTH_URL=http://localhost:3200 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/conformite/preparer-maquette.ts && next build && next start -p 3200'",
     "conformite:references": "CONFORMITE_CIBLE=maquette playwright test -c playwright.conformite.config.ts --update-snapshots",
     "test:conformite": "playwright test -c playwright.conformite.config.ts",
-    "maquette:css": "node scripts/extraire-css-maquette.mjs",
     "db:seed": "tsx prisma/seed.ts",
     "db:demo": "tsx prisma/seed-demo.ts",
     "e2e:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/preparer-planning.ts && tsx e2e/preparer-financier.ts && tsx e2e/preparer-suivi.ts && next build && next start -p 3100'"
@@ -33,7 +32,6 @@
     "react": "19.2.8",
     "react-dom": "19.2.8",
     "sonner": "^2.0.8",
-    "tw-animate-css": "^1.4.0",
     "zod": "^4.6.5"
   },
   "devDependencies": {
```

```bash
npm install
```

Expected : `package-lock.json` perd `tw-animate-css`.

`FeuilleUnique` : l'ombre par défaut de Tailwind n'existe plus.

```diff
diff --git a/src/composants/planning/FeuilleUnique.tsx b/src/composants/planning/FeuilleUnique.tsx
index 1bf135b..fbb2dc2 100644
--- a/src/composants/planning/FeuilleUnique.tsx
+++ b/src/composants/planning/FeuilleUnique.tsx
@@ -32,7 +32,7 @@ export function FeuilleUnique({ children, onMesure }: { children: ReactNode; onM
 		<div
 			id="feuille-unique"
 			// shrink-0 : dans le conteneur flex de l'aperçu, la feuille garde la largeur mesurée.
-			className="mode-impression shrink-0 shadow-md"
+			className="mode-impression shrink-0 shadow-ombre"
 			data-pas={mesure?.pas}
 			data-echelle={mesure?.echelle}
 			style={mesure ? { width: LARGEUR_UTILE_PX / mesure.echelle, zoom: mesure.echelle } : { width: LARGEUR_UTILE_PX }}
```

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts figer
```

Expected :
- `0 sélecteur(s) retiré(s), 513 restant(s).` : le correctif a déjà élagué. Le script compte les sélecteurs de la feuille : un même sélecteur peut servir dans plusieurs règles ;
- puis `494 sélecteur(s) figé(s) dans src/styles/heritage.selecteurs.txt.` : la liste ne garde chacun qu'une fois.

- [ ] **Step 6 : les tests de l'héritage passent**

Run : `npx vitest run src/styles/heritage.test.ts`
Expected : PASS (10 tests).

- [ ] **Step 7 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run test:int
npm run test:e2e
npm run test:conformite
```

Expected : tout vert ; le banc compare toujours l'app à la maquette, 10 écrans à 1 %.

- [ ] **Step 8 : commit**

```bash
git add -A src/styles scripts src/app package.json package-lock.json src/composants/planning/FeuilleUnique.tsx components.json
git commit -m "refactor(interface): jetons, thème Tailwind et héritage figé de la maquette

Les jetons passent en light-dark(), le thème Tailwind est réduit à l'identité, l'ancien CSS de la
maquette devient src/styles/heritage.css (couche components), qui ne fait plus que maigrir.
Retire la couche shadcn de globals.css, l'extracteur de la maquette et tw-animate-css.
FeuilleUnique : shadow-md n'existe plus, shadow-ombre.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : `briques/`, `cx`, le garde-fou et les premières briques

`src/composants/maquette/` devient `src/composants/briques/`, sans toucher à sa logique ni à ses tests. Les petites briques sans état arrivent : `Bouton`, `Pastille`, `Surtitre`, `Etiquette`, `LienAction`. Avec elles viennent `cx`, les assemblages typographiques (`typo.ts`) et le garde-fou statique. Aucun écran ne les utilise encore : le rendu ne change pas. Les icônes portent désormais leur trait elles-mêmes (`stroke`, `fill`), au lieu de le recevoir de `.btn svg` ou `.nav-b svg`.

**Files :**
- Rename : `src/composants/maquette/` → `src/composants/briques/` (et les imports `@/composants/maquette/…` des 29 fichiers qui l'utilisent)
- Create : `src/composants/briques/cx.ts`, `cx.test.ts`, `typo.ts`, `Bouton.tsx`, `Bouton.test.tsx`, `Pastille.tsx`, `Surtitre.tsx`, `Etiquette.tsx`, `LienAction.tsx`, `etiquettes.test.tsx`, `briques.test.ts`
- Modify : `src/composants/briques/icones.tsx:1-2`

**Interfaces :**
- Consumes : les utilitaires de la Task 1.
- Produces :
  - `cx(...classes: (string | false | null | undefined)[]): string`.
  - `typo.ts` :
    - `CHIFFRES` = `'font-mono tabular-nums'` (ex-`.num`) ;
    - `SURTITRE` (ex-`.eyebrow`) ;
    - `CLE` (clé discrète : `.context-k`, `.total-k`, `.synth-k`, `.zoom-lbl`).
  - `Bouton`. Un `href` en fait un `Link` ; `natif` en fait un `<a>` ordinaire. Le libellé d'un `seulIcone` passe par `aria-label` et `title`.

    | prop | valeurs |
    |---|---|
    | `variante` | `'normal' \| 'primaire' \| 'fantome' \| 'danger' \| 'surCarte'` |
    | `taille` | `'normal' \| 'sm' \| 'grand'` |
    | `seulIcone`, `desactive`, `enCours` | `boolean` |
    | `className` | placement |

  - `classesBouton({ variante, taille, seulIcone, className }): string`, pour un élément qui ne peut pas être un `Bouton`.
  - `Pastille` : `ton?: 'accent' | 'neutre'`.
  - `Surtitre` : `filet?: boolean` (un `div` souligné au lieu d'un `span`), plus les attributs HTML.
  - `Etiquette` : `ton?: 'accent' | 'neutre'`, `taille?: 'normale' | 'mini'`, `title?`.
  - `LienAction` : un `<button>`, ou un `Link` avec `href`.
  - `briques.test.ts` exporte `utilitaire(classe)`, `horsIdentite(classe)`, `violationsPlacement(fichier, texte, briques)` et `violationsIdentite(fichier, texte)`. Ses deux derniers tests parcourent tout `src/` : `npm test` les relance à chaque tâche.

- [ ] **Step 1 : renommer le dossier**

```bash
git mv src/composants/maquette src/composants/briques
grep -rl '@/composants/maquette/' src | xargs sed -i 's#@/composants/maquette/#@/composants/briques/#g'
grep -rn 'composants/maquette' src e2e
```

Expected : la dernière commande n'affiche rien. Puis `npx tsc --noEmit && npm test` : vert (les tests de `menu`, `nomPanneau` et `preference` ont suivi le dossier).

- [ ] **Step 2 : écrire les tests de `cx` et du garde-fou**

`src/composants/briques/cx.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
	it('joint les classes et ignore false, null, undefined et les chaînes vides', () => {
		expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
	});
	it('ne fusionne rien : les doublons restent', () => {
		expect(cx('mt-2', 'mt-2')).toBe('mt-2 mt-2');
	});
	it('sans classe, une chaîne vide', () => {
		expect(cx()).toBe('');
	});
});
```

`src/composants/briques/briques.test.ts`. Le vérificateur lit le code avec l'API du compilateur TypeScript. Ses propres tests nourrissent le vérificateur de sources inventées ; ses deux derniers tests parcourent le vrai code.

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/*
 * Le garde-fou des briques (spec § 4) :
 * - className d'une brique sert au placement, et à rien d'autre ;
 * - l'identité passe par les jetons : jamais de couleur, de taille de texte, de police ni d'ombre en valeur arbitraire.
 */

const DOSSIER = path.join('src', 'composants', 'briques');

/** Les briques : les composants exportés (`export function Nom`) des fichiers .tsx de briques/. */
function nomsDesBriques(): Set<string> {
	const noms = new Set<string>();
	for (const f of readdirSync(DOSSIER).filter((n) => n.endsWith('.tsx') && !n.endsWith('.test.tsx'))) {
		for (const m of readFileSync(path.join(DOSSIER, f), 'utf8').matchAll(/export function ([A-Z]\w*)/g)) noms.add(m[1]);
	}
	return noms;
}

/** L'interface : src/**\/*.{ts,tsx}, sans les tests, le client Prisma ni les feuilles imprimables (src/documents, hors périmètre). */
function fichiers(dossier = 'src'): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return ['generated', 'documents'].includes(e.name) && dossier === 'src' ? [] : fichiers(chemin);
		return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [chemin] : [];
	});
}

/** L'utilitaire sans ses préfixes de variantes : « max-etroit:w-full » → « w-full » ; les ':' entre crochets ne comptent pas. */
export function utilitaire(classe: string): string {
	let profondeur = 0;
	let dernier = -1;
	for (let i = 0; i < classe.length; i++) {
		if (classe[i] === '[') profondeur++;
		else if (classe[i] === ']') profondeur--;
		else if (classe[i] === ':' && profondeur === 0) dernier = i;
	}
	return classe.slice(dernier + 1).replace(/^!|!$/g, '');
}

const PLACEMENT = /^(-?m[trblxyse]?-|self-|justify-self-|place-self-|order-|col-|row-|basis-|grow|shrink|flex-(1|none|auto|initial)$|w-|min-w-|max-w-|align-)/;

/** Les chaînes littérales d'une expression (un gabarit, un ternaire, un appel à cx…). */
function chainesDans(n: ts.Node): string[] {
	if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return [n.text];
	if (ts.isTemplateExpression(n)) return [n.head.text, ...n.templateSpans.flatMap((s) => [s.literal.text, ...chainesDans(s.expression)])];
	const sortie: string[] = [];
	ts.forEachChild(n, (e) => { sortie.push(...chainesDans(e)); });
	return sortie;
}

const source = (fichier: string, texte: string) =>
	ts.createSourceFile(fichier, texte, ts.ScriptTarget.Latest, true, fichier.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** « fichier : <Bouton> className « bg-accent » » pour chaque classe de className qui n'est pas du placement. */
export function violationsPlacement(fichier: string, texte: string, briques: Set<string>): string[] {
	const sortie: string[] = [];
	const visiter = (n: ts.Node): void => {
		if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && briques.has(n.tagName.getText())) {
			for (const a of n.attributes.properties) {
				if (!ts.isJsxAttribute(a) || a.name.getText() !== 'className' || !a.initializer) continue;
				for (const c of chainesDans(a.initializer).flatMap((t) => t.split(/\s+/)).filter(Boolean)) {
					if (!PLACEMENT.test(utilitaire(c))) sortie.push(`${fichier} : <${n.tagName.getText()}> className « ${c} »`);
				}
			}
		}
		ts.forEachChild(n, visiter);
	};
	visiter(source(fichier, texte));
	return sortie;
}

const COULEUR = /#|rgba?\(|hsla?\(|oklch|oklab|color-mix|light-dark|var\(--|currentcolor/i;
const PROPRIETE_IDENTITE = /^\[(color|background(-color)?|border(-[a-z]+)?-color|outline-color|fill|stroke|box-shadow|text-shadow|font(-family|-size)?)\s*:/;

/** Une valeur arbitraire de couleur, de taille de texte, de police ou d'ombre ? */
export function horsIdentite(classe: string): boolean {
	const u = utilitaire(classe);
	if (/^(text|font|shadow|inset-shadow|drop-shadow|text-shadow)-\[/.test(u)) return true;
	if (PROPRIETE_IDENTITE.test(u)) return true;
	const valeur = /-\[(.*)\]$/.exec(u)?.[1] ?? /^\[(.*)\]$/.exec(u)?.[1];
	return valeur !== undefined && COULEUR.test(valeur);
}

export function violationsIdentite(fichier: string, texte: string): string[] {
	return chainesDans(source(fichier, texte)).flatMap((t) => t.split(/\s+/)).filter((c) => c.includes('[') && horsIdentite(c))
		.map((c) => `${fichier} : « ${c} »`);
}

describe('garde-fou des briques : le vérificateur', () => {
	const briques = new Set(['Bouton', 'Pastille']);

	it('admet le placement, préfixes de variantes compris', () => {
		expect(violationsPlacement('a.tsx', '<Bouton className="ml-3 self-stretch max-etroit:w-full flex-1 -mt-2 align-[1px]" />', briques)).toEqual([]);
	});

	it('refuse tout le reste, nomme le fichier, la brique et la classe', () => {
		expect(violationsPlacement('a.tsx', '<Pastille className={cx("mt-1", ouvert && "bg-accent")}>x</Pastille>', briques))
			.toEqual(['a.tsx : <Pastille> className « bg-accent »']);
	});

	it('ne regarde que les briques', () => {
		expect(violationsPlacement('a.tsx', '<div className="bg-accent" />', briques)).toEqual([]);
	});

	it('refuse une couleur, une taille de texte, une police ou une ombre arbitraires', () => {
		for (const c of ['bg-[#fff]', 'text-[13px]', 'font-[Outfit]', 'shadow-[0_1px_2px_black]', 'border-[var(--rule)]', 'hover:bg-[rgb(0,0,0)]', '[color:red]', '[&_svg]:fill-[#000]']) {
			expect(horsIdentite(c), c).toBe(true);
		}
	});

	it('admet une géométrie arbitraire et les variantes arbitraires', () => {
		for (const c of ['leading-[1.3]', 'w-[min(31rem,100vw)]', 'rounded-[4px]', '[&_thead_th]:text-11', '[&_tbody_tr:not([data-ouvert]):hover]:bg-surface', 'px-[calc(0.75rem-1px)]']) {
			expect(horsIdentite(c), c).toBe(false);
		}
	});
});

describe('garde-fou des briques : le code', () => {
	const briques = nomsDesBriques();
	const tous = fichiers();

	it('className d\'une brique : placement seulement', () => {
		expect(tous.flatMap((f) => violationsPlacement(f, readFileSync(f, 'utf8'), briques))).toEqual([]);
	});

	it('identité par jetons : aucune couleur, taille de texte, police ni ombre arbitraire', () => {
		expect(tous.flatMap((f) => violationsIdentite(f, readFileSync(f, 'utf8')))).toEqual([]);
	});
});
```

- [ ] **Step 3 : les lancer**

Run : `npx vitest run src/composants/briques/cx.test.ts src/composants/briques/briques.test.ts`
Expected : FAIL, « Failed to resolve import "./cx" ». Le garde-fou passe déjà, puisqu'aucune brique n'a encore de `className` interdit.

- [ ] **Step 4 : `cx` et `typo`**

`src/composants/briques/cx.ts` :

```ts
/** Joint des classes ; ignore false, null, undefined et les chaînes vides. Pas de fusion : une brique n'émet jamais deux classes sans variante sur la même propriété. */
export function cx(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(' ');
}
```

`src/composants/briques/typo.ts` :

```ts
/** Les chiffres alignés de la maquette (ex-.num). */
export const CHIFFRES = 'font-mono tabular-nums';
/** Le surtitre en petites capitales (ex-.eyebrow). */
export const SURTITRE = 'font-titre text-11 font-semibold tracking-[0.09em] uppercase text-muted';
/** Une clé en petites capitales discrètes (ex-.context-k, .total-k, .synth-k, .zoom-lbl). */
export const CLE = 'font-titre text-10 font-semibold tracking-capitales uppercase text-faint';
```

Run : `npx vitest run src/composants/briques/cx.test.ts src/composants/briques/briques.test.ts`
Expected : PASS.

- [ ] **Step 5 : écrire les tests des petites briques**

`src/composants/briques/Bouton.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bouton, classesBouton } from './Bouton';

const classes = (html: string) => /class="([^"]*)"/.exec(html)?.[1].split(' ') ?? [];

describe('Bouton', () => {
	it('est un <button type="button">, variante normale, taille normale', () => {
		const html = renderToStaticMarkup(<Bouton>Annuler</Bouton>);
		expect(html).toMatch(/^<button type="button" class="[^"]+">Annuler<\/button>$/);
		expect(classes(html)).toEqual(expect.arrayContaining(['bg-raise', 'border-rule-strong', 'px-3.25', 'text-13']));
	});

	it('en cours : désactivé et occupé', () => {
		const html = renderToStaticMarkup(<Bouton enCours>Créer</Bouton>);
		expect(html).toContain('disabled=""');
		expect(html).toContain('aria-busy="true"');
	});

	it('un href rend un lien du routeur ; natif, un <a> ordinaire', () => {
		expect(renderToStaticMarkup(<Bouton href="/chantiers">Retour</Bouton>)).toMatch(/^<a [^>]*href="\/chantiers"/);
		const natif = renderToStaticMarkup(<Bouton natif href="/api/x" download>PDF</Bouton>);
		expect(natif).toMatch(/^<a href="\/api\/x" download=""/);
		expect(natif).not.toContain('natif');
	});

	it('seulIcone remplace la taille', () => {
		const c = classesBouton({ seulIcone: true, taille: 'sm' }).split(' ');
		expect(c).toContain('p-1');
		expect(c).not.toContain('px-2');
	});

	it('className s\'ajoute en dernier (placement)', () => {
		expect(classesBouton({ className: 'ml-3' }).split(' ').at(-1)).toBe('ml-3');
	});
});
```

`src/composants/briques/etiquettes.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Etiquette } from './Etiquette';
import { LienAction } from './LienAction';
import { Pastille } from './Pastille';
import { Surtitre } from './Surtitre';

describe('petites briques', () => {
	it('Pastille : le ton neutre cercle la puce au lieu de la remplir', () => {
		expect(renderToStaticMarkup(<Pastille>Ouvert</Pastille>)).toContain('before:bg-current');
		const neutre = renderToStaticMarkup(<Pastille ton="neutre">Terminé</Pastille>);
		expect(neutre).toContain('before:border-current');
		expect(neutre).not.toContain('before:bg-current');
	});

	it('Surtitre : filet le pose sur sa ligne, souligné', () => {
		expect(renderToStaticMarkup(<Surtitre>Client</Surtitre>)).toMatch(/^<span class="[^"]*uppercase/);
		expect(renderToStaticMarkup(<Surtitre filet>Montant</Surtitre>)).toMatch(/^<div class="[^"]*border-b border-rule/);
		expect(renderToStaticMarkup(<Surtitre id="g-resume">3 périodes</Surtitre>)).toContain('id="g-resume"');
	});

	it('Etiquette : taille mini et ton accent', () => {
		const html = renderToStaticMarkup(<Etiquette ton="accent" taille="mini">Sous-traitance</Etiquette>);
		expect(html).toContain('text-9');
		expect(html).toContain('border-accent');
	});

	it('LienAction : un bouton, ou un lien avec href', () => {
		expect(renderToStaticMarkup(<LienAction>Corriger</LienAction>)).toMatch(/^<button type="button"/);
		expect(renderToStaticMarkup(<LienAction href="?pv=tous">Tous les lots</LienAction>)).toMatch(/^<a [^>]*href="\?pv=tous"/);
	});
});
```

Run : `npx vitest run src/composants/briques/Bouton.test.tsx src/composants/briques/etiquettes.test.tsx`
Expected : FAIL, « Failed to resolve import "./Bouton" ».

- [ ] **Step 6 : écrire les briques**

`src/composants/briques/Bouton.tsx`. Les classes reprennent `.btn` et ses variantes de la maquette. `surCarte` est l'ancienne surcharge `.chantier-actions .btn`, devenue une variante.

```tsx
import Link from 'next/link';
import type { ComponentProps, ComponentPropsWithRef } from 'react';
import { cx } from './cx';

const BASE = 'inline-flex items-center rounded-sm border leading-[1.3] whitespace-nowrap not-italic no-underline cursor-pointer '
	+ 'transition-[background-color,border-color] duration-120 [&_svg]:size-3.5 '
	+ 'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const TAILLE = {
	normal: 'gap-1.75 px-3.25 py-1.75 text-13',
	sm: 'gap-1.75 px-2 py-1 text-12',
	/** Le bouton plein de la connexion, centré. */
	grand: 'justify-center gap-1.75 p-2.25 text-13',
} as const;

/** Réduit à l'icône (ex-.btn-ico) : remplace la taille. */
const SEUL_ICONE = 'gap-0 p-1 text-12';

const VARIANTE = {
	normal: 'border-rule-strong bg-raise text-ink hover:border-muted hover:bg-idle-soft',
	primaire: 'border-accent bg-accent font-medium text-on-accent hover:border-accent-2 hover:bg-accent-2',
	fantome: 'border-transparent bg-transparent text-muted hover:bg-idle-soft hover:text-ink',
	/** Action destructrice : elle ne se confond jamais avec sa voisine. */
	danger: 'border-rule-strong bg-raise text-danger hover:border-danger hover:bg-danger-soft [&_svg]:opacity-85',
	/** Posé sur une carte cliquable, où un bouton fantôme passerait pour du texte (ex-.chantier-actions .btn). */
	surCarte: 'border-rule-strong bg-surface text-ink-2 hover:border-muted hover:bg-idle-soft hover:text-ink [&_svg]:opacity-70',
} as const;

type Apparence = {
	variante?: keyof typeof VARIANTE;
	taille?: keyof typeof TAILLE;
	/** Le libellé passe alors par aria-label et title. */
	seulIcone?: boolean;
	/** Placement seulement (marges, place dans un flex ou une grille, largeur). */
	className?: string;
};

type PropsBouton = Apparence & Omit<ComponentPropsWithRef<'button'>, 'className' | 'disabled'> & {
	href?: undefined;
	desactive?: boolean;
	/** Pendant l'action : désactivé et aria-busy. */
	enCours?: boolean;
};
type PropsLien = Apparence & Omit<ComponentProps<typeof Link>, 'className'> & { natif?: false };
/** Un lien hors du routeur (fichier d'une route /api, téléchargement). */
type PropsLienNatif = Apparence & Omit<ComponentPropsWithRef<'a'>, 'className'> & { href: string; natif: true };

export function classesBouton({ variante = 'normal', taille = 'normal', seulIcone = false, className }: Apparence): string {
	return cx(BASE, seulIcone ? SEUL_ICONE : TAILLE[taille], VARIANTE[variante], className);
}

/** Le bouton de la maquette (ex-.btn et ses variantes). Un href en fait un lien. */
export function Bouton(props: PropsBouton | PropsLien | PropsLienNatif) {
	if (props.href === undefined) {
		const { variante, taille, seulIcone, className, desactive, enCours, type = 'button', ...reste } = props;
		return (
			<button {...reste} type={type} disabled={desactive || enCours} aria-busy={enCours || undefined}
				className={classesBouton({ variante, taille, seulIcone, className })} />
		);
	}
	if (props.natif) {
		const { variante, taille, seulIcone, className, natif: _natif, ...reste } = props;
		return <a {...reste} className={classesBouton({ variante, taille, seulIcone, className })} />;
	}
	const { variante, taille, seulIcone, className, natif: _natif, ...reste } = props;
	return <Link {...reste} className={classesBouton({ variante, taille, seulIcone, className })} />;
}
```

`src/composants/briques/Pastille.tsx` :

```tsx
import { cx } from './cx';

const BASE = 'inline-flex items-center gap-1.5 rounded-xs pt-0.5 px-1.75 pb-0.75 font-titre text-11 font-semibold tracking-[0.045em] uppercase whitespace-nowrap '
	+ "before:size-1.5 before:flex-none before:rounded-full before:content-['']";

const TON = {
	/** Ouvert, actif, modifié (ex-.pill-actif, .pill-modif). */
	accent: 'bg-accent-soft text-accent-2 before:bg-current',
	/** Terminé, archivé, bloqué : la puce n'est qu'un cercle (ex-.pill-fini). */
	neutre: 'bg-idle-soft text-muted before:border before:border-current',
} as const;

/** La pastille d'état de la maquette (ex-.pill). */
export function Pastille({ ton = 'accent', className, children }: { ton?: keyof typeof TON; className?: string; children: React.ReactNode }) {
	return <span className={cx(BASE, TON[ton], className)}>{children}</span>;
}
```

`src/composants/briques/Surtitre.tsx` :

```tsx
import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { SURTITRE } from './typo';

type Props = Omit<HTMLAttributes<HTMLElement>, 'className'> & {
	/** Souligné d'un filet, sur sa propre ligne (ex-.fgroup > .eyebrow). */
	filet?: boolean;
	className?: string;
};

/** Le surtitre en petites capitales (ex-.eyebrow). */
export function Surtitre({ filet = false, className, ...reste }: Props) {
	return filet
		? <div {...reste} className={cx(SURTITRE, 'border-b border-rule pb-1.25', className)} />
		: <span {...reste} className={cx(SURTITRE, className)} />;
}
```

`src/composants/briques/Etiquette.tsx` :

```tsx
import { cx } from './cx';

const TON = {
	/** Sous-traitance (ex-.nature-tag.st). */
	accent: 'border-accent text-accent-2',
	/** Avenants (ex-.nature-tag.av). */
	neutre: 'border-rule-strong text-muted',
} as const;

const TAILLE = { normale: 'text-10', mini: 'text-9' } as const;

/** Le marqueur encadré posé à côté d'une désignation (ex-.nature-tag). */
export function Etiquette({ ton = 'neutre', taille = 'normale', className, title, children }: {
	ton?: keyof typeof TON;
	taille?: keyof typeof TAILLE;
	className?: string;
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<span title={title} className={cx('rounded-xs border pt-0.25 px-1.25 pb-0.5 font-titre font-semibold tracking-[0.05em] uppercase whitespace-nowrap',
			TAILLE[taille], TON[ton], className)}>
			{children}
		</span>
	);
}
```

`src/composants/briques/LienAction.tsx` :

```tsx
import Link from 'next/link';
import type { ComponentProps, ComponentPropsWithRef } from 'react';
import { cx } from './cx';

/** Une action discrète, soulignée au survol, même dans un en-tête en capitales (ex-.dm-th-action). */
const CLASSES = 'cursor-pointer border-0 bg-transparent p-0 font-sans text-11 font-medium tracking-normal normal-case text-accent-2 no-underline hover:underline';

type Props =
	| (Omit<ComponentPropsWithRef<'button'>, 'className'> & { href?: undefined; className?: string })
	| (Omit<ComponentProps<typeof Link>, 'className'> & { className?: string });

export function LienAction(props: Props) {
	if (props.href === undefined) {
		const { className, type = 'button', ...reste } = props;
		return <button {...reste} type={type} className={cx(CLASSES, className)} />;
	}
	const { className, ...reste } = props;
	return <Link {...reste} className={cx(CLASSES, className)} />;
}
```

Les icônes portent leur trait :

```diff
diff --git a/src/composants/briques/icones.tsx b/src/composants/briques/icones.tsx
--- a/src/composants/briques/icones.tsx
+++ b/src/composants/briques/icones.tsx
@@ -1,5 +1,7 @@
-/* Les icônes de la maquette (docs/maquette/sentinelle-marches.html), tracé pour tracé. Le trait vient du CSS (.btn svg, .nav-b svg…). */
-const svg = (d: React.ReactNode) => function Icone() { return <svg viewBox="0 0 16 16" aria-hidden="true">{d}</svg>; };
+/* Les icônes de la maquette (docs/maquette/sentinelle-marches.html), tracé pour tracé. Trait de 1,6 en couleur courante ; un contexte peut le régler ([&_svg]:stroke-[1.5]). */
+const svg = (d: React.ReactNode) => function Icone() {
+	return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">{d}</svg>;
+};
 
 export const Maison = svg(<path d="M2 13V6l6-4 6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />);                                   // l. 2134
 export const Artisans = svg(<><circle cx="6" cy="5.5" r="2.5" /><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M11 3.2a2.5 2.5 0 0 1 0 4.6" /></>); // l. 2149
```

Run : `npx vitest run src/composants/briques`
Expected : PASS.

- [ ] **Step 7 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert. `npx tsx scripts/heritage.ts elaguer` → `0 sélecteur(s) retiré(s), 513 restant(s).`

- [ ] **Step 8 : commit**

```bash
git add -A src/composants
git commit -m "feat(interface): briques/, cx, garde-fou et premières briques

src/composants/maquette devient src/composants/briques. Bouton, Pastille, Surtitre, Etiquette et
LienAction possèdent leur style (tables de variantes). Le garde-fou (API TypeScript) n'admet sur
className d'une brique que le placement, et refuse toute couleur, taille de texte, police ou ombre
arbitraire. Les icônes portent leur trait.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : les briques de formulaire

`Champ` et ses voisines remplacent `.field`, `.grid-2`, `.fieldset`, `.form-wrap`, `.form-actions`, `.hint` et `.erreur`. `classesSaisie` remplace `.text-input`, `.money-input`, `.champ-kv` et `.date-lot`. `ChoixSegmente` remplace `.radio-row`. `Interrupteur` et `Recherche` sont restylés. Les états d'une saisie passent par ARIA :
- `aria-invalid` remplace `.est-erreur` ;
- `aria-busy` remplace `.est-en-cours`.

`ChampEnLigne` (la saisie enregistrée à la sortie du champ) adopte `classesSaisie` : toutes les saisies en ligne des écrans changent d'un coup, sans changer de rendu.

**Files :**
- Create : `src/composants/briques/Champ.tsx`, `src/composants/briques/ChoixSegmente.tsx`, `src/composants/briques/Champ.test.tsx`
- Modify :
  - `src/composants/briques/Interrupteur.tsx`, `src/composants/briques/Recherche.tsx` ;
  - `src/composants/ChampEnLigne.tsx`, `src/composants/ActionsLevee.tsx` ;
  - `src/composants/FormulaireChantier.tsx`, `src/composants/PanneauLot.tsx`, `src/composants/TableauLots.tsx` ;
  - `src/composants/chantier/BandeauChantier.tsx` ;
  - `src/composants/planning/FenetreFermetures.tsx`, `src/composants/planning/PanneauLotPlanning.tsx`.
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `cx` ; `CHIFFRES` et `SURTITRE` (`typo.ts`) ; les jetons.
- Produces (`src/composants/briques/Champ.tsx`) :
  - `type VarianteSaisie` : `'champ' | 'texte' | 'texte-mini' | 'montant' | 'montant-mini' | 'montant-etroit' | 'kv' | 'kv-etroit' | 'date'` ;
  - `classesSaisie(variante: VarianteSaisie, o?: { gras?: boolean; chiffres?: boolean }): string` ;
  - `idErreur(id: string): string`, qui renvoie `` `${id}-erreur` `` ;
  - `Saisie` et `ZoneTexte`. Props HTML de l'`input` (ou du `textarea`), plus `variante?`, `gras?`, `chiffres?`, `erreur?: string | boolean`. Une erreur pose `aria-invalid` et, si c'est un message, `aria-describedby`.
  - `Erreur({ id?, alerte?, taille?: 'normale' | 'petite', children })` : `alerte` pose `role="alert"`.
  - `Champ({ libelle?, pour?, aide?, erreur?: string, pleineLargeur?, className?, children })`. `pour` relie le libellé et donne l'id du message d'erreur.
  - `GrilleChamps`, `GroupeChamps({ titre })`, `ColonnesFormulaire`, `PiedFormulaire`.
- Produces (`ChoixSegmente.tsx`) : `ChoixSegmente<V extends string>({ libelle, options: readonly { v: V; t: string }[], valeur: V, onChoisir })`. Il rend des `role="radio"` dans un `role="radiogroup"` ; rien n'est envoyé par un formulaire.
- Produces : `Interrupteur` gagne `variante?: 'normale' | 'discrete'`. `ChampEnLigne` gagne `variante?: VarianteSaisie`, `gras?` et `chiffres?`.

- [ ] **Step 1 : écrire le test**

`src/composants/briques/Champ.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Champ, classesSaisie, Saisie } from './Champ';
import { ChoixSegmente } from './ChoixSegmente';
import { Interrupteur } from './Interrupteur';

describe('briques de formulaire', () => {
	it('classesSaisie : « gras » remplace la graisse de la variante, sans doublon', () => {
		const c = classesSaisie('texte', { gras: true }).split(' ');
		expect(c).toContain('font-semibold');
		expect(c).not.toContain('font-medium');
		expect(classesSaisie('champ', { chiffres: true })).toContain('font-mono tabular-nums');
	});

	it('toute saisie porte les états erreur et en cours', () => {
		for (const v of ['champ', 'texte', 'montant-etroit', 'kv', 'date'] as const) {
			expect(classesSaisie(v)).toContain('aria-invalid:border-danger');
			expect(classesSaisie(v)).toContain('aria-busy:opacity-70');
		}
	});

	it('Champ relie le libellé au contrôle, et l\'erreur à la saisie', () => {
		const html = renderToStaticMarkup(
			<Champ libelle="Référence dossier" pour="f-ref" erreur="Cette référence existe déjà.">
				<Saisie id="f-ref" erreur="Cette référence existe déjà." />
			</Champ>,
		);
		expect(html).toContain('<label for="f-ref"');
		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain('aria-describedby="f-ref-erreur"');
		expect(html).toContain('<p id="f-ref-erreur" class="m-0 text-danger text-11">Cette référence existe déjà.</p>');
	});

	it('ChoixSegmente : des role="radio", un seul coché', () => {
		const html = renderToStaticMarkup(
			<ChoixSegmente libelle="Type de mission" valeur="PARTIELLE" onChoisir={() => {}}
				options={[{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }]} />,
		);
		expect(html).toContain('role="radiogroup" aria-label="Type de mission"');
		expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
		expect(html).toMatch(/aria-checked="true"[^>]*>Partielle</);
	});

	it('Interrupteur discret : le texte du libellé d\'un champ', () => {
		expect(renderToStaticMarkup(<Interrupteur coche={false} onChange={() => {}} variante="discrete">x</Interrupteur>)).toContain('text-12 text-muted');
	});
});
```

- [ ] **Step 2 : le lancer**

Run : `npx vitest run src/composants/briques/Champ.test.tsx`
Expected : FAIL, « Failed to resolve import "./Champ" ».

- [ ] **Step 3 : écrire les briques**

`src/composants/briques/Champ.tsx` :

```tsx
import type { ComponentPropsWithRef } from 'react';
import { cx } from './cx';
import { CHIFFRES, SURTITRE } from './typo';

/** Saisie posée dans une cellule : invisible au repos, cadre au survol, accent au focus (ex-.text-input, .money-input). */
const EN_CELLULE = 'rounded-sm border border-transparent bg-transparent px-[calc(0.75rem-1px)] py-0.75 transition-[border-color,background-color] duration-120 '
	+ 'hover:border-rule-strong hover:bg-surface focus:border-accent focus:bg-raise focus:outline-none';
/** Saisie à cadre d'un panneau (ex-.champ-kv). */
const KV = 'rounded-sm border border-rule-strong bg-surface px-1.75 py-0.75 text-left font-mono tabular-nums text-13 transition-[border-color,background-color] duration-120 '
	+ 'hover:bg-raise focus:border-accent focus:bg-raise focus:outline-none';

const SAISIE = {
	/** Le champ d'un formulaire (ex-.field input). */
	champ: 'w-full rounded-sm border border-rule-strong bg-surface px-2.5 py-2 text-ink focus:border-accent focus:bg-raise focus:outline-none',
	texte: `w-full ${EN_CELLULE} text-13 placeholder:font-normal placeholder:italic placeholder:text-faint`,
	'texte-mini': `w-full ${EN_CELLULE} font-mono text-12 text-muted placeholder:font-normal placeholder:italic placeholder:text-faint`,
	montant: `w-full ${EN_CELLULE} text-right font-mono tabular-nums text-13`,
	'montant-mini': `w-full ${EN_CELLULE} text-right font-mono tabular-nums text-12 text-muted`,
	/** Dans le tableau serré d'un panneau (semaine, année, durée). */
	'montant-etroit': `w-13 ${EN_CELLULE} text-right font-mono tabular-nums text-12 text-muted`,
	kv: `w-36 ${KV}`,
	'kv-etroit': `w-16 ${KV}`,
	/** Une date posée dans le texte (ex-.date-lot). */
	date: 'rounded-sm border border-rule-strong bg-surface px-1.5 py-0.75 text-13 text-ink',
} as const;

/** La graisse propre à chaque saisie ; « gras » la remplace. */
const POIDS: Partial<Record<VarianteSaisie, string>> = { texte: 'font-medium' };

/** Refusée par le serveur : rouge, la saisie reste (ex-.est-erreur). Pendant l'enregistrement : estompée (ex-.est-en-cours). */
const ETATS = 'aria-invalid:border-danger aria-invalid:bg-danger-soft aria-busy:opacity-70';

export type VarianteSaisie = keyof typeof SAISIE;

/** Les classes d'une saisie : pour Saisie, ZoneTexte, ChampEnLigne, ou un <input> qui ne peut pas être une brique. */
export function classesSaisie(variante: VarianteSaisie, o: { gras?: boolean; chiffres?: boolean } = {}): string {
	return cx(SAISIE[variante], o.gras ? 'font-semibold' : POIDS[variante], o.chiffres && CHIFFRES, ETATS);
}

/** L'id du message d'erreur d'un champ, que la saisie annonce par aria-describedby. */
export const idErreur = (id: string) => `${id}-erreur`;

type PropsSaisie<E extends 'input' | 'textarea'> = Omit<ComponentPropsWithRef<E>, 'className'> & {
	variante?: VarianteSaisie;
	gras?: boolean;
	chiffres?: boolean;
	/** Le message (ou true) : la saisie passe en erreur et l'annonce. */
	erreur?: string | boolean;
	className?: string;
};

const aria = (id: string | undefined, erreur: string | boolean | undefined) => ({
	'aria-invalid': erreur ? true : undefined,
	'aria-describedby': typeof erreur === 'string' && id ? idErreur(id) : undefined,
});

export function Saisie({ variante = 'champ', gras, chiffres, erreur, className, ...reste }: PropsSaisie<'input'>) {
	return <input {...aria(reste.id, erreur)} {...reste} className={cx(classesSaisie(variante, { gras, chiffres }), className)} />;
}

/** Un texte sur plusieurs lignes, qui s'agrandit à la main (ex-.gen-fields textarea). */
export function ZoneTexte({ variante = 'champ', gras, chiffres, erreur, className, ...reste }: PropsSaisie<'textarea'>) {
	return <textarea {...aria(reste.id, erreur)} {...reste} className={cx(classesSaisie(variante, { gras, chiffres }), 'resize-y leading-[1.45]', className)} />;
}

const TAILLE_ERREUR = { normale: 'text-12', petite: 'text-11' } as const;

/** Un message d'erreur (ex-.erreur). « alerte » l'annonce aussitôt (role="alert"). */
export function Erreur({ id, alerte = false, taille = 'normale', children }: { id?: string; alerte?: boolean; taille?: keyof typeof TAILLE_ERREUR; children: React.ReactNode }) {
	return <p id={id} role={alerte ? 'alert' : undefined} className={cx('m-0 text-danger', TAILLE_ERREUR[taille])}>{children}</p>;
}

/** Un champ de formulaire : libellé, contrôle, aide, erreur (ex-.field). */
export function Champ({ libelle, pour, aide, erreur, pleineLargeur = false, className, children }: {
	libelle?: React.ReactNode;
	/** L'id du contrôle : le libellé lui est relié, et le message d'erreur prend idErreur(pour). */
	pour?: string;
	aide?: React.ReactNode;
	erreur?: string;
	/** Toute la largeur de la grille (ex-.field.span). */
	pleineLargeur?: boolean;
	/** Placement seulement. */
	className?: string;
	children: React.ReactNode;
}) {
	const etiquette = 'text-12 text-muted';
	return (
		<div className={cx('flex min-w-0 flex-col gap-1', pleineLargeur && 'col-span-full', className)}>
			{libelle !== undefined && (pour ? <label htmlFor={pour} className={etiquette}>{libelle}</label> : <span className={etiquette}>{libelle}</span>)}
			{children}
			{aide && <span className="text-11 text-faint">{aide}</span>}
			{erreur && <Erreur id={pour ? idErreur(pour) : undefined} taille="petite">{erreur}</Erreur>}
		</div>
	);
}

/** Des champs sur deux colonnes ou plus, selon la place (ex-.grid-2). */
export function GrilleChamps({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-4 gap-y-3.5', className)}>{children}</div>;
}

/** Un groupe de champs sous son surtitre, dans un cadre (ex-.fieldset). */
export function GroupeChamps({ titre, className, children }: { titre: React.ReactNode; className?: string; children: React.ReactNode }) {
	return (
		<div className={cx('mb-4 break-inside-avoid rounded-md border border-rule bg-raise px-5.5 pt-5 pb-5.5 shadow-ombre', className)}>
			<div className={cx(SURTITRE, 'mb-3.5 border-b border-rule pb-2.5')}>{titre}</div>
			{children}
		</div>
	);
}

/** Les groupes coulent sur trois colonnes dès qu'il y a la place (ex-.form-wrap). */
export function ColonnesFormulaire({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('columns-[3_24rem] gap-x-5', className)}>{children}</div>;
}

/** Les actions, sous toutes les colonnes (ex-.form-actions). */
export function PiedFormulaire({ children }: { children: React.ReactNode }) {
	return <div className="flex items-center gap-2.5 pt-1 [column-span:all]">{children}</div>;
}
```

`src/composants/briques/ChoixSegmente.tsx` :

```tsx
import { cx } from './cx';

/**
 * Un choix exclusif en segments (ex-.radio-row) : des boutons role="radio", atteignables au clavier,
 * Espace ou Entrée choisit. Rien n'est envoyé par un formulaire : le parent tient la valeur.
 */
export function ChoixSegmente<V extends string>({ libelle, options, valeur, onChoisir }: {
	/** Le nom du groupe (aria-label). */
	libelle: string;
	options: readonly { v: V; t: string }[];
	valeur: V;
	onChoisir: (v: V) => void;
}) {
	return (
		<div role="radiogroup" aria-label={libelle} className="flex gap-2">
			{options.map((o) => {
				const choisi = o.v === valeur;
				return (
					<button key={o.v} type="button" role="radio" aria-checked={choisi} onClick={() => { if (!choisi) onChoisir(o.v); }}
						className={cx('flex-1 cursor-pointer rounded-sm border px-2.5 py-2 text-left text-13',
							choisi ? 'border-accent bg-accent-soft font-medium text-accent-2' : 'border-rule-strong bg-surface text-ink')}>
						{o.t}
					</button>
				);
			})}
		</div>
	);
}
```

`Interrupteur` et `Recherche` :

```diff
diff --git a/src/composants/briques/Interrupteur.tsx b/src/composants/briques/Interrupteur.tsx
index de6bec8..dba9561 100644
--- a/src/composants/briques/Interrupteur.tsx
+++ b/src/composants/briques/Interrupteur.tsx
@@ -1,9 +1,28 @@
-/** L'interrupteur de la maquette (.switch) : une case à cocher habillée. */
-export function Interrupteur({ coche, onChange, children, id }: { coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode; id?: string }) {
+import { cx } from './cx';
+
+const TEXTE = {
+	normale: 'text-13',
+	/** Dans un champ de formulaire, comme son libellé (ex-.field label). */
+	discrete: 'text-12 text-muted',
+} as const;
+
+const BOITE = 'relative h-4 w-7.5 flex-none rounded-full border border-rule-strong bg-raise transition-[background-color,border-color] duration-140 '
+	+ "after:absolute after:top-0.5 after:left-0.5 after:size-2.5 after:rounded-full after:bg-muted after:transition-[translate,background-color] after:duration-140 after:content-[''] "
+	+ 'peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-3.5 peer-checked:after:bg-on-accent '
+	+ 'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';
+
+/** L'interrupteur de la maquette (ex-.switch) : une case à cocher habillée. */
+export function Interrupteur({ coche, onChange, children, id, variante = 'normale' }: {
+	coche: boolean;
+	onChange: (v: boolean) => void;
+	children: React.ReactNode;
+	id?: string;
+	variante?: keyof typeof TEXTE;
+}) {
 	return (
-		<label className="switch">
-			<input type="checkbox" id={id} checked={coche} onChange={(e) => onChange(e.target.checked)} />
-			<span className="switch-box" aria-hidden="true" />
+		<label className={cx('inline-flex cursor-pointer items-center gap-2 select-none', TEXTE[variante])}>
+			<input type="checkbox" id={id} checked={coche} onChange={(e) => onChange(e.target.checked)} className="peer absolute size-0 opacity-0" />
+			<span aria-hidden="true" className={BOITE} />
 			{children}
 		</label>
 	);
diff --git a/src/composants/briques/Recherche.tsx b/src/composants/briques/Recherche.tsx
index a23fa39..760ff9f 100644
--- a/src/composants/briques/Recherche.tsx
+++ b/src/composants/briques/Recherche.tsx
@@ -1,11 +1,12 @@
 import { Loupe } from './icones';
 
-/** La barre de recherche de la maquette (.search) : loupe et champ nu. */
+/** La barre de recherche de la maquette (ex-.search) : loupe et champ nu. */
 export function Recherche({ placeholder, valeur, onChange, libelle, id }: { placeholder: string; valeur: string; onChange: (v: string) => void; libelle?: string; id?: string }) {
 	return (
-		<div className="search">
+		<div className="flex max-w-104 min-w-72 flex-1 items-center gap-2 rounded-xs border border-rule-strong bg-raise px-2.5 py-1.25 [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:stroke-muted">
 			<Loupe />
-			<input id={id} type="search" placeholder={placeholder} aria-label={libelle ?? placeholder} value={valeur} onChange={(e) => onChange(e.target.value)} />
+			<input id={id} type="search" placeholder={placeholder} aria-label={libelle ?? placeholder} value={valeur} onChange={(e) => onChange(e.target.value)}
+				className="w-full border-0 bg-transparent py-px outline-none" />
 		</div>
 	);
 }
```

Run : `npx vitest run src/composants/briques/Champ.test.tsx`
Expected : PASS (5 tests).

- [ ] **Step 4 : brancher les saisies en ligne**

`ChampEnLigne` et la date de levée des réserves :

```diff
diff --git a/src/composants/ActionsLevee.tsx b/src/composants/ActionsLevee.tsx
index 115ea35..28ff02c 100644
--- a/src/composants/ActionsLevee.tsx
+++ b/src/composants/ActionsLevee.tsx
@@ -5,6 +5,7 @@ import { useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import type { Resultat } from '@/actions/executer';
 import { annulerLeveeAction, leverReservesAction } from '@/actions/receptions';
+import { classesSaisie } from '@/composants/briques/Champ';
 import type { EtatReception } from '@/domaine/reception';
 
 /** Aujourd'hui à Châteaubriant, AAAA-MM-JJ (le format suédois est l'ISO). */
@@ -39,7 +40,7 @@ export function ActionsLevee({ lotId, etat }: { lotId: string; etat: EtatRecepti
 			const date = String(new FormData(e.currentTarget).get('date') ?? '');
 			envoyer(() => leverReservesAction(lotId, date));
 		}}>
-			<input type="date" name="date" aria-label="Date de levée des réserves" defaultValue={aujourdhui()} className="date-lot" />
+			<input type="date" name="date" aria-label="Date de levée des réserves" defaultValue={aujourdhui()} className={classesSaisie('date')} />
 			<button type="submit" className="dm-th-action" disabled={enCours}>Enregistrer la levée</button>
 		</form>
 	);
diff --git a/src/composants/ChampEnLigne.tsx b/src/composants/ChampEnLigne.tsx
index cb20503..07e2ead 100644
--- a/src/composants/ChampEnLigne.tsx
+++ b/src/composants/ChampEnLigne.tsx
@@ -3,6 +3,8 @@
 import { useRef, useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import type { Resultat } from '@/actions/executer';
+import { classesSaisie, type VarianteSaisie } from '@/composants/briques/Champ';
+import { cx } from '@/composants/briques/cx';
 
 type Props = {
 	valeur: string;
@@ -10,20 +12,23 @@ type Props = {
 	libelle: string;
 	type?: 'text' | 'date' | 'email' | 'tel';
 	multiligne?: boolean;
+	/** Placement seulement. */
 	className?: string;
 	placeholder?: string;
-	variante?: 'texte' | 'texte-mini' | 'montant' | 'montant-mini' | 'champ';
+	variante?: VarianteSaisie;
+	/** Graisse 600 : le TTC du panneau, l'intitulé de la période visée. */
+	gras?: boolean;
+	/** Chiffres alignés : un code postal. */
+	chiffres?: boolean;
 	id?: string;
 };
 
-const CLASSES = { texte: 'text-input', 'texte-mini': 'text-input mini', montant: 'money-input', 'montant-mini': 'money-input mini', champ: '' } as const;
-
 /**
  * Champ enregistré quand on le quitte, sans bouton. En cas d'échec il passe en rouge
  * et garde la saisie. Il se recale sur la valeur du serveur quand celle-ci change
  * (TTC reformaté, modification d'un collègue).
  */
-export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', multiligne, className, placeholder, variante = 'texte', id }: Props) {
+export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', multiligne, className, placeholder, variante = 'texte', gras, chiffres, id }: Props) {
 	const [texte, setTexte] = useState(valeur);
 	const [valeurRecue, setValeurRecue] = useState(valeur);
 	const [enErreur, setEnErreur] = useState(false);
@@ -53,15 +58,15 @@ export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', mult
 		});
 	}
 
-	const classes = [CLASSES[variante], enErreur && 'est-erreur', enCours && 'est-en-cours', className].filter(Boolean).join(' ');
 	const communs = {
 		id,
 		'aria-label': libelle,
 		'aria-invalid': enErreur,
+		'aria-busy': enCours || undefined,
 		placeholder,
 		value: texte,
 		onBlur: quitter,
-		className: classes,
+		className: cx(classesSaisie(variante, { gras, chiffres }), className),
 	};
 	return multiligne ? (
 		<textarea {...communs} rows={3} onChange={(e) => setTexte(e.target.value)} />
```

Les appelants passent de classes à variantes (`kv`, `kv-etroit`, `date`, `montant-etroit`, `gras`, `chiffres`). Les deux interrupteurs du formulaire chantier deviennent `discrete` :

```diff
diff --git a/src/composants/FormulaireChantier.tsx b/src/composants/FormulaireChantier.tsx
index d738a13..bd58aee 100644
--- a/src/composants/FormulaireChantier.tsx
+++ b/src/composants/FormulaireChantier.tsx
@@ -88,7 +88,7 @@ export function FormulaireChantier({ chargesAffaire, moi }: Props) {
 							{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
 							{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
 							<div className="field span">
-								<Interrupteur id="f-meme" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
+								<Interrupteur id="f-meme" variante="discrete" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
 								<span className="hint">Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</span>
 							</div>
 						</div>
@@ -122,7 +122,7 @@ export function FormulaireChantier({ chargesAffaire, moi }: Props) {
 					<div className="fieldset">
 						<span className="eyebrow">Lots</span>
 						<div className="field">
-							<Interrupteur id="f-lots-base" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
+							<Interrupteur id="f-lots-base" variante="discrete" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
 							<span className="hint">Terrassement, gros œuvre, charpente… jusqu&apos;à l&apos;escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.</span>
 						</div>
 					</div>
diff --git a/src/composants/PanneauLot.tsx b/src/composants/PanneauLot.tsx
index 72fac06..a2ee459 100644
--- a/src/composants/PanneauLot.tsx
+++ b/src/composants/PanneauLot.tsx
@@ -118,20 +118,20 @@ export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarche
 				<div className="block-body">
 					<dl className="kv">
 						<dt><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></dt>
-						<dd><ChampEnLigne id="pl-ht" variante="montant" className="champ-kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
+						<dd><ChampEnLigne id="pl-ht" variante="kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
 						{avecAvenants && (
 							<><dt>Avenants</dt><dd className={somme.isNegative() ? 'num moins' : 'num'} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</dd></>
 						)}
 						<dt><label htmlFor="pl-tva">T.V.A.</label></dt>
-						<dd><ChampEnLigne id="pl-tva" variante="montant" className="champ-kv etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className="unite">%</span></dd>
+						<dd><ChampEnLigne id="pl-tva" variante="kv-etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className="unite">%</span></dd>
 						<dt><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></dt>
 						<dd>
-							<ChampEnLigne id="pl-ttc" variante="montant" className="champ-kv est-gras" libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
+							<ChampEnLigne id="pl-ttc" variante="kv" gras libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
 							{avecAvenants && <span className="hint-inline">avenants compris : le montant initial HT est recalculé</span>}
 						</dd>
 						<dt><label htmlFor="pl-rg">Retenue de garantie</label></dt>
 						<dd>
-							<ChampEnLigne id="pl-rg" variante="montant" className="champ-kv etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
+							<ChampEnLigne id="pl-rg" variante="kv-etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
 							<span className="unite">%</span>
 							<span className="calcule">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
 						</dd>
@@ -139,7 +139,7 @@ export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarche
 						<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
 						<dt>Signé le</dt>
 						<dd>
-							<ChampEnLigne variante="champ" className="date-lot" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
+							<ChampEnLigne variante="date" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
 							{!lot.dateSignature && <span className="hint-inline">à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</span>}
 						</dd>
 					</dl>
@@ -168,7 +168,7 @@ export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarche
 												<td className="num" style={{ color: 'var(--muted)' }}>{n}</td>
 												<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
 												<td className="ta-r is-editable"><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
-												<td><ChampEnLigne variante="champ" className="date-lot" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
+												<td><ChampEnLigne variante="date" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
 												<td className="ta-r cell-actions nowrap">
 													<Link className="btn btn-sm btn-ico" href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
 														title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Link>
diff --git a/src/composants/TableauLots.tsx b/src/composants/TableauLots.tsx
index a88aee3..8c61ad9 100644
--- a/src/composants/TableauLots.tsx
+++ b/src/composants/TableauLots.tsx
@@ -78,7 +78,7 @@ export function TableauLots({ vue }: { vue: VueMarches }) {
 									</td>
 									<td className="cell-lot is-editable" onClick={arreter}>
 										<div className="lot-wrap">
-											<ChampEnLigne libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
+											<ChampEnLigne className="min-w-0 flex-1" libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
 											{l.nature === 'SOUS_TRAITANCE' && <span className="nature-tag st">Sous-traitance</span>}
 											{nbAv > 0 && <span className="nature-tag av" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</span>}
 										</div>
diff --git a/src/composants/chantier/BandeauChantier.tsx b/src/composants/chantier/BandeauChantier.tsx
index 7d7d693..199e092 100644
--- a/src/composants/chantier/BandeauChantier.tsx
+++ b/src/composants/chantier/BandeauChantier.tsx
@@ -56,7 +56,7 @@ export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnT
 					{CHAMPS.map((f) => (
 						<div key={f.champ} className={f.span ? 'field span' : 'field'}>
 							<label htmlFor={`e-${f.champ}`}>{f.libelle}</label>
-							<ChampEnLigne id={`e-${f.champ}`} variante="champ" className={f.num ? 'num' : undefined} libelle={f.libelle} type={f.type}
+							<ChampEnLigne id={`e-${f.champ}`} variante="champ" chiffres={f.num} libelle={f.libelle} type={f.type}
 								valeur={c[f.champ] as string} enregistrer={modifierChampChantierAction.bind(null, c.id, f.champ)} />
 						</div>
 					))}
diff --git a/src/composants/planning/FenetreFermetures.tsx b/src/composants/planning/FenetreFermetures.tsx
index eebbac0..5212ee4 100644
--- a/src/composants/planning/FenetreFermetures.tsx
+++ b/src/composants/planning/FenetreFermetures.tsx
@@ -34,9 +34,9 @@ export function FenetreFermetures({ ouverte, onFermer, fermetures, onAjouter, on
 									return (
 										<tr key={f.id}>
 											<td><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
+											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
+											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
+											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
 											<td className="ta-r cell-actions">
 												<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(f.id)}
 													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></button>
diff --git a/src/composants/planning/PanneauLotPlanning.tsx b/src/composants/planning/PanneauLotPlanning.tsx
index 5ad3154..af98b97 100644
--- a/src/composants/planning/PanneauLotPlanning.tsx
+++ b/src/composants/planning/PanneauLotPlanning.tsx
@@ -78,10 +78,10 @@ function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprim
 	return (
 		<tbody data-periode={x.id}>
 			<tr className={vise ? 'ligne-per est-vise' : 'ligne-per'} data-vise={vise ? '1' : undefined}>
-				<td><ChampEnLigne libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
+				<td><ChampEnLigne gras={vise} libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
+				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
+				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
+				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
 				<td className="ta-r cell-actions">
 					<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(x.id)}
 						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></button>
```

- [ ] **Step 5 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer search
npx tsx scripts/heritage.ts restes src/composants/briques/Champ.tsx src/composants/briques/ChoixSegmente.tsx src/composants/briques/Interrupteur.tsx src/composants/briques/Recherche.tsx src/composants/ChampEnLigne.tsx
```

Expected :
- `27 sélecteur(s) retiré(s), 486 restant(s).`
- puis `4 sélecteur(s) retiré(s), 482 restant(s).` : `.search` survit par `type="search"` ;
- puis rien.

- [ ] **Step 6 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert.

- [ ] **Step 7 : commit**

```bash
git add -A src/composants src/styles
git commit -m "feat(interface): briques de formulaire, saisies par variantes

Champ, Saisie, ZoneTexte, Erreur, GrilleChamps, GroupeChamps, ColonnesFormulaire, PiedFormulaire,
ChoixSegmente ; classesSaisie remplace .text-input, .money-input, .champ-kv et .date-lot. Erreur et
enregistrement passent par aria-invalid et aria-busy. Interrupteur et Recherche restylés.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : les briques de structure

Elles portent la charpente des écrans :
- `Carte` : le cadre d'une carte ;
- `Bloc` : l'encadré d'un panneau ;
- `CleValeur` : un couple clé-valeur ;
- `Vide` : « aucun… » ;
- `CadreTableau` et `Tableau` ;
- `BarreOutils` ;
- `BarreOnglets` et `Onglet`.

`Ecran` (la barre de titre) et `Sigle` sont restylés. Le reste n'est utilisé que par les écrans des Tasks 7 à 15. Le banc perd un sélecteur de classe (`.topbar-actions`), disparu avec `Ecran`.

**Files :**
- Create : `src/composants/briques/Carte.tsx`, `Bloc.tsx`, `CleValeur.tsx`, `Vide.tsx`, `Tableau.tsx`, `BarreOutils.tsx`, `Onglet.tsx`, `structure.test.tsx`
- Modify :
  - `src/composants/briques/Ecran.tsx`, `src/composants/briques/Sigle.tsx` ;
  - `src/app/connexion/page.tsx:41`, `src/composants/FormulaireMotDePasse.tsx:41` : `Sigle taille="grande"` ;
  - `src/composants/navigation/BarreNavigation.tsx:33` : `Sigle survol` ;
  - `e2e/conformite/ecrans.ts:90`.
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `cx`, `Surtitre`, `CHIFFRES`, `CLE`, `SURTITRE`.
- Produces :
  - `Carte`. Un `href` en fait un `Link` ; sinon c'est un `div` qui garde ses attributs (`role`, `tabIndex`, `onClick`, `data-testid`…).

    | prop | valeurs |
    |---|---|
    | `variante` | `'cliquable' \| 'ajout' \| 'compacte' \| 'compacteVide'` |
    | `estompee?` | `boolean` (un chantier terminé) |
    | `className?` | placement |

  - `Bloc({ titre?, action?, corps?: 'normal' | 'nu' | 'colonne', className?, children })`.
  - `CleValeur({ className?, children })`, `Cle({ children })`, `Valeur({ chiffres?, moins?, ...attributs })`.
  - `Vide({ variante: 'liste' | 'mini', className?, children })`.
  - `CadreTableau({ className?, children })`.
  - `Tableau({ variante: 'plain' | 'mini' | 'lots' | 'dm', className?, ...attributs de <table> })`. Les attributs de cellule et de ligne sont listés dans les conventions.
  - `BarreOutils({ etalee?, children })`.
  - `BarreOnglets({ libelle, children })` et `Onglet({ href, actif, icone, compteur?, children })` : l'onglet courant porte `aria-current="page"`, son compteur `data-testid="compteur"`.
  - `Ecran` : même API ; titre `h1` en `text-22`.
  - `Sigle({ taille?: 'normale' | 'grande', survol?: boolean })`.

- [ ] **Step 1 : écrire le test**

`src/composants/briques/structure.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bloc } from './Bloc';
import { Carte } from './Carte';
import { Cle, CleValeur, Valeur } from './CleValeur';
import { Ecran } from './Ecran';
import { Onglet } from './Onglet';
import { Tableau } from './Tableau';

describe('briques de structure', () => {
	it('Carte : un div qui garde ses attributs, ou un lien', () => {
		const div = renderToStaticMarkup(<Carte variante="cliquable" role="button" tabIndex={0} data-testid="carte-chantier">x</Carte>);
		expect(div).toMatch(/^<div role="button" tabindex="0" data-testid="carte-chantier" class="[^"]*shadow-ombre/);
		const lien = renderToStaticMarkup(<Carte variante="ajout" href="/chantiers/nouveau">+</Carte>);
		expect(lien).toMatch(/^<a /);
		expect(lien).toContain('href="/chantiers/nouveau"');
		expect(lien).toContain('border-dashed');
		expect(renderToStaticMarkup(<Carte variante="cliquable" estompee>x</Carte>)).toContain('opacity-72');
	});

	it('Bloc : sans titre ni action, pas d\'en-tête', () => {
		expect(renderToStaticMarkup(<Bloc>corps</Bloc>)).not.toContain('border-b');
		expect(renderToStaticMarkup(<Bloc titre="Avenants" corps="nu">corps</Bloc>)).toContain('>Avenants</span>');
	});

	it('CleValeur : une moins-value en danger, en chiffres', () => {
		const html = renderToStaticMarkup(<CleValeur><Cle>Avenants</Cle><Valeur chiffres moins data-testid="somme-avenants">− 300,00 €</Valeur></CleValeur>);
		expect(html).toContain('<dd data-testid="somme-avenants" class="text-13 font-mono tabular-nums text-danger">');
	});

	it('Tableau : les attributs de cellule passent avant les règles de la variante', () => {
		const c = renderToStaticMarkup(<Tableau variante="mini"><tbody /></Tableau>).replaceAll('&amp;', '&').replaceAll('&gt;', '>');
		for (const attendu of ['[&_[data-droite]]:text-right', '[&_[data-saisie]]:px-0', '[&_[data-vide]]:italic', '[&_[data-droite]]:w-[1%]']) expect(c).toContain(attendu);
	});

	it('Onglet : l\'onglet courant porte aria-current, le compteur un data-testid', () => {
		const html = renderToStaticMarkup(<Onglet href="/x" actif icone={null} compteur={3}>Marchés</Onglet>);
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('data-testid="compteur"');
	});

	it('Ecran : un titre de niveau 1', () => {
		expect(renderToStaticMarkup(<Ecran titre="Artisans">x</Ecran>)).toContain('<h1 class="text-22">Artisans</h1>');
	});
});
```

- [ ] **Step 2 : le lancer**

Run : `npx vitest run src/composants/briques/structure.test.tsx`
Expected : FAIL, « Failed to resolve import "./Carte" ».

- [ ] **Step 3 : écrire les briques**

`src/composants/briques/Carte.tsx` :

```tsx
import Link from 'next/link';
import type { HTMLAttributes } from 'react';
import { cx } from './cx';

const SOULEVE = 'cursor-pointer transition-[box-shadow,border-color,translate] duration-160 hover:-translate-y-0.5 hover:border-accent hover:shadow-ombre-h active:translate-y-0';

const VARIANTE = {
	/** Une carte qui s'ouvre : elle se soulève au survol (ex-.chantier). */
	cliquable: `gap-3 border-rule bg-raise px-5.5 pt-5 pb-4.5 shadow-ombre ${SOULEVE}`,
	/** La carte d'ajout, en pointillés, contenu centré (ex-.chantier-new). */
	ajout: `items-start justify-center gap-1.5 border-dashed border-rule bg-surface px-5.5 pt-5 pb-4.5 shadow-ombre ${SOULEVE}`,
	/** Une carte de série (ex-.dm-carte). */
	compacte: 'items-start gap-1 border-rule bg-raise px-4 py-3.5 shadow-ombre',
	/** La même, encore vide (ex-.dm-carte.est-vide). */
	compacteVide: 'items-start gap-1 border-dashed border-rule-strong bg-surface px-4 py-3.5',
} as const;

type Apparence = {
	variante: keyof typeof VARIANTE;
	/** Estompée : un chantier terminé (ex-.chantier.is-done). */
	estompee?: boolean;
	/** Placement seulement. */
	className?: string;
};

const classes = ({ variante, estompee, className }: Apparence) =>
	cx('flex flex-col rounded-md border text-left', VARIANTE[variante], estompee && 'opacity-72', className);

/** Le cadre d'une carte : fond, filet, rondeur, ombre. Un href en fait un lien. */
export function Carte(props: Apparence & Omit<HTMLAttributes<HTMLDivElement>, 'className'> & { href?: undefined } | Apparence & { href: string; children: React.ReactNode }) {
	if (props.href !== undefined) {
		const { variante, estompee, className, href, children } = props;
		return <Link href={href} className={classes({ variante, estompee, className })}>{children}</Link>;
	}
	const { variante, estompee, className, href: _href, ...reste } = props;
	return <div {...reste} className={classes({ variante, estompee, className })} />;
}
```

`src/composants/briques/Bloc.tsx` :

```tsx
import { cx } from './cx';
import { Surtitre } from './Surtitre';

const CORPS = {
	normal: 'p-3.5',
	/** Un tableau qui touche les bords. */
	nu: 'p-0',
	/** Des éléments empilés, espacés. */
	colonne: 'flex flex-col gap-3 p-3.5',
} as const;

/** Un bloc d'un panneau : en-tête (surtitre, action) et corps (ex-.block, .block-head, .block-body). */
export function Bloc({ titre, action, corps = 'normal', className, children }: {
	titre?: React.ReactNode;
	action?: React.ReactNode;
	corps?: keyof typeof CORPS;
	/** Placement seulement. */
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cx('overflow-hidden rounded-md border border-rule bg-raise', className)}>
			{(titre || action) && (
				<div className="flex items-center justify-between gap-3 border-b border-rule bg-surface px-3.5 py-2">
					{titre && <Surtitre>{titre}</Surtitre>}
					{action}
				</div>
			)}
			<div className={CORPS[corps]}>{children}</div>
		</div>
	);
}
```

`src/composants/briques/CleValeur.tsx` :

```tsx
import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { CHIFFRES } from './typo';

/** Des paires clé — valeur sur deux colonnes (ex-.kv). */
export function CleValeur({ className, children }: { className?: string; children: React.ReactNode }) {
	return <dl className={cx('grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3.5 gap-y-1.5', className)}>{children}</dl>;
}

export function Cle({ children }: { children: React.ReactNode }) {
	return <dt className="text-12 text-muted">{children}</dt>;
}

/** « chiffres » : alignés ; « moins » : une moins-value, en danger (ex-.kv dd.num.moins). */
export function Valeur({ chiffres = false, moins = false, children, ...reste }: Omit<HTMLAttributes<HTMLElement>, 'className'> & { chiffres?: boolean; moins?: boolean }) {
	return <dd {...reste} className={cx('text-13', chiffres && CHIFFRES, moins && 'text-danger')}>{children}</dd>;
}
```

`src/composants/briques/Vide.tsx` :

```tsx
import { cx } from './cx';

const VARIANTE = {
	/** À la place d'une liste de cartes, sur toute la largeur de la grille (ex-.empty-list). */
	liste: 'col-span-full rounded-sm border border-rule bg-raise px-5 py-8 text-center italic text-muted',
	/** Dans un bloc de panneau (ex-.vide-mini). */
	mini: 'px-3.5 py-5 text-center text-13 italic text-muted',
} as const;

/** Ce qui s'affiche quand il n'y a rien. */
export function Vide({ variante, className, children }: { variante: keyof typeof VARIANTE; className?: string; children: React.ReactNode }) {
	return <p className={cx(VARIANTE[variante], className)}>{children}</p>;
}
```

`src/composants/briques/Tableau.tsx`. Les règles d'une variante visent les cellules par des sélecteurs descendants (`[&_thead_th]:…`). Un utilitaire posé sur une cellule ne les battrait pas ; d'où les attributs `data-*`, servis par `CELLULES` avant la variante.

```tsx
import type { ComponentProps } from 'react';
import { cx } from './cx';

/** Le cadre qui porte un tableau et le fait défiler à l'horizontale (ex-.table-frame, .dm-cadre). */
export function CadreTableau({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('overflow-x-auto rounded-md border border-rule bg-raise shadow-ombre', className)}>{children}</div>;
}

/** L'en-tête de tous les tableaux : petites capitales sur fond surface. */
const ENTETE = '[&_thead_th]:border-b [&_thead_th]:border-rule-strong [&_thead_th]:bg-surface [&_thead_th]:text-left [&_thead_th]:font-titre '
	+ '[&_thead_th]:text-11 [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.07em] [&_thead_th]:whitespace-nowrap [&_thead_th]:text-muted [&_thead_th]:uppercase';

/**
 * Ce qu'une cellule ou une ligne demande par un attribut, plus fort que les règles de la variante :
 * data-droite (aligné à droite), data-saisie (le champ porte le rembourrage), data-actions (boutons sur une ligne),
 * data-vide (« aucun résultat »), data-premiere (la colonne du lot, tableau dm) ; ligne : data-ouvert, data-inactif.
 */
const CELLULES = '[&_[data-droite]]:text-right [&_[data-saisie]]:px-0 [&_[data-actions]]:whitespace-nowrap [&_[data-actions]>*+*]:ml-1.5 '
	+ '[&_[data-vide]]:px-3 [&_[data-vide]]:py-7 [&_[data-vide]]:text-center [&_[data-vide]]:italic [&_[data-vide]]:text-muted [&_[data-inactif]>*]:text-muted';

const VARIANTE = {
	/** Une liste (ex-table.plain). */
	plain: `min-w-184 ${ENTETE} [&_thead_th]:px-3 [&_thead_th]:py-2 [&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 [&_tbody_tr:hover]:bg-surface`,
	/** Serré, dans un panneau ; les colonnes de chiffres se serrent sur leur contenu (ex-table.plain.plain-mini). */
	mini: `min-w-0 text-13 ${ENTETE} [&_thead_th]:px-2 [&_thead_th]:py-1.5 [&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-1 [&_tbody_td]:py-0.75 `
		+ '[&_tbody_tr:hover]:bg-surface [&_[data-droite]]:w-[1%] [&_[data-droite]]:whitespace-nowrap',
	/** Les lots : en-tête collé, lignes cliquables, ligne ouverte en accent (ex-table.lots). */
	lots: `min-w-208 ${ENTETE} [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-5 [&_thead_th]:px-3 [&_thead_th]:py-2 `
		+ '[&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 [&_tbody_td]:align-middle [&_tbody_tr]:cursor-pointer '
		+ '[&_tbody_tr:not([data-ouvert]):hover]:bg-surface [&_tbody_tr[data-ouvert]]:bg-accent-soft',
	/** Les documents par lot : la première colonne est un <th> de ligne (ex-table.dm). */
	dm: `min-w-224 ${ENTETE} [&_thead_th]:px-3 [&_thead_th]:py-2.5 [&_td]:border-b [&_td]:border-rule [&_td]:px-3 [&_td]:py-1.75 [&_td]:align-middle `
		+ '[&_tbody_th]:border-b [&_tbody_th]:border-rule [&_tbody_th]:px-3 [&_tbody_th]:py-1.75 [&_tbody_th]:text-left [&_tbody_th]:align-middle [&_tbody_th]:font-normal '
		+ '[&_tbody_tr:last-child>*]:border-b-0 [&_tbody_tr:hover]:bg-surface [&_[data-premiere]]:w-[34%] [&_[data-premiere]]:pl-4',
} as const;

/** Un tableau de la maquette. Les cellules restent du HTML ; leurs écarts passent par des attributs data-* (CELLULES). */
export function Tableau({ variante, className, ...reste }: { variante: keyof typeof VARIANTE; className?: string } & Omit<ComponentProps<'table'>, 'className'>) {
	return <table {...reste} className={cx('w-full border-collapse', CELLULES, VARIANTE[variante], className)} />;
}
```

`src/composants/briques/BarreOutils.tsx` :

```tsx
import { cx } from './cx';

/** La barre au-dessus d'une liste : recherche, tri, filtres (ex-.toolbar). « etalee » écarte ses deux bouts (ex-.g-toolbar). */
export function BarreOutils({ etalee = false, children }: { etalee?: boolean; children: React.ReactNode }) {
	return <div className={cx('mb-4 flex flex-wrap items-center gap-2.5', etalee && 'justify-between')}>{children}</div>;
}
```

`src/composants/briques/Onglet.tsx` :

```tsx
import Link from 'next/link';
import { cx } from './cx';

/** L'étage des onglets du chantier ouvert (ex-.nav-onglets). */
export function BarreOnglets({ libelle, children }: { libelle: string; children: React.ReactNode }) {
	return (
		<nav aria-label={libelle} className="flex gap-0.5 overflow-x-auto border-t border-rule bg-paper px-6 [scrollbar-width:none] max-etroit:px-3.5 [&::-webkit-scrollbar]:hidden">
			{children}
		</nav>
	);
}

/** Un onglet (ex-.nav-o) : son icône, son libellé, son compteur ; l'onglet courant porte aria-current. */
export function Onglet({ href, actif, icone, compteur, children }: { href: string; actif: boolean; icone: React.ReactNode; compteur?: number; children: React.ReactNode }) {
	return (
		<Link href={href} aria-current={actif ? 'page' : undefined}
			className={cx('inline-flex flex-none items-center gap-2 border-b-2 px-3.5 pt-2.75 pb-2.25 text-14 whitespace-nowrap no-underline transition-[color,border-color] duration-120',
				'[&_svg]:size-4 [&_svg]:flex-none [&_svg]:stroke-[1.5] [&_svg]:opacity-80',
				actif ? 'border-accent font-semibold text-accent' : 'border-transparent text-muted hover:text-ink')}>
			{icone}{children}
			{compteur !== undefined && (
				<span data-testid="compteur" className={cx('font-mono text-11', actif ? 'text-accent opacity-75' : 'text-faint')}>{compteur}</span>
			)}
		</Link>
	);
}
```

Run : `npx vitest run src/composants/briques/structure.test.tsx`
Expected : FAIL sur « Ecran : un titre de niveau 1 » seulement, tant qu'`Ecran` garde ses classes.

- [ ] **Step 4 : restyler `Ecran` et `Sigle`, adapter leurs appelants**

```diff
diff --git a/src/app/connexion/page.tsx b/src/app/connexion/page.tsx
index 110721f..ef036b9 100644
--- a/src/app/connexion/page.tsx
+++ b/src/app/connexion/page.tsx
@@ -38,7 +38,7 @@ export default function PageConnexion() {
 			<div className="login">
 				<div className="login-card">
 					<div className="login-brand">
-						<div className="login-mark"><Sigle grand />Sentinelle</div>
+						<div className="login-mark"><Sigle taille="grande" />Sentinelle</div>
 						<p className="login-tag">Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</p>
 					</div>
 					<form className="login-form" onSubmit={soumettre}>
diff --git a/src/composants/FormulaireMotDePasse.tsx b/src/composants/FormulaireMotDePasse.tsx
index 703e857..92a4f01 100644
--- a/src/composants/FormulaireMotDePasse.tsx
+++ b/src/composants/FormulaireMotDePasse.tsx
@@ -38,7 +38,7 @@ export function FormulaireMotDePasse() {
 			<div className="login">
 				<div className="login-card">
 					<div className="login-brand">
-						<div className="login-mark"><Sigle grand />Sentinelle</div>
+						<div className="login-mark"><Sigle taille="grande" />Sentinelle</div>
 						<p className="login-tag">Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</p>
 					</div>
 					<form className="login-form" onSubmit={soumettre}>
diff --git a/src/composants/briques/Ecran.tsx b/src/composants/briques/Ecran.tsx
index 1ebcf8c..d2f3cc0 100644
--- a/src/composants/briques/Ecran.tsx
+++ b/src/composants/briques/Ecran.tsx
@@ -1,26 +1,26 @@
-/** Un écran de la maquette : section.screen, sa barre de titre (.topbar) et son corps (.body-pad). */
+/** Un écran : sa barre de titre et son corps (ex-section.screen, .topbar, .body-pad). */
 export function Ecran({ titre, sousTitre, actions, contexte, children }: {
 	titre: string;
 	/** Sous le titre : le surtitre « 6 documents produits… » de l'écran Documents. */
 	sousTitre?: React.ReactNode;
 	actions?: React.ReactNode;
-	/** Le bandeau .context du chantier (Marchés, Planning). */
+	/** Le bandeau du chantier (Marchés, Planning). */
 	contexte?: React.ReactNode;
 	children: React.ReactNode;
 }) {
 	return (
-		<section className="screen is-on">
-			<div className="topbar">
-				<div className="topbar-row">
+		<section>
+			<div className="border-b border-rule bg-paper">
+				<div className="flex flex-wrap items-end justify-between gap-6 px-6 pt-4 pb-3.5">
 					<div>
-						<h1 className="page-title">{titre}</h1>
+						<h1 className="text-22">{titre}</h1>
 						{sousTitre}
 					</div>
-					{actions && <div className="topbar-actions">{actions}</div>}
+					{actions && <div className="flex items-center gap-2">{actions}</div>}
 				</div>
 				{contexte}
 			</div>
-			<div className="body-pad">{children}</div>
+			<div className="p-6">{children}</div>
 		</section>
 	);
 }
diff --git a/src/composants/briques/Sigle.tsx b/src/composants/briques/Sigle.tsx
index 68f58f6..9dbc71a 100644
--- a/src/composants/briques/Sigle.tsx
+++ b/src/composants/briques/Sigle.tsx
@@ -1,9 +1,11 @@
+import { cx } from './cx';
+
 const S = '0,17 15.5,0 70.5,0 86,17 19.8,17 19.8,41.5 86,41.5 86,83 70.5,100 15.5,100 0,83 66.2,83 66.2,58.5 0,58.5';
 
 /** Le sprite du sigle (la plaque gravée, claire et sombre) : une fois par page, dans le layout. */
 export function SigleDefs() {
 	return (
-		<svg className="sigle-defs" width="0" height="0" aria-hidden="true">
+		<svg className="absolute size-0 overflow-hidden" width="0" height="0" aria-hidden="true">
 			<defs>
 				<linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="1">
 					<stop offset="0" stopColor="#8ea9c3" /><stop offset="0.38" stopColor="#b8cadd" /><stop offset="0.7" stopColor="#cfdcea" /><stop offset="1" stopColor="#f2f7fb" />
@@ -28,10 +30,18 @@ export function SigleDefs() {
 	);
 }
 
-export function Sigle({ grand = false }: { grand?: boolean }) {
+/** Le fond de la plaque prend la teinte de son support : elle s'y fond, on ne voit que le S creusé. */
+const TAILLE = {
+	normale: 'size-12 text-surface',
+	/** L'écran de connexion (ex-.sigle-lg). */
+	grande: 'size-18 text-paper',
+} as const;
+
+/** Le sigle, une plaque par thème. « survol » : il suit le survol de son parent (qui porte la classe group). */
+export function Sigle({ taille = 'normale', survol = false }: { taille?: keyof typeof TAILLE; survol?: boolean }) {
 	return (
-		<svg className={grand ? 'sigle sigle-lg' : 'sigle'} viewBox="0 0 160 160" aria-hidden="true">
-			<use className="pl-clair" href="#plaque-clair" /><use className="pl-sombre" href="#plaque-sombre" />
+		<svg className={cx('flex-none', TAILLE[taille], survol && 'group-hover:text-idle-soft')} viewBox="0 0 160 160" aria-hidden="true">
+			<use className="dark:hidden" href="#plaque-clair" /><use className="hidden dark:block" href="#plaque-sombre" />
 		</svg>
 	);
 }
diff --git a/src/composants/navigation/BarreNavigation.tsx b/src/composants/navigation/BarreNavigation.tsx
index 5dee513..0b1b2b4 100644
--- a/src/composants/navigation/BarreNavigation.tsx
+++ b/src/composants/navigation/BarreNavigation.tsx
@@ -30,7 +30,7 @@ export function BarreNavigation({ utilisateur, navigation, children }: { utilisa
 			<div className="main">
 				<header className="nav">
 					<div className="nav-haut">
-						<Link className="nav-marque" href="/chantiers" title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle /></Link>
+						<Link className="nav-marque group" href="/chantiers" title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle survol /></Link>
 						<Link className={accueil ? 'nav-ic is-on' : 'nav-ic'} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
 						<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
 						<div className="nav-fin">
```

Le banc cherchait le bouton « Nouveau chantier » par `.topbar-actions`, disparu avec `Ecran` :

```diff
diff --git a/e2e/conformite/ecrans.ts b/e2e/conformite/ecrans.ts
index ab1dd13..596674f 100644
--- a/e2e/conformite/ecrans.ts
+++ b/e2e/conformite/ecrans.ts
@@ -87,7 +87,7 @@ export const ECRANS: Ecran[] = [
 		await poserMasqueCompte(page);
 	} },
 	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
-	{ nom: 'nouveau', masques: ['.field:has(#f-ca)'], aller: async (page) => { await page.locator('.topbar-actions .btn-primary', { hasText: 'Nouveau chantier' }).click(); } },
+	{ nom: 'nouveau', masques: ['.field:has(#f-ca)'], aller: async (page) => { await page.getByText('Nouveau chantier', { exact: true }).first().click(); } },
 	{ nom: 'marches', aller: ouvrirPerrier },
 	{ nom: 'panneau-lot', aller: async (page) => { await ouvrirPerrier(page); await page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent').click(); } },
 	{ nom: 'planning', masques: ['.g-auj', '.g-sems .auj'], aller: async (page) => {
```

Run : `npx vitest run src/composants/briques`
Expected : PASS.

- [ ] **Step 5 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts restes src/composants/briques/Ecran.tsx src/composants/briques/Sigle.tsx src/composants/briques/Tableau.tsx src/composants/briques/Carte.tsx src/composants/briques/Bloc.tsx
```

Expected : `9 sélecteur(s) retiré(s), 473 restant(s).`, puis `src/composants/briques/Sigle.tsx : block`, un faux positif (`dark:block` ; `.block` est le cadre de la maquette).

- [ ] **Step 6 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert.

- [ ] **Step 7 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): briques de structure ; Ecran et Sigle restylés

Carte, Bloc, CleValeur, Vide, CadreTableau, Tableau (attributs data-* de cellule), BarreOutils,
BarreOnglets et Onglet. Ecran et Sigle passent en utilitaires.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : les surcouches (Panneau, MenuDeroulant, Confirmation, Toasts)

Les surcouches gardent leur logique, mais se reconnaissent désormais à des attributs : `data-surcouche`, `data-ouvert`, `data-verrou-defilement`, `data-bloque-clavier`. Le tri d'Échap ne lit plus aucune classe :
- `Panneau` ignore Échap tant qu'une confirmation est ouverte ;
- `CadreApercu` l'ignore tant qu'une confirmation, un menu ou un panneau est ouvert.

Le verrou de défilement passe à `html:has([data-verrou-defilement])` (`base.css`, Task 1). `MenuDeroulant` perd sa prop `classe` (`dd-plein`, `dd-large`) au profit de `largeur` (`'normale' | 'large' | 'pleine'`) et d'un `className` de placement.

Correction au passage : un menu ouvert vers le haut gardait le `top` posé à l'ouverture précédente. Son placement passe désormais tout entier par le style en ligne `top`/`bottom`.

**Files :**
- Create : `src/composants/briques/surcouches.ts`, `src/composants/briques/surcouches.test.tsx`
- Modify :
  - `src/composants/briques/Panneau.tsx`, `MenuDeroulant.tsx`, `Confirmation.tsx`, `Toasts.tsx`, `CadreApercu.tsx:31` ;
  - `src/composants/ApercuReception.tsx`, `FormulaireChantier.tsx`, `PanneauLot.tsx`, `TableauLots.tsx` ;
  - `src/composants/accueil/AccueilChantiers.tsx`, `src/composants/chantier/BandeauChantier.tsx` ;
  - `src/composants/planning/BarreOutilsPlanning.tsx`, `src/composants/planning/PanneauLotPlanning.tsx`.
- Test : `e2e/marches.spec.ts`, `e2e/parcours.spec.ts`, `e2e/planning-gestes.spec.ts`, `e2e/suivi.spec.ts`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `Bouton`, `Surtitre`, `cx`, `CLE`, `SURTITRE`.
- Produces :
  - `surcouches.ts` :
    - `CONFIRMATION_OUVERTE` = `'[data-surcouche="confirmation"][data-ouvert]'` ;
    - `PANNEAU_OUVERT` = `'[data-surcouche="panneau"][data-ouvert]'` ;
    - `AU_DESSUS_DE_L_APERCU` : les deux, plus le menu ouvert.
  - `MENU` (`MenuDeroulant.tsx`) : les classes partagées du dessin des menus. `SelecteurChantier` (Task 8) les reprend.
    - `bouton`, `cle`, `valeur`, `fleche` ;
    - `liste`, `item`, `itemCourant`, `itemAutre` ;
    - `nom`, `meta`, `tete`, `separateur`.
  - `MenuDeroulant` :
    - props : `largeur?: 'normale' | 'large' | 'pleine'`, `className?` (placement) ; la prop `classe` disparaît ;
    - racine : `id`, `data-surcouche="menu"`, `data-ouvert` ;
    - la valeur affichée porte `data-testid="dd-valeur"`.
  - `Confirmation` : `role="alertdialog"`, texte `id="confirmation-texte"`. `useConfirmation` et `ConfirmationFournisseur` ne changent pas.
  - `Panneau` : même API ; `data-surcouche="panneau"` et, ouvert, `data-ouvert`, `data-verrou-defilement`, `data-bloque-clavier`.

- [ ] **Step 1 : écrire le test**

`src/composants/briques/surcouches.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfirmationFournisseur } from './Confirmation';
import { MenuDeroulant } from './MenuDeroulant';
import { Panneau } from './Panneau';
import { AU_DESSUS_DE_L_APERCU, CONFIRMATION_OUVERTE, PANNEAU_OUVERT } from './surcouches';

const rien = () => {};

describe('surcouches', () => {
	it('les sélecteurs visent des attributs, jamais des classes', () => {
		for (const s of [CONFIRMATION_OUVERTE, PANNEAU_OUVERT, AU_DESSUS_DE_L_APERCU]) expect(s).not.toMatch(/(^|[\s,])\./);
		expect(AU_DESSUS_DE_L_APERCU).toBe('[data-surcouche="confirmation"][data-ouvert], [data-surcouche="menu"][data-ouvert], [data-surcouche="panneau"][data-ouvert]');
	});

	it('Panneau ouvert : data-ouvert, verrou de défilement, blocage du clavier', () => {
		const html = renderToStaticMarkup(<Panneau ouvert surtitre="LOT 02" titre="GROS ŒUVRE" onFermer={rien}>corps</Panneau>);
		expect(html).toContain('data-surcouche="panneau" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""');
		expect(html).toContain('>corps<');
		expect(html).not.toContain('translate-x-full');
	});

	it('Panneau fermé : hors écran, sans verrou ni contenu', () => {
		const html = renderToStaticMarkup(<Panneau ouvert={false} surtitre="LOT 02" titre="GROS ŒUVRE" onFermer={rien}>corps</Panneau>);
		expect(html).toContain('data-surcouche="panneau"');
		expect(html).not.toContain('data-ouvert');
		expect(html).not.toContain('data-verrou-defilement');
		expect(html).toContain('translate-x-full');
		expect(html).not.toContain('>corps<');
	});

	it('Confirmation fermée : un alertdialog masqué, sans verrou', () => {
		const html = renderToStaticMarkup(<ConfirmationFournisseur>page</ConfirmationFournisseur>);
		expect(html).toContain('role="alertdialog"');
		expect(html).toContain('data-surcouche="confirmation"');
		expect(html).not.toContain('data-ouvert');
		expect(html).toMatch(/class="[^"]*\bhidden\b/);
	});

	it('MenuDeroulant : surcouche « menu », valeur repérable, largeur par prop, placement par className', () => {
		const html = renderToStaticMarkup(<MenuDeroulant id="dd-ent" k="Attribuée à" valeur="b" largeur="pleine" className="self-stretch"
			options={[{ v: 'a', t: 'ALPHA' }, { v: 'b', t: 'CONSTRUCTIONS REBOURS' }]} onChoisir={rien} />);
		expect(html).toContain('id="dd-ent" data-surcouche="menu"');
		expect(html).not.toContain('data-ouvert');
		expect(html).toMatch(/data-testid="dd-valeur">CONSTRUCTIONS REBOURS</);
		expect(html).toMatch(/id="dd-ent"[^>]*class="relative min-w-0 flex-1 self-stretch"/);
		expect(html).toContain('title="Attribuée à : CONSTRUCTIONS REBOURS"');
	});
});
```

- [ ] **Step 2 : le lancer**

Run : `npx vitest run src/composants/briques/surcouches.test.tsx`
Expected : FAIL, « Failed to resolve import "./surcouches" ».

- [ ] **Step 3 : écrire `surcouches.ts`**

```ts
/*
 * Les surcouches se reconnaissent à des attributs, jamais à leurs classes :
 * data-surcouche="panneau" | "menu" | "confirmation" | "apercu", data-ouvert quand elle est ouverte,
 * data-verrou-defilement quand elle fige la page de derrière (base.css).
 */

/** Une confirmation ouverte garde Échap pour elle. */
export const CONFIRMATION_OUVERTE = '[data-surcouche="confirmation"][data-ouvert]';

export const PANNEAU_OUVERT = '[data-surcouche="panneau"][data-ouvert]';

/** Ce qui, ouvert au-dessus d'un aperçu, garde Échap pour soi. */
export const AU_DESSUS_DE_L_APERCU = [CONFIRMATION_OUVERTE, '[data-surcouche="menu"][data-ouvert]', PANNEAU_OUVERT].join(', ');
```

- [ ] **Step 4 : restyler les surcouches**

`Panneau`. Le surtitre et le titre sont empilés dans un `flex flex-col` (convention « Surtitre au-dessus d'un titre ») :

```diff
diff --git a/src/composants/briques/Panneau.tsx b/src/composants/briques/Panneau.tsx
index 285d668..643a6bb 100644
--- a/src/composants/briques/Panneau.tsx
+++ b/src/composants/briques/Panneau.tsx
@@ -1,11 +1,15 @@
 'use client';
 
 import { useEffect } from 'react';
+import { Bouton } from './Bouton';
+import { cx } from './cx';
 import { nomAccessible } from './nomPanneau';
+import { Surtitre } from './Surtitre';
+import { CONFIRMATION_OUVERTE } from './surcouches';
 
 type Props = {
 	ouvert: boolean;
-	/** L'eyebrow (« LOT 02 », « ENTREPRISE »). */
+	/** Le surtitre (« LOT 02 », « ENTREPRISE »). */
 	surtitre: string;
 	titre: string;
 	onFermer: () => void;
@@ -17,30 +21,36 @@ type Props = {
 	children: React.ReactNode;
 };
 
-/** Échap le ferme, le fond le ferme, la page derrière ne défile plus (html:has(.panel.is-on) dans la maquette). */
+/** Le panneau latéral (ex-.panel, .scrim) : Échap le ferme, le voile le ferme, la page derrière ne défile plus. */
 export function Panneau({ ouvert, surtitre, titre, onFermer, pied, libelle, sansFermeture, children }: Props) {
 	useEffect(() => {
 		if (!ouvert) return;
 		// Une confirmation ouverte garde Échap pour elle.
-		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on')) onFermer(); };
+		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector(CONFIRMATION_OUVERTE)) onFermer(); };
 		window.addEventListener('keydown', touche);
 		return () => window.removeEventListener('keydown', touche);
 	}, [ouvert, onFermer]);
+	const ouverture = ouvert ? '' : undefined;
 	return (
 		<>
-			<div className={ouvert ? 'scrim is-on' : 'scrim'} onClick={onFermer} />
+			<div aria-hidden="true" onClick={onFermer}
+				className={cx('fixed inset-0 z-40 bg-voile/42 transition-opacity duration-180', ouvert ? 'opacity-100' : 'pointer-events-none opacity-0')} />
 			{/* data-bloque-clavier, seulement ouvert : sinon les raccourcis du planning seraient coupés en permanence (useClavier). */}
-			<aside className={ouvert ? 'panel is-on' : 'panel'} role="dialog" aria-label={nomAccessible(libelle, titre)} aria-hidden={!ouvert}
-				data-bloque-clavier={ouvert ? '' : undefined}>
-				<div className="panel-head">
-					<div>
-						<div className="eyebrow">{surtitre}</div>
-						<h2 style={{ fontSize: '1.125rem' }}>{titre}</h2>
+			<aside role="dialog" aria-label={nomAccessible(libelle, titre)} aria-hidden={!ouvert}
+				data-surcouche="panneau" data-ouvert={ouverture} data-verrou-defilement={ouverture} data-bloque-clavier={ouverture}
+				className={cx('fixed inset-y-0 right-0 z-50 flex w-[min(31rem,100vw)] flex-col overflow-hidden rounded-l-lg border-l border-rule-strong bg-paper shadow-ombre-h',
+					'transition-transform duration-200 ease-[ease]', !ouvert && 'translate-x-full')}>
+				<div className="flex items-start justify-between gap-4 border-b border-rule bg-surface px-5 pt-4 pb-3.5">
+					{/* En colonne : le surtitre (un span) prend sa propre hauteur de ligne, pas celle du corps. */}
+					<div className="flex flex-col">
+						<Surtitre>{surtitre}</Surtitre>
+						<h2 className="text-18">{titre}</h2>
 					</div>
-					{!sansFermeture && <button type="button" className="btn btn-ghost btn-sm" onClick={onFermer} aria-label="Fermer">✕</button>}
+					{!sansFermeture && <Bouton variante="fantome" taille="sm" onClick={onFermer} aria-label="Fermer">✕</Bouton>}
 				</div>
-				<div className="panel-body">{ouvert && children}</div>
-				{pied && <div className="panel-foot">{pied}</div>}
+				{/* Les enfants gardent leur hauteur : c'est le corps qui défile, pas eux. */}
+				<div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5 *:flex-none">{ouvert && children}</div>
+				{pied && <div className="flex flex-wrap gap-2 border-t border-rule bg-surface px-5 py-3.5">{pied}</div>}
 			</aside>
 		</>
 	);
```

`MenuDeroulant`. Il reçoit les tables `MENU`, `LARGEUR` et la case du choix multiple ; ses requêtes visent `[role="option"]` et `[aria-selected="true"]`.

```diff
diff --git a/src/composants/briques/MenuDeroulant.tsx b/src/composants/briques/MenuDeroulant.tsx
index 946de0f..c759e09 100644
--- a/src/composants/briques/MenuDeroulant.tsx
+++ b/src/composants/briques/MenuDeroulant.tsx
@@ -1,8 +1,39 @@
 'use client';
 
 import { useEffect, useLayoutEffect, useRef, useState } from 'react';
+import { cx } from './cx';
 import { estChoix, filtrerOptions, placerMenu, type OptionMenu } from './menu';
 
+/** Le dessin des menus déroulants (ex-.dd-*, .picker-*) : MenuDeroulant et le sélecteur de chantier le partagent. */
+export const MENU = {
+	bouton: 'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 rounded-sm border border-l-2 border-rule-strong border-l-accent bg-raise '
+		+ 'pt-1.25 pr-2 pb-1.5 pl-2.5 text-left transition-[border-color,background-color] duration-120 hover:border-muted hover:border-l-accent hover:bg-idle-soft',
+	cle: 'col-start-1 row-start-1 font-titre text-9 font-semibold tracking-[0.1em] uppercase text-faint',
+	valeur: 'col-start-1 row-start-2 truncate font-titre text-15 leading-[1.15] font-semibold',
+	fleche: 'col-start-2 row-[1/3] size-3.5 stroke-muted transition-transform duration-140',
+	liste: 'max-h-88 overflow-y-auto rounded-sm border border-rule-strong bg-raise p-0.75 shadow-ombre-h',
+	item: 'flex w-full cursor-pointer items-baseline gap-2 rounded-[4px] px-2 py-1.5 text-left',
+	itemCourant: 'bg-accent-soft font-semibold text-accent-2',
+	itemAutre: 'text-ink hover:bg-idle-soft',
+	nom: 'min-w-0 flex-1 truncate text-13',
+	meta: 'flex-none font-mono text-10 text-faint',
+	tete: 'px-2 pt-1.75 pb-1 font-titre text-9 font-semibold tracking-[0.1em] uppercase text-faint',
+	separateur: 'my-0.75 border-0 border-t border-rule',
+} as const;
+
+const LARGEUR = {
+	normale: { racine: 'relative flex-none', bouton: 'min-w-44' },
+	large: { racine: 'relative flex-none', bouton: 'min-w-60' },
+	/** Toute la place de son conteneur (ex-.dd-plein). */
+	pleine: { racine: 'relative min-w-0 flex-1', bouton: 'min-w-0' },
+} as const;
+
+/** La case d'un choix multiple : cochée, elle prend l'accent. */
+const COCHE = "relative pl-7 before:absolute before:top-2 before:left-2 before:size-3 before:rounded-[3px] before:border before:content-['']";
+const COCHEE = "before:border-accent before:bg-accent before:inset-ring before:inset-ring-accent after:absolute after:top-2.75 after:left-[0.71875rem] after:h-1.5 after:w-0.75 "
+	+ "after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-on-accent after:content-['']";
+const DECOCHEE = 'before:border-rule-strong before:bg-raise';
+
 type Props = {
 	id: string;
 	/** Le surtitre (« Trier par », « Attribuée à »…). */
@@ -18,8 +49,10 @@ type Props = {
 	vide?: string;
 	/** true : « Rechercher… » ; un texte : son invite. */
 	recherche?: boolean | string;
-	classe?: string;
+	largeur?: keyof typeof LARGEUR;
 	desactive?: boolean;
+	/** Placement seulement (self-stretch dans une barre d'outils). */
+	className?: string;
 };
 
 export function MenuDeroulant(p: Props) {
@@ -28,11 +61,14 @@ export function MenuDeroulant(p: Props) {
 	const racine = useRef<HTMLDivElement>(null);
 	const bouton = useRef<HTMLButtonElement>(null);
 	const menu = useRef<HTMLDivElement>(null);
+	const champ = useRef<HTMLInputElement>(null);
 	const [place, setPlace] = useState<React.CSSProperties>({});
 	const choisie = p.options.find((o) => estChoix(o) && o.v === p.valeur);
 	const libelle = p.libelle ?? (choisie && estChoix(choisie) ? choisie.t : (p.vide ?? '—'));
 	const visibles = filtrerOptions(p.options, requete);
 	const choix = visibles.filter(estChoix);
+	const largeur = LARGEUR[p.largeur ?? 'normale'];
+	const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
 
 	function placer() {
 		if (!bouton.current || !menu.current) return;
@@ -52,9 +88,8 @@ export function MenuDeroulant(p: Props) {
 		window.addEventListener('scroll', placer, true);
 		window.addEventListener('resize', placer);
 		// Un menu avec recherche s'ouvre prêt à taper ; les autres, sur l'entrée courante.
-		const champ = menu.current?.querySelector<HTMLInputElement>('.dd-recherche input');
-		const courant = menu.current?.querySelector<HTMLElement>('.dd-item.is-current') ?? menu.current?.querySelector<HTMLElement>('.dd-item');
-		(champ ?? courant)?.focus({ preventScroll: true });
+		const courant = menu.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ?? items()[0];
+		(champ.current ?? courant)?.focus({ preventScroll: true });
 		return () => {
 			document.removeEventListener('click', dehors);
 			document.removeEventListener('keydown', touche, true);
@@ -72,52 +107,55 @@ export function MenuDeroulant(p: Props) {
 
 	/** Les flèches parcourent la liste, comme sur un <select>. */
 	function clavierListe(e: React.KeyboardEvent) {
-		const items = [...(menu.current?.querySelectorAll<HTMLElement>('.dd-item') ?? [])];
-		const i = items.indexOf(document.activeElement as HTMLElement);
+		const liste = items();
+		const i = liste.indexOf(document.activeElement as HTMLElement);
 		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
 			e.preventDefault();
-			items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
+			liste[(i + (e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length]?.focus();
 		} else if (e.key === 'Home' || e.key === 'End') {
 			e.preventDefault();
-			(e.key === 'Home' ? items[0] : items.at(-1))?.focus();
+			(e.key === 'Home' ? liste[0] : liste.at(-1))?.focus();
 		}
 	}
 
 	return (
-		<div ref={racine} id={p.id} className={['dd', p.classe, ouvert && 'is-open est-flottant'].filter(Boolean).join(' ')}>
-			<button ref={bouton} type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={ouvert} disabled={p.desactive}
+		<div ref={racine} id={p.id} data-surcouche="menu" data-ouvert={ouvert ? '' : undefined} className={cx(largeur.racine, p.className)}>
+			<button ref={bouton} type="button" className={cx(MENU.bouton, largeur.bouton)} aria-haspopup="listbox" aria-expanded={ouvert} disabled={p.desactive}
 				title={`${p.k} : ${libelle}`} onClick={(e) => { e.stopPropagation(); if (ouvert) fermer(); else setOuvert(true); }}
 				onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ouvert) { e.preventDefault(); setOuvert(true); } }}>
-				<span className="dd-k">{p.k}</span>
-				<span className="dd-v">{libelle}</span>
-				<svg className="dd-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
+				<span className={MENU.cle}>{p.k}</span>
+				<span className={MENU.valeur} data-testid="dd-valeur">{libelle}</span>
+				<svg className={cx(MENU.fleche, ouvert && 'rotate-180')} viewBox="0 0 16 16" fill="none" strokeWidth={1.6} aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
 			</button>
 			{ouvert && (
-				<div ref={menu} className="dd-menu" role="listbox" aria-label={p.k} style={place} onKeyDown={clavierListe}>
+				// Ouvert, le menu quitte le flux (position fixe, calculée par placerMenu) : un panneau qui défile ne le rogne pas.
+				<div ref={menu} className={cx(MENU.liste, 'fixed z-70 w-80 overscroll-contain')} role="listbox" aria-label={p.k} style={place} onKeyDown={clavierListe}>
 					{p.recherche && (
-						<div className="dd-recherche">
-							<input type="search" placeholder={p.recherche === true ? 'Rechercher…' : p.recherche} aria-label={`Rechercher dans ${p.k}`}
+						// La recherche reste en haut quand la liste défile.
+						<div className="sticky -top-0.75 z-1 -mx-0.75 -mt-0.75 mb-0.75 border-b border-rule bg-raise p-1.5">
+							<input ref={champ} type="search" placeholder={p.recherche === true ? 'Rechercher…' : p.recherche} aria-label={`Rechercher dans ${p.k}`}
 								autoComplete="off" value={requete} onChange={(e) => setRequete(e.target.value)}
+								className="w-full rounded-xs border border-rule-strong bg-surface px-2.5 py-1.75 text-13 text-ink focus:border-accent focus:bg-raise focus:outline-none"
 								onKeyDown={(e) => {
 									if (e.key === 'Enter') { e.preventDefault(); if (choix[0]) choisir(choix[0].v); }
-									else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); menu.current?.querySelector<HTMLElement>('.dd-item')?.focus(); }
+									else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); items()[0]?.focus(); }
 								}} />
 						</div>
 					)}
 					{visibles.map((o, i) => {
-						if ('sep' in o) return <hr key={`sep${i}`} className="dd-sep" />;
-						if ('tete' in o) return <div key={`tete${i}`} className="dd-head">{o.tete}</div>;
+						if ('sep' in o) return <hr key={`sep${i}`} className={MENU.separateur} />;
+						if ('tete' in o) return <div key={`tete${i}`} className={MENU.tete}>{o.tete}</div>;
 						const courant = p.multi ? (p.valeurs ?? []).includes(o.v) : o.v === p.valeur;
 						return (
 							<button key={o.v} type="button" role="option" aria-selected={courant} data-v={o.v}
-								className={['dd-item', courant && 'is-current', p.multi && 'dd-coche'].filter(Boolean).join(' ')}
+								className={cx(MENU.item, 'focus-visible:-outline-offset-2', courant ? MENU.itemCourant : MENU.itemAutre, p.multi && COCHE, p.multi && (courant ? COCHEE : DECOCHEE))}
 								onClick={(e) => { e.stopPropagation(); choisir(o.v); }}>
-								<span className="dd-item-name">{o.t}</span>
-								{o.meta && <span className="dd-item-meta">{o.meta}</span>}
+								<span className={MENU.nom}>{o.t}</span>
+								{o.meta && <span className={MENU.meta}>{o.meta}</span>}
 							</button>
 						);
 					})}
-					{!choix.length && <p className="dd-aucun">Aucun résultat.</p>}
+					{!choix.length && <p className="px-2 py-3 text-center text-13 italic text-muted">Aucun résultat.</p>}
 				</div>
 			)}
 		</div>
```

`Confirmation`, `Toasts`, `CadreApercu` :

```diff
diff --git a/src/composants/briques/CadreApercu.tsx b/src/composants/briques/CadreApercu.tsx
index 31abd8b..ab739c7 100644
--- a/src/composants/briques/CadreApercu.tsx
+++ b/src/composants/briques/CadreApercu.tsx
@@ -2,6 +2,7 @@
 
 import { useEffect, useRef } from 'react';
 import { CSS_DOCUMENTS } from '@/documents/styles';
+import { AU_DESSUS_DE_L_APERCU } from './surcouches';
 
 type Props = {
 	/** Nom accessible de la surcouche (les E2E le cherchent) : le titre du type de document. */
@@ -27,7 +28,7 @@ export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, di
 	useEffect(() => {
 		const avant = document.body.style.overflow;
 		document.body.style.overflow = 'hidden';
-		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on, .dd.is-open, .panel.is-on')) fermer.current(); };
+		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector(AU_DESSUS_DE_L_APERCU)) fermer.current(); };
 		window.addEventListener('keydown', touche);
 		return () => { document.body.style.overflow = avant; window.removeEventListener('keydown', touche); };
 	}, []);
diff --git a/src/composants/briques/Confirmation.tsx b/src/composants/briques/Confirmation.tsx
index bafa723..7b6f6e8 100644
--- a/src/composants/briques/Confirmation.tsx
+++ b/src/composants/briques/Confirmation.tsx
@@ -1,13 +1,15 @@
 'use client';
 
 import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
+import { Bouton } from './Bouton';
+import { cx } from './cx';
 
 type Demande = { texte: React.ReactNode; libelle: string; dangereux?: boolean };
 type EnCours = Demande & { resoudre: (oui: boolean) => void };
 
 const Contexte = createContext<((d: Demande) => Promise<boolean>) | null>(null);
 
-/** La fenêtre de confirmation de la maquette (.ask). Annuler, Échap ou un clic hors de la carte : non. */
+/** La fenêtre de confirmation (ex-.ask). Annuler, Échap ou un clic hors de la carte : non. */
 export function ConfirmationFournisseur({ children }: { children: React.ReactNode }) {
 	const [enCours, setEnCours] = useState<EnCours | null>(null);
 	const oui = useRef<HTMLButtonElement>(null);
@@ -32,19 +34,21 @@ export function ConfirmationFournisseur({ children }: { children: React.ReactNod
 		return () => window.removeEventListener('keydown', touche, true);
 	});
 
+	const ouverte = enCours ? '' : undefined;
 	return (
 		<Contexte.Provider value={demander}>
 			{children}
 			{/* data-bloque-clavier, seulement ouverte : le planning ignore ses raccourcis tant qu'un tel élément existe (useClavier). */}
-			<div className={enCours ? 'ask is-on' : 'ask'} role="dialog" aria-modal="true" aria-labelledby="ask-txt"
-				data-bloque-clavier={enCours ? '' : undefined}
-				onClick={(e) => { if (e.target === e.currentTarget) repondre(false); }}>
+			<div role="alertdialog" aria-modal="true" aria-labelledby="confirmation-texte"
+				data-surcouche="confirmation" data-ouvert={ouverte} data-verrou-defilement={ouverte} data-bloque-clavier={ouverte}
+				onClick={(e) => { if (e.target === e.currentTarget) repondre(false); }}
+				className={cx('fixed inset-0 z-80 items-center justify-center bg-voile/50 p-6', enCours ? 'flex' : 'hidden')}>
 				{enCours && (
-					<div className="ask-card">
-						<p className="ask-txt" id="ask-txt">{enCours.texte}</p>
-						<div className="ask-actions">
-							<button type="button" className="btn" onClick={() => repondre(false)}>Annuler</button>
-							<button ref={oui} type="button" className={enCours.dangereux ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => repondre(true)}>{enCours.libelle}</button>
+					<div className="w-[min(27rem,100%)] rounded-md border border-rule-strong bg-raise px-5.5 pt-5 pb-4.5 shadow-ombre-h">
+						<p className="mb-4.5 text-14 leading-normal" id="confirmation-texte">{enCours.texte}</p>
+						<div className="flex justify-end gap-2">
+							<Bouton onClick={() => repondre(false)}>Annuler</Bouton>
+							<Bouton ref={oui} variante={enCours.dangereux ? 'danger' : 'primaire'} onClick={() => repondre(true)}>{enCours.libelle}</Bouton>
 						</div>
 					</div>
 				)}
diff --git a/src/composants/briques/Toasts.tsx b/src/composants/briques/Toasts.tsx
index aef8597..0e6c881 100644
--- a/src/composants/briques/Toasts.tsx
+++ b/src/composants/briques/Toasts.tsx
@@ -2,9 +2,12 @@
 
 import { Toaster } from 'sonner';
 
+/** Les messages de la maquette (ex-.toast) : sonner les place, la brique les dessine. */
+const TOAST = 'flex items-center gap-2 rounded-xs bg-ink px-3.75 py-2.25 text-13 text-paper shadow-ombre-toast animate-monte [&_b]:font-medium [&_b]:text-accent-2';
+
 export function Toasts() {
 	return (
 		<Toaster position="bottom-center" duration={3600} gap={8}
-			toastOptions={{ unstyled: true, classNames: { toast: 'toast', title: '', description: '' } }} />
+			toastOptions={{ unstyled: true, classNames: { toast: TOAST, title: '', description: '' } }} />
 	);
 }
```

Run : `npx vitest run src/composants/briques`
Expected : PASS.

- [ ] **Step 5 : les appelants**

`classe="dd-plein"` devient `largeur="pleine"`, et `classe="dd-large"` devient `largeur="large"`. Les menus de tri (`ch-sort`, `lot-sort`) et « Lots affichés » prennent `className="self-stretch"`, que la barre d'outils leur donnait. `PanneauLotPlanning` cherche la ligne visée par `PANNEAU_OUVERT`.

```diff
diff --git a/src/composants/ApercuReception.tsx b/src/composants/ApercuReception.tsx
index 1d35375..7189622 100644
--- a/src/composants/ApercuReception.tsx
+++ b/src/composants/ApercuReception.tsx
@@ -130,7 +130,7 @@ export function ApercuReception({ ouvert: initial, reference }: { ouvert: Recept
 			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
 			actions={<>
 				{ouvert.options.length > 0 && (
-					<MenuDeroulant id="pv-lot" k="Procès-verbal pour" valeur={ouvert.cible} recherche classe="dd-large"
+					<MenuDeroulant id="pv-lot" k="Procès-verbal pour" valeur={ouvert.cible} recherche largeur="large"
 						options={[...ouvert.options.map((o) => ({ v: o.lotId, t: o.libelle, meta: o.entreprise })), { sep: true as const }, { v: TOUS_LES_LOTS, t: 'Tous les lots attribués — une page chacun' }]}
 						onChoisir={aller} />
 				)}
diff --git a/src/composants/FormulaireChantier.tsx b/src/composants/FormulaireChantier.tsx
index bd58aee..a524411 100644
--- a/src/composants/FormulaireChantier.tsx
+++ b/src/composants/FormulaireChantier.tsx
@@ -110,7 +110,7 @@ export function FormulaireChantier({ chargesAffaire, moi }: Props) {
 							{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
 							<div className="field">
 								<label htmlFor="f-ca">Chargé d&apos;affaire</label>
-								<MenuDeroulant id="f-ca" k="Compte" classe="dd-plein" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
+								<MenuDeroulant id="f-ca" k="Compte" largeur="pleine" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
 									options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
 								<span className="hint">Chez vous, pas chez le client.</span>
 								{erreurs.chargeAffaireId && <span className="erreur">{erreurs.chargeAffaireId}</span>}
diff --git a/src/composants/PanneauLot.tsx b/src/composants/PanneauLot.tsx
index a2ee459..af70664 100644
--- a/src/composants/PanneauLot.tsx
+++ b/src/composants/PanneauLot.tsx
@@ -97,7 +97,7 @@ export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarche
 					{artisan && <Link className="btn btn-ghost btn-sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Link>}
 				</div>
 				<div className="block-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
-					<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" classe="dd-plein" desactive={enCours}
+					<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" largeur="pleine" desactive={enCours}
 						options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
 					{artisan && (
 						<>
diff --git a/src/composants/TableauLots.tsx b/src/composants/TableauLots.tsx
index 8c61ad9..4aadc42 100644
--- a/src/composants/TableauLots.tsx
+++ b/src/composants/TableauLots.tsx
@@ -59,7 +59,7 @@ export function TableauLots({ vue }: { vue: VueMarches }) {
 		<>
 			<div className="toolbar">
 				<Recherche placeholder="Rechercher un lot, une entreprise, un numéro…" libelle="Rechercher un lot" valeur={requete} onChange={setRequete} />
-				<MenuDeroulant id="lot-sort" k="Trier par" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
+				<MenuDeroulant id="lot-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
 				<span className="eyebrow">{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</span>
 			</div>
 			<div className="table-frame">
diff --git a/src/composants/accueil/AccueilChantiers.tsx b/src/composants/accueil/AccueilChantiers.tsx
index 51934ee..25bd3bd 100644
--- a/src/composants/accueil/AccueilChantiers.tsx
+++ b/src/composants/accueil/AccueilChantiers.tsx
@@ -27,7 +27,7 @@ export function AccueilChantiers({ cartes }: { cartes: Carte[] }) {
 			<Synthese s={synthese(cartes)} />
 			<div className="toolbar">
 				<Recherche placeholder="Rechercher un chantier, un client, une commune…" libelle="Rechercher un chantier" valeur={requete} onChange={setRequete} />
-				<MenuDeroulant id="ch-sort" k="Trier par" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
+				<MenuDeroulant id="ch-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
 				<Interrupteur coche={masquer} onChange={setMasquer}>Masquer les terminés</Interrupteur>
 				<span className="eyebrow">{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</span>
 			</div>
diff --git a/src/composants/chantier/BandeauChantier.tsx b/src/composants/chantier/BandeauChantier.tsx
index 199e092..e8d73f8 100644
--- a/src/composants/chantier/BandeauChantier.tsx
+++ b/src/composants/chantier/BandeauChantier.tsx
@@ -72,7 +72,7 @@ export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnT
 					</div>
 					<div className="field span">
 						<label htmlFor="e-ca">Chargé d&apos;affaire</label>
-						<MenuDeroulant id="e-ca" k="Compte" classe="dd-plein" valeur={c.chargeAffaireId}
+						<MenuDeroulant id="e-ca" k="Compte" largeur="pleine" valeur={c.chargeAffaireId}
 							options={chargesAffaire.map((x) => ({ v: x.id, t: x.nom }))}
 							onChoisir={(v) => agir(() => modifierChampChantierAction(c.id, 'chargeAffaireId', v))} />
 					</div>
diff --git a/src/composants/planning/BarreOutilsPlanning.tsx b/src/composants/planning/BarreOutilsPlanning.tsx
index 666ea34..29ec9fa 100644
--- a/src/composants/planning/BarreOutilsPlanning.tsx
+++ b/src/composants/planning/BarreOutilsPlanning.tsx
@@ -46,7 +46,7 @@ export function BarreOutilsPlanning(p: Props) {
 				</span>
 			</div>
 			<div className="g-outils">
-				<MenuDeroulant id="lots-vus" k="Lots affichés" multi classe="dd-large"
+				<MenuDeroulant id="lots-vus" k="Lots affichés" multi largeur="large" className="self-stretch"
 					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
 					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
 					options={[
diff --git a/src/composants/planning/PanneauLotPlanning.tsx b/src/composants/planning/PanneauLotPlanning.tsx
index af98b97..3e39cf8 100644
--- a/src/composants/planning/PanneauLotPlanning.tsx
+++ b/src/composants/planning/PanneauLotPlanning.tsx
@@ -6,6 +6,7 @@ import { ChampEnLigne } from '@/composants/ChampEnLigne';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { Panneau } from '@/composants/briques/Panneau';
+import { PANNEAU_OUVERT } from '@/composants/briques/surcouches';
 import { COULEURS } from '@/domaine/couleurs';
 import { rangIso, type LotPlanning, type PeriodeVue, type PlanningVue } from '@/domaine/planningVue';
 import { semaineDuRang } from '@/domaine/semaines';
@@ -25,7 +26,7 @@ type Props = {
 };
 
 export function PanneauLotPlanning({ lot, planning, principale, onFermer, onCouleur, onModifier, onLier, onSupprimer, onAjouter }: Props) {
-	useEffect(() => { document.querySelector('.panel.is-on tr[data-vise]')?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
+	useEffect(() => { document.querySelector(`${PANNEAU_OUVERT} tr[data-vise]`)?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
 	return (
 		<Panneau ouvert={lot !== null} surtitre={lot?.numero ? `LOT ${lot.numero}` : 'LOT'} titre={lot?.designation || 'Désignation à saisir'}
 			libelle={lot?.designation || undefined} onFermer={onFermer} pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
@@ -89,7 +90,7 @@ function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprim
 			</tr>
 			<tr className={vise ? 'ligne-dep est-vise' : 'ligne-dep'}>
 				<td colSpan={5}>
-					<MenuDeroulant id={`dd-dep-${x.id}`} k="Commence après" classe="dd-large" valeur={x.dependDeId ?? ''}
+					<MenuDeroulant id={`dd-dep-${x.id}`} k="Commence après" largeur="large" className="max-w-full" valeur={x.dependDeId ?? ''}
 						options={[
 							{ v: '', t: '— rien, date libre —' },
 							// optionsDep() de la maquette : un séparateur et le nom du lot, puis ses périodes (« Fondations » · « S16 2026 »).
```

- [ ] **Step 6 : les sélecteurs E2E**

`.ask.is-on` devient `getByRole('alertdialog')`, et `.dd-v` devient `getByTestId('dd-valeur')`. Le bouton du menu PV se trouve par son nom :

```diff
diff --git a/e2e/marches.spec.ts b/e2e/marches.spec.ts
index 05099b6..f2436d8 100644
--- a/e2e/marches.spec.ts
+++ b/e2e/marches.spec.ts
@@ -25,7 +25,7 @@ test('attribue une entreprise par recherche et saisit un TTC', async ({ page })
 	await page.getByRole('button', { name: 'Attribuée à' }).click();
 	await page.getByPlaceholder('Nom, commune…').fill('rebours martigne');
 	await page.keyboard.press('Enter');
-	await expect(page.locator('#dd-ent .dd-v')).toHaveText('CONSTRUCTIONS REBOURS');
+	await expect(page.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');
 	await page.keyboard.press('Escape');
 	await expect(ligne).toContainText('MARTIGNÉ-FERCHAUD');
 });
@@ -38,7 +38,7 @@ test('attribuer une entreprise au clavier : recherche, Entrée choisit le premie
 	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
 	await page.getByRole('searchbox', { name: 'Rechercher dans Attribuée à' }).fill('rebours');
 	await page.keyboard.press('Enter');
-	await expect(panneau.locator('#dd-ent .dd-v')).toHaveText('CONSTRUCTIONS REBOURS');
+	await expect(panneau.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');
 	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
 	await page.keyboard.press('Escape');
 	await expect(page.getByRole('listbox', { name: 'Attribuée à' })).toBeHidden();
@@ -53,9 +53,9 @@ test('supprimer un avenant puis annuler par Échap : rien ne change', async ({ p
 	await panneau.getByRole('button', { name: 'Ajouter un avenant' }).click();
 	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
 	await panneau.getByRole('button', { name: "Supprimer l'avenant n° 01" }).click();
-	await expect(page.locator('.ask.is-on')).toBeVisible();
+	await expect(page.getByRole('alertdialog')).toBeVisible();
 	await page.keyboard.press('Escape');
-	await expect(page.locator('.ask.is-on')).toBeHidden();
+	await expect(page.getByRole('alertdialog')).toBeHidden();
 	await expect(panneau).toBeVisible();   // Échap annule la confirmation, pas le panneau
 	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
 });
diff --git a/e2e/parcours.spec.ts b/e2e/parcours.spec.ts
index 3abe227..b494502 100644
--- a/e2e/parcours.spec.ts
+++ b/e2e/parcours.spec.ts
@@ -36,7 +36,7 @@ test('du chantier au récapitulatif, en passant par trois versions de marché',
 	await page.getByRole('button', { name: 'Attribuée à' }).click();
 	await page.getByPlaceholder('Nom, commune…').fill('rebours');
 	await page.keyboard.press('Enter');
-	await expect(page.locator('#dd-ent .dd-v')).toHaveText('CONSTRUCTIONS REBOURS');
+	await expect(page.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');
 
 	// 4. ouvrir le marché, écrire la clause sur la feuille, générer la v1
 	await page.getByRole('link', { name: 'Ouvrir le marché' }).click();
diff --git a/e2e/planning-gestes.spec.ts b/e2e/planning-gestes.spec.ts
index de88298..b8b6899 100644
--- a/e2e/planning-gestes.spec.ts
+++ b/e2e/planning-gestes.spec.ts
@@ -88,7 +88,7 @@ test('tracer, déplacer, allonger, sélectionner, décaler, cadre, supprimer, ou
 
 	// 7. Suppr sur deux périodes : confirmation d'abord.
 	await page.keyboard.press('Delete');
-	const confirmation = page.locator('.ask.is-on');
+	const confirmation = page.getByRole('alertdialog');
 	await expect(confirmation).toContainText('Supprimer les 2 périodes sélectionnées ?');
 	await confirmation.getByRole('button', { name: 'Supprimer' }).click();
 	await toast('2 périodes supprimées.');
diff --git a/e2e/suivi.spec.ts b/e2e/suivi.spec.ts
index 86070fe..3b7ef73 100644
--- a/e2e/suivi.spec.ts
+++ b/e2e/suivi.spec.ts
@@ -60,7 +60,7 @@ test('comptes rendus : brouillon repris, enregistré, suivant, abandon, correcti
 
 	// 4. Abandonner le brouillon, puis corriger le n° 01 : v2.
 	await cr.getByRole('button', { name: 'Abandonner le brouillon' }).click();
-	await page.locator('.ask.is-on').getByRole('button', { name: 'Abandonner' }).click();
+	await page.getByRole('alertdialog').getByRole('button', { name: 'Abandonner' }).click();
 	await expect(cr).toBeHidden();
 	await expect(carteCr(page).getByRole('button', { name: 'Nouveau compte rendu' })).toBeVisible();
 	await page.getByRole('link', { name: 'Corriger le n° 01' }).click();
@@ -101,10 +101,10 @@ test('PV de réception : tous les lots, refus puis 12 PV assemblés ; levée des
 	await expect(page.getByText("LA DÉCO'TECH : précisez la nature des réserves.")).toBeVisible();
 	pv = page.getByRole('dialog', { name: 'Procès-verbal de réception' });
 	await expect(pv.locator('[data-entreprise]')).toHaveCount(1);
-	await expect(pv.locator('#pv-lot .dd-v')).toHaveText(/.+/);
+	await expect(pv.locator('#pv-lot').getByTestId('dd-valeur')).toHaveText(/.+/);
 	await expect(pv.locator('[data-entreprise="LA DÉCO\'TECH"]')).toBeVisible();
 	await pv.getByRole('textbox', { name: 'Nature des réserves' }).fill('Reprise des joints de la cuisine');
-	await pv.locator('#pv-lot .dd-btn').click();
+	await pv.getByRole('button', { name: /^Procès-verbal pour/ }).click();
 	await pv.getByRole('option', { name: 'Tous les lots attribués — une page chacun' }).click();
 	pv = page.getByRole('dialog', { name: 'Procès-verbal de réception' });
 	await expect(pv.locator('[data-entreprise]')).toHaveCount(12);
```

- [ ] **Step 7 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts restes src/composants/briques/MenuDeroulant.tsx src/composants/briques/Panneau.tsx src/composants/briques/Confirmation.tsx src/composants/briques/Toasts.tsx
```

Expected : `55 sélecteur(s) retiré(s), 418 restant(s).`, puis rien. (`CadreApercu` garde ses classes jusqu'à la Task 12.)

- [ ] **Step 8 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « panneau-lot » (le panneau, son menu « Attribuée à ») et « selecteur ».

- [ ] **Step 9 : commit**

```bash
git add -A src/composants e2e src/styles
git commit -m "feat(interface): surcouches reconnues par attributs, restylées

Panneau, MenuDeroulant, Confirmation et Toasts : data-surcouche, data-ouvert, data-verrou-defilement,
data-bloque-clavier ; plus aucun querySelector sur une classe. MenuDeroulant : largeur et className
remplacent classe ; un menu ouvert vers le haut n'hérite plus du top de l'ouverture précédente.
Confirmation : role=alertdialog.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : la vitrine, ses E2E et ses captures

`/vitrine` montre chaque brique, ses variantes et ses états, avec des contenus du métier. Elle n'existe qu'en développement ou sur le serveur du banc (`E2E=1`), passe par `exigerPage()` (couvert par `src/app/gardes.test.ts`) et ne lit aucune donnée. Ses E2E couvrent les points 1, 2 et 5 de la Review Focus. Ses captures, en clair et en sombre, couvrent le point 3.

Le banc apprend à viser chaque côté par ses propres sélecteurs. La fonction `selon(cible, maquette, app)` choisit :
- côté maquette, ses classes, puisqu'elle ne change plus ;
- côté app, des rôles et des libellés, qui survivront aux migrations des Tasks 7 à 15.

Les masques deviennent des fonctions `(page, cible) => Locator[]`.

**Files :**
- Create :
  - `src/composants/briques/vitrine/ouverte.ts`, `ouverte.test.ts`, `Vitrine.tsx` ;
  - `src/app/(app)/vitrine/page.tsx` ;
  - `e2e/vitrine.spec.ts`, `e2e/conformite/vitrine.spec.ts`.
- Create (par commande) : `e2e/conformite/references/vitrine-*-{clair,sombre}.png` (22 captures)
- Modify : `e2e/conformite/ecrans.ts`, `e2e/conformite/conformite.spec.ts:12`

**Interfaces :**
- Consumes : toutes les briques des Tasks 2 à 5.
- Produces :
  - `vitrineOuverte(env: { NODE_ENV?: string; E2E?: string }): boolean` ;
  - `Vitrine()` : sections `data-testid="vitrine-<nom>"` (`boutons`, `etiquettes`, `champs`, `structure`, `navigation`, `tableaux`, `menus`, `surcouches`).

    | élément de la vitrine | repère |
    |---|---|
    | menus | `#v-tri`, `#v-vus` (multiple), `#v-off` (désactivé), `#v-ent` (valeur longue) |
    | bouton du panneau | « Ouvrir le panneau » |
    | panneau | « GROS ŒUVRE », avec le menu `#v-panneau-ent` et le bouton « Supprimer le lot » (confirmation) |
    | message | bouton « Afficher un message » |
  - `e2e/conformite/ecrans.ts` :
    - `type Cible = 'maquette' | 'app'` ;
    - `selon<T>(cible, maquette: T, app: T): T` ;
    - `preparer(page, cible)`, `seConnecterSur(page, cible)` ;
    - `Ecran.masques?: (page, cible) => Locator[]`, `Ecran.aller?: (page, cible) => Promise<void>`.

- [ ] **Step 1 : écrire le test de la garde**

`src/composants/briques/vitrine/ouverte.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vitrineOuverte } from './ouverte';

describe('vitrine', () => {
	it('fermée en production, ouverte en développement et sous E2E', () => {
		expect(vitrineOuverte({ NODE_ENV: 'production' })).toBe(false);
		expect(vitrineOuverte({ NODE_ENV: 'production', E2E: '1' })).toBe(true);
		expect(vitrineOuverte({ NODE_ENV: 'development' })).toBe(true);
		expect(vitrineOuverte({ NODE_ENV: 'test' })).toBe(true);
	});

	it('ne lit aucune donnée', () => {
		for (const f of ['src/app/(app)/vitrine/page.tsx', 'src/composants/briques/vitrine/Vitrine.tsx']) {
			const source = readFileSync(f, 'utf8');
			expect(source).not.toMatch(/prisma|@\/donnees|@\/actions/);
		}
	});
});
```

Run : `npx vitest run src/composants/briques/vitrine`
Expected : FAIL, « Failed to resolve import "./ouverte" ».

- [ ] **Step 2 : la garde et la page**

`src/composants/briques/vitrine/ouverte.ts` :

```ts
/**
 * La vitrine sert au développement et au banc visuel : jamais en production,
 * sauf sous E2E=1 (le serveur de test est une compilation de production).
 */
export function vitrineOuverte(env: { NODE_ENV?: string; E2E?: string }): boolean {
	return env.NODE_ENV !== 'production' || env.E2E === '1';
}
```

`src/app/(app)/vitrine/page.tsx` :

```tsx
import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { Ecran } from '@/composants/briques/Ecran';
import { vitrineOuverte } from '@/composants/briques/vitrine/ouverte';
import { Vitrine } from '@/composants/briques/vitrine/Vitrine';

/** Toutes les briques, pour le développement et le banc visuel (jamais en production). */
export default async function PageVitrine() {
	await exigerPage();
	if (!vitrineOuverte(process.env)) notFound();
	return <Ecran titre="Vitrine"><Vitrine /></Ecran>;
}
```

- [ ] **Step 3 : la vitrine**

`src/composants/briques/vitrine/Vitrine.tsx`. Les surcouches qui figent la page ou ne s'ouvrent que sur un clic sont derrière un bouton. `LONG`, une désignation trop longue, éprouve la troncature.

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BarreOutils } from '../BarreOutils';
import { Bloc } from '../Bloc';
import { Bouton } from '../Bouton';
import { Carte } from '../Carte';
import { Champ, GrilleChamps, GroupeChamps, Saisie, ZoneTexte } from '../Champ';
import { ChoixSegmente } from '../ChoixSegmente';
import { Cle, CleValeur, Valeur } from '../CleValeur';
import { useConfirmation } from '../Confirmation';
import { Etiquette } from '../Etiquette';
import * as Icone from '../icones';
import { Interrupteur } from '../Interrupteur';
import { LienAction } from '../LienAction';
import { MenuDeroulant } from '../MenuDeroulant';
import { BarreOnglets, Onglet } from '../Onglet';
import { Panneau } from '../Panneau';
import { Pastille } from '../Pastille';
import { Recherche } from '../Recherche';
import { Sigle } from '../Sigle';
import { Surtitre } from '../Surtitre';
import { CadreTableau, Tableau } from '../Tableau';
import { Vide } from '../Vide';

/** Assez long pour déborder partout : il doit se tronquer, jamais pousser la mise en page. */
const LONG = 'SOCIÉTÉ NOUVELLE DE CONSTRUCTIONS MÉTALLIQUES ET DE SERRURERIE DU PAYS DE CHÂTEAUBRIANT';

const ENTREPRISES = [
	{ v: 'rebours', t: 'CONSTRUCTIONS REBOURS', meta: 'Martigné-Ferchaud' },
	{ v: 'gillot', t: 'GILLOT TP', meta: 'Vallons-de-l’Erdre' },
	{ v: 'long', t: LONG, meta: 'Châteaubriant' },
];

/** Une section : son surtitre, puis ses exemples ; data-testid sert aux captures (e2e/conformite/vitrine.spec.ts). */
function Section({ nom, titre, children }: { nom: string; titre: string; children: React.ReactNode }) {
	return (
		<section data-testid={`vitrine-${nom}`} className="flex flex-col gap-4 bg-paper py-2">
			<Surtitre filet>{titre}</Surtitre>
			{children}
		</section>
	);
}

const Rangee = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

/**
 * Toutes les briques, toutes leurs variantes et tous leurs états, en clair comme en sombre.
 * Une variante ou un état nouveau s'ajoute ici en même temps que dans sa brique.
 */
export function Vitrine() {
	const [mission, setMission] = useState<'complete' | 'partielle'>('complete');
	const [coche, setCoche] = useState(true);
	const [recherche, setRecherche] = useState('');
	const [entreprise, setEntreprise] = useState('long');
	const [vus, setVus] = useState(['rebours']);
	const [panneau, setPanneau] = useState(false);
	const demander = useConfirmation();
	const confirmer = () => void demander({ texte: <>Supprimer le lot <b>02 — GROS ŒUVRE</b> ?</>, libelle: 'Supprimer', dangereux: true });

	return (
		<div className="flex flex-col gap-8">
			<Section nom="boutons" titre="Boutons">
				<Rangee>
					<Bouton>Normal</Bouton>
					<Bouton variante="primaire"><Icone.Plus />Primaire</Bouton>
					<Bouton variante="fantome">Fantôme</Bouton>
					<Bouton variante="danger"><Icone.Corbeille />Danger</Bouton>
					<Bouton variante="surCarte"><Icone.Coche />Sur carte</Bouton>
					<Bouton href="/vitrine">Lien</Bouton>
				</Rangee>
				<Rangee>
					<Bouton taille="sm">Petit</Bouton>
					<Bouton taille="sm" variante="primaire">Petit primaire</Bouton>
					<Bouton taille="sm" variante="danger" seulIcone aria-label="Supprimer" title="Supprimer"><Icone.Corbeille /></Bouton>
					<Bouton desactive>Désactivé</Bouton>
					<Bouton variante="primaire" enCours>En cours…</Bouton>
				</Rangee>
				<div className="w-80"><Bouton variante="primaire" taille="grand" className="w-full">Grand, pleine largeur</Bouton></div>
			</Section>

			<Section nom="etiquettes" titre="Pastilles, étiquettes, surtitres">
				<Rangee>
					<Pastille>Ouvert</Pastille>
					<Pastille ton="neutre">Terminé</Pastille>
					<Etiquette ton="accent">Sous-traitance</Etiquette>
					<Etiquette>1 avenant</Etiquette>
					<Etiquette taille="mini">v2</Etiquette>
					<Surtitre>Surtitre</Surtitre>
					<LienAction onClick={() => toast('Action discrète.')}>Action discrète</LienAction>
				</Rangee>
				<Surtitre filet>Surtitre souligné d’un filet</Surtitre>
			</Section>

			<Section nom="champs" titre="Champs">
				<GroupeChamps titre="Identification">
					<GrilleChamps>
						<Champ libelle="Référence" pour="v-ref"><Saisie id="v-ref" defaultValue="PERRIER — Louisfert" /></Champ>
						<Champ libelle="Commune" pour="v-commune" aide="Telle qu’elle figure sur l’arrêté."><Saisie id="v-commune" placeholder="Louisfert" /></Champ>
						<Champ libelle="Code postal" pour="v-cp" erreur="Cinq chiffres attendus."><Saisie id="v-cp" defaultValue="441" erreur="Cinq chiffres attendus." /></Champ>
						<Champ libelle="Type de mission">
							<ChoixSegmente libelle="Type de mission" valeur={mission} onChoisir={setMission}
								options={[{ v: 'complete', t: 'Complète' }, { v: 'partielle', t: 'Partielle' }]} />
						</Champ>
						<Champ libelle="Observations" pour="v-obs" pleineLargeur><ZoneTexte id="v-obs" rows={3} defaultValue={LONG} /></Champ>
					</GrilleChamps>
				</GroupeChamps>
				<Rangee>
					<Interrupteur coche={coche} onChange={setCoche}>Interrupteur</Interrupteur>
					<Interrupteur coche={!coche} onChange={(v) => setCoche(!v)} variante="discrete">Interrupteur discret</Interrupteur>
					<Recherche placeholder="Rechercher un lot, une entreprise…" libelle="Rechercher" valeur={recherche} onChange={setRecherche} />
				</Rangee>
				<Rangee>
					<Saisie variante="kv" aria-label="Montant kv" defaultValue="96 250,00" />
					<Saisie variante="kv-etroit" aria-label="Taux" defaultValue="20,00" />
					<Saisie variante="kv" gras aria-label="Montant gras" defaultValue="115 500,00" />
					<Saisie variante="date" type="date" aria-label="Date" defaultValue="2026-03-04" />
					<Saisie variante="montant-etroit" aria-label="Durée" defaultValue="12" />
				</Rangee>
			</Section>

			<Section nom="structure" titre="Cartes, blocs, valeurs">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
					<Carte variante="cliquable" role="button" tabIndex={0}>
						<div className="flex items-center justify-between gap-2"><span className="truncate font-titre text-18 font-semibold">{LONG}</span><Pastille>Ouvert</Pastille></div>
						<span className="text-13 text-muted">Carte cliquable : elle se soulève au survol.</span>
					</Carte>
					<Carte variante="cliquable" estompee role="button" tabIndex={0}>
						<span className="font-titre text-18 font-semibold">Chantier terminé</span>
						<span className="text-13 text-muted">Carte estompée.</span>
					</Carte>
					<Carte variante="ajout" href="/vitrine"><Icone.Plus /><span className="font-titre text-15 font-semibold">Nouveau chantier</span></Carte>
					<Carte variante="compacte"><Surtitre>Marché</Surtitre><span className="text-13">v2 · 04/03/2026</span></Carte>
					<Carte variante="compacteVide"><Surtitre>Avenant</Surtitre><span className="text-13 text-muted">Aucun</span></Carte>
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-4">
					<Bloc titre="Entreprise" action={<Bouton variante="fantome" taille="sm">Voir la fiche</Bouton>}>
						<CleValeur>
							<Cle>Adresse</Cle><Valeur>Z.I. du Pigeon Blanc</Valeur>
							<Cle>Interlocuteur</Cle><Valeur>{LONG}</Valeur>
							<Cle>Avenants</Cle><Valeur chiffres moins>− 300,00 €</Valeur>
							<Cle>Montant TTC</Cle><Valeur chiffres>115 500,00 €</Valeur>
						</CleValeur>
					</Bloc>
					<Bloc titre="Avenants" corps="colonne"><Vide variante="mini">Aucun avenant.</Vide></Bloc>
				</div>
				<Vide variante="liste">Aucun chantier ne correspond.</Vide>
			</Section>

			<Section nom="navigation" titre="Navigation">
				<BarreOnglets libelle="Exemple d’onglets">
					<Onglet href="/vitrine" actif icone={<Icone.Marches />} compteur={13}>Marchés</Onglet>
					<Onglet href="/vitrine" actif={false} icone={<Icone.Planning />} compteur={27}>Planning</Onglet>
					<Onglet href="/vitrine" actif={false} icone={<Icone.Documents />}>Documents</Onglet>
				</BarreOnglets>
				<Rangee>
					<Sigle />
					<Sigle taille="grande" />
				</Rangee>
				<BarreOutils etalee>
					<Recherche placeholder="Rechercher…" libelle="Rechercher dans la barre" valeur="" onChange={() => {}} />
					<Bouton variante="primaire"><Icone.Plus />Ajouter</Bouton>
				</BarreOutils>
			</Section>

			<Section nom="tableaux" titre="Tableaux">
				<CadreTableau>
					<Tableau variante="plain">
						<thead><tr><th>Entreprise</th><th>Commune</th><th data-droite>Lots</th><th data-actions /></tr></thead>
						<tbody>
							<tr><td>CONSTRUCTIONS REBOURS</td><td>Martigné-Ferchaud</td><td data-droite>2</td>
								<td data-actions><Bouton taille="sm"><Icone.Crayon />Modifier</Bouton><Bouton taille="sm" variante="danger">Archiver</Bouton></td></tr>
							<tr data-inactif><td>ANCIENNE SARL</td><td>Rennes</td><td data-droite>0</td><td data-actions><Bouton taille="sm">Réactiver</Bouton></td></tr>
							<tr><td data-vide colSpan={4}>Aucune autre entreprise.</td></tr>
						</tbody>
					</Tableau>
				</CadreTableau>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(28rem,1fr))] gap-4">
					<CadreTableau>
						<Tableau variante="mini">
							<thead><tr><th>Avenant</th><th data-droite>Montant HT</th></tr></thead>
							<tbody>
								<tr><td data-saisie><Saisie variante="texte" aria-label="Objet" placeholder="Objet de l’avenant" /></td>
									<td data-saisie data-droite><Saisie variante="montant" aria-label="Montant" defaultValue="1 250,00" /></td></tr>
								<tr><td data-saisie><Saisie variante="texte-mini" aria-label="Note" defaultValue="note" /></td>
									<td data-saisie data-droite><Saisie variante="montant-mini" aria-label="Montant mini" defaultValue="− 300,00" /></td></tr>
							</tbody>
						</Tableau>
					</CadreTableau>
					<CadreTableau>
						<Tableau variante="lots">
							<thead><tr><th>N°</th><th>Lot</th><th data-droite>Montant HT</th></tr></thead>
							<tbody>
								<tr><td>01</td><td>TERRASSEMENT — V.R.D.</td><td data-droite>42 300,00</td></tr>
								<tr data-ouvert><td>02</td><td>GROS ŒUVRE</td><td data-droite>96 250,00</td></tr>
							</tbody>
						</Tableau>
					</CadreTableau>
				</div>
				<CadreTableau>
					<Tableau variante="dm">
						<thead><tr><th data-premiere>Lot et entreprise</th><th>Marché</th><th>Avenants</th></tr></thead>
						<tbody>
							<tr><th data-premiere scope="row">02 — GROS ŒUVRE</th><td>v2</td><td>1</td></tr>
							<tr><th data-premiere scope="row">03 — CHARPENTE</th><td>v1</td><td>—</td></tr>
						</tbody>
					</Tableau>
				</CadreTableau>
			</Section>

			<Section nom="menus" titre="Menus">
				<BarreOutils>
					<MenuDeroulant id="v-tri" k="Trier par" valeur="ordre" className="self-stretch"
						options={[{ v: 'ordre', t: 'Ordre du chantier' }, { v: 'nom', t: 'Nom' }]} onChoisir={() => {}} />
					<MenuDeroulant id="v-vus" k="Lots affichés" multi largeur="large" className="self-stretch" valeurs={vus}
						libelle={`${vus.length} lot${vus.length > 1 ? 's' : ''}`}
						options={[{ tete: 'Entreprises' }, ...ENTREPRISES, { sep: true }, { v: 'aucune', t: 'Non attribués' }]}
						onChoisir={(v) => setVus((avant) => (avant.includes(v) ? avant.filter((x) => x !== v) : [...avant, v]))} />
					<MenuDeroulant id="v-off" k="Version" valeur="v1" desactive options={[{ v: 'v1', t: 'v1 · 04/03/2026' }]} onChoisir={() => {}} />
				</BarreOutils>
				<div className="flex w-96 max-w-full">
					<MenuDeroulant id="v-ent" k="Attribuée à" largeur="pleine" recherche="Nom, commune…" valeur={entreprise} options={ENTREPRISES} onChoisir={setEntreprise} />
				</div>
			</Section>

			<Section nom="surcouches" titre="Surcouches">
				<Rangee>
					<Bouton onClick={() => setPanneau(true)}>Ouvrir le panneau</Bouton>
					<Bouton variante="danger" onClick={confirmer}>Demander une confirmation</Bouton>
					<Bouton onClick={() => toast(<>Chantier <b>PERRIER — Louisfert</b> marqué terminé.</>)}>Afficher un message</Bouton>
				</Rangee>
			</Section>

			<Panneau ouvert={panneau} surtitre="Lot 02" titre="GROS ŒUVRE" onFermer={() => setPanneau(false)}
				pied={<><Bouton variante="primaire">Générer le marché</Bouton><Bouton variante="danger" onClick={confirmer}>Supprimer le lot</Bouton></>}>
				<Bloc titre="Entreprise" corps="colonne">
					<MenuDeroulant id="v-panneau-ent" k="Attribuée à" largeur="pleine" recherche valeur={entreprise} options={ENTREPRISES} onChoisir={setEntreprise} />
					<CleValeur><Cle>Commune</Cle><Valeur>35640 MARTIGNÉ-FERCHAUD</Valeur></CleValeur>
				</Bloc>
				<Bloc titre="Marché" corps="colonne">
					<CleValeur><Cle>Montant HT</Cle><Valeur chiffres>96 250,00 €</Valeur></CleValeur>
				</Bloc>
			</Panneau>
		</div>
	);
}
```

Run : `npx vitest run src/composants/briques/vitrine src/app/gardes.test.ts`
Expected : PASS.

- [ ] **Step 4 : écrire les E2E des surcouches**

`e2e/vitrine.spec.ts` :

```ts
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Les surcouches empilées et les libellés longs, sur la vitrine : aucun écran métier ne les réunit tous. */
async function ouvrirVitrine(page: Page) {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/vitrine');
	await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
}

const panneau = (page: Page) => page.getByRole('dialog', { name: 'GROS ŒUVRE' });
const debordement = (page: Page) => page.locator('html').evaluate((h) => getComputedStyle(h).overflowY);

test.beforeEach(async ({ page }) => { await ouvrirVitrine(page); });

test('Échap referme le menu ouvert dans le panneau, pas le panneau', async ({ page }) => {
	await page.getByRole('button', { name: 'Ouvrir le panneau' }).click();
	await panneau(page).getByRole('button', { name: /^Attribuée à/ }).click();
	await expect(page.getByRole('listbox', { name: 'Attribuée à' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox', { name: 'Attribuée à' })).toBeHidden();
	await expect(panneau(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(panneau(page)).toBeHidden();
});

test('Échap annule la confirmation ouverte sur le panneau, pas le panneau', async ({ page }) => {
	await page.getByRole('button', { name: 'Ouvrir le panneau' }).click();
	await panneau(page).getByRole('button', { name: 'Supprimer le lot' }).click();
	await expect(page.getByRole('alertdialog')).toContainText('Supprimer le lot 02 — GROS ŒUVRE ?');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('alertdialog')).toBeHidden();
	await expect(panneau(page)).toBeVisible();
});

test('le panneau et la confirmation figent la page ; leur fermeture la libère', async ({ page }) => {
	expect(await debordement(page)).not.toBe('hidden');
	await page.getByRole('button', { name: 'Ouvrir le panneau' }).click();
	await expect(panneau(page)).toBeVisible();
	expect(await debordement(page)).toBe('hidden');
	await panneau(page).getByRole('button', { name: 'Fermer' }).click();
	await expect(panneau(page)).toBeHidden();
	expect(await debordement(page)).not.toBe('hidden');
	await page.getByRole('button', { name: 'Demander une confirmation' }).click();
	expect(await debordement(page)).toBe('hidden');
	await page.getByRole('alertdialog').getByRole('button', { name: 'Annuler' }).click();
	expect(await debordement(page)).not.toBe('hidden');
});

test('une valeur longue se tronque dans le bouton du menu, sans l’élargir', async ({ page }) => {
	const menu = page.locator('#v-ent');
	const valeur = menu.getByTestId('dd-valeur');
	await expect(valeur).toHaveText(/^SOCIÉTÉ NOUVELLE/);
	const cadre = await menu.locator('xpath=..').boundingBox();
	const bouton = await menu.getByRole('button').boundingBox();
	expect(bouton!.width).toBeLessThanOrEqual(cadre!.width);
	expect(await valeur.evaluate((v) => v.scrollWidth > v.clientWidth)).toBe(true);
});
```

Run : `npx playwright test e2e/vitrine.spec.ts`
Expected : PASS (4 tests).

- [ ] **Step 5 : le banc vise chaque côté par ses sélecteurs**

```diff
diff --git a/e2e/conformite/conformite.spec.ts b/e2e/conformite/conformite.spec.ts
index e2c8144..9e4f03d 100644
--- a/e2e/conformite/conformite.spec.ts
+++ b/e2e/conformite/conformite.spec.ts
@@ -9,7 +9,7 @@ for (const ecran of ECRANS) {
 		await ouvrirEcran(page, CIBLE, ecran);
 		await expect(page).toHaveScreenshot(`${ecran.nom}.png`, {
 			animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
-			mask: (ecran.masques ?? []).map((m) => page.locator(m)),
+			mask: ecran.masques?.(page, CIBLE) ?? [],
 		});
 	});
 }
diff --git a/e2e/conformite/ecrans.ts b/e2e/conformite/ecrans.ts
index 596674f..9bde518 100644
--- a/e2e/conformite/ecrans.ts
+++ b/e2e/conformite/ecrans.ts
@@ -1,10 +1,21 @@
-import { expect, type Page } from '@playwright/test';
+import { expect, type Locator, type Page } from '@playwright/test';
 import 'dotenv/config';
 import path from 'node:path';
 import { pathToFileURL } from 'node:url';
 
 export type Cible = 'maquette' | 'app';
-export type Ecran = { nom: string; masques?: string[]; aller?: (page: Page) => Promise<void> };
+/**
+ * Un écran du banc. Les deux côtés n'ont pas le même balisage : `aller` et `masques` reçoivent la cible,
+ * et `selon` choisit le sélecteur. Côté app : rôles, libellés, data-testid — jamais une classe de style
+ * (sauf g-* du Gantt). Côté maquette : ses classes, puisqu'elle ne change plus.
+ */
+export type Ecran = {
+	nom: string;
+	masques?: (page: Page, cible: Cible) => Locator[];
+	aller?: (page: Page, cible: Cible) => Promise<void>;
+};
+
+export const selon = <T>(cible: Cible, maquette: T, app: T): T => (cible === 'maquette' ? maquette : app);
 
 const MAQUETTE = pathToFileURL(path.resolve('docs/maquette/sentinelle-marches.html')).href;
 const POLICES: Record<string, string> = {
@@ -43,22 +54,24 @@ export async function seConnecterSur(page: Page, cible: Cible) {
 	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
 }
 
-const ouvrirPerrier = async (page: Page) => {
-	await page.locator('.chantier', { hasText: 'PERRIER — Louisfert' }).first().click();
+const ouvrirPerrier = async (page: Page, cible: Cible) => {
+	await selon(cible, page.locator('.chantier', { hasText: 'PERRIER — Louisfert' }).first(),
+		page.getByRole('button', { name: /^PERRIER — Louisfert/ })).click();
 	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
 };
-const onglet = (nom: string) => async (page: Page) => {
-	await ouvrirPerrier(page);
-	await page.locator('.nav-o', { hasText: nom }).click();
+const onglet = (nom: string) => async (page: Page, cible: Cible) => {
+	await ouvrirPerrier(page, cible);
+	await selon(cible, page.locator('.nav-o', { hasText: nom }),
+		page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) })).click();
 };
 
 /**
  * Playwright peint le masque sur la boîte de l'élément. Le menu compte de l'app est plus haut
- * (écart 1 : Paramètres, Comptes) : un masque sur `.compte-menu` diffère. Clip de taille fixe,
+ * (écart 1 : Paramètres, Comptes) : un masque sur le menu diffère. Clip de taille fixe,
  * ancré sur le menu, assez grand pour l'app et son ombre (--ombre-h).
  */
-async function poserMasqueCompte(page: Page) {
-	const menu = page.locator('.compte-menu');
+async function poserMasqueCompte(page: Page, cible: Cible) {
+	const menu = selon(cible, page.locator('.compte-menu'), page.getByRole('menu'));
 	await expect(menu).toBeVisible();
 	await menu.evaluate((el) => {
 		const r = el.getBoundingClientRect();
@@ -79,23 +92,35 @@ async function poserMasqueCompte(page: Page) {
 }
 
 export const ECRANS: Ecran[] = [
-	{ nom: 'connexion', masques: ['.login-foot'] },
+	{ nom: 'connexion', masques: (page, cible) => [selon(cible, page.locator('.login-foot'), page.getByText('Accès réservé aux comptes SOCOREVE.'))] },
 	{ nom: 'chantiers', aller: async () => {} },
-	{ nom: 'selecteur', aller: async (page) => { await page.locator('.picker-btn').click(); } },
-	{ nom: 'compte', masques: ['#conformite-masque'], aller: async (page) => {
-		await page.locator('.avatar').click();
-		await poserMasqueCompte(page);
+	{ nom: 'selecteur', aller: async (page, cible) => {
+		await selon(cible, page.locator('.picker-btn'), page.getByRole('button', { name: /^Affichage/ })).click();
+	} },
+	{ nom: 'compte', masques: (page) => [page.locator('#conformite-masque')], aller: async (page, cible) => {
+		await selon(cible, page.locator('.avatar'), page.locator('.avatar')).click();
+		await poserMasqueCompte(page, cible);
 	} },
 	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
-	{ nom: 'nouveau', masques: ['.field:has(#f-ca)'], aller: async (page) => { await page.getByText('Nouveau chantier', { exact: true }).first().click(); } },
+	{ nom: 'nouveau', masques: (page, cible) => [selon(cible, page.locator('.field:has(#f-ca)'), page.locator('#f-ca').locator('xpath=..'))],
+		aller: async (page, cible) => {
+			await selon(cible, page.locator('.topbar-actions .btn-primary', { hasText: 'Nouveau chantier' }),
+				page.getByRole('link', { name: 'Nouveau chantier', exact: true })).click();
+		} },
 	{ nom: 'marches', aller: ouvrirPerrier },
-	{ nom: 'panneau-lot', aller: async (page) => { await ouvrirPerrier(page); await page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent').click(); } },
-	{ nom: 'planning', masques: ['.g-auj', '.g-sems .auj'], aller: async (page) => {
-		await onglet('Planning')(page);
+	{ nom: 'panneau-lot', aller: async (page, cible) => {
+		await ouvrirPerrier(page, cible);
+		await selon(cible, page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent'),
+			page.getByRole('row').filter({ hasText: 'CONSTRUCTIONS REBOURS' }).getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ })).click();
+	} },
+	{ nom: 'planning', masques: (page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')], aller: async (page, cible) => {
+		await onglet('Planning')(page, cible);
 		await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
 	} },
 	{ nom: 'documents', aller: onglet('Documents') },
-	{ nom: 'artisans', aller: async (page) => { await page.locator('.nav-b', { hasText: 'Artisans' }).click(); } },
+	{ nom: 'artisans', aller: async (page, cible) => {
+		await selon(cible, page.locator('.nav-b', { hasText: 'Artisans' }), page.getByRole('link', { name: /^Artisans/ })).click();
+	} },
 ];
 
 export async function ouvrirEcran(page: Page, cible: Cible, ecran: Ecran) {
@@ -109,6 +134,6 @@ export async function ouvrirEcran(page: Page, cible: Cible, ecran: Ecran) {
 		return;
 	}
 	await seConnecterSur(page, cible);
-	await ecran.aller?.(page);
+	await ecran.aller?.(page, cible);
 	await page.mouse.move(0, 0);   // aucun survol dans la capture
 }
```

`e2e/conformite/vitrine.spec.ts` : la vitrine n'existe que côté app.

```ts
import { expect, test, type Page } from '@playwright/test';
import { preparer, seConnecterSur, type Cible } from './ecrans';

/**
 * La vitrine n'existe que dans l'app : ses références se capturent sur l'app
 * (CONFORMITE_CIBLE=app … --update-snapshots -g vitrine), puis se relisent à l'œil.
 */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;
const SECTIONS = ['boutons', 'etiquettes', 'champs', 'structure', 'navigation', 'tableaux', 'menus'];
const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;

async function ouvrirVitrine(page: Page, theme: 'light' | 'dark') {
	await preparer(page, 'app');
	await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
	await seConnecterSur(page, 'app');
	await page.goto('/vitrine');
	await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
	const suffixe = theme === 'light' ? 'clair' : 'sombre';

	test.describe(`vitrine (${suffixe})`, () => {
		test.skip(CIBLE !== 'app', 'la vitrine n’existe pas dans la maquette');

		test(`vitrine ${suffixe} : sections`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			for (const section of SECTIONS) {
				await expect(page.getByTestId(`vitrine-${section}`)).toHaveScreenshot(`vitrine-${section}-${suffixe}.png`, OPTIONS);
			}
		});

		test(`vitrine ${suffixe} : menu ouvert`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.locator('#v-vus').getByRole('button').click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-menu-${suffixe}.png`, OPTIONS);
		});

		test(`vitrine ${suffixe} : panneau et confirmation`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Ouvrir le panneau' }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-panneau-${suffixe}.png`, OPTIONS);
			await page.getByRole('dialog', { name: 'GROS ŒUVRE' }).getByRole('button', { name: 'Supprimer le lot' }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-confirmation-${suffixe}.png`, OPTIONS);
		});

		test(`vitrine ${suffixe} : message`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Afficher un message' }).click();
			await expect(page.locator('[data-sonner-toast]')).toHaveScreenshot(`vitrine-message-${suffixe}.png`, OPTIONS);
		});
	});
}
```

- [ ] **Step 6 : capturer les références de la vitrine**

```bash
CONFORMITE_CIBLE=app npx playwright test -c playwright.conformite.config.ts --update-snapshots -g vitrine
```

Expected : 22 PNG `e2e/conformite/references/vitrine-*` : par thème, 7 sections, le menu ouvert, le panneau, la confirmation et le message.

**Les montrer à l'utilisateur** (spec § 5, étape 2), face à la maquette en clair et en sombre. Points à regarder :
- aucune couleur claire en dur en sombre ;
- l'orangé des réserves (case « alerte » de la section tableaux) ;
- la valeur longue de `#v-ent`, tronquée par « … ».

Attendre son accord avant de commiter.

- [ ] **Step 7 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert. Le banc compte 18 tests : 10 écrans et 8 tests de vitrine.

- [ ] **Step 8 : commit**

```bash
git add -A src/composants/briques/vitrine "src/app/(app)/vitrine" e2e
git commit -m "feat(interface): la vitrine, ses E2E et ses captures

/vitrine montre chaque brique, ses variantes et ses états (développement et banc seulement, aucune
donnée lue). E2E : Échap avec des surcouches empilées, verrou de défilement, troncature d'une valeur
longue. Le banc vise la maquette par ses classes et l'app par rôles et libellés (selon), et capture
la vitrine en clair et en sombre.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : connexion, mot de passe, erreur et page introuvable

Premier écran migré. `EcranCentre` porte la carte centrée de la connexion (ex-`.login`, `.login-card`, `.login-brand`…). Les quatre écrans qui la partagent passent sur les briques. Les champs utilisent `Champ` et `Saisie`, le message d'échec `Erreur alerte`, le bouton `Bouton variante="primaire" taille="grand"`.

**Files :**
- Create : `src/composants/briques/EcranCentre.tsx`, `src/composants/briques/EcranCentre.test.tsx`
- Modify : `src/app/connexion/page.tsx`, `src/composants/FormulaireMotDePasse.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `Sigle`, `SigleDefs`, `cx`, `Champ`, `Saisie`, `Erreur`, `Bouton`.
- Produces :
  - `EcranCentre({ titre, accroche, sigle?: boolean, pied?, children })`. Il rend un `main` plein écran et une carte de 24 rem. Le titre est un `h1`, précédé du sigle si `sigle` (avec ses `SigleDefs`).
  - `FormulaireCentre(props de <form> sans className)` : un formulaire en colonne, sous un filet.

- [ ] **Step 1 : écrire le test**

`src/composants/briques/EcranCentre.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EcranCentre, FormulaireCentre } from './EcranCentre';

describe('EcranCentre', () => {
	it('un titre de niveau 1, son accroche, le contenu puis le pied', () => {
		const html = renderToStaticMarkup(<EcranCentre titre="Page introuvable" accroche="Ce chantier n'existe pas." pied="Pied"><button type="button">Retour</button></EcranCentre>);
		expect(html).toMatch(/<h1 [^>]*>Page introuvable<\/h1>/);
		expect(html.indexOf('Ce chantier')).toBeLessThan(html.indexOf('Retour'));
		expect(html.indexOf('Retour')).toBeLessThan(html.indexOf('Pied'));
		expect(html).not.toContain('plaque-clair');
	});

	it('avec le sigle, ses définitions viennent avec lui', () => {
		const html = renderToStaticMarkup(<EcranCentre sigle titre="Sentinelle" accroche="…">x</EcranCentre>);
		expect(html).toContain('id="plaque-clair"');
		expect(html).toContain('href="#plaque-clair"');
	});

	it('FormulaireCentre garde ses attributs', () => {
		expect(renderToStaticMarkup(<FormulaireCentre aria-label="Connexion">x</FormulaireCentre>)).toMatch(/^<form aria-label="Connexion" class="flex flex-col/);
	});
});
```

Run : `npx vitest run src/composants/briques/EcranCentre.test.tsx`
Expected : FAIL, « Failed to resolve import "./EcranCentre" ».

- [ ] **Step 2 : écrire la brique**

`src/composants/briques/EcranCentre.tsx` :

```tsx
import type { ComponentProps } from 'react';
import { Sigle, SigleDefs } from './Sigle';

/**
 * Un écran hors de l'application, centré (ex-.login) : connexion, mot de passe, erreur, page introuvable.
 * Le titre en grand, son accroche, puis le contenu (un FormulaireCentre ou un bouton) et un pied discret.
 */
export function EcranCentre({ titre, accroche, sigle = false, pied, children }: {
	titre: string;
	accroche: React.ReactNode;
	/** Le sigle devant le titre ; ses définitions viennent avec lui (l'écran est hors de la barre de navigation). */
	sigle?: boolean;
	pied?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<main className="grid min-h-screen grid-cols-1 place-items-center bg-paper px-5 py-8">
			{sigle && <SigleDefs />}
			<div className="flex w-[min(24rem,100%)] flex-col gap-5">
				<div className="flex flex-col gap-1.5">
					<h1 className="flex items-center gap-3 font-titre text-40 leading-none font-bold tracking-[-0.03em]">{sigle && <Sigle taille="grande" />}{titre}</h1>
					<p className="my-3.5 max-w-88 text-14 text-muted">{accroche}</p>
				</div>
				{children}
				{pied && <div className="my-2.75 font-mono text-11 text-faint">{pied}</div>}
			</div>
		</main>
	);
}

/** Le formulaire d'un écran centré, sous un filet (ex-.login-form). */
export function FormulaireCentre(props: Omit<ComponentProps<'form'>, 'className'>) {
	return <form {...props} className="flex flex-col gap-3 border-t border-rule pt-5" />;
}
```

Run : `npx vitest run src/composants/briques/EcranCentre.test.tsx`
Expected : PASS (3 tests).

- [ ] **Step 3 : migrer les quatre écrans**

```diff
diff --git a/src/app/connexion/page.tsx b/src/app/connexion/page.tsx
index ef036b9..f35a3ae 100644
--- a/src/app/connexion/page.tsx
+++ b/src/app/connexion/page.tsx
@@ -3,7 +3,9 @@
 import { useRouter } from 'next/navigation';
 import { useState, type FormEvent } from 'react';
 import { authClient } from '@/auth/client';
-import { Sigle, SigleDefs } from '@/composants/briques/Sigle';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, Erreur, Saisie } from '@/composants/briques/Champ';
+import { EcranCentre, FormulaireCentre } from '@/composants/briques/EcranCentre';
 
 export default function PageConnexion() {
 	const router = useRouter();
@@ -33,31 +35,14 @@ export default function PageConnexion() {
 	}
 
 	return (
-		<div className="screen is-on">
-			<SigleDefs />
-			<div className="login">
-				<div className="login-card">
-					<div className="login-brand">
-						<div className="login-mark"><Sigle taille="grande" />Sentinelle</div>
-						<p className="login-tag">Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</p>
-					</div>
-					<form className="login-form" onSubmit={soumettre}>
-						<div className="field">
-							<label htmlFor="email">Adresse e-mail</label>
-							<input id="email" name="email" type="email" autoComplete="username" required />
-						</div>
-						<div className="field">
-							<label htmlFor="motDePasse">Mot de passe</label>
-							<input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
-						</div>
-						{erreur && <p role="alert" className="erreur">{erreur}</p>}
-						<button className="btn btn-primary" type="submit" disabled={envoi} style={{ justifyContent: 'center', padding: '0.5625rem' }}>
-							{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}
-						</button>
-					</form>
-					<p className="login-foot">Accès réservé aux comptes SOCOREVE.</p>
-				</div>
-			</div>
-		</div>
+		<EcranCentre sigle titre="Sentinelle" accroche={<>Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</>}
+			pied="Accès réservé aux comptes SOCOREVE.">
+			<FormulaireCentre onSubmit={soumettre}>
+				<Champ libelle="Adresse e-mail" pour="email"><Saisie id="email" name="email" type="email" autoComplete="username" required /></Champ>
+				<Champ libelle="Mot de passe" pour="motDePasse"><Saisie id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required /></Champ>
+				{erreur && <Erreur alerte>{erreur}</Erreur>}
+				<Bouton variante="primaire" taille="grand" type="submit" enCours={envoi}>{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}</Bouton>
+			</FormulaireCentre>
+		</EcranCentre>
 	);
 }
diff --git a/src/app/error.tsx b/src/app/error.tsx
index 70a1738..f7c0d92 100644
--- a/src/app/error.tsx
+++ b/src/app/error.tsx
@@ -1,6 +1,8 @@
 'use client';
 
 import { useEffect } from 'react';
+import { Bouton } from '@/composants/briques/Bouton';
+import { EcranCentre } from '@/composants/briques/EcranCentre';
 
 export default function PageErreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
 	useEffect(() => {
@@ -8,18 +10,8 @@ export default function PageErreur({ error, reset }: { error: Error & { digest?:
 	}, [error]);
 
 	return (
-		<div className="screen is-on">
-			<div className="login">
-				<div className="login-card">
-					<div className="login-brand">
-						<div className="login-mark">Une erreur est survenue</div>
-						<p className="login-tag">Réessayez ; si le problème persiste, prévenez l&apos;administrateur.</p>
-					</div>
-					<button type="button" className="btn btn-primary" onClick={reset} style={{ justifyContent: 'center', padding: '0.5625rem' }}>
-						Réessayer
-					</button>
-				</div>
-			</div>
-		</div>
+		<EcranCentre titre="Une erreur est survenue" accroche="Réessayez ; si le problème persiste, prévenez l'administrateur.">
+			<Bouton variante="primaire" taille="grand" onClick={reset}>Réessayer</Bouton>
+		</EcranCentre>
 	);
 }
diff --git a/src/app/not-found.tsx b/src/app/not-found.tsx
index b82e24a..7b1e95e 100644
--- a/src/app/not-found.tsx
+++ b/src/app/not-found.tsx
@@ -1,19 +1,10 @@
-import Link from 'next/link';
+import { Bouton } from '@/composants/briques/Bouton';
+import { EcranCentre } from '@/composants/briques/EcranCentre';
 
 export default function PageIntrouvable() {
 	return (
-		<div className="screen is-on">
-			<div className="login">
-				<div className="login-card">
-					<div className="login-brand">
-						<div className="login-mark">Page introuvable</div>
-						<p className="login-tag">Ce chantier ou cette page n&apos;existe pas.</p>
-					</div>
-					<Link href="/chantiers" className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.5625rem' }}>
-						Retour aux chantiers
-					</Link>
-				</div>
-			</div>
-		</div>
+		<EcranCentre titre="Page introuvable" accroche="Ce chantier ou cette page n'existe pas.">
+			<Bouton variante="primaire" taille="grand" href="/chantiers">Retour aux chantiers</Bouton>
+		</EcranCentre>
 	);
 }
diff --git a/src/composants/FormulaireMotDePasse.tsx b/src/composants/FormulaireMotDePasse.tsx
index 92a4f01..31e33d4 100644
--- a/src/composants/FormulaireMotDePasse.tsx
+++ b/src/composants/FormulaireMotDePasse.tsx
@@ -3,7 +3,9 @@
 import { useRouter } from 'next/navigation';
 import { useState, useTransition, type FormEvent } from 'react';
 import { changerMotDePasseAction, deconnexionAction } from '@/actions/session';
-import { Sigle, SigleDefs } from '@/composants/briques/Sigle';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, Erreur, Saisie } from '@/composants/briques/Champ';
+import { EcranCentre, FormulaireCentre } from '@/composants/briques/EcranCentre';
 
 export function FormulaireMotDePasse() {
 	const router = useRouter();
@@ -25,34 +27,21 @@ export function FormulaireMotDePasse() {
 	}
 
 	const champ = (nom: string, libelle: string, autoComplete: string) => (
-		<div className="field">
-			<label htmlFor={nom}>{libelle}</label>
-			<input id={nom} name={nom} type="password" autoComplete={autoComplete} required aria-invalid={Boolean(erreurs[nom])} className={erreurs[nom] ? 'est-erreur' : undefined} />
-			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
-		</div>
+		<Champ libelle={libelle} pour={nom} erreur={erreurs[nom]}>
+			<Saisie id={nom} name={nom} type="password" autoComplete={autoComplete} required erreur={erreurs[nom]} />
+		</Champ>
 	);
 
 	return (
-		<div className="screen is-on">
-			<SigleDefs />
-			<div className="login">
-				<div className="login-card">
-					<div className="login-brand">
-						<div className="login-mark"><Sigle taille="grande" />Sentinelle</div>
-						<p className="login-tag">Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</p>
-					</div>
-					<form className="login-form" onSubmit={soumettre}>
-						{champ('ancien', 'Mot de passe actuel', 'current-password')}
-						{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
-						{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
-						{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
-						<button className="btn btn-primary" type="submit" disabled={enCours} style={{ justifyContent: 'center', padding: '0.5625rem' }}>Enregistrer</button>
-					</form>
-					<form action={deconnexionAction} className="login-foot">
-						<button type="submit" className="btn btn-ghost btn-sm">Se déconnecter</button>
-					</form>
-				</div>
-			</div>
-		</div>
+		<EcranCentre sigle titre="Sentinelle" accroche={<>Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</>}
+			pied={<form action={deconnexionAction}><Bouton variante="fantome" taille="sm" type="submit">Se déconnecter</Bouton></form>}>
+			<FormulaireCentre onSubmit={soumettre}>
+				{champ('ancien', 'Mot de passe actuel', 'current-password')}
+				{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
+				{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
+				{erreurs.general && <Erreur alerte>{erreurs.general}</Erreur>}
+				<Bouton variante="primaire" taille="grand" type="submit" enCours={enCours}>Enregistrer</Bouton>
+			</FormulaireCentre>
+		</EcranCentre>
 	);
 }
```

- [ ] **Step 4 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts restes src/composants/briques/EcranCentre.tsx src/app/connexion/page.tsx src/composants/FormulaireMotDePasse.tsx src/app/error.tsx src/app/not-found.tsx
```

Expected :
- `9 sélecteur(s) retiré(s), 409 restant(s).`
- puis des faux positifs seulement :
  - `grand` : `taille="grand"`, et `.total-v.grand` vit jusqu'à la Task 11 ;
  - `compte`, `erreur`, `chantier` : des mots des messages.

  ```
  src/app/connexion/page.tsx : compte grand
  src/composants/FormulaireMotDePasse.tsx : grand
  src/app/error.tsx : erreur grand
  src/app/not-found.tsx : chantier grand
  ```

- [ ] **Step 5 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « connexion » au banc et `e2e/connexion.spec.ts`.

- [ ] **Step 6 : commit**

```bash
git add -A src/composants src/app src/styles
git commit -m "feat(interface): connexion, mot de passe, erreur et introuvable sur les briques

EcranCentre porte la carte centrée (ex-.login) ; champs, message d'échec et bouton passent par
Champ, Saisie, Erreur et Bouton.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : la barre de navigation, le menu du compte, le sélecteur de chantier

La barre (ex-`header.nav`, `.nav-haut`, `.nav-onglets`) passe en utilitaires. Ses onglets deviennent `BarreOnglets` et `Onglet`, nommés « Écrans du chantier », et n'existent que sur les écrans d'un chantier. Le menu du compte (ex-`.compte`, `.avatar`, `.compte-menu`) prend :
- `aria-label="Mon compte"` sur l'avatar ;
- `role="menu"` sur la liste, masquée par `hidden` quand elle est fermée.

Le sélecteur de chantier (ex-`.picker`) reprend le dessin partagé des menus, `MENU` (Task 5). Un chantier terminé y est barré.

Les E2E perdent leurs classes. Deux aides apparaissent dans `e2e/aide.ts` : `onglet(page, nom)` et `ouvrirMenuCompte(page)`.

**Files :**
- Modify : `src/composants/navigation/BarreNavigation.tsx`, `src/composants/navigation/MenuCompte.tsx`, `src/composants/navigation/SelecteurChantier.tsx`
- Test :
  - `e2e/aide.ts`, `e2e/aidePlanning.ts` ;
  - `e2e/comptes.spec.ts`, `e2e/connexion.spec.ts`, `e2e/navigation.spec.ts` ;
  - `e2e/planning-documents.spec.ts`, `e2e/planning.spec.ts`, `e2e/suivi.spec.ts` ;
  - `e2e/conformite/ecrans.ts:101`.
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `BarreOnglets`, `Onglet`, `Sigle`, `SigleDefs`, `MENU`, `cx`, `CLE`.
- Produces :
  - `e2e/aide.ts` : `onglet(page, nom)`, un `Locator` (le lien de l'onglet dont le nom commence par `nom`) ; `ouvrirMenuCompte(page)`.
  - Les repères stables de la barre :

    | élément | repère |
    |---|---|
    | avatar | bouton « Mon compte » |
    | menu du compte | `role="menu"`, ses entrées en `role="menuitem"` |
    | onglets | `navigation` « Écrans du chantier » |
    | sélecteur | bouton dont le nom commence par « Affichage » ou « Chantier ouvert » |
    | Artisans | lien dont le nom commence par « Artisans » |

- [ ] **Step 1 : les sélecteurs E2E d'abord**

```diff
diff --git a/e2e/aide.ts b/e2e/aide.ts
index a0076d9..d27fab4 100644
--- a/e2e/aide.ts
+++ b/e2e/aide.ts
@@ -13,3 +13,10 @@ export async function seConnecter(page: Page, email: string, motDePasse: string)
 	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
 	await expect(page).not.toHaveURL(/\/connexion/);
 }
+
+/** Un onglet du chantier ouvert, par le début de son nom (son compteur le suit). */
+export const onglet = (page: Page, nom: string) =>
+	page.getByRole('navigation', { name: 'Écrans du chantier' }).getByRole('link', { name: new RegExp(`^${nom}`) });
+
+/** Ouvre le menu du compte (le bouton rond des initiales). */
+export const ouvrirMenuCompte = (page: Page) => page.getByRole('button', { name: 'Mon compte' }).click();
diff --git a/e2e/aidePlanning.ts b/e2e/aidePlanning.ts
index f60ba99..c6def13 100644
--- a/e2e/aidePlanning.ts
+++ b/e2e/aidePlanning.ts
@@ -1,5 +1,5 @@
 import { expect, type Page } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, onglet, seConnecter } from './aide';
 
 /** Densité Normale : 46 px par semaine. */
 export const W = 46;
@@ -8,7 +8,7 @@ export async function ouvrirPlanning(page: Page, reference: string) {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await page.goto('/chantiers');
 	await page.locator('.chantier', { hasText: reference }).click();
-	await page.locator('.nav-o', { hasText: 'Planning' }).click();
+	await onglet(page, 'Planning').click();
 	await expect(page).toHaveURL(/\/planning$/);
 	await expect(page.locator('.g-bar').first()).toBeVisible();
 }
diff --git a/e2e/comptes.spec.ts b/e2e/comptes.spec.ts
index 5c91a82..dd717a3 100644
--- a/e2e/comptes.spec.ts
+++ b/e2e/comptes.spec.ts
@@ -1,5 +1,5 @@
 import { expect, test } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, ouvrirMenuCompte, seConnecter } from './aide';
 
 test('l\'admin crée un compte, le collègue change son mot de passe provisoire', async ({ page }) => {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
@@ -13,7 +13,7 @@ test('l\'admin crée un compte, le collègue change son mot de passe provisoire'
 	const provisoire = (await dialogue.getByTestId('mot-de-passe-provisoire').textContent()) ?? '';
 	expect(provisoire).toHaveLength(16);
 	await dialogue.getByRole('button', { name: 'Fermer' }).click();
-	await page.locator('.avatar').click();
+	await ouvrirMenuCompte(page);
 	await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
 
 	await seConnecter(page, 'jean.martin@socoreve.local', provisoire);
@@ -23,7 +23,7 @@ test('l\'admin crée un compte, le collègue change son mot de passe provisoire'
 	await page.getByLabel('Confirmer le nouveau mot de passe').fill('nouveau-mot-de-passe-jean');
 	await page.getByRole('button', { name: 'Enregistrer' }).click();
 	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
-	await page.locator('.avatar').click();
+	await ouvrirMenuCompte(page);
 	await expect(page.getByRole('menuitem', { name: 'Se déconnecter' })).toBeVisible();
 	await expect(page.getByRole('menuitem', { name: 'Comptes' })).toHaveCount(0);
 });
diff --git a/e2e/connexion.spec.ts b/e2e/connexion.spec.ts
index 855577a..66739ce 100644
--- a/e2e/connexion.spec.ts
+++ b/e2e/connexion.spec.ts
@@ -1,5 +1,5 @@
 import { expect, test } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, ouvrirMenuCompte, seConnecter } from './aide';
 
 test('un visiteur sans session est renvoyé vers la connexion', async ({ page }) => {
 	await page.goto('/chantiers');
@@ -17,7 +17,7 @@ test('un mauvais mot de passe est refusé', async ({ page }) => {
 test('l\'admin se connecte puis se déconnecte', async ({ page }) => {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
-	await page.locator('.avatar').click();
+	await ouvrirMenuCompte(page);
 	await expect(page.getByRole('menuitem', { name: 'Comptes' })).toBeVisible();
 	await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
 	await expect(page).toHaveURL(/\/connexion$/);
diff --git a/e2e/navigation.spec.ts b/e2e/navigation.spec.ts
index daad4ac..6a211d8 100644
--- a/e2e/navigation.spec.ts
+++ b/e2e/navigation.spec.ts
@@ -1,5 +1,5 @@
 import { expect, test, type Page } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, onglet, seConnecter } from './aide';
 
 /** Un chantier sans lot, par le formulaire de la Task 7 (ses libellés sont ceux de la maquette). */
 async function creerChantierVide(page: Page, reference: string) {
@@ -14,16 +14,16 @@ async function creerChantierVide(page: Page, reference: string) {
 test('les compteurs de la barre suivent les actions, sans rechargement', async ({ page }) => {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await creerChantierVide(page, `NAV-${Date.now()}`);
-	const onglet = (nom: string) => page.locator('.nav-o', { hasText: nom }).locator('.count');
-	await expect(onglet('Marchés')).toHaveText('0');
+	const compteur = (nom: string) => onglet(page, nom).getByTestId('compteur');
+	await expect(compteur('Marchés')).toHaveText('0');
 	await page.getByRole('button', { name: 'Ajouter un lot' }).first().click();
-	await expect(onglet('Marchés')).toHaveText('1');
+	await expect(compteur('Marchés')).toHaveText('1');
 	// « Ajouter un lot » ouvre le panneau du lot (maquette) : le quitter pour retrouver la barre.
 	await page.keyboard.press('Escape');
 	// Hors d'un chantier, pas d'onglets ; le sélecteur dit « Affichage ».
 	await page.getByTitle('Tous les chantiers').click();
-	await expect(page.locator('.nav-onglets')).toBeHidden();
-	await expect(page.locator('.picker-k')).toHaveText('Affichage');
+	await expect(page.getByRole('navigation', { name: 'Écrans du chantier' })).toBeHidden();
+	await expect(page.getByRole('button', { name: /^Affichage/ })).toBeVisible();
 });
 
 test('le thème choisi tient au rechargement', async ({ page }) => {
diff --git a/e2e/planning-documents.spec.ts b/e2e/planning-documents.spec.ts
index 6904dd8..ad1275f 100644
--- a/e2e/planning-documents.spec.ts
+++ b/e2e/planning-documents.spec.ts
@@ -1,5 +1,6 @@
 import { readFileSync } from 'node:fs';
 import { expect, test } from '@playwright/test';
+import { onglet } from './aide';
 import { barre, ligne, ouvrirPlanning, telecharger } from './aidePlanning';
 
 /** Mesures du planning PERRIER dans le Chromium du PDF (Task 7) : l'aperçu doit trouver les mêmes. */
@@ -12,7 +13,7 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 	const visa = page.getByRole('dialog', { name: 'Feuille de visa du planning' });
 	const cartePlanning = page.locator('[data-serie="planning"]');
 	const carteVisa = page.locator('[data-serie="visa"]');
-	const onglet = (nom: string) => page.locator('.nav-o', { hasText: nom }).click();
+	const allerA = (nom: string) => onglet(page, nom).click();
 
 	// 1. Planning imprimable : l'aperçu mesure comme le PDF ; la génération crée la v1.
 	await page.getByRole('link', { name: 'Planning imprimable' }).click();
@@ -34,7 +35,7 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 	await expect(visa).toBeHidden();
 
 	// 3. Documents : les deux séries à jour ; la version 1 s'ouvre sur une seule feuille, mesurée pareil.
-	await onglet('Documents');
+	await allerA('Documents');
 	await expect(cartePlanning.locator('.dm-carte-n')).toHaveText('v1');
 	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
 	await expect(carteVisa.locator('.dm-carte-n')).toHaveText('v1');
@@ -45,14 +46,14 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 	await expect(apercu).toBeHidden();
 
 	// 4. Une période change : le planning est « modifié » ; le visa reste sur la dernière version générée.
-	await onglet('Planning');
+	await allerA('Planning');
 	await ligne(page, 'PEINTURE').locator('.g-fixe').click();
 	const duree = page.getByRole('dialog', { name: 'PEINTURE' }).getByRole('textbox', { name: 'Durée' });
 	await duree.fill('4');
 	await duree.press('Enter');
 	await expect(barre(page, 'Peintures')).toHaveAttribute('title', /4 semaines$/);
 	await page.keyboard.press('Escape');
-	await onglet('Documents');
+	await allerA('Documents');
 	await expect(cartePlanning.getByText('modifié', { exact: true })).toBeVisible();
 	await expect(carteVisa.getByText('périmé', { exact: true })).toHaveCount(0);
 
@@ -66,7 +67,7 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 	await apercu.getByRole('button', { name: 'Fermer' }).click();
 
 	// 6. Documents : le visa fait signer la v1, la v2 existe : périmé.
-	await onglet('Documents');
+	await allerA('Documents');
 	await expect(cartePlanning.locator('.dm-carte-n')).toHaveText('v2');
 	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
 	await expect(carteVisa.getByText('périmé', { exact: true })).toBeVisible();
diff --git a/e2e/planning.spec.ts b/e2e/planning.spec.ts
index cbea8c0..55d4ce1 100644
--- a/e2e/planning.spec.ts
+++ b/e2e/planning.spec.ts
@@ -7,7 +7,7 @@ test.describe('écran Planning', () => {
 	});
 
 	test('onglet, résumé, grille, fermetures, entreprises, infobulles et flèches', async ({ page }) => {
-		const onglets = page.locator('.nav-o');
+		const onglets = page.getByRole('navigation', { name: 'Écrans du chantier' }).getByRole('link');
 		await expect(onglets).toHaveText([/Marchés/, /Planning/, /Documents/]);
 		await expect(page.locator('#g-resume')).toHaveText('23 périodes · semaine 15 de 2026 à la semaine 13 de 2027');
 		await expect(page.locator('.g-row[data-lot]')).toHaveCount(13);
diff --git a/e2e/suivi.spec.ts b/e2e/suivi.spec.ts
index 3b7ef73..08bc869 100644
--- a/e2e/suivi.spec.ts
+++ b/e2e/suivi.spec.ts
@@ -2,7 +2,7 @@ import { readFileSync } from 'node:fs';
 import { unzipSync } from 'fflate';
 import { PDFDocument } from 'pdf-lib';
 import { expect, test, type Page } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, onglet, seConnecter } from './aide';
 import { telecharger } from './aidePlanning';
 
 test.describe.configure({ mode: 'serial' });
@@ -12,7 +12,7 @@ async function ouvrirDocuments(page: Page) {
 	await page.goto('/chantiers');
 	await page.locator('.chantier', { hasText: 'SUIVI' }).click();
 	await expect(page).toHaveURL(/\/marches$/);
-	await page.locator('.nav-o', { hasText: 'Documents' }).click();
+	await onglet(page, 'Documents').click();
 	await expect(page.getByRole('heading', { name: 'Documents du chantier' })).toBeVisible();
 }
 
```

Le banc vise l'avatar de l'app par son nom :

```diff
diff --git a/e2e/conformite/ecrans.ts b/e2e/conformite/ecrans.ts
index 9bde518..1cbf11c 100644
--- a/e2e/conformite/ecrans.ts
+++ b/e2e/conformite/ecrans.ts
@@ -98,7 +98,7 @@ export const ECRANS: Ecran[] = [
 		await selon(cible, page.locator('.picker-btn'), page.getByRole('button', { name: /^Affichage/ })).click();
 	} },
 	{ nom: 'compte', masques: (page) => [page.locator('#conformite-masque')], aller: async (page, cible) => {
-		await selon(cible, page.locator('.avatar'), page.locator('.avatar')).click();
+		await selon(cible, page.locator('.avatar'), page.getByRole('button', { name: 'Mon compte' })).click();
 		await poserMasqueCompte(page, cible);
 	} },
 	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
```

- [ ] **Step 2 : les lancer**

Run : `npx playwright test e2e/navigation.spec.ts e2e/comptes.spec.ts`
Expected : FAIL. Le bouton « Mon compte » et la navigation « Écrans du chantier » n'existent pas encore.

- [ ] **Step 3 : migrer la barre, le menu du compte et le sélecteur**

```diff
diff --git a/src/composants/navigation/BarreNavigation.tsx b/src/composants/navigation/BarreNavigation.tsx
index 0b1b2b4..db1df7c 100644
--- a/src/composants/navigation/BarreNavigation.tsx
+++ b/src/composants/navigation/BarreNavigation.tsx
@@ -3,7 +3,9 @@
 import Link from 'next/link';
 import { useParams, usePathname } from 'next/navigation';
 import type { UtilisateurConnecte } from '@/auth/session';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
+import { BarreOnglets, Onglet } from '@/composants/briques/Onglet';
 import { Sigle, SigleDefs } from '@/composants/briques/Sigle';
 import { basculerTheme } from '@/composants/briques/theme';
 import type { VueNavigation } from '@/donnees/navigation';
@@ -11,51 +13,56 @@ import { MenuCompte } from './MenuCompte';
 import { SelecteurChantier } from './SelecteurChantier';
 
 const ONGLETS = [
-	{ suffixe: 'marches', texte: 'Marchés', icone: <Icone.Marches />, compte: 'lots' },
-	{ suffixe: 'planning', texte: 'Planning', icone: <Icone.Planning />, compte: 'periodes' },
-	{ suffixe: 'documents', texte: 'Documents', icone: <Icone.Documents />, compte: 'documents' },
+	{ suffixe: 'marches', texte: 'Marchés', icone: <Icone.Marches />, compteur: 'lots' },
+	{ suffixe: 'planning', texte: 'Planning', icone: <Icone.Planning />, compteur: 'periodes' },
+	{ suffixe: 'documents', texte: 'Documents', icone: <Icone.Documents />, compteur: 'documents' },
 ] as const;
 
-/** header.nav de la maquette. Les onglets n'existent que sur les trois écrans d'un chantier (majOnglets). */
+/** Une icône ronde de la barre (ex-.nav-ic) : l'accueil, le thème. */
+const ICONE = 'inline-flex size-8 items-center justify-center rounded-full [&_svg]:size-4 [&_svg]:stroke-[1.5]';
+const ICONE_AU_REPOS = 'text-muted hover:bg-idle-soft hover:text-ink';
+const ICONE_ACTIVE = 'bg-accent-soft text-accent-2';
+
+/** La barre de navigation (ex-header.nav). Les onglets n'existent que sur les trois écrans d'un chantier (majOnglets). */
 export function BarreNavigation({ utilisateur, navigation, children }: { utilisateur: UtilisateurConnecte; navigation: VueNavigation; children: React.ReactNode }) {
 	const chemin = usePathname();
 	const { id } = useParams<{ id?: string }>();
 	const courant = (id && navigation.chantiers.find((c) => c.id === id)) || null;
 	const surChantier = courant !== null && ONGLETS.some((o) => chemin.startsWith(`/chantiers/${courant.id}/${o.suffixe}`));
 	const accueil = chemin === '/chantiers';
+	const artisans = chemin.startsWith('/artisans');
 
 	return (
-		<div className={surChantier ? 'app is-on' : 'app is-on sans-onglets'}>
+		<div className="flex min-h-screen min-w-0 flex-col">
 			<SigleDefs />
-			<div className="main">
-				<header className="nav">
-					<div className="nav-haut">
-						<Link className="nav-marque group" href="/chantiers" title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle survol /></Link>
-						<Link className={accueil ? 'nav-ic is-on' : 'nav-ic'} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
-						<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
-						<div className="nav-fin">
-							<Link className={chemin.startsWith('/artisans') ? 'nav-b is-on' : 'nav-b'} href="/artisans">
-								<Icone.Artisans /><span className="nav-txt">Artisans</span><span className="count">{navigation.artisans}</span>
-							</Link>
-							<button type="button" className="nav-ic" onClick={basculerTheme} title="Basculer clair / sombre" aria-label="Basculer clair / sombre"><Icone.Soleil /></button>
-							<MenuCompte utilisateur={utilisateur} />
-						</div>
+			{/* Deux étages : au-dessus du filet ce qui vaut partout, en dessous ce qui appartient au chantier ouvert. */}
+			<header className="sticky top-0 z-25 border-b border-rule bg-surface">
+				<div className="flex min-h-13 items-center gap-3.5 px-6 py-1.5 max-etroit:gap-2 max-etroit:px-3.5 max-etroit:py-2">
+					<Link className="group inline-flex flex-none items-center rounded-sm px-1 py-0.5 hover:bg-idle-soft" href="/chantiers"
+						title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle survol /></Link>
+					<Link className={cx(ICONE, accueil ? ICONE_ACTIVE : ICONE_AU_REPOS)} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
+					<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
+					<div className="ml-auto flex items-center gap-0.75">
+						<Link href="/artisans" className={cx('inline-flex items-center gap-1.75 rounded-full px-3 py-1.75 text-13 whitespace-nowrap transition-[background-color,color] duration-120',
+							'[&_svg]:size-4 [&_svg]:flex-none [&_svg]:stroke-[1.5] [&_svg]:opacity-80 max-etroit:px-2',
+							artisans ? 'bg-accent-soft font-semibold text-accent-2' : 'text-ink-2 hover:bg-idle-soft hover:text-ink')}>
+							<Icone.Artisans /><span className="max-etroit:hidden">Artisans</span>
+							<span className={cx('font-mono text-11', artisans ? 'text-accent-2 opacity-75' : 'text-faint')}>{navigation.artisans}</span>
+						</Link>
+						<button type="button" className={cx(ICONE, ICONE_AU_REPOS, 'cursor-pointer')} onClick={basculerTheme} title="Basculer clair / sombre" aria-label="Basculer clair / sombre"><Icone.Soleil /></button>
+						<MenuCompte utilisateur={utilisateur} />
 					</div>
-					{courant && (
-						<div className="nav-onglets">
-							{ONGLETS.map((o) => {
-								const href = `/chantiers/${courant.id}/${o.suffixe}`;
-								return (
-									<Link key={o.suffixe} href={href} className={chemin.startsWith(href) ? 'nav-o is-on' : 'nav-o'}>
-										{o.icone}{o.texte}<span className="count">{courant[o.compte]}</span>
-									</Link>
-								);
-							})}
-						</div>
-					)}
-				</header>
-				{children}
-			</div>
+				</div>
+				{surChantier && courant && (
+					<BarreOnglets libelle="Écrans du chantier">
+						{ONGLETS.map((o) => {
+							const href = `/chantiers/${courant.id}/${o.suffixe}`;
+							return <Onglet key={o.suffixe} href={href} actif={chemin.startsWith(href)} icone={o.icone} compteur={courant[o.compteur]}>{o.texte}</Onglet>;
+						})}
+					</BarreOnglets>
+				)}
+			</header>
+			{children}
 		</div>
 	);
 }
diff --git a/src/composants/navigation/MenuCompte.tsx b/src/composants/navigation/MenuCompte.tsx
index f39abde..b1ccc32 100644
--- a/src/composants/navigation/MenuCompte.tsx
+++ b/src/composants/navigation/MenuCompte.tsx
@@ -4,6 +4,8 @@ import Link from 'next/link';
 import { useEffect, useRef, useState } from 'react';
 import { deconnexionAction } from '@/actions/session';
 import type { UtilisateurConnecte } from '@/auth/session';
+import { cx } from '@/composants/briques/cx';
+import { MENU } from '@/composants/briques/MenuDeroulant';
 
 /** « Augustin Jouan » → « AJ » (initiales() de la maquette). */
 export function initiales(nom: string): string {
@@ -12,6 +14,10 @@ export function initiales(nom: string): string {
 	return (mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2)).toUpperCase();
 }
 
+/** Une entrée du menu ; le lien la pose en bloc (flow-root), le bouton de déconnexion garde son flux. */
+const ITEM = 'w-full cursor-pointer rounded-[4px] px-2.25 py-1.75 text-left text-13 text-ink-2 no-underline hover:bg-idle-soft hover:text-ink';
+
+/** Le compte (ex-.compte) : ce qui n'a pas sa place dans la navigation. */
 export function MenuCompte({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
 	const [ouvert, setOuvert] = useState(false);
 	const racine = useRef<HTMLDivElement>(null);
@@ -28,27 +34,28 @@ export function MenuCompte({ utilisateur }: { utilisateur: UtilisateurConnecte }
 
 	const fermer = () => setOuvert(false);
 	return (
-		<div ref={racine} className={ouvert ? 'compte is-open' : 'compte'}>
-			<button type="button" className="avatar" aria-haspopup="menu" aria-expanded={ouvert} title={`${utilisateur.nom} — ${role}`}
+		<div ref={racine} className="relative ml-1 flex-none">
+			<button type="button" aria-label="Mon compte" aria-haspopup="menu" aria-expanded={ouvert} title={`${utilisateur.nom} — ${role}`}
+				className="grid size-7.5 cursor-pointer place-items-center rounded-full bg-accent-soft font-titre text-11 font-semibold tracking-[0.02em] text-accent-2 hover:bg-accent hover:text-on-accent"
 				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
 				{initiales(utilisateur.nom)}
 			</button>
-			<div className="compte-menu" role="menu">
-				<div className="compte-id">
-					<span className="compte-nom">{utilisateur.nom}</span>
-					<span className="compte-role">{role}</span>
-					<span className="compte-mail">{utilisateur.email}</span>
+			<div role="menu" className={cx('absolute top-[calc(100%+0.375rem)] right-0 z-30 w-56 rounded-sm border border-rule-strong bg-raise p-0.75 shadow-ombre-h', !ouvert && 'hidden')}>
+				<div className="px-2.25 pt-2 pb-1.75">
+					<div className="text-13 font-medium">{utilisateur.nom}</div>
+					<div className="text-11 text-faint">{role}</div>
+					<div className="mt-0.75 font-mono text-10 text-faint">{utilisateur.email}</div>
 				</div>
-				<hr className="picker-sep" />
-				<Link className="compte-item" role="menuitem" href="/mot-de-passe" onClick={fermer}>Changer mon mot de passe</Link>
+				<hr className={MENU.separateur} />
+				<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/mot-de-passe" onClick={fermer}>Changer mon mot de passe</Link>
 				{utilisateur.role === 'admin' && (
 					<>
-						<Link className="compte-item" role="menuitem" href="/parametres" onClick={fermer}>Paramètres</Link>
-						<Link className="compte-item" role="menuitem" href="/admin/comptes" onClick={fermer}>Comptes</Link>
+						<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/parametres" onClick={fermer}>Paramètres</Link>
+						<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/admin/comptes" onClick={fermer}>Comptes</Link>
 					</>
 				)}
 				<form action={deconnexionAction}>
-					<button type="submit" className="compte-item" role="menuitem">Se déconnecter</button>
+					<button type="submit" className={ITEM} role="menuitem">Se déconnecter</button>
 				</form>
 			</div>
 		</div>
diff --git a/src/composants/navigation/SelecteurChantier.tsx b/src/composants/navigation/SelecteurChantier.tsx
index 32c541a..ff1b2b9 100644
--- a/src/composants/navigation/SelecteurChantier.tsx
+++ b/src/composants/navigation/SelecteurChantier.tsx
@@ -2,9 +2,11 @@
 
 import { useRouter } from 'next/navigation';
 import { useEffect, useRef, useState } from 'react';
+import { cx } from '@/composants/briques/cx';
+import { MENU } from '@/composants/briques/MenuDeroulant';
 import type { ChantierNavigation } from '@/donnees/navigation';
 
-/** Le sélecteur nomme ce qu'on regarde : le chantier sur ses trois écrans, « Tous les chantiers » partout ailleurs. */
+/** Le sélecteur nomme ce qu'on regarde : le chantier sur ses trois écrans, « Tous les chantiers » partout ailleurs (ex-.picker). */
 export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierNavigation[]; courant: ChantierNavigation | null }) {
 	const router = useRouter();
 	const [ouvert, setOuvert] = useState(false);
@@ -29,10 +31,10 @@ export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierN
 		const estCourant = courant?.id === x.id;
 		return (
 			<button key={x.id} type="button" role="option" aria-selected={estCourant}
-				className={['picker-item', estCourant && 'is-current', x.termine && 'is-done'].filter(Boolean).join(' ')}
-				onClick={() => aller(`/chantiers/${x.id}/marches`)}>
-				<span className="picker-item-name">{x.reference}</span>
-				<span className="picker-item-meta">{x.lots ? `${x.lots} lot${x.lots > 1 ? 's' : ''}` : '—'}</span>
+				className={cx(MENU.item, estCourant ? MENU.itemCourant : MENU.itemAutre)} onClick={() => aller(`/chantiers/${x.id}/marches`)}>
+				{/* Un chantier terminé est barré. */}
+				<span className={cx(MENU.nom, x.termine && 'text-muted line-through')}>{x.reference}</span>
+				<span className={MENU.meta}>{x.lots ? `${x.lots} lot${x.lots > 1 ? 's' : ''}` : '—'}</span>
 			</button>
 		);
 	};
@@ -40,25 +42,26 @@ export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierN
 	const finis = chantiers.filter((x) => x.termine);
 
 	return (
-		<div ref={racine} className={ouvert ? 'picker is-open' : 'picker'}>
-			<button type="button" className="picker-btn" aria-haspopup="listbox" aria-expanded={ouvert}
+		<div ref={racine} className="relative flex-none">
+			<button type="button" className={cx(MENU.bouton, 'min-w-60 max-etroit:min-w-0')} aria-haspopup="listbox" aria-expanded={ouvert}
 				title={courant ? `Chantier ouvert : ${nom}` : 'Tous les chantiers — en ouvrir un'}
 				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
-				<span className="picker-k">{courant ? 'Chantier ouvert' : 'Affichage'}</span>
-				<span className="picker-v">{nom}</span>
-				<svg className="picker-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
+				<span className={MENU.cle}>{courant ? 'Chantier ouvert' : 'Affichage'}</span>
+				<span className={MENU.valeur}>{nom}</span>
+				<svg className={cx(MENU.fleche, ouvert && 'rotate-180')} viewBox="0 0 16 16" fill="none" strokeWidth={1.6} aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
 			</button>
-			<div className="picker-menu" role="listbox" aria-label="Choisir un chantier">
-				<button type="button" role="option" aria-selected={!courant} className={courant ? 'picker-item' : 'picker-item is-current'} onClick={() => aller('/chantiers')}>
-					<span className="picker-item-name">Tous les chantiers</span>
-					<span className="picker-item-meta">{chantiers.length}</span>
+			<div role="listbox" aria-label="Choisir un chantier"
+				className={cx(MENU.liste, 'absolute top-[calc(100%+0.375rem)] left-0 z-30 w-80 min-w-full max-etroit:w-[min(20rem,calc(100vw-1.75rem))]', !ouvert && 'hidden')}>
+				<button type="button" role="option" aria-selected={!courant} className={cx(MENU.item, courant ? MENU.itemAutre : MENU.itemCourant)} onClick={() => aller('/chantiers')}>
+					<span className={MENU.nom}>Tous les chantiers</span>
+					<span className={MENU.meta}>{chantiers.length}</span>
 				</button>
-				<hr className="picker-sep" />
-				{actifs.length ? actifs.map(ligne) : <div className="picker-head">Aucun chantier en cours</div>}
-				{finis.length > 0 && <><hr className="picker-sep" /><div className="picker-head">Terminés</div>{finis.map(ligne)}</>}
-				<hr className="picker-sep" />
-				<button type="button" className="picker-item picker-new" onClick={() => aller('/chantiers/nouveau')}>
-					<span className="picker-item-name">+ Nouveau chantier</span>
+				<hr className={MENU.separateur} />
+				{actifs.length ? actifs.map(ligne) : <div className={MENU.tete}>Aucun chantier en cours</div>}
+				{finis.length > 0 && <><hr className={MENU.separateur} /><div className={MENU.tete}>Terminés</div>{finis.map(ligne)}</>}
+				<hr className={MENU.separateur} />
+				<button type="button" className={cx(MENU.item, 'font-medium text-accent-2 hover:bg-idle-soft')} onClick={() => aller('/chantiers/nouveau')}>
+					<span className={MENU.nom}>+ Nouveau chantier</span>
 				</button>
 			</div>
 		</div>
```

Run : `npx playwright test e2e/navigation.spec.ts e2e/comptes.spec.ts`
Expected : PASS.

- [ ] **Step 4 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer compte main
npx tsx scripts/heritage.ts restes src/composants/navigation/BarreNavigation.tsx src/composants/navigation/MenuCompte.tsx src/composants/navigation/SelecteurChantier.tsx
```

Expected :
- `69 sélecteur(s) retiré(s), 340 restant(s).`
- puis `2 sélecteur(s) retiré(s), 338 restant(s).` : `.compte` survit par « Mon compte », `.main` par l'outil `'main'` du planning ;
- puis des faux positifs seulement : `chantier` (des messages) et `lots` (le compteur `'lots'` ; `table.lots` vit jusqu'à la Task 11).

  ```
  src/composants/navigation/BarreNavigation.tsx : chantier lots
  src/composants/navigation/SelecteurChantier.tsx : chantier
  ```

- [ ] **Step 5 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « chantiers », « selecteur » et « compte » au banc.

- [ ] **Step 6 : commit**

```bash
git add -A src/composants e2e src/styles
git commit -m "feat(interface): barre de navigation, menu du compte et sélecteur sur les briques

Onglets par BarreOnglets et Onglet (« Écrans du chantier »), menu du compte en role=menu sous le
bouton « Mon compte », sélecteur de chantier sur le dessin partagé MENU. Les E2E visent rôles et
libellés (aides onglet et ouvrirMenuCompte).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9 : l'accueil « Mes chantiers »

La synthèse (ex-`.synthese`, `.synth-*`), les cartes de chantier (ex-`.chantier*`) et la barre d'outils de l'accueil passent sur les briques. Les deux boutons d'une carte deviennent `Bouton variante="surCarte"`, l'ex-surcharge `.chantier-actions .btn` : « Terminer » ou « Rouvrir », puis « Supprimer » en `seulIcone`. La carte « Nouveau chantier » est une `Carte variante="ajout"`. L'aide E2E `carteChantier(page, référence)` remplace `.chantier`.

**Files :**
- Modify :
  - `src/composants/accueil/CarteChantier.tsx`, `Synthese.tsx`, `AccueilChantiers.tsx` ;
  - `src/app/(app)/chantiers/page.tsx`.
- Test : `e2e/aide.ts`, `e2e/aidePlanning.ts`, `e2e/chantiers.spec.ts`, `e2e/financier.spec.ts`, `e2e/gardes.spec.ts`, `e2e/suivi.spec.ts`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `Carte` (`cliquable`, `ajout`, `estompee`), `Pastille`, `Bouton` (`surCarte`, `seulIcone`, `primaire` avec `href`), `BarreOutils`, `Surtitre`, `Vide variante="liste"`, `CLE`, `CHIFFRES`.
- Produces :
  - `e2e/aide.ts` : `carteChantier(page, reference)` = `getByTestId('carte-chantier').filter({ hasText: reference })` ;
  - chaque carte porte `data-testid="carte-chantier"`. Le type de domaine `Carte` s'importe en `DonneesCarte`, pour ne pas masquer la brique.

- [ ] **Step 1 : les sélecteurs E2E d'abord**

```diff
diff --git a/e2e/aide.ts b/e2e/aide.ts
index d27fab4..6c960d4 100644
--- a/e2e/aide.ts
+++ b/e2e/aide.ts
@@ -20,3 +20,6 @@ export const onglet = (page: Page, nom: string) =>
 
 /** Ouvre le menu du compte (le bouton rond des initiales). */
 export const ouvrirMenuCompte = (page: Page) => page.getByRole('button', { name: 'Mon compte' }).click();
+
+/** La carte d'un chantier sur l'accueil, par sa référence. */
+export const carteChantier = (page: Page, reference: string) => page.getByTestId('carte-chantier').filter({ hasText: reference });
diff --git a/e2e/aidePlanning.ts b/e2e/aidePlanning.ts
index c6def13..eb3c258 100644
--- a/e2e/aidePlanning.ts
+++ b/e2e/aidePlanning.ts
@@ -1,5 +1,5 @@
 import { expect, type Page } from '@playwright/test';
-import { ADMIN, onglet, seConnecter } from './aide';
+import { ADMIN, carteChantier, onglet, seConnecter } from './aide';
 
 /** Densité Normale : 46 px par semaine. */
 export const W = 46;
@@ -7,7 +7,7 @@ export const W = 46;
 export async function ouvrirPlanning(page: Page, reference: string) {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await page.goto('/chantiers');
-	await page.locator('.chantier', { hasText: reference }).click();
+	await carteChantier(page, reference).click();
 	await onglet(page, 'Planning').click();
 	await expect(page).toHaveURL(/\/planning$/);
 	await expect(page.locator('.g-bar').first()).toBeVisible();
diff --git a/e2e/chantiers.spec.ts b/e2e/chantiers.spec.ts
index d288203..d0d5f9b 100644
--- a/e2e/chantiers.spec.ts
+++ b/e2e/chantiers.spec.ts
@@ -1,5 +1,5 @@
 import { expect, test } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, carteChantier, seConnecter } from './aide';
 
 test('crée un chantier et l\'ouvre', async ({ page }) => {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
@@ -13,7 +13,7 @@ test('crée un chantier et l\'ouvre', async ({ page }) => {
 	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
 
 	await page.goto('/chantiers');
-	await expect(page.locator('.chantier-ref', { hasText: 'DURAND — Erbray' })).toBeVisible();
+	await expect(carteChantier(page, 'DURAND — Erbray')).toBeVisible();
 });
 
 test('la référence en double est refusée', async ({ page }) => {
diff --git a/e2e/financier.spec.ts b/e2e/financier.spec.ts
index 7ac8c76..c0e3c0b 100644
--- a/e2e/financier.spec.ts
+++ b/e2e/financier.spec.ts
@@ -1,5 +1,5 @@
 import { expect, test, type Page } from '@playwright/test';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, carteChantier, seConnecter } from './aide';
 import { telecharger } from './aidePlanning';
 
 /** Les espaces de formatEuros : fine insécable entre les milliers, insécable avant « € ». */
@@ -20,7 +20,7 @@ test('avenant, lettre, acomptes antérieurs, certificat et correction', async ({
 	test.setTimeout(180_000);
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await page.goto('/chantiers');
-	await page.locator('.chantier', { hasText: 'FINANCIER' }).click();
+	await carteChantier(page, 'FINANCIER').click();
 	await expect(page).toHaveURL(/\/marches$/);
 	const ttc = lignePeinture(page).getByLabel('Montant TTC');
 	await expect(ttc).toHaveValue(saisie('11 340,00'));
diff --git a/e2e/gardes.spec.ts b/e2e/gardes.spec.ts
index a944a12..a37b2a4 100644
--- a/e2e/gardes.spec.ts
+++ b/e2e/gardes.spec.ts
@@ -1,7 +1,7 @@
 import { expect, test } from '@playwright/test';
 import { config } from 'dotenv';
 import pg from 'pg';
-import { ADMIN, seConnecter } from './aide';
+import { ADMIN, carteChantier, seConnecter } from './aide';
 
 config({ path: '.env.test' });
 
@@ -28,7 +28,7 @@ const SECRETS = ['M. et Mme PERRIER', 'CONSTRUCTIONS REBOURS', 'FINANCIER'];
 test('sans session valide, aucune page ne livre de données, même avec un cookie inventé', async ({ page, playwright }) => {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await page.goto('/chantiers');
-	await page.locator('.chantier', { hasText: 'FINANCIER' }).click();
+	await carteChantier(page, 'FINANCIER').click();
 	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
 	const chantier = new URL(page.url()).pathname.replace(/\/marches$/, '');
 	const chantierId = chantier.split('/').pop()!;
diff --git a/e2e/suivi.spec.ts b/e2e/suivi.spec.ts
index 08bc869..8059adb 100644
--- a/e2e/suivi.spec.ts
+++ b/e2e/suivi.spec.ts
@@ -2,7 +2,7 @@ import { readFileSync } from 'node:fs';
 import { unzipSync } from 'fflate';
 import { PDFDocument } from 'pdf-lib';
 import { expect, test, type Page } from '@playwright/test';
-import { ADMIN, onglet, seConnecter } from './aide';
+import { ADMIN, carteChantier, onglet, seConnecter } from './aide';
 import { telecharger } from './aidePlanning';
 
 test.describe.configure({ mode: 'serial' });
@@ -10,7 +10,7 @@ test.describe.configure({ mode: 'serial' });
 async function ouvrirDocuments(page: Page) {
 	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
 	await page.goto('/chantiers');
-	await page.locator('.chantier', { hasText: 'SUIVI' }).click();
+	await carteChantier(page, 'SUIVI').click();
 	await expect(page).toHaveURL(/\/marches$/);
 	await onglet(page, 'Documents').click();
 	await expect(page.getByRole('heading', { name: 'Documents du chantier' })).toBeVisible();
```

Run : `npx playwright test e2e/chantiers.spec.ts`
Expected : FAIL : aucune carte ne porte encore `data-testid="carte-chantier"`.

- [ ] **Step 2 : migrer l'accueil**

```diff
diff --git a/src/app/(app)/chantiers/page.tsx b/src/app/(app)/chantiers/page.tsx
index d52fcfc..fa422e3 100644
--- a/src/app/(app)/chantiers/page.tsx
+++ b/src/app/(app)/chantiers/page.tsx
@@ -1,6 +1,6 @@
-import Link from 'next/link';
 import { exigerPage } from '@/auth/session';
 import { AccueilChantiers } from '@/composants/accueil/AccueilChantiers';
+import { Bouton } from '@/composants/briques/Bouton';
 import { Ecran } from '@/composants/briques/Ecran';
 import * as Icone from '@/composants/briques/icones';
 import { lireAccueil } from '@/donnees/accueil';
@@ -8,7 +8,7 @@ import { lireAccueil } from '@/donnees/accueil';
 export default async function PageChantiers() {
 	await exigerPage();
 	return (
-		<Ecran titre="Mes chantiers" actions={<Link className="btn btn-primary" href="/chantiers/nouveau"><Icone.Plus />Nouveau chantier</Link>}>
+		<Ecran titre="Mes chantiers" actions={<Bouton variante="primaire" href="/chantiers/nouveau"><Icone.Plus />Nouveau chantier</Bouton>}>
 			<AccueilChantiers cartes={await lireAccueil()} />
 		</Ecran>
 	);
diff --git a/src/composants/accueil/AccueilChantiers.tsx b/src/composants/accueil/AccueilChantiers.tsx
index 25bd3bd..265c4bf 100644
--- a/src/composants/accueil/AccueilChantiers.tsx
+++ b/src/composants/accueil/AccueilChantiers.tsx
@@ -1,20 +1,23 @@
 'use client';
 
-import Link from 'next/link';
 import { useState, useSyncExternalStore } from 'react';
+import { BarreOutils } from '@/composants/briques/BarreOutils';
+import { Carte } from '@/composants/briques/Carte';
 import { Interrupteur } from '@/composants/briques/Interrupteur';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { usePreference } from '@/composants/briques/preference';
 import { Recherche } from '@/composants/briques/Recherche';
+import { Surtitre } from '@/composants/briques/Surtitre';
+import { Vide } from '@/composants/briques/Vide';
 import { lireChantierOuvert } from '@/composants/navigation/chantierOuvert';
-import { chantiersVisibles, synthese, TRIS_CHANTIERS, type CarteChantier as Carte, type TriChantiers } from '@/domaine/accueil';
+import { chantiersVisibles, synthese, TRIS_CHANTIERS, type CarteChantier as DonneesCarte, type TriChantiers } from '@/domaine/accueil';
 import { CarteChantier } from './CarteChantier';
 import { Synthese } from './Synthese';
 
 const estTri = (v: unknown): v is TriChantiers => TRIS_CHANTIERS.some((t) => t.v === v);
 const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';
 
-export function AccueilChantiers({ cartes }: { cartes: Carte[] }) {
+export function AccueilChantiers({ cartes }: { cartes: DonneesCarte[] }) {
 	const [requete, setRequete] = useState('');
 	const [tri, setTri] = usePreference<TriChantiers>('sentinelle-tri-chantiers', 'ref', estTri);
 	const [masquer, setMasquer] = usePreference('sentinelle-masquer-termines', true, estBooleen);
@@ -25,22 +28,23 @@ export function AccueilChantiers({ cartes }: { cartes: Carte[] }) {
 	return (
 		<>
 			<Synthese s={synthese(cartes)} />
-			<div className="toolbar">
+			<BarreOutils>
 				<Recherche placeholder="Rechercher un chantier, un client, une commune…" libelle="Rechercher un chantier" valeur={requete} onChange={setRequete} />
 				<MenuDeroulant id="ch-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
 				<Interrupteur coche={masquer} onChange={setMasquer}>Masquer les terminés</Interrupteur>
-				<span className="eyebrow">{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</span>
-			</div>
-			<div className="chantier-grid">
+				<Surtitre>{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</Surtitre>
+			</BarreOutils>
+			{/* 24 rem et non 20 : à 1392 px, 20 rem donnait 4 colonnes où les noms de chantier passaient à la ligne. */}
+			<div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-4">
 				{visibles.map((c) => <CarteChantier key={c.id} c={c} ouvert={c.id === ouvert} />)}
 				{!visibles.length && (
-					<div className="empty-list">{q ? `Aucun chantier ne correspond à « ${q} ».` : 'Tous les chantiers sont terminés. Décochez le filtre pour les revoir.'}</div>
+					<Vide variante="liste">{q ? `Aucun chantier ne correspond à « ${q} ».` : 'Tous les chantiers sont terminés. Décochez le filtre pour les revoir.'}</Vide>
 				)}
-				<Link className="chantier chantier-new" href="/chantiers/nouveau">
-					<span className="plus">+</span>
-					<span className="chantier-ref">Nouveau chantier</span>
-					<div className="chantier-meta">Saisissez l&apos;en-tête une fois, il alimentera tous les documents.</div>
-				</Link>
+				<Carte variante="ajout" href="/chantiers/nouveau">
+					<span className="font-titre text-24 leading-none text-accent">+</span>
+					<span className="font-titre text-17 font-semibold text-accent-2">Nouveau chantier</span>
+					<div className="text-12 leading-[1.45] text-muted">Saisissez l&apos;en-tête une fois, il alimentera tous les documents.</div>
+				</Carte>
 			</div>
 		</>
 	);
diff --git a/src/composants/accueil/CarteChantier.tsx b/src/composants/accueil/CarteChantier.tsx
index 1add05f..c8c59c2 100644
--- a/src/composants/accueil/CarteChantier.tsx
+++ b/src/composants/accueil/CarteChantier.tsx
@@ -5,14 +5,19 @@ import { useTransition } from 'react';
 import { toast } from 'sonner';
 import { marquerTermineAction, supprimerChantierAction } from '@/actions/chantiers';
 import { sansOuvrirLaCarte } from '@/composants/accueil/carteActions';
-import * as Icone from '@/composants/briques/icones';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Carte } from '@/composants/briques/Carte';
 import { useConfirmation } from '@/composants/briques/Confirmation';
-import { pertesSuppression, SUPPRESSION_IMPOSSIBLE, type CarteChantier as Carte } from '@/domaine/accueil';
+import { cx } from '@/composants/briques/cx';
+import * as Icone from '@/composants/briques/icones';
+import { Pastille } from '@/composants/briques/Pastille';
+import { CHIFFRES } from '@/composants/briques/typo';
+import { pertesSuppression, SUPPRESSION_IMPOSSIBLE, type CarteChantier as DonneesCarte } from '@/domaine/accueil';
 import { formatEuros } from '@/domaine/montants';
 
 const dateFr = (iso: string) => iso.split('-').reverse().join('.');
 
-export function CarteChantier({ c, ouvert }: { c: Carte; ouvert: boolean }) {
+export function CarteChantier({ c, ouvert }: { c: DonneesCarte; ouvert: boolean }) {
 	const router = useRouter();
 	const confirmer = useConfirmation();
 	const [, demarrer] = useTransition();
@@ -44,33 +49,36 @@ export function CarteChantier({ c, ouvert }: { c: Carte; ouvert: boolean }) {
 
 	const adresse = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 	return (
-		<div className={c.termine ? 'chantier is-done' : 'chantier'} role="button" tabIndex={0} onClick={ouvrir}
+		<Carte variante="cliquable" estompee={c.termine} role="button" tabIndex={0} data-testid="carte-chantier" onClick={ouvrir}
 			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } }}>
-			<div className="chantier-top">
-				<span className="chantier-ref">{c.reference}</span>
-				<span className="chantier-actions">
-					{c.termine ? <span className="pill pill-fini">Terminé</span> : ouvert && <span className="pill pill-actif">Ouvert</span>}
-					<button type="button" className="btn btn-sm" onClick={(e) => { sansOuvrirLaCarte(e); terminer(); }}
+			<div className="flex items-start justify-between gap-3">
+				{/* Un chantier terminé est barré. */}
+				<span className={cx('font-titre text-17 font-semibold', c.termine && 'line-through decoration-1')}>{c.reference}</span>
+				<span className="flex flex-none items-center gap-1.5">
+					{c.termine ? <Pastille ton="neutre">Terminé</Pastille> : ouvert && <Pastille>Ouvert</Pastille>}
+					<Bouton variante="surCarte" taille="sm" onClick={(e) => { sansOuvrirLaCarte(e); terminer(); }}
 						onKeyDown={sansOuvrirLaCarte} title={c.termine ? 'Rouvrir ce chantier' : 'Marquer ce chantier terminé'}>
 						{c.termine ? <><Icone.Rouvrir />Rouvrir</> : <><Icone.Coche />Terminer</>}
-					</button>
-					<button type="button" className="btn btn-sm btn-danger btn-ico"
-						onClick={(e) => { sansOuvrirLaCarte(e); void supprimer(); }} onKeyDown={sansOuvrirLaCarte}
+					</Bouton>
+					<Bouton variante="surCarte" taille="sm" seulIcone onClick={(e) => { sansOuvrirLaCarte(e); void supprimer(); }} onKeyDown={sansOuvrirLaCarte}
 						title="Supprimer ce chantier" aria-label={`Supprimer ${c.reference}`}>
 						<Icone.Corbeille />
-					</button>
+					</Bouton>
 				</span>
 			</div>
-			<div className="chantier-meta">
+			<div className="text-12 leading-[1.45] text-muted">
 				{c.maitreOuvrage || '—'}<br />
 				{c.natureTravaux || 'Nature des travaux non renseignée'}<br />
 				{adresse || 'Adresse non renseignée'}
-				{c.dateSignature && <><br /><span className="chantier-sig">Signature le {dateFr(c.dateSignature)}</span></>}
+				{c.dateSignature && <><br /><span className="font-mono text-11 text-faint">Signature le {dateFr(c.dateSignature)}</span></>}
 			</div>
-			<div className="chantier-foot">
-				<div className="chantier-lots">{c.lots === 0 ? 'Aucun lot' : `${c.lots} lot${c.lots > 1 ? 's' : ''} · ${c.attribues} attribué${c.attribues > 1 ? 's' : ''}`}</div>
-				<div className="chantier-total"><small>Marchés TTC</small>{c.lots ? formatEuros(c.ttc) : '—'}</div>
+			<div className="mt-auto flex items-end justify-between gap-4">
+				<div className="font-mono text-11 text-muted">{c.lots === 0 ? 'Aucun lot' : `${c.lots} lot${c.lots > 1 ? 's' : ''} · ${c.attribues} attribué${c.attribues > 1 ? 's' : ''}`}</div>
+				<div className={cx(CHIFFRES, 'text-16')}>
+					<div className="font-titre text-10 tracking-capitales uppercase text-faint">Marchés TTC</div>
+					{c.lots ? formatEuros(c.ttc) : '—'}
+				</div>
 			</div>
-		</div>
+		</Carte>
 	);
 }
diff --git a/src/composants/accueil/Synthese.tsx b/src/composants/accueil/Synthese.tsx
index 3a4e70e..64950b7 100644
--- a/src/composants/accueil/Synthese.tsx
+++ b/src/composants/accueil/Synthese.tsx
@@ -1,14 +1,20 @@
+import { cx } from '@/composants/briques/cx';
+import { CHIFFRES, CLE } from '@/composants/briques/typo';
 import type { Synthese as S } from '@/domaine/accueil';
 
+/** Une case de la synthèse (ex-.synth-cell) : la clé, la valeur en chiffres (en danger si alerte), la précision. */
 const cellule = (k: string, v: React.ReactNode, sous: string, alerte = false) => (
-	<div className={alerte ? 'synth-cell alerte' : 'synth-cell'}>
-		<span className="synth-k">{k}</span><span className="synth-v">{v}</span><span className="synth-sous">{sous}</span>
+	<div className="bg-raise px-4.5 pt-3.5 pb-3.75">
+		<div className={cx(CLE, 'mb-0.75')}>{k}</div>
+		<span className={cx(CHIFFRES, 'text-22 leading-[1.1]', alerte && 'text-danger')}>{v}</span>
+		<div className="mt-0.75 text-12 text-muted">{sous}</div>
 	</div>
 );
 
+/** Ce qu'on veut savoir en arrivant (ex-.synthese) : un filet d'un pixel entre les cases, c'est le fond qui le dessine. */
 export function Synthese({ s }: { s: S }) {
 	return (
-		<div className="synthese">
+		<div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-px overflow-hidden rounded-md border border-rule bg-rule shadow-ombre">
 			{cellule('Chantiers en cours', s.enCours, s.termines ? `${s.termines} terminé${s.termines > 1 ? 's' : ''} par ailleurs` : 'aucun terminé')}
 			{cellule('Marchés engagés', s.ttcTexte, `${s.lots} lot${s.lots > 1 ? 's' : ''} au total`)}
 			{cellule('Lots à attribuer', s.aAttribuer, s.aAttribuer ? 'aucune entreprise désignée' : 'tous les lots ont leur entreprise', s.aAttribuer > 0)}
```

Run : `npx playwright test e2e/chantiers.spec.ts`
Expected : PASS.

- [ ] **Step 3 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer chantier
npx tsx scripts/heritage.ts restes src/composants/accueil/CarteChantier.tsx src/composants/accueil/Synthese.tsx src/composants/accueil/AccueilChantiers.tsx "src/app/(app)/chantiers/page.tsx"
```

Expected :
- `26 sélecteur(s) retiré(s), 312 restant(s).`
- puis `3 sélecteur(s) retiré(s), 309 restant(s).` : `.chantier` survit par des messages ;
- puis `src/composants/accueil/Synthese.tsx : lots`, un faux positif (« 19 lots au total » ; `table.lots` vit jusqu'à la Task 11).

- [ ] **Step 4 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « chantiers », « compte » et « selecteur » au banc.

- [ ] **Step 5 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): l'accueil sur les briques

Synthèse, cartes de chantier (Carte cliquable, boutons surCarte) et carte « Nouveau chantier »
(Carte ajout). E2E : carteChantier(page, référence) remplace la classe .chantier.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10 : le nouveau chantier

Le formulaire de création passe sur les briques : `Ecran`, `ColonnesFormulaire`, `GroupeChamps`, `GrilleChamps`, `Champ`, `Saisie`, `PiedFormulaire` et `Bouton`. « Type de mission » quitte ses boutons radio natifs cachés (`display: none`, hors d'atteinte du clavier) pour `ChoixSegmente` : Tab y entre, Espace choisit (point 4 de la Review Focus). Une référence refusée par le serveur s'annonce sur son champ (`aria-describedby`) au lieu d'un `.erreur` détaché. Le type local `Saisie` devient `Valeurs`, pour ne pas masquer la brique.

**Files :**
- Modify : `src/composants/FormulaireChantier.tsx`, `src/app/(app)/chantiers/nouveau/page.tsx`
- Test : `e2e/chantiers.spec.ts`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes : `Ecran`, `ColonnesFormulaire`, `GroupeChamps`, `GrilleChamps`, `Champ`, `Saisie`, `ChoixSegmente`, `PiedFormulaire`, `Bouton`, `Interrupteur variante="discrete"`, `MenuDeroulant largeur="pleine"`.
- Produces : la page `nouveau` rend `FormulaireChantier` seul ; c'est lui qui pose l'`Ecran`.

- [ ] **Step 1 : écrire les tests**

```diff
diff --git a/e2e/chantiers.spec.ts b/e2e/chantiers.spec.ts
index d0d5f9b..eab18c8 100644
--- a/e2e/chantiers.spec.ts
+++ b/e2e/chantiers.spec.ts
@@ -25,5 +25,18 @@ test('la référence en double est refusée', async ({ page }) => {
 		await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
 		if (essai === 1) await expect(page).toHaveURL(/\/marches$/);
 	}
-	await expect(page.locator('.erreur', { hasText: 'Cette référence existe déjà.' })).toBeVisible();
+	await expect(page.getByRole('textbox', { name: 'Référence dossier' })).toHaveAccessibleDescription('Cette référence existe déjà.');
+});
+
+test('choisit la mission au clavier', async ({ page }) => {
+	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
+	await page.goto('/chantiers/nouveau');
+	const mission = page.getByRole('radiogroup', { name: 'Type de mission' });
+	await expect(mission.getByRole('radio', { name: 'Complète' })).toBeChecked();
+	await mission.getByRole('radio', { name: 'Complète' }).focus();
+	await page.keyboard.press('Tab');
+	await expect(mission.getByRole('radio', { name: 'Partielle' })).toBeFocused();
+	await page.keyboard.press('Space');
+	await expect(mission.getByRole('radio', { name: 'Partielle' })).toBeChecked();
+	await expect(mission.getByRole('radio', { name: 'Complète' })).not.toBeChecked();
 });
```

- [ ] **Step 2 : les lancer**

Run : `npx playwright test e2e/chantiers.spec.ts`
Expected : FAIL.
- « la référence en double est refusée » : le champ n'a pas de description accessible.
- « choisit la mission au clavier » : aucun `role="radio"` n'est atteignable.

- [ ] **Step 3 : migrer le formulaire**

```diff
diff --git a/src/app/(app)/chantiers/nouveau/page.tsx b/src/app/(app)/chantiers/nouveau/page.tsx
index 97e951c..43dc209 100644
--- a/src/app/(app)/chantiers/nouveau/page.tsx
+++ b/src/app/(app)/chantiers/nouveau/page.tsx
@@ -4,9 +4,5 @@ import { listerChargesAffaire } from '@/donnees/chantiers';
 
 export default async function PageNouveauChantier() {
 	const moi = await exigerPage();
-	return (
-		<section className="screen is-on">
-			<FormulaireChantier chargesAffaire={await listerChargesAffaire()} moi={{ id: moi.id, nom: moi.nom }} />
-		</section>
-	);
+	return <FormulaireChantier chargesAffaire={await listerChargesAffaire()} moi={{ id: moi.id, nom: moi.nom }} />;
 }
diff --git a/src/composants/FormulaireChantier.tsx b/src/composants/FormulaireChantier.tsx
index a524411..965b791 100644
--- a/src/composants/FormulaireChantier.tsx
+++ b/src/composants/FormulaireChantier.tsx
@@ -4,29 +4,35 @@ import { useRouter } from 'next/navigation';
 import { useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { creerChantierAction } from '@/actions/chantiers';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, ColonnesFormulaire, GrilleChamps, GroupeChamps, PiedFormulaire, Saisie } from '@/composants/briques/Champ';
+import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
+import { Ecran } from '@/composants/briques/Ecran';
 import { Interrupteur } from '@/composants/briques/Interrupteur';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 
 type Props = { chargesAffaire: { id: string; nom: string }[]; moi: { id: string; nom: string } };
-type Saisie = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };
+type Valeurs = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };
 
-const VIDE: Saisie = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
+const MISSIONS = [{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }] as const;
+
+const VIDE: Valeurs = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
 /** fillExample() de la maquette. */
-const EXEMPLE: Saisie = {
+const EXEMPLE: Valeurs = {
 	maitreOuvrage: 'M. et Mme BLANCHARD', adresseClient: '7 rue des Tilleuls, 44110 CHÂTEAUBRIANT', natureTravaux: "Construction d'une maison individuelle — 118 m²",
 	adresse: 'La Grande Noë', cp: '44520', commune: 'ISSÉ', dateSignaturePrevue: '2026-10-02', reference: 'BLANCHARD — Issé',
 };
 
 export function FormulaireChantier({ chargesAffaire, moi }: Props) {
 	const router = useRouter();
-	const [s, setS] = useState<Saisie>(VIDE);
+	const [s, setS] = useState<Valeurs>(VIDE);
 	const [surPlace, setSurPlace] = useState(false);
 	const [mission, setMission] = useState<'COMPLETE' | 'PARTIELLE'>('COMPLETE');
 	const [chargeAffaireId, setChargeAffaireId] = useState(moi.id);
 	const [lotsDeBase, setLotsDeBase] = useState(true);
 	const [erreurs, setErreurs] = useState<Record<string, string>>({});
 	const [enCours, demarrer] = useTransition();
-	const maj = (champ: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [champ]: e.target.value });
+	const maj = (champ: keyof Valeurs) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [champ]: e.target.value });
 	// Rénovation, extension : le client vit sur le chantier, son adresse en est recopiée (syncAdresseClient).
 	const adresseChantier = [s.adresse.trim(), [s.cp.trim(), s.commune.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 	const adresseClient = surPlace ? adresseChantier : s.adresseClient;
@@ -47,93 +53,67 @@ export function FormulaireChantier({ chargesAffaire, moi }: Props) {
 		});
 	}
 
-	const champ = (id: string, nom: keyof Saisie, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; span?: boolean; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
-		<div className={o.span ? 'field span' : 'field'}>
-			<label htmlFor={id}>{libelle}</label>
-			<input id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
-				className={[o.num && 'num', erreurs[nom] && 'est-erreur'].filter(Boolean).join(' ') || undefined} aria-invalid={Boolean(erreurs[nom])} />
-			{o.aide && <span className="hint">{o.aide}</span>}
-			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
-		</div>
+	const champ = (id: string, nom: keyof Valeurs, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; span?: boolean; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
+		<Champ libelle={libelle} pour={id} aide={o.aide} erreur={erreurs[nom]} pleineLargeur={o.span}>
+			<Saisie id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
+				chiffres={o.num} erreur={erreurs[nom]} />
+		</Champ>
 	);
 
+	const annuler = () => router.push('/chantiers');
 	return (
-		<>
-			<div className="topbar">
-				<div className="topbar-row">
-					<div><h1 className="page-title">Nouveau chantier</h1></div>
-					<div className="topbar-actions">
-						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
-						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
-					</div>
-				</div>
-			</div>
-			<div className="body-pad">
-				<div className="form-wrap">
-					<div className="fieldset">
-						<span className="eyebrow">Client</span>
-						<div className="grid-2">
-							{champ('f-mo', 'maitreOuvrage', 'Nom du client', { span: true, placeholder: 'M. et Mme MARTIN — ou SCI LES CHÊNES',
-								aide: "Imprimé sous la mention « Maître d'Ouvrage » dans les marchés, et « Mr/Mme » en tête du récap." })}
-							{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { span: true, placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
-								aide: <>Là où lui écrire <b>aujourd&apos;hui</b> — pas le chantier. En construction neuve il n&apos;y habite pas encore. Imprimée sous « Demeurant » sur les marchés.</> })}
-						</div>
-					</div>
+		<Ecran titre="Nouveau chantier" actions={<>
+			<Bouton variante="fantome" onClick={annuler}>Annuler</Bouton>
+			<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
+		</>}>
+			<ColonnesFormulaire>
+				<GroupeChamps titre="Client">
+					<GrilleChamps>
+						{champ('f-mo', 'maitreOuvrage', 'Nom du client', { span: true, placeholder: 'M. et Mme MARTIN — ou SCI LES CHÊNES',
+							aide: "Imprimé sous la mention « Maître d'Ouvrage » dans les marchés, et « Mr/Mme » en tête du récap." })}
+						{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { span: true, placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
+							aide: <>Là où lui écrire <b>aujourd&apos;hui</b> — pas le chantier. En construction neuve il n&apos;y habite pas encore. Imprimée sous « Demeurant » sur les marchés.</> })}
+					</GrilleChamps>
+				</GroupeChamps>
 
-					<div className="fieldset">
-						<span className="eyebrow">Chantier</span>
-						<div className="grid-2">
-							{champ('f-nat', 'natureTravaux', 'Nature des travaux', { span: true, placeholder: "Construction d'une maison individuelle — 120 m²" })}
-							{champ('f-adr', 'adresse', 'Adresse du chantier', { span: true, placeholder: 'Le Haut Bois', aide: 'Là où les travaux ont lieu. Imprimée sous « Située » sur les marchés.' })}
-							{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
-							{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
-							<div className="field span">
-								<Interrupteur id="f-meme" variante="discrete" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
-								<span className="hint">Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</span>
-							</div>
-						</div>
-					</div>
+				<GroupeChamps titre="Chantier">
+					<GrilleChamps>
+						{champ('f-nat', 'natureTravaux', 'Nature des travaux', { span: true, placeholder: "Construction d'une maison individuelle — 120 m²" })}
+						{champ('f-adr', 'adresse', 'Adresse du chantier', { span: true, placeholder: 'Le Haut Bois', aide: 'Là où les travaux ont lieu. Imprimée sous « Située » sur les marchés.' })}
+						{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
+						{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
+						<Champ pleineLargeur aide={<>Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</>}>
+							<Interrupteur id="f-meme" variante="discrete" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
+						</Champ>
+					</GrilleChamps>
+				</GroupeChamps>
 
-					<div className="fieldset">
-						<span className="eyebrow">Mission</span>
-						<div className="grid-2">
-							<div className="field span">
-								<label>Type de mission</label>
-								<div className="radio-row" role="radiogroup" aria-label="Type de mission">
-									{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
-										<label key={m} className={mission === m ? 'is-on' : undefined}>
-											<input type="radio" name="mission" checked={mission === m} onChange={() => setMission(m)} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
-										</label>
-									))}
-								</div>
-							</div>
-							{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
-							<div className="field">
-								<label htmlFor="f-ca">Chargé d&apos;affaire</label>
-								<MenuDeroulant id="f-ca" k="Compte" largeur="pleine" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
-									options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
-								<span className="hint">Chez vous, pas chez le client.</span>
-								{erreurs.chargeAffaireId && <span className="erreur">{erreurs.chargeAffaireId}</span>}
-							</div>
-							{champ('f-ref', 'reference', 'Référence dossier', { placeholder: "Repris du maître d'ouvrage si vide" })}
-						</div>
-					</div>
+				<GroupeChamps titre="Mission">
+					<GrilleChamps>
+						<Champ libelle="Type de mission" pleineLargeur>
+							<ChoixSegmente libelle="Type de mission" options={MISSIONS} valeur={mission} onChoisir={setMission} />
+						</Champ>
+						{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
+						<Champ libelle="Chargé d'affaire" pour="f-ca" aide="Chez vous, pas chez le client." erreur={erreurs.chargeAffaireId}>
+							<MenuDeroulant id="f-ca" k="Compte" largeur="pleine" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
+								options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
+						</Champ>
+						{champ('f-ref', 'reference', 'Référence dossier', { placeholder: "Repris du maître d'ouvrage si vide" })}
+					</GrilleChamps>
+				</GroupeChamps>
 
-					<div className="fieldset">
-						<span className="eyebrow">Lots</span>
-						<div className="field">
-							<Interrupteur id="f-lots-base" variante="discrete" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
-							<span className="hint">Terrassement, gros œuvre, charpente… jusqu&apos;à l&apos;escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.</span>
-						</div>
-					</div>
+				<GroupeChamps titre="Lots">
+					<Champ aide="Terrassement, gros œuvre, charpente… jusqu'à l'escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.">
+						<Interrupteur id="f-lots-base" variante="discrete" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
+					</Champ>
+				</GroupeChamps>
 
-					<div className="form-actions">
-						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
-						<button type="button" className="btn" onClick={() => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); }}>Remplir un exemple</button>
-						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
-					</div>
-				</div>
-			</div>
-		</>
+				<PiedFormulaire>
+					<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
+					<Bouton onClick={() => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); }}>Remplir un exemple</Bouton>
+					<Bouton variante="fantome" onClick={annuler}>Annuler</Bouton>
+				</PiedFormulaire>
+			</ColonnesFormulaire>
+		</Ecran>
 	);
 }
```

Run : `npx playwright test e2e/chantiers.spec.ts`
Expected : PASS (3 tests).

- [ ] **Step 4 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts restes src/composants/FormulaireChantier.tsx "src/app/(app)/chantiers/nouveau/page.tsx"
```

Expected : `7 sélecteur(s) retiré(s), 302 restant(s).`, puis `src/composants/FormulaireChantier.tsx : moins`. C'est un faux positif : « au moins » dans un message, et `.kv dd.num.moins` vit jusqu'à la Task 11.

- [ ] **Step 5 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « nouveau » au banc (le cadre du chargé d'affaire y reste masqué, écart 4).

- [ ] **Step 6 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): le nouveau chantier sur les briques, mission au clavier

Formulaire en ColonnesFormulaire, GroupeChamps et Champ. « Type de mission » devient un
ChoixSegmente (role=radio) : Tab y entre, Espace choisit. La référence refusée s'annonce sur son
champ (aria-describedby).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11 : Marchés (bandeau du chantier, tableau des lots, panneau du lot)

L'écran le plus dense après le Planning. Trois parties passent sur les briques :
- **le bandeau du chantier** (ex-`.context`) : un bouton qui ouvre le panneau d'édition de l'en-tête. Ce panneau est en `GrilleChamps`, `Champ` et `ChoixSegmente`.
- **le tableau des lots** (ex-`table.lots`, `.totals`) : `Tableau variante="lots"` avec ses attributs de cellule et de ligne (`data-saisie`, `data-droite`, `data-ouvert`, `data-inactif`), la nature en `Etiquette`, et la barre de totaux collée en bas.
- **le panneau du lot** (ex-`.kv`, `.frow`, `.block`) : `Bloc`, `CleValeur`, `ChoixSegmente` pour la nature du marché, `Tableau variante="mini"` pour les avenants, `Vide variante="mini"`.

Aucun sélecteur E2E ne change : ces écrans étaient déjà visés par rôles, libellés et `data-testid`.

**Files :**
- Modify :
  - `src/composants/chantier/BandeauChantier.tsx`, `src/composants/TableauLots.tsx`, `src/composants/PanneauLot.tsx` ;
  - `src/app/(app)/chantiers/[id]/marches/page.tsx:81` : le lien d'export devient `Bouton natif` ;
  - `src/composants/BoutonMarchesManquants.tsx:26` : la forme « barre » devient `Bouton variante="primaire" enCours`.
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes :
  - `Tableau` (`lots`, `mini`) et `CadreTableau` ;
  - `Bloc`, `CleValeur`, `Cle`, `Valeur` ;
  - `ChoixSegmente`, `GrilleChamps`, `Champ`, `Etiquette`, `Vide`, `Bouton` ;
  - `ChampEnLigne` (`kv`, `kv-etroit`, `date`), `MenuDeroulant largeur="pleine"` ;
  - `CLE`, `CHIFFRES`.
- Produces : rien de nouveau pour les tâches suivantes. `TableauLots` garde ses exports (`TableauLots`, `BoutonAjouterLot`) et ses `data-testid` de totaux.

- [ ] **Step 1 : migrer le bandeau du chantier**

```diff
diff --git a/src/composants/chantier/BandeauChantier.tsx b/src/composants/chantier/BandeauChantier.tsx
index e8d73f8..28a566e 100644
--- a/src/composants/chantier/BandeauChantier.tsx
+++ b/src/composants/chantier/BandeauChantier.tsx
@@ -4,8 +4,13 @@ import { useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { marquerTermineAction, modifierChampChantierAction } from '@/actions/chantiers';
 import { ChampEnLigne } from '@/composants/ChampEnLigne';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, GrilleChamps } from '@/composants/briques/Champ';
+import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
+import { cx } from '@/composants/briques/cx';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { Panneau } from '@/composants/briques/Panneau';
+import { CHIFFRES, CLE } from '@/composants/briques/typo';
 import type { ChampChantier, EnTeteChantierVue } from '@/donnees/chantiers';
 
 const CHAMPS: { champ: ChampChantier; libelle: string; type?: 'date'; span?: boolean; num?: boolean }[] = [
@@ -19,6 +24,8 @@ const CHAMPS: { champ: ChampChantier; libelle: string; type?: 'date'; span?: boo
 	{ champ: 'reference', libelle: 'Référence dossier' },
 ];
 
+const MISSIONS = [{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }] as const;
+
 const dateFr = (iso: string) => iso.split('-').reverse().join('.');
 
 export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnTeteChantierVue; chargesAffaire: { id: string; nom: string }[] }) {
@@ -39,44 +46,41 @@ export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnT
 	];
 	return (
 		<>
-			<button type="button" className="context" title="Modifier l'en-tête du chantier" onClick={() => setOuvert(true)}>
+			{/* Le bandeau du chantier (ex-.context) : un clic ouvre l'en-tête à modifier. */}
+			<button type="button" className="flex w-full cursor-pointer overflow-x-auto border-t border-rule bg-surface text-left hover:bg-idle-soft"
+				title="Modifier l'en-tête du chantier" onClick={() => setOuvert(true)}>
 				{cellules.map(([k, v, mono]) => (
-					<div key={k} className="context-cell"><span className="context-k">{k}</span><span className={mono ? 'context-v num' : 'context-v'}>{v}</span></div>
+					<div key={k} className="min-w-0 flex-none border-r border-rule px-6 pt-2.5 pb-2.75 last:border-r-0">
+						<span className={cx(CLE, 'mb-0.25 flow-root')}>{k}</span>
+						<span className={cx('text-13 whitespace-nowrap', mono && CHIFFRES)}>{v}</span>
+					</div>
 				))}
 			</button>
 			<Panneau ouvert={ouvert} surtitre="CHANTIER" titre="En-tête du chantier" onFermer={() => setOuvert(false)}
 				pied={<>
-					<button type="button" className="btn" onClick={() => agir(() => marquerTermineAction(c.id, !c.termine),
+					<Bouton onClick={() => agir(() => marquerTermineAction(c.id, !c.termine),
 						c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>)}>
 						{c.termine ? 'Rouvrir le chantier' : 'Marquer terminé'}
-					</button>
-					<button type="button" className="btn btn-ghost" onClick={() => setOuvert(false)}>Fermer</button>
+					</Bouton>
+					<Bouton variante="fantome" onClick={() => setOuvert(false)}>Fermer</Bouton>
 				</>}>
-				<div className="grid-2">
+				<GrilleChamps>
 					{CHAMPS.map((f) => (
-						<div key={f.champ} className={f.span ? 'field span' : 'field'}>
-							<label htmlFor={`e-${f.champ}`}>{f.libelle}</label>
+						<Champ key={f.champ} libelle={f.libelle} pour={`e-${f.champ}`} pleineLargeur={f.span}>
 							<ChampEnLigne id={`e-${f.champ}`} variante="champ" chiffres={f.num} libelle={f.libelle} type={f.type}
 								valeur={c[f.champ] as string} enregistrer={modifierChampChantierAction.bind(null, c.id, f.champ)} />
-						</div>
+						</Champ>
 					))}
-					<div className="field span">
-						<label>Type de mission</label>
-						<div className="radio-row" role="radiogroup" aria-label="Type de mission">
-							{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
-								<label key={m} className={c.mission === m ? 'is-on' : undefined}>
-									<input type="radio" name="e-mission" checked={c.mission === m} onChange={() => agir(() => modifierChampChantierAction(c.id, 'mission', m))} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
-								</label>
-							))}
-						</div>
-					</div>
-					<div className="field span">
-						<label htmlFor="e-ca">Chargé d&apos;affaire</label>
+					<Champ libelle="Type de mission" pleineLargeur>
+						<ChoixSegmente libelle="Type de mission" options={MISSIONS} valeur={c.mission}
+							onChoisir={(m) => agir(() => modifierChampChantierAction(c.id, 'mission', m))} />
+					</Champ>
+					<Champ libelle="Chargé d'affaire" pour="e-ca" pleineLargeur>
 						<MenuDeroulant id="e-ca" k="Compte" largeur="pleine" valeur={c.chargeAffaireId}
 							options={chargesAffaire.map((x) => ({ v: x.id, t: x.nom }))}
 							onChoisir={(v) => agir(() => modifierChampChantierAction(c.id, 'chargeAffaireId', v))} />
-					</div>
-				</div>
+					</Champ>
+				</GrilleChamps>
 			</Panneau>
 		</>
 	);
```

- [ ] **Step 2 : migrer le tableau des lots**

`Total` regroupe une case de la barre de totaux. Les largeurs de colonne reprennent la maquette : `w-18` (numéro), `min-w-64` (lot), `w-42` (HT, TTC), `w-26` (TVA).

```diff
diff --git a/src/composants/TableauLots.tsx b/src/composants/TableauLots.tsx
index 4aadc42..c2d0d19 100644
--- a/src/composants/TableauLots.tsx
+++ b/src/composants/TableauLots.tsx
@@ -3,10 +3,17 @@
 import { useEffect, useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { ajouterLotAction, modifierChampLotAction } from '@/actions/lots';
+import { BarreOutils } from '@/composants/briques/BarreOutils';
+import { Bouton } from '@/composants/briques/Bouton';
+import { cx } from '@/composants/briques/cx';
+import { Etiquette } from '@/composants/briques/Etiquette';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { usePreference } from '@/composants/briques/preference';
 import { Recherche } from '@/composants/briques/Recherche';
+import { Surtitre } from '@/composants/briques/Surtitre';
+import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
+import { CHIFFRES, CLE } from '@/composants/briques/typo';
 import type { VueMarches } from '@/donnees/marches';
 import { lotsVisibles, TRIS_LOTS, type TriLots } from '@/domaine/lots';
 import { formatMontantSaisie, formatTauxPoint } from '@/domaine/montants';
@@ -21,13 +28,23 @@ const OUVRIR_LOT = 'sentinelle:ouvrir-lot';
 export function BoutonAjouterLot({ chantierId }: { chantierId: string }) {
 	const [enCours, demarrer] = useTransition();
 	return (
-		<button type="button" className="btn" disabled={enCours} onClick={() => demarrer(async () => {
+		<Bouton enCours={enCours} onClick={() => demarrer(async () => {
 			const r = await ajouterLotAction(chantierId);
 			if (!r.ok) { toast.error(r.erreur); return; }
 			window.dispatchEvent(new CustomEvent(OUVRIR_LOT, { detail: r.donnees.id }));
 		})}>
 			<Icone.Plus />Ajouter un lot
-		</button>
+		</Bouton>
+	);
+}
+
+/** Une case de la barre des totaux (ex-.total-cell) ; la dernière, le TTC, en grand sur fond d'encre. */
+function Total({ cle, valeur, grand = false, testid }: { cle: string; valeur: string; grand?: boolean; testid?: string }) {
+	return (
+		<div className={cx('flex-none px-4.5 pt-2.5 pb-2.75', grand ? 'ml-auto bg-ink text-paper' : 'border-r border-rule')}>
+			<div className={CLE}>{cle}</div>
+			<span data-testid={testid} className={cx(CHIFFRES, 'whitespace-nowrap', grand ? 'text-18 font-semibold' : 'text-15 font-medium')}>{valeur}</span>
+		</div>
 	);
 }
 
@@ -57,64 +74,66 @@ export function TableauLots({ vue }: { vue: VueMarches }) {
 
 	return (
 		<>
-			<div className="toolbar">
+			<BarreOutils>
 				<Recherche placeholder="Rechercher un lot, une entreprise, un numéro…" libelle="Rechercher un lot" valeur={requete} onChange={setRequete} />
 				<MenuDeroulant id="lot-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
-				<span className="eyebrow">{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</span>
-			</div>
-			<div className="table-frame">
-				<table className="lots">
+				<Surtitre>{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</Surtitre>
+			</BarreOutils>
+			<CadreTableau>
+				<Tableau variante="lots">
 					<thead>
-						<tr><th>N°</th><th>Lot</th><th>Entreprise</th><th className="ta-r">Montant HT</th><th className="ta-r">TVA</th><th className="ta-r">Montant TTC</th></tr>
+						<tr><th>N°</th><th>Lot</th><th>Entreprise</th><th data-droite>Montant HT</th><th data-droite>TVA</th><th data-droite>Montant TTC</th></tr>
 					</thead>
 					<tbody>
 						{vus.map((l) => {
 							const nbAv = l.avenants.length;
-							const classes = [!l.entreprise && 'is-unassigned', l.id === lotOuvert && 'is-open'].filter(Boolean).join(' ') || undefined;
 							return (
-								<tr key={l.id} data-lot={l.designation} className={classes} onClick={() => setLotOuvert(l.id)}>
-									<td className="cell-num is-editable" onClick={arreter}>
+								<tr key={l.id} data-lot={l.designation} data-inactif={l.entreprise ? undefined : ''} data-ouvert={l.id === lotOuvert ? '' : undefined}
+									onClick={() => setLotOuvert(l.id)}>
+									<td data-saisie className="w-18 font-mono text-12 text-muted" onClick={arreter}>
 										<ChampEnLigne variante="texte-mini" libelle="Numéro du lot" placeholder="—" valeur={l.numero ?? ''} enregistrer={champ(l.id, 'numero')} />
 									</td>
-									<td className="cell-lot is-editable" onClick={arreter}>
-										<div className="lot-wrap">
+									<td data-saisie className="min-w-64 font-medium whitespace-nowrap" onClick={arreter}>
+										{/* Le champ et ses étiquettes partagent un conteneur : la cellule reste une vraie cellule. */}
+										<div className="flex items-center">
 											<ChampEnLigne className="min-w-0 flex-1" libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
-											{l.nature === 'SOUS_TRAITANCE' && <span className="nature-tag st">Sous-traitance</span>}
-											{nbAv > 0 && <span className="nature-tag av" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</span>}
+											{l.nature === 'SOUS_TRAITANCE' && <Etiquette ton="accent" className="mr-3 flex-none">Sous-traitance</Etiquette>}
+											{nbAv > 0 && <Etiquette className="mr-3 flex-none" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</Etiquette>}
 										</div>
 									</td>
-									<td className="cell-ent">
+									<td className="whitespace-nowrap">
 										{l.entreprise
-											? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}{l.commune && <small>{l.commune}</small>}</>
-											: <span className="unset">à attribuer</span>}
+											? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}{l.commune && <div className="text-11 text-muted">{l.commune}</div>}</>
+											: <span className="text-faint italic">à attribuer</span>}
 									</td>
-									<td className="ta-r cell-ht is-editable" onClick={arreter}>
+									<td data-droite data-saisie className="w-42" onClick={arreter}>
 										<ChampEnLigne variante="montant" libelle="Montant HT" valeur={formatMontantSaisie(l.htInitial)} enregistrer={champ(l.id, 'montantHt')} />
 									</td>
-									<td className="ta-r cell-tva is-editable" onClick={arreter}>
+									<td data-droite data-saisie className="w-26" onClick={arreter}>
 										<ChampEnLigne variante="montant-mini" libelle="Taux de TVA" valeur={formatTauxPoint(l.tauxTva)} enregistrer={champ(l.id, 'tauxTva')} />
 									</td>
-									<td className="ta-r cell-ht is-editable" onClick={arreter} title={nbAv ? 'Avenants compris — le montant initial HT est recalculé' : undefined}>
+									<td data-droite data-saisie className="w-42" onClick={arreter} title={nbAv ? 'Avenants compris — le montant initial HT est recalculé' : undefined}>
 										<ChampEnLigne variante="montant" libelle="Montant TTC" valeur={formatMontantSaisie(l.ttcEngage)} enregistrer={champ(l.id, 'montantTtc')} />
 									</td>
 								</tr>
 							);
 						})}
 						{!vus.length && (
-							<tr className="empty-row">
-								<td colSpan={6}>
-									{q ? <>Aucun lot ne correspond à « {q} ». <button type="button" className="btn btn-sm" onClick={() => setRequete('')}>Effacer la recherche</button></>
-										: <>Aucun lot pour l&apos;instant. <button type="button" className="btn btn-sm btn-primary" onClick={ajouter}>Ajouter le premier lot</button></>}
+							<tr>
+								<td data-vide colSpan={6}>
+									{q ? <>Aucun lot ne correspond à « {q} ». <Bouton taille="sm" className="ml-3" onClick={() => setRequete('')}>Effacer la recherche</Bouton></>
+										: <>Aucun lot pour l&apos;instant. <Bouton taille="sm" variante="primaire" className="ml-3" onClick={ajouter}>Ajouter le premier lot</Bouton></>}
 								</td>
 							</tr>
 						)}
 					</tbody>
-				</table>
-			</div>
-			<div className="totals">
-				<div className="total-cell"><span className="total-k">Total marchés HT</span><span className="total-v num" data-testid="total-ht">{vue.totalHtTexte}</span></div>
-				<div className="total-cell"><span className="total-k">TVA</span><span className="total-v num">{vue.totalTvaTexte}</span></div>
-				<div className="total-cell"><span className="total-k">Total marchés TTC</span><span className="total-v grand num" data-testid="total-ttc">{vue.totalTtcTexte}</span></div>
+				</Tableau>
+			</CadreTableau>
+			{/* Les totaux restent collés en bas de la fenêtre pendant que le tableau défile. */}
+			<div className="sticky bottom-0 z-15 mt-3 flex items-stretch overflow-hidden rounded-md border border-rule-strong bg-surface shadow-ombre">
+				<Total cle="Total marchés HT" valeur={vue.totalHtTexte} testid="total-ht" />
+				<Total cle="TVA" valeur={vue.totalTvaTexte} />
+				<Total cle="Total marchés TTC" valeur={vue.totalTtcTexte} testid="total-ttc" grand />
 			</div>
 			{ouvert && <PanneauLot lot={ouvert} vue={vue} onFermer={() => setLotOuvert(null)} />}
 		</>
```

- [ ] **Step 3 : migrer le panneau du lot**

```diff
diff --git a/src/composants/PanneauLot.tsx b/src/composants/PanneauLot.tsx
index af70664..931f763 100644
--- a/src/composants/PanneauLot.tsx
+++ b/src/composants/PanneauLot.tsx
@@ -1,15 +1,22 @@
 'use client';
 
 import Decimal from 'decimal.js';
-import Link from 'next/link';
 import { useTransition } from 'react';
 import { toast } from 'sonner';
 import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
 import { attribuerArtisanAction, changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
+import { Bloc } from '@/composants/briques/Bloc';
+import { Bouton } from '@/composants/briques/Bouton';
+import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
+import { Cle, CleValeur, Valeur } from '@/composants/briques/CleValeur';
 import { useConfirmation } from '@/composants/briques/Confirmation';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { Panneau } from '@/composants/briques/Panneau';
+import { Tableau } from '@/composants/briques/Tableau';
+import { CHIFFRES } from '@/composants/briques/typo';
+import { Vide } from '@/composants/briques/Vide';
 import type { LotVue, VueMarches } from '@/donnees/marches';
 import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
 import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
@@ -19,9 +26,13 @@ import { LIBELLES_MANQUES } from '@/domaine/regles';
 import { ChampEnLigne } from './ChampEnLigne';
 
 type Avenant = LotVue['avenants'][number];
-const NATURES = [['GRE_A_GRE', 'Gré à gré'], ['SOUS_TRAITANCE', 'Sous-traitance']] as const;
+const NATURES = [{ v: 'GRE_A_GRE', t: 'Gré à gré' }, { v: 'SOUS_TRAITANCE', t: 'Sous-traitance' }] as const;
+/** Le symbole ou le calcul qui suit un champ de la grille (ex-.unite, .calcule). */
+const UNITE = 'ml-1.25 font-mono text-12 text-muted';
+const CALCULE = 'ml-2.5 font-mono text-12 text-muted';
+/** Une précision sous un champ (ex-.hint-inline). */
+const Precision = ({ children }: { children: React.ReactNode }) => <div className="mt-0.75 text-11 text-faint">{children}</div>;
 const dateFr = (iso: string) => iso.split('-').reverse().join('.');
-const note = { margin: 0, fontSize: '0.75rem', color: 'var(--muted)' } as const;
 
 export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarches; onFermer: () => void }) {
 	const [enCours, demarrer] = useTransition();
@@ -58,135 +69,116 @@ export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarche
 	const pied = (
 		<>
 			{lot.manques.length === 0 ? (
-				<Link className="btn btn-primary" href={`?apercu=${lot.id}`} scroll={false} onClick={onFermer}><Icone.Doc />Ouvrir le marché</Link>
+				<Bouton variante="primaire" href={`?apercu=${lot.id}`} scroll={false} onClick={onFermer}><Icone.Doc />Ouvrir le marché</Bouton>
 			) : (
-				<button type="button" className="btn" onClick={() => toast(lot.artisanId
+				<Bouton onClick={() => toast(lot.artisanId
 					? `Pour générer le marché : ${lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.`
-					: "Attribuez d'abord une entreprise.")}>Ouvrir le marché</button>
+					: "Attribuez d'abord une entreprise.")}>Ouvrir le marché</Bouton>
 			)}
 			{lot.artisanId && (lot.certificat.possible
-				? <Link className="btn" href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer}>Certificat de paiement</Link>
-				: <button type="button" className="btn" onClick={() => toast(CERTIFICAT_IMPOSSIBLE)}>Certificat de paiement</button>)}
+				? <Bouton href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer}>Certificat de paiement</Bouton>
+				: <Bouton onClick={() => toast(CERTIFICAT_IMPOSSIBLE)}>Certificat de paiement</Bouton>)}
 			{lot.certificat.dernier && (
-				<Link className="btn" href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer}>
+				<Bouton href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer}>
 					{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
-				</Link>
+				</Bouton>
 			)}
-			{lot.artisanId && <Link className="btn" href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer}>PV de réception</Link>}
-			<button type="button" className="btn btn-ghost" disabled={enCours} onClick={supprimerLot}>Supprimer le lot</button>
+			{lot.artisanId && <Bouton href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer}>PV de réception</Bouton>}
+			<Bouton variante="fantome" desactive={enCours} onClick={supprimerLot}>Supprimer le lot</Bouton>
 		</>
 	);
 
 	return (
 		<Panneau ouvert surtitre={lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'} titre={lot.designation || 'Désignation à saisir'}
 			libelle={lot.designation || undefined} onFermer={onFermer} pied={pied}>
-			<div className="radio-row" role="radiogroup" aria-label="Nature du marché">
-				{NATURES.map(([n, t]) => (
-					<label key={n} role="radio" aria-checked={lot.nature === n} tabIndex={0} className={lot.nature === n ? 'is-on' : undefined}
-						onClick={() => lot.nature !== n && agir(() => changerNatureAction(lot.id, n))}
-						onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && lot.nature !== n) { e.preventDefault(); agir(() => changerNatureAction(lot.id, n)); } }}>
-						{t}
-					</label>
-				))}
-			</div>
-			<p style={{ margin: '-0.5rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Détermine le gabarit imprimé pour ce lot.</p>
+			<ChoixSegmente libelle="Nature du marché" options={NATURES} valeur={lot.nature} onChoisir={(n) => agir(() => changerNatureAction(lot.id, n))} />
+			<p className="-mt-2 text-12 text-muted">Détermine le gabarit imprimé pour ce lot.</p>
 
-			<div className="block">
-				<div className="block-head">
-					<span className="eyebrow">Entreprise</span>
-					{artisan && <Link className="btn btn-ghost btn-sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Link>}
-				</div>
-				<div className="block-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
-					<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" largeur="pleine" desactive={enCours}
-						options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
-					{artisan && (
-						<>
-							<dl className="kv">
-								<dt>Adresse</dt><dd>{artisan.adresse || '—'}</dd>
-								<dt>Commune</dt><dd>{artisan.cp} {artisan.commune || '—'}</dd>
-								<dt>Interlocuteur</dt><dd>{artisan.interlocuteur || <span className="dash">non renseigné</span>}</dd>
-								<dt>Téléphone</dt><dd className="num">{artisan.telephone || <span className="dash">—</span>}</dd>
-							</dl>
-							<p style={note}>Ces lignes sont lues dans le référentiel au moment de l&apos;impression. Elles ne sont pas recopiées dans le marché.</p>
-						</>
-					)}
-				</div>
-			</div>
-
-			<div className="block">
-				<div className="block-head"><span className="eyebrow">Marché</span></div>
-				<div className="block-body">
-					<dl className="kv">
-						<dt><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></dt>
-						<dd><ChampEnLigne id="pl-ht" variante="kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
-						{avecAvenants && (
-							<><dt>Avenants</dt><dd className={somme.isNegative() ? 'num moins' : 'num'} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</dd></>
-						)}
-						<dt><label htmlFor="pl-tva">T.V.A.</label></dt>
-						<dd><ChampEnLigne id="pl-tva" variante="kv-etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className="unite">%</span></dd>
-						<dt><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></dt>
-						<dd>
-							<ChampEnLigne id="pl-ttc" variante="kv" gras libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
-							{avecAvenants && <span className="hint-inline">avenants compris : le montant initial HT est recalculé</span>}
-						</dd>
-						<dt><label htmlFor="pl-rg">Retenue de garantie</label></dt>
-						<dd>
-							<ChampEnLigne id="pl-rg" variante="kv-etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
-							<span className="unite">%</span>
-							<span className="calcule">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
-						</dd>
-						<dt>Exemplaires</dt>
-						<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
-						<dt>Signé le</dt>
-						<dd>
-							<ChampEnLigne variante="date" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
-							{!lot.dateSignature && <span className="hint-inline">à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</span>}
-						</dd>
-					</dl>
-				</div>
-			</div>
+			<Bloc titre="Entreprise" corps="colonne"
+				action={artisan && <Bouton variante="fantome" taille="sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Bouton>}>
+				<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" largeur="pleine" desactive={enCours}
+					options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
+				{artisan && (
+					<>
+						<CleValeur>
+							<Cle>Adresse</Cle><Valeur>{artisan.adresse || '—'}</Valeur>
+							<Cle>Commune</Cle><Valeur>{artisan.cp} {artisan.commune || '—'}</Valeur>
+							<Cle>Interlocuteur</Cle><Valeur>{artisan.interlocuteur || <span className="text-faint">non renseigné</span>}</Valeur>
+							<Cle>Téléphone</Cle><Valeur chiffres>{artisan.telephone || <span className="text-faint">—</span>}</Valeur>
+						</CleValeur>
+						<p className="text-12 text-muted">Ces lignes sont lues dans le référentiel au moment de l&apos;impression. Elles ne sont pas recopiées dans le marché.</p>
+					</>
+				)}
+			</Bloc>
 
-			<div className="block">
-				<div className="block-head">
-					<span className="eyebrow">Avenants</span>
-					<button type="button" className="btn btn-sm" disabled={enCours} aria-label="Ajouter un avenant" onClick={() => demarrer(async () => {
-						const r = await ajouterAvenantAction(lot.id);
-						if (r.ok) toast(r.donnees.message);
-						else toast.error(r.erreur);
-					})}>Ajouter</button>
-				</div>
-				<div className="block-body" style={{ padding: 0 }}>
-					{avecAvenants ? (
-						<>
-							<table className="plain plain-mini">
-								<thead><tr><th>N°</th><th>Devis</th><th className="ta-r">Montant HT</th><th>Date</th><th /></tr></thead>
-								<tbody>
-									{lot.avenants.map((a) => {
-										const n = numeroAvenantTexte(a.numero);
-										return (
-											<tr key={a.id} data-avenant={n}>
-												<td className="num" style={{ color: 'var(--muted)' }}>{n}</td>
-												<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
-												<td className="ta-r is-editable"><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
-												<td><ChampEnLigne variante="date" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
-												<td className="ta-r cell-actions nowrap">
-													<Link className="btn btn-sm btn-ico" href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
-														title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Link>
-													<button type="button" className="btn btn-sm btn-danger btn-ico" disabled={enCours} onClick={() => supprimerAvenant(a)}
-														title="Supprimer cet avenant" aria-label={`Supprimer l'avenant n° ${n}`}><Icone.Corbeille /></button>
-												</td>
-											</tr>
-										);
-									})}
-								</tbody>
-							</table>
-							<p className="av-note">Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine&nbsp;; c&apos;est l&apos;avenant qui porte la différence.</p>
-						</>
-					) : (
-						<p className="vide-mini">Aucun avenant. Le marché vaut son montant d&apos;origine.</p>
+			<Bloc titre="Marché">
+				<CleValeur>
+					<Cle><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></Cle>
+					<Valeur><ChampEnLigne id="pl-ht" variante="kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></Valeur>
+					{avecAvenants && (
+						<><Cle>Avenants</Cle><Valeur chiffres moins={somme.isNegative()} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</Valeur></>
 					)}
-				</div>
-			</div>
+					<Cle><label htmlFor="pl-tva">T.V.A.</label></Cle>
+					<Valeur><ChampEnLigne id="pl-tva" variante="kv-etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className={UNITE}>%</span></Valeur>
+					<Cle><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></Cle>
+					<Valeur>
+						<ChampEnLigne id="pl-ttc" variante="kv" gras libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
+						{avecAvenants && <Precision>avenants compris : le montant initial HT est recalculé</Precision>}
+					</Valeur>
+					<Cle><label htmlFor="pl-rg">Retenue de garantie</label></Cle>
+					<Valeur>
+						<ChampEnLigne id="pl-rg" variante="kv-etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
+						<span className={UNITE}>%</span>
+						<span className={CALCULE}>{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
+					</Valeur>
+					<Cle>Exemplaires</Cle>
+					<Valeur>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</Valeur>
+					<Cle>Signé le</Cle>
+					<Valeur>
+						<ChampEnLigne variante="date" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
+						{!lot.dateSignature && <Precision>à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</Precision>}
+					</Valeur>
+				</CleValeur>
+			</Bloc>
+
+			<Bloc titre="Avenants" corps="nu"
+				action={<Bouton taille="sm" desactive={enCours} aria-label="Ajouter un avenant" onClick={() => demarrer(async () => {
+					const r = await ajouterAvenantAction(lot.id);
+					if (r.ok) toast(r.donnees.message);
+					else toast.error(r.erreur);
+				})}>Ajouter</Bouton>}>
+				{avecAvenants ? (
+					<>
+						<Tableau variante="mini">
+							<thead><tr><th>N°</th><th>Devis</th><th data-droite>Montant HT</th><th>Date</th><th /></tr></thead>
+							<tbody>
+								{lot.avenants.map((a) => {
+									const n = numeroAvenantTexte(a.numero);
+									return (
+										<tr key={a.id} data-avenant={n}>
+											<td className={cx(CHIFFRES, 'text-muted')}>{n}</td>
+											<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
+											<td data-droite><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
+											<td><ChampEnLigne variante="date" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
+											<td data-droite data-actions>
+												<Bouton taille="sm" seulIcone href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
+													title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Bouton>
+												<Bouton taille="sm" variante="danger" seulIcone desactive={enCours} onClick={() => supprimerAvenant(a)}
+													title="Supprimer cet avenant" aria-label={`Supprimer l'avenant n° ${n}`}><Icone.Corbeille /></Bouton>
+											</td>
+										</tr>
+									);
+								})}
+							</tbody>
+						</Tableau>
+						<p className="border-t border-rule px-3.5 pt-2.5 pb-3 text-11 leading-[1.45] text-muted">
+							Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine&nbsp;; c&apos;est l&apos;avenant qui porte la différence.
+						</p>
+					</>
+				) : (
+					<Vide variante="mini">Aucun avenant. Le marché vaut son montant d&apos;origine.</Vide>
+				)}
+			</Bloc>
 		</Panneau>
 	);
 }
```

- [ ] **Step 4 : les deux boutons de la barre de titre**

```diff
diff --git a/src/app/(app)/chantiers/[id]/marches/page.tsx b/src/app/(app)/chantiers/[id]/marches/page.tsx
index 57c113a..eb2a0cb 100644
--- a/src/app/(app)/chantiers/[id]/marches/page.tsx
+++ b/src/app/(app)/chantiers/[id]/marches/page.tsx
@@ -4,6 +4,7 @@ import { ApercuCertificat } from '@/composants/ApercuCertificat';
 import { ApercuDocument } from '@/composants/ApercuDocument';
 import { BoutonMarchesManquants } from '@/composants/BoutonMarchesManquants';
 import { BandeauChantier } from '@/composants/chantier/BandeauChantier';
+import { Bouton } from '@/composants/briques/Bouton';
 import { Ecran } from '@/composants/briques/Ecran';
 import * as Icone from '@/composants/briques/icones';
 import { BoutonAjouterLot, TableauLots } from '@/composants/TableauLots';
@@ -77,7 +78,7 @@ export default async function PageMarches({ params, searchParams }: Props) {
 			titre="Marchés & récapitulatif"
 			actions={<>
 				<BoutonAjouterLot chantierId={id} />
-				<a className="btn" href={`/api/chantiers/${id}/recap-xlsx`}><Icone.Telecharger />Exporter le récap</a>
+				<Bouton natif href={`/api/chantiers/${id}/recap-xlsx`}><Icone.Telecharger />Exporter le récap</Bouton>
 				<BoutonMarchesManquants chantierId={id} forme="barre" />
 			</>}
 			contexte={<BandeauChantier chantier={chantier} chargesAffaire={chargesAffaire} />}
diff --git a/src/composants/BoutonMarchesManquants.tsx b/src/composants/BoutonMarchesManquants.tsx
index 693a445..f3879cc 100644
--- a/src/composants/BoutonMarchesManquants.tsx
+++ b/src/composants/BoutonMarchesManquants.tsx
@@ -4,6 +4,7 @@ import { useRouter } from 'next/navigation';
 import { useTransition } from 'react';
 import { toast } from 'sonner';
 import { genererMarchesManquantsAction } from '@/actions/documents';
+import { Bouton } from '@/composants/briques/Bouton';
 
 export function BoutonMarchesManquants({ chantierId, forme = 'barre', texte }: { chantierId: string; forme?: 'barre' | 'entete'; texte?: string }) {
 	const [enCours, demarrer] = useTransition();
@@ -22,7 +23,7 @@ export function BoutonMarchesManquants({ chantierId, forme = 'barre', texte }: {
 		router.refresh();
 	});
 	return forme === 'barre' ? (
-		<button type="button" className="btn btn-primary" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : 'Générer les marchés manquants'}</button>
+		<Bouton variante="primaire" enCours={enCours} onClick={clic}>{enCours ? 'Génération…' : 'Générer les marchés manquants'}</Bouton>
 	) : (
 		<button type="button" className="dm-th-action" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : texte}</button>
 	);
```

- [ ] **Step 5 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer kv lots
npx tsx scripts/heritage.ts restes src/composants/TableauLots.tsx src/composants/PanneauLot.tsx src/composants/chantier/BandeauChantier.tsx "src/app/(app)/chantiers/[id]/marches/page.tsx"
```

Expected :
- `31 sélecteur(s) retiré(s), 271 restant(s).`
- puis `10 sélecteur(s) retiré(s), 261 restant(s).` : `kv` et `lots` survivent comme noms de variantes (`'kv'`, `'lots'`) ;
- puis `src/composants/TableauLots.tsx : num`, un faux positif (« numéro »).

La forme « entete » de `BoutonMarchesManquants` garde `dm-th-action` jusqu'à la Task 12.

- [ ] **Step 6 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « marches » et « panneau-lot » au banc, et `e2e/marches.spec.ts`, `e2e/financier.spec.ts`.

- [ ] **Step 7 : commit**

```bash
git add -A src/composants src/app src/styles
git commit -m "feat(interface): Marchés sur les briques

Bandeau du chantier, tableau des lots (Tableau lots, attributs de cellule, barre de totaux) et
panneau du lot (Bloc, CleValeur, ChoixSegmente, Tableau mini).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12 : Documents (cartes, tableau, aperçus)

Les migrations de cet écran :
- la case d'un document (ex-`.dm-case` et ses états) devient une brique métier, `CaseDocument`. Ses réserves prennent les jetons `alerte*` au lieu des couleurs en dur de la maquette ;
- le tableau par entreprise passe en `Tableau variante="dm"` ;
- les cartes du chantier passent en `Carte compacte` et `compacteVide` ;
- les liens d'action deviennent des `LienAction`.

`CadreApercu`, la surcouche qui montre un document avant de l'imprimer (ex-`.gen`), est restylé :
- il se déclare par `data-surcouche="apercu"` et `data-verrou-defilement` ;
- il ne touche plus à `body.style.overflow`, puisque le verrou de `base.css` suffit ;
- il gagne `NoteApercu`.

Les champs des aperçus passent par `Champ`, `Saisie` et `ZoneTexte`.

**Files :**
- Create : `src/composants/documents/CaseDocument.tsx`, `src/composants/documents/CaseDocument.test.tsx`
- Modify :
  - `src/composants/briques/CadreApercu.tsx` ;
  - `src/composants/documents/TableauDocuments.tsx`, `src/composants/documents/CartesDocuments.tsx` ;
  - `src/composants/apercu/ChampsMarche.tsx` ;
  - `src/composants/ApercuDocument.tsx`, `ApercuCertificat.tsx`, `ApercuReception.tsx`, `ApercuCompteRendu.tsx` ;
  - `src/composants/ActionsLevee.tsx`, `src/composants/BoutonMarchesManquants.tsx` ;
  - `src/app/(app)/chantiers/[id]/documents/page.tsx`.
- Test : `e2e/financier.spec.ts`, `e2e/planning-documents.spec.ts`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes :
  - `Tableau` (`dm`), `CadreTableau`, `Carte` (`compacte`, `compacteVide`) ;
  - `LienAction`, `Pastille`, `Etiquette` (`mini`), `Surtitre` ;
  - `Bouton` (`natif`, `desactive`), `Champ`, `Saisie`, `ZoneTexte`.
- Produces :
  - `CaseDocument({ ton, taille?, href?, titre?, cas?, etat?, children })`. Les attributs `data-case` et `data-etat` sont lus par les E2E.
    - `ton: TonCase`, parmi `'fait' | 'manque' | 'alerte' | 'hors'` ;
    - `taille?: 'normale' | 'legende'`.
  - `NoteApercu({ info?, children })`, dans `CadreApercu.tsx`. Elle est utilisée par les aperçus de cette tâche et par `ApercuPlanning` (Task 13).
  - `CadreApercu` garde son API (`disposition: 'champs' | 'solo' | 'simple'`…) et porte `data-surcouche="apercu" data-ouvert data-verrou-defilement data-bloque-clavier`.
  - Les cartes de documents portent `data-testid="carte-version"` (le numéro) et `data-testid="carte-valeur"` (le lien).

- [ ] **Step 1 : écrire le test**

`src/composants/documents/CaseDocument.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CadreApercu, NoteApercu } from '../briques/CadreApercu';
import { CaseDocument } from './CaseDocument';

describe('CaseDocument', () => {
	it('un lien quand elle mène quelque part, sinon un texte', () => {
		expect(renderToStaticMarkup(<CaseDocument ton="fait" href="?version=1" cas="marche">v1</CaseDocument>)).toMatch(/^<a [^>]*data-case="marche"/);
		expect(renderToStaticMarkup(<CaseDocument ton="manque" cas="avenant">n° 01</CaseDocument>)).toMatch(/^<span /);
	});

	it('les réserves prennent les jetons d’alerte, jamais une couleur en dur', () => {
		const html = renderToStaticMarkup(<CaseDocument ton="alerte" href="?pv=1">avec réserves</CaseDocument>);
		expect(html).toContain('bg-alerte-soft');
		expect(html).toContain('text-alerte');
		expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
	});

	it('dans la légende, la case est inerte', () => {
		expect(renderToStaticMarkup(<CaseDocument ton="fait" taille="legende">fait</CaseDocument>)).toContain('cursor-default');
	});
});

describe('CadreApercu', () => {
	it('se déclare surcouche ouverte, fige la page et bloque les raccourcis du planning', () => {
		const html = renderToStaticMarkup(
			<CadreApercu libelle="Marché" surtitre="Marché" titre="Lot 02" actions={null} disposition="simple" onFermer={() => {}}>feuille</CadreApercu>);
		expect(html).toContain('role="dialog" aria-label="Marché" data-surcouche="apercu" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""');
	});

	it('NoteApercu : en danger, ou discrète en info', () => {
		expect(renderToStaticMarkup(<NoteApercu>Manque : montant</NoteApercu>)).toContain('text-danger');
		expect(renderToStaticMarkup(<NoteApercu info>Le PDF fait foi</NoteApercu>)).toContain('text-muted');
	});
});
```

Run : `npx vitest run src/composants/documents/CaseDocument.test.tsx`
Expected : FAIL, « Failed to resolve import "./CaseDocument" ».

- [ ] **Step 2 : `CaseDocument` et `CadreApercu`**

`src/composants/documents/CaseDocument.tsx` :

```tsx
import Link from 'next/link';
import { cx } from '@/composants/briques/cx';

/** L'état d'un document dans le tableau (ex-.dm-case.est-*). */
const TON = {
	/** Produit : la case l'ouvre. */
	fait: 'border-transparent bg-accent-soft text-accent-2 hover:border-accent',
	/** À produire : en pointillés. */
	manque: 'border-dashed border-rule-strong bg-transparent text-ink-2 hover:border-accent hover:text-accent-2',
	/** Des réserves à suivre : l'orangé, en clair comme en sombre (jetons --alerte*). */
	alerte: 'border-transparent bg-alerte-soft text-alerte hover:border-alerte-trait',
	/** Saisi hors de l'application : une case sans lien. */
	hors: 'border-transparent bg-idle-soft text-muted',
} as const;

const TAILLE = {
	normale: 'px-2 py-0.75 text-12',
	/** Dans la légende du pied de tableau (ex-.dm-legende .dm-case). */
	legende: 'px-1.5 py-0 text-11',
} as const;

export type TonCase = keyof typeof TON;

/** Une case du tableau Documents : un lien quand elle mène quelque part, sinon un texte. */
export function CaseDocument({ ton, taille = 'normale', href, titre, cas, etat, children }: {
	ton: TonCase;
	taille?: keyof typeof TAILLE;
	href?: string;
	titre?: string;
	/** data-case et data-etat : les E2E lisent la colonne et l'état. */
	cas?: string;
	etat?: string;
	children: React.ReactNode;
}) {
	const inerte = taille === 'legende' || ton === 'hors';
	const classes = cx('inline-flex items-center rounded-[6px] border leading-[1.35] whitespace-nowrap no-underline', TAILLE[taille], TON[ton],
		inerte ? 'cursor-default' : 'cursor-pointer');
	return href
		? <Link className={classes} href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>
		: <span className={classes} title={titre} data-case={cas} data-etat={etat}>{children}</span>;
}
```

`CadreApercu`. Le surtitre et le titre sont empilés dans un `flex flex-col`, comme dans `Panneau`.

```diff
diff --git a/src/composants/briques/CadreApercu.tsx b/src/composants/briques/CadreApercu.tsx
index ab739c7..5c22f3f 100644
--- a/src/composants/briques/CadreApercu.tsx
+++ b/src/composants/briques/CadreApercu.tsx
@@ -2,6 +2,8 @@
 
 import { useEffect, useRef } from 'react';
 import { CSS_DOCUMENTS } from '@/documents/styles';
+import { cx } from './cx';
+import { Surtitre } from './Surtitre';
 import { AU_DESSUS_DE_L_APERCU } from './surcouches';
 
 type Props = {
@@ -11,43 +13,60 @@ type Props = {
 	titre: string;
 	/** « Les zones bleues s'écrivent directement sur le marché — le bleu ne s'imprime pas. » */
 	aide?: string;
-	/** Ce qui empêche de générer, ou une précision sur la version affichée. */
+	/** Ce qui empêche de générer, ou une précision sur la version affichée (des NoteApercu). */
 	notes?: React.ReactNode;
 	actions: React.ReactNode;
-	/** 'champs' : colonne gen-fields + feuille (le marché) ; 'solo' : gen-split solo (compte rendu, certificat, PV) ; 'simple' : la feuille seule. */
+	/** 'champs' : la colonne des champs puis la feuille (le marché) ; 'solo' : la feuille seule, dans la grille (compte rendu, certificat, PV) ; 'simple' : la feuille seule. */
 	disposition: 'champs' | 'solo' | 'simple';
 	champs?: React.ReactNode;
 	onFermer: () => void;
 	children: React.ReactNode;
 };
 
-/** L'aperçu .gen de la maquette : la page de derrière ne défile plus, Échap le ferme (sauf menu ou confirmation ouverts, qui le gardent). */
+/** Une note sous le titre d'un aperçu (ex-.gen-note) : ce qui empêche de générer, ou, « info », une précision discrète. */
+export function NoteApercu({ info = false, children }: { info?: boolean; children: React.ReactNode }) {
+	return <p role="note" className={cx('mt-1.5 text-12', info ? 'text-muted' : 'text-danger')}>{children}</p>;
+}
+
+/** La grille sous l'en-tête (ex-.gen-split) ; sous 60 rem, les champs passent au-dessus de la feuille. */
+const SPLIT = {
+	champs: 'grid min-h-0 grid-cols-[minmax(0,22rem)_minmax(0,1fr)] max-etroit:grid-cols-1 max-etroit:grid-rows-[auto_minmax(0,1fr)]',
+	solo: 'grid min-h-0 grid-cols-[minmax(0,1fr)] max-etroit:grid-rows-[auto_minmax(0,1fr)]',
+} as const;
+
+/**
+ * L'aperçu plein écran d'un document (ex-.gen) : la page de derrière ne défile plus (data-verrou-defilement),
+ * Échap le ferme sauf si un menu, une confirmation ou un panneau ouvert au-dessus le garde (AU_DESSUS_DE_L_APERCU).
+ */
 export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, disposition, champs, onFermer, children }: Props) {
 	const fermer = useRef(onFermer);
 	useEffect(() => { fermer.current = onFermer; });
 	useEffect(() => {
-		const avant = document.body.style.overflow;
-		document.body.style.overflow = 'hidden';
 		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector(AU_DESSUS_DE_L_APERCU)) fermer.current(); };
 		window.addEventListener('keydown', touche);
-		return () => { document.body.style.overflow = avant; window.removeEventListener('keydown', touche); };
+		return () => window.removeEventListener('keydown', touche);
 	}, []);
-	const feuille = <div className="gen-preview">{children}</div>;
+	const feuille = <div className="flex items-start justify-center overflow-auto overscroll-contain p-7">{children}</div>;
 	return (
-		<div className="gen is-on" role="dialog" aria-label={libelle} data-bloque-clavier="">
+		<div role="dialog" aria-label={libelle} data-surcouche="apercu" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""
+			className="fixed inset-0 z-60 grid grid-rows-[auto_minmax(0,1fr)] bg-paper">
 			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
-			<div className="gen-head">
-				<div>
-					<div className="eyebrow">{surtitre}</div>
-					<h2 style={{ fontSize: '1.0625rem' }}>{titre}</h2>
-					{aide && <p className="saisie-aide">{aide}</p>}
+			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule bg-surface px-5 py-3.5">
+				{/* En colonne : le surtitre (un span) prend sa propre hauteur de ligne. */}
+				<div className="flex flex-col">
+					<Surtitre>{surtitre}</Surtitre>
+					<h2 className="text-17">{titre}</h2>
+					{aide && <p className="mt-0.5 text-12 text-muted">{aide}</p>}
 					{notes}
 				</div>
-				<div className="topbar-actions">{actions}</div>
+				<div className="flex items-center gap-2">{actions}</div>
 			</div>
-			{disposition === 'champs' ? <div className="gen-split"><div className="gen-fields">{champs}</div>{feuille}</div>
-				: disposition === 'solo' ? <div className="gen-split solo">{feuille}</div>
-				: feuille}
+			{disposition === 'champs' ? (
+				<div className={SPLIT.champs}>
+					<div className="flex flex-col gap-4.5 overflow-y-auto overscroll-contain border-r border-rule bg-surface p-4.5 max-etroit:max-h-[40vh] max-etroit:border-r-0 max-etroit:border-b">{champs}</div>
+					{feuille}
+				</div>
+			) : disposition === 'solo' ? <div className={SPLIT.solo}>{feuille}</div> : feuille}
 		</div>
 	);
 }
```

Run : `npx vitest run src/composants/documents/CaseDocument.test.tsx`
Expected : PASS (5 tests).

- [ ] **Step 3 : les sélecteurs E2E**

```diff
diff --git a/e2e/financier.spec.ts b/e2e/financier.spec.ts
index c0e3c0b..d19798c 100644
--- a/e2e/financier.spec.ts
+++ b/e2e/financier.spec.ts
@@ -109,7 +109,7 @@ test('avenant, lettre, acomptes antérieurs, certificat et correction', async ({
 	await expect(colonne(0).getByText('modifié', { exact: true })).toHaveCount(0);
 	await expect(colonne(1).locator('[data-case="avenant"]')).toHaveText(/n° 01 · − 300/);
 	const certificats = colonne(2).locator('[data-case="certificat"]');
-	await expect(colonne(2).locator('.dm-plus')).toHaveText('1 avant');
+	await expect(colonne(2).getByText('1 avant')).toBeVisible();
 	await expect(certificats).toHaveCount(2);
 	await expect(certificats.nth(0)).toHaveText('n° 02 · hors appli');
 	await expect(certificats.nth(1)).toContainText('n° 03 · v2');
diff --git a/e2e/planning-documents.spec.ts b/e2e/planning-documents.spec.ts
index ad1275f..105b274 100644
--- a/e2e/planning-documents.spec.ts
+++ b/e2e/planning-documents.spec.ts
@@ -36,11 +36,11 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 
 	// 3. Documents : les deux séries à jour ; la version 1 s'ouvre sur une seule feuille, mesurée pareil.
 	await allerA('Documents');
-	await expect(cartePlanning.locator('.dm-carte-n')).toHaveText('v1');
+	await expect(cartePlanning.getByTestId('carte-version')).toHaveText('v1');
 	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
-	await expect(carteVisa.locator('.dm-carte-n')).toHaveText('v1');
+	await expect(carteVisa.getByTestId('carte-version')).toHaveText('v1');
 	await expect(carteVisa.getByText('périmé', { exact: true })).toHaveCount(0);
-	await cartePlanning.locator('.dm-carte-v').click();
+	await cartePlanning.getByTestId('carte-valeur').click();
 	await expect(apercu.locator('#feuille-unique')).toHaveAttribute('data-pas', String(MESURES.pas));
 	await page.keyboard.press('Escape');
 	await expect(apercu).toBeHidden();
@@ -68,7 +68,7 @@ test('planning imprimable, feuille de visa, états dans Documents', async ({ pag
 
 	// 6. Documents : le visa fait signer la v1, la v2 existe : périmé.
 	await allerA('Documents');
-	await expect(cartePlanning.locator('.dm-carte-n')).toHaveText('v2');
+	await expect(cartePlanning.getByTestId('carte-version')).toHaveText('v2');
 	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
 	await expect(carteVisa.getByText('périmé', { exact: true })).toBeVisible();
 });
```

- [ ] **Step 4 : le tableau et les cartes**

`Etiquette` s'importe tel quel ; la brique `Carte` s'importe en `CarteBrique` dans `CartesDocuments`, où `Carte` est déjà un type de domaine.

```diff
diff --git a/src/app/(app)/chantiers/[id]/documents/page.tsx b/src/app/(app)/chantiers/[id]/documents/page.tsx
index 6db6cea..d6b64fe 100644
--- a/src/app/(app)/chantiers/[id]/documents/page.tsx
+++ b/src/app/(app)/chantiers/[id]/documents/page.tsx
@@ -5,8 +5,10 @@ import { ApercuDocument } from '@/composants/ApercuDocument';
 import { ApercuReception } from '@/composants/ApercuReception';
 import { CartesDocuments } from '@/composants/documents/CartesDocuments';
 import { AutresDocuments, TableauDocuments } from '@/composants/documents/TableauDocuments';
+import { Bouton } from '@/composants/briques/Bouton';
 import { Ecran } from '@/composants/briques/Ecran';
 import * as Icone from '@/composants/briques/icones';
+import { Surtitre } from '@/composants/briques/Surtitre';
 import { construireDonneesRecap } from '@/documents/donnees';
 import { etatsDocumentsChantier, lireDocument, versionsDeLaSerie, type VueDocuments } from '@/documents/etats';
 import { TITRES_TYPES, type TypeDocument } from '@/documents/libelles';
@@ -74,12 +76,12 @@ export default async function PageDocuments({ params, searchParams }: Props) {
 	return (
 		<Ecran
 			titre="Documents du chantier"
-			sousTitre={<span className="eyebrow" data-testid="resume-documents">{texteResume(vue.resume)}</span>}
+			sousTitre={<Surtitre data-testid="resume-documents">{texteResume(vue.resume)}</Surtitre>}
 			actions={vue.resume.nombre
-				? <a className="btn" href={`/api/chantiers/${id}/archive`} download><Icone.Telecharger />Tout télécharger</a>
-				: <button type="button" className="btn" disabled title="Aucun document à télécharger"><Icone.Telecharger />Tout télécharger</button>}
+				? <Bouton natif href={`/api/chantiers/${id}/archive`} download><Icone.Telecharger />Tout télécharger</Bouton>
+				: <Bouton desactive title="Aucun document à télécharger"><Icone.Telecharger />Tout télécharger</Bouton>}
 		>
-			<div className="doc-sections">
+			<div className="flex min-w-0 flex-col gap-4">
 				<CartesDocuments vue={vue} etendue={etendue} attribues={vue.lots.filter((l) => l.entreprise).length} />
 				<TableauDocuments vue={vue} />
 				<AutresDocuments vue={vue} />
diff --git a/src/composants/ActionsLevee.tsx b/src/composants/ActionsLevee.tsx
index 28ff02c..d1780b8 100644
--- a/src/composants/ActionsLevee.tsx
+++ b/src/composants/ActionsLevee.tsx
@@ -6,6 +6,7 @@ import { toast } from 'sonner';
 import type { Resultat } from '@/actions/executer';
 import { annulerLeveeAction, leverReservesAction } from '@/actions/receptions';
 import { classesSaisie } from '@/composants/briques/Champ';
+import { LienAction } from '@/composants/briques/LienAction';
 import type { EtatReception } from '@/domaine/reception';
 
 /** Aujourd'hui à Châteaubriant, AAAA-MM-JJ (le format suédois est l'ISO). */
@@ -30,18 +31,18 @@ export function ActionsLevee({ lotId, etat }: { lotId: string; etat: EtatRecepti
 	}
 
 	if (etat === 'levee') {
-		return <button type="button" className="dm-th-action" disabled={enCours} onClick={() => envoyer(() => annulerLeveeAction(lotId))}>Annuler la levée</button>;
+		return <LienAction disabled={enCours} onClick={() => envoyer(() => annulerLeveeAction(lotId))}>Annuler la levée</LienAction>;
 	}
 	if (etat !== 'avec-reserves') return null;
-	if (!ouvert) return <button type="button" className="dm-th-action" onClick={() => setOuvert(true)}>Réserves levées…</button>;
+	if (!ouvert) return <LienAction onClick={() => setOuvert(true)}>Réserves levées…</LienAction>;
 	return (
-		<form className="dm-sous" onSubmit={(e) => {
+		<form className="mt-0.75 flex gap-2" onSubmit={(e) => {
 			e.preventDefault();
 			const date = String(new FormData(e.currentTarget).get('date') ?? '');
 			envoyer(() => leverReservesAction(lotId, date));
 		}}>
 			<input type="date" name="date" aria-label="Date de levée des réserves" defaultValue={aujourdhui()} className={classesSaisie('date')} />
-			<button type="submit" className="dm-th-action" disabled={enCours}>Enregistrer la levée</button>
+			<LienAction type="submit" disabled={enCours}>Enregistrer la levée</LienAction>
 		</form>
 	);
 }
diff --git a/src/composants/BoutonMarchesManquants.tsx b/src/composants/BoutonMarchesManquants.tsx
index f3879cc..513bfee 100644
--- a/src/composants/BoutonMarchesManquants.tsx
+++ b/src/composants/BoutonMarchesManquants.tsx
@@ -5,6 +5,7 @@ import { useTransition } from 'react';
 import { toast } from 'sonner';
 import { genererMarchesManquantsAction } from '@/actions/documents';
 import { Bouton } from '@/composants/briques/Bouton';
+import { LienAction } from '@/composants/briques/LienAction';
 
 export function BoutonMarchesManquants({ chantierId, forme = 'barre', texte }: { chantierId: string; forme?: 'barre' | 'entete'; texte?: string }) {
 	const [enCours, demarrer] = useTransition();
@@ -25,6 +26,6 @@ export function BoutonMarchesManquants({ chantierId, forme = 'barre', texte }: {
 	return forme === 'barre' ? (
 		<Bouton variante="primaire" enCours={enCours} onClick={clic}>{enCours ? 'Génération…' : 'Générer les marchés manquants'}</Bouton>
 	) : (
-		<button type="button" className="dm-th-action" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : texte}</button>
+		<LienAction className="ml-1.5" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : texte}</LienAction>
 	);
 }
diff --git a/src/composants/documents/CartesDocuments.tsx b/src/composants/documents/CartesDocuments.tsx
index eb04681..efe75d8 100644
--- a/src/composants/documents/CartesDocuments.tsx
+++ b/src/composants/documents/CartesDocuments.tsx
@@ -5,6 +5,10 @@ import { useRouter } from 'next/navigation';
 import { useTransition } from 'react';
 import { toast } from 'sonner';
 import { creerBrouillonAction } from '@/actions/comptesRendus';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Carte as CarteBrique } from '@/composants/briques/Carte';
+import { cx } from '@/composants/briques/cx';
+import { Pastille } from '@/composants/briques/Pastille';
 import type { SerieDocuments, SerieVisa, VueDocuments } from '@/documents/etats';
 import { numeroTexte } from '@/domaine/compteRendu';
 import type { Semaine } from '@/domaine/semaines';
@@ -12,19 +16,26 @@ import { dateDuJourTexte } from '@/domaine/regles';
 
 type Carte = { k: string; n: string; v: React.ReactNode; vide: boolean; ouvrir?: string; s: string; bouton: React.ReactNode; serie: string; idSuite?: string };
 
+/** Une carte de série (ex-.dm-carte) : le nom, la dernière version, ce qu'elle contient, son bouton. */
 function DmCarte(c: Carte) {
+	const valeur = cx('font-titre text-17 font-semibold', c.vide ? 'cursor-default text-muted' : 'cursor-pointer text-accent-2 hover:underline');
 	return (
-		<div className={c.vide ? 'dm-carte est-vide' : 'dm-carte'} data-serie={c.serie}>
-			<div className="dm-carte-tete"><span className="dm-carte-k">{c.k}</span><span className="dm-carte-n">{c.n}</span></div>
-			{c.vide || !c.ouvrir ? <div className={c.vide ? 'dm-carte-v est-vide' : 'dm-carte-v'}>{c.v}</div> : <Link className="dm-carte-v" href={c.ouvrir} scroll={false}>{c.v}</Link>}
-			<div className="dm-carte-s" data-testid={c.idSuite}>{c.s}</div>
+		<CarteBrique variante={c.vide ? 'compacteVide' : 'compacte'} data-serie={c.serie}>
+			<div className="flex justify-between self-stretch">
+				<span className="font-titre text-11 font-semibold tracking-capitales uppercase text-muted">{c.k}</span>
+				<span className="font-mono text-12 text-muted" data-testid="carte-version">{c.n}</span>
+			</div>
+			{c.vide || !c.ouvrir
+				? <div className={valeur} data-testid="carte-valeur">{c.v}</div>
+				: <Link className={valeur} href={c.ouvrir} scroll={false} data-testid="carte-valeur">{c.v}</Link>}
+			<div className="mb-1.5 text-12 text-muted" data-testid={c.idSuite}>{c.s}</div>
 			{c.bouton}
-		</div>
+		</CarteBrique>
 	);
 }
 
 const le = (iso: string) => dateDuJourTexte(new Date(iso));
-const pastille = (texte: string) => <span className="pill pill-modif">{texte}</span>;
+const pastille = (texte: string) => <Pastille className="ml-1">{texte}</Pastille>;
 
 export function CartesDocuments({ vue, etendue, attribues }: { vue: VueDocuments; etendue: { debut: Semaine; fin: Semaine }; attribues: number }) {
 	const router = useRouter();
@@ -45,7 +56,7 @@ export function CartesDocuments({ vue, etendue, attribues }: { vue: VueDocuments
 	}
 
 	return (
-		<div className="dm-cartes">
+		<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3">
 			<DmCarte serie="comptes-rendus" idSuite="suite-comptes-rendus" k="Comptes rendus" n={cr.liste.length ? String(cr.liste.length) : ''} vide={!dernier}
 				v={dernier ? `n° ${numeroTexte(dernier.numero)} · ${dernier.date.replace(/\//g, '.')}` : "Aucun pour l'instant"}
 				ouvrir={dernier ? `?cr=${dernier.id}` : undefined}
@@ -53,20 +64,20 @@ export function CartesDocuments({ vue, etendue, attribues }: { vue: VueDocuments
 					: cr.prochainRdv === null ? 'Le premier reprend lots et entreprises'
 					: cr.prochainRdv ? `Prochain : ${cr.prochainRdv}` : 'Prochain rendez-vous non fixé'}
 				bouton={cr.brouillon
-					? <Link className="btn btn-sm btn-primary" href="?cr=brouillon" scroll={false}>Reprendre le brouillon</Link>
-					: <button type="button" className="btn btn-sm btn-primary" disabled={enCours} onClick={nouveauCompteRendu}>Nouveau compte rendu</button>} />
+					? <Bouton taille="sm" variante="primaire" href="?cr=brouillon" scroll={false}>Reprendre le brouillon</Bouton>
+					: <Bouton taille="sm" variante="primaire" enCours={enCours} onClick={nouveauCompteRendu}>Nouveau compte rendu</Bouton>} />
 			<DmCarte serie="recap" k="Récap des marchés" n={recap ? `v${recap.version}` : ''} vide={!recap}
 				v={recap ? <>{le(recap.creeLe)}{vue.recap.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore exporté'} ouvrir="?apercu=recap"
 				s={recap ? `${nbRecap} version${nbRecap > 1 ? 's' : ''} enregistrée${nbRecap > 1 ? 's' : ''}` : `${vue.lots.length} lots à récapituler`}
-				bouton={<Link className="btn btn-sm" href="?apercu=recap" scroll={false}>Exporter à jour</Link>} />
+				bouton={<Bouton taille="sm" href="?apercu=recap" scroll={false}>Exporter à jour</Bouton>} />
 			<DmCarte serie="planning" k="Planning" n={plan ? `v${plan.version}` : ''} vide={!plan}
 				v={plan ? <>{le(plan.creeLe)}{vue.planning.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore imprimé'} ouvrir={`${planning}?apercu=planning`}
 				s={`Semaine ${etendue.debut.semaine} · ${etendue.debut.annee} à ${etendue.fin.semaine} · ${etendue.fin.annee}`}
-				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=planning`}>Planning imprimable</Link>} />
+				bouton={<Bouton taille="sm" href={`${planning}?apercu=planning`}>Planning imprimable</Bouton>} />
 			<DmCarte serie="visa" k="Feuille de visa" n={visa ? `v${visa.version}` : ''} vide={!visa}
 				v={visa ? <>{le(visa.creeLe)}{vue.visa.etat === 'perime' && pastille('périmé')}</> : 'Pas encore produite'} ouvrir={`${planning}?apercu=visa`}
 				s={`À faire signer aux ${attribues} entreprise${attribues > 1 ? 's' : ''}`}
-				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=visa`}>{visa ? 'Réimprimer' : 'Produire'}</Link>} />
+				bouton={<Bouton taille="sm" href={`${planning}?apercu=visa`}>{visa ? 'Réimprimer' : 'Produire'}</Bouton>} />
 		</div>
 	);
 }
diff --git a/src/composants/documents/TableauDocuments.tsx b/src/composants/documents/TableauDocuments.tsx
index a88f3b3..b382be1 100644
--- a/src/composants/documents/TableauDocuments.tsx
+++ b/src/composants/documents/TableauDocuments.tsx
@@ -1,11 +1,17 @@
 import Decimal from 'decimal.js';
 import Link from 'next/link';
+import { cx } from '@/composants/briques/cx';
+import { Etiquette } from '@/composants/briques/Etiquette';
+import { LienAction } from '@/composants/briques/LienAction';
+import { Pastille } from '@/composants/briques/Pastille';
+import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
 import type { CaseAvenant, LigneDocuments, VueDocuments } from '@/documents/etats';
 import type { ManqueAvenant } from '@/domaine/avenants';
 import { formatEuros } from '@/domaine/montants';
 import { dateDuJourTexte } from '@/domaine/regles';
 import { ActionsLevee } from '../ActionsLevee';
 import { BoutonMarchesManquants } from '../BoutonMarchesManquants';
+import { CaseDocument } from './CaseDocument';
 
 const deux = (n: number) => String(n).padStart(2, '0');
 /** « 02.04 » : le jour et le mois de la dernière version (courtDate de la maquette). */
@@ -16,15 +22,17 @@ const signe = (v: string) => {
 	return `${d.isNegative() ? '−' : '+'} ${formatEuros(d.abs()).replace(',00\u00a0€', '\u00a0€')}`;
 };
 const MANQUES_CASE: Record<ManqueAvenant, string> = { entreprise: "pas d'entreprise", montantAvenant: 'montant nul' };
-const modifie = <span className="pill pill-modif">modifié</span>;
+const modifie = <Pastille className="ml-1">modifié</Pastille>;
+/** Des cases côte à côte, qui passent à la ligne (ex-.dm-pile). */
+const PILE = 'flex flex-wrap items-center gap-1';
+/** Les actions secondaires sous une case : Corriger, Nouveau PV, Réserves levées (ex-.dm-sous). */
+const SOUS = 'mt-0.75 flex gap-2';
 
 function Fait({ href, titre, alerte, children, cas, etat }: { href: string; titre?: string; alerte?: boolean; children: React.ReactNode; cas: string; etat?: string }) {
-	return <Link className={alerte ? 'dm-case est-alerte' : 'dm-case est-fait'} href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>;
+	return <CaseDocument ton={alerte ? 'alerte' : 'fait'} href={href} titre={titre} cas={cas} etat={etat}>{children}</CaseDocument>;
 }
 function Manque({ href, titre, children, cas, etat }: { href?: string; titre?: string; children: React.ReactNode; cas: string; etat?: string }) {
-	return href
-		? <Link className="dm-case est-manque" href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>
-		: <span className="dm-case est-manque" title={titre} data-case={cas}>{children}</span>;
+	return <CaseDocument ton="manque" href={href} titre={titre} cas={cas} etat={href ? etat : undefined}>{children}</CaseDocument>;
 }
 
 function CaseMarche({ base, l }: { base: string; l: LigneDocuments }) {
@@ -32,7 +40,7 @@ function CaseMarche({ base, l }: { base: string; l: LigneDocuments }) {
 	const d = l.marche.versions[0];
 	if (!d) return <Manque cas="marche" href={ouvrir} titre="Ouvrir le marché de ce lot pour le produire">+ Générer</Manque>;
 	return (
-		<span className="dm-pile">
+		<span className={PILE}>
 			<Fait cas="marche" href={ouvrir} titre={l.marche.versions.length > 1 ? `${l.marche.versions.length} versions — la dernière s'ouvre` : undefined}>{`v${d.version} · ${court(d.creeLe)}`}</Fait>
 			{l.marche.etat === 'modifie' && modifie}
 		</span>
@@ -47,28 +55,31 @@ function CaseAv({ base, a }: { base: string; a: CaseAvenant }) {
 			? <Manque cas="avenant">{`n° ${deux(a.numero)} · ${a.manques.map((m) => MANQUES_CASE[m]).join(', ')}`}</Manque>
 			: <Manque cas="avenant" href={ouvrir} titre="Cet avenant n'a pas encore été enregistré dans les documents">{`${texte} à éditer`}</Manque>;
 	}
-	return <span className="dm-pile"><Fait cas="avenant" href={ouvrir}>{texte}</Fait>{a.etat === 'modifie' && modifie}</span>;
+	return <span className={PILE}><Fait cas="avenant" href={ouvrir}>{texte}</Fait>{a.etat === 'modifie' && modifie}</span>;
 }
 
+/** Le « + » d'un nouveau certificat (ex-.dm-ajout) : en ligne, la case suit la hauteur de son texte. */
+const AJOUT = 'rounded-[6px] border border-dashed border-rule-strong text-14 leading-none text-ink-2 no-underline hover:border-accent hover:text-accent-2';
+
 function CasesCertificats({ base, l }: { base: string; l: LigneDocuments }) {
 	const visibles = l.certificats.slice(-2);
 	return (
-		<div className="dm-pile">
-			{l.certificats.length > 2 && <span className="dm-plus">{l.certificats.length - 2} avant</span>}
+		<div className={PILE}>
+			{l.certificats.length > 2 && <span className="text-11 text-muted">{l.certificats.length - 2} avant</span>}
 			{visibles.map((c) => {
 				const n = `n° ${deux(c.numero)}`;
 				const d = c.versions[0];
-				if (c.manuel || !d) return <span key={c.acompteId} className="dm-case est-hors" data-case="certificat">{`${n} · hors appli`}</span>;
+				if (c.manuel || !d) return <CaseDocument key={c.acompteId} ton="hors" cas="certificat">{`${n} · hors appli`}</CaseDocument>;
 				return (
 					<span key={c.acompteId}>
 						<Fait cas="certificat" href={`?version=${d.id}`} titre={`Certificat n° ${c.numero}`}>{c.versions.length > 1 ? `${n} · v${d.version}` : n}</Fait>
-						{c.corrigeable && <span className="dm-sous"><Link className="dm-th-action" href={`${base}/marches?corriger=${c.acompteId}`}>Corriger</Link></span>}
+						{c.corrigeable && <span className={SOUS}><LienAction href={`${base}/marches?corriger=${c.acompteId}`}>Corriger</LienAction></span>}
 					</span>
 				);
 			})}
 			{l.certificatPossible
-				? <Link className="dm-ajout" href={`${base}/marches?certificat=${l.lotId}`} title="Nouveau certificat de paiement" aria-label={`Nouveau certificat de paiement pour ${l.entreprise}`}>+</Link>
-				: <span className="dm-ajout" aria-disabled="true" title="Lot sans entreprise ou sans montant">+</span>}
+				? <Link className={cx(AJOUT, 'cursor-pointer')} href={`${base}/marches?certificat=${l.lotId}`} title="Nouveau certificat de paiement" aria-label={`Nouveau certificat de paiement pour ${l.entreprise}`}>+</Link>
+				: <span className={cx(AJOUT, 'cursor-not-allowed opacity-40')} aria-disabled="true" title="Lot sans entreprise ou sans montant">+</span>}
 		</div>
 	);
 }
@@ -79,8 +90,8 @@ function CaseReception({ l }: { l: LigneDocuments }) {
 	return (
 		<span>
 			<Fait cas="reception" etat={r.etat} href={`?version=${r.derniere.id}`} alerte={r.alerte}>{r.texte}</Fait>
-			<span className="dm-sous">
-				<Link className="dm-th-action" href={`?pv=${l.lotId}`} scroll={false}>Nouveau PV</Link>
+			<span className={SOUS}>
+				<LienAction href={`?pv=${l.lotId}`} scroll={false}>Nouveau PV</LienAction>
 				<ActionsLevee lotId={l.lotId} etat={r.etat} />
 			</span>
 		</span>
@@ -92,50 +103,54 @@ export function TableauDocuments({ vue }: { vue: VueDocuments }) {
 	const attribues = vue.lots.filter((l) => l.entreprise).length;
 	const sansMarche = vue.lots.filter((l) => l.entreprise && l.marche.etat === 'a-produire').length;
 	return (
-		<div className="dm-cadre">
-			<table className="dm">
+		<CadreTableau>
+			<Tableau variante="dm">
 				<thead><tr>
-					<th scope="col" className="dm-lot">Lot et entreprise</th>
+					<th scope="col" data-premiere>Lot et entreprise</th>
 					<th scope="col">Marché{sansMarche > 0 && <> <BoutonMarchesManquants chantierId={vue.chantierId} forme="entete" texte={`Générer les ${sansMarche} manquants`} /></>}</th>
 					<th scope="col">Avenants</th>
 					<th scope="col">Certificats de paiement</th>
-					<th scope="col">Réception{attribues > 1 && <> <Link className="dm-th-action" href="?pv=tous" scroll={false}>Tous les lots</Link></>}</th>
+					<th scope="col">Réception{attribues > 1 && <> <LienAction className="ml-1.5" href="?pv=tous" scroll={false}>Tous les lots</LienAction></>}</th>
 				</tr></thead>
 				<tbody>
 					{vue.lots.map((l) => {
 						const st = l.nature === 'SOUS_TRAITANCE';
+						const inactif = !l.entreprise;
 						const lot = (
-							<th scope="row" className="dm-lot">
-								<div className="dm-lot-in">
-									<span className="dm-lot-n">{l.numero || (st ? 'ST' : '—')}</span>
-									<span className="dm-lot-d">{l.designation || 'Lot sans désignation'}{st && <> <span className="nature-tag st">Sous-traitance</span></>}</span>
-									<span className="dm-lot-e">{l.entreprise ?? <i>à attribuer</i>}</span>
+							<th scope="row" data-premiere>
+								{/* La grille vit dans un bloc intérieur : posée sur la cellule, elle la sortait du tableau. */}
+								<div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-1">
+									<span className="row-[1/3] pt-0.5 font-mono text-11 text-muted">{l.numero || (st ? 'ST' : '—')}</span>
+									<span className={cx('text-14 font-medium', inactif && 'text-muted')}>
+										{l.designation || 'Lot sans désignation'}{st && <> <Etiquette ton="accent" taille="mini" className="ml-1 align-[1px]">Sous-traitance</Etiquette></>}
+									</span>
+									<span className="text-12 text-muted">{l.entreprise ?? <i>à attribuer</i>}</span>
 								</div>
 							</th>
 						);
-						if (!l.entreprise) {
-							return <tr key={l.lotId} className="dm-inactif" data-lot={l.lotTexte}>{lot}<td colSpan={4} className="dm-note">Attribuez une entreprise depuis l&apos;écran Marchés pour produire ses documents.</td></tr>;
+						if (inactif) {
+							return <tr key={l.lotId} data-lot={l.lotTexte}>{lot}<td colSpan={4} className="text-12 italic text-muted">Attribuez une entreprise depuis l&apos;écran Marchés pour produire ses documents.</td></tr>;
 						}
 						return (
 							<tr key={l.lotId} data-lot={l.lotTexte}>
 								{lot}
 								<td><CaseMarche base={base} l={l} /></td>
-								<td><div className="dm-pile">{l.avenants.length ? l.avenants.map((a) => <CaseAv key={a.avenantId} base={base} a={a} />) : <span className="dm-rien" aria-label="aucun">—</span>}</div></td>
+								<td><div className={PILE}>{l.avenants.length ? l.avenants.map((a) => <CaseAv key={a.avenantId} base={base} a={a} />) : <span className="text-faint" aria-label="aucun">—</span>}</div></td>
 								<td><CasesCertificats base={base} l={l} /></td>
 								<td><CaseReception l={l} /></td>
 							</tr>
 						);
 					})}
-					{!vue.lots.length && <tr><td colSpan={5} className="dm-note">Ce chantier n&apos;a pas encore de lot.</td></tr>}
+					{!vue.lots.length && <tr><td colSpan={5} className="text-12 italic text-muted">Ce chantier n&apos;a pas encore de lot.</td></tr>}
 				</tbody>
-			</table>
-			<div className="dm-pied">
-				<span className="dm-legende">
-					<span className="dm-case est-fait">fait</span> s&apos;ouvre · <span className="dm-case est-manque">à produire</span> se produit · <span className="dm-case est-alerte">réserves</span> demande un suivi
+			</Tableau>
+			<div className="flex flex-wrap justify-between gap-4 border-t border-rule bg-surface px-4 py-2.5 text-12 text-muted">
+				<span>
+					<CaseDocument ton="fait" taille="legende">fait</CaseDocument> s&apos;ouvre · <CaseDocument ton="manque" taille="legende">à produire</CaseDocument> se produit · <CaseDocument ton="alerte" taille="legende">réserves</CaseDocument> demande un suivi
 				</span>
 				<span>{attribues} entreprise{attribues > 1 ? 's' : ''} sur {vue.lots.length} lot{vue.lots.length > 1 ? 's' : ''}</span>
 			</div>
-		</div>
+		</CadreTableau>
 	);
 }
 
@@ -144,20 +159,20 @@ export function AutresDocuments({ vue }: { vue: VueDocuments }) {
 	const liste = vue.comptesRendus.liste;
 	if (!liste.length) return null;
 	return (
-		<div className="dm-cadre">
-			<div className="dm-autres-t">Autres documents</div>
+		<CadreTableau>
+			<div className="border-b border-rule bg-surface px-4 py-2.5 font-titre text-11 font-semibold tracking-capitales uppercase text-muted">Autres documents</div>
 			{liste.map((c) => {
 				const d = c.versions[0];
 				return (
-					<div key={c.id} className="dm-autre">
-						<Link className="doc-link" href={`?cr=${c.id}`} scroll={false}>{`Compte rendu n° ${deux(c.numero)}`}</Link>
-						<span>
+					<div key={c.id} className="flex justify-between border-b border-rule px-4 py-2 text-13 last:border-b-0">
+						<Link className="font-medium text-accent-2 no-underline hover:underline" href={`?cr=${c.id}`} scroll={false}>{`Compte rendu n° ${deux(c.numero)}`}</Link>
+						<span className="font-mono text-12 text-muted">
 							{d ? `v${d.version} · ${c.date.replace(/\//g, '.')}` : c.date}
-							{c.dernier && <> · <Link className="dm-th-action" href={`?corriger-cr=${c.id}`} scroll={false}>{`Corriger le n° ${deux(c.numero)}`}</Link></>}
+							{c.dernier && <> · <LienAction href={`?corriger-cr=${c.id}`} scroll={false}>{`Corriger le n° ${deux(c.numero)}`}</LienAction></>}
 						</span>
 					</div>
 				);
 			})}
-		</div>
+		</CadreTableau>
 	);
 }
```

- [ ] **Step 5 : les aperçus**

```diff
diff --git a/src/composants/ApercuCertificat.tsx b/src/composants/ApercuCertificat.tsx
index b0297b7..4cccde8 100644
--- a/src/composants/ApercuCertificat.tsx
+++ b/src/composants/ApercuCertificat.tsx
@@ -9,7 +9,8 @@ import {
 	modifierAcompteManuelAction, supprimerAcompteManuelAction,
 } from '@/actions/certificats';
 import type { Resultat } from '@/actions/executer';
-import { CadreApercu } from '@/composants/briques/CadreApercu';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
 import * as Icone from '@/composants/briques/icones';
 import { telecharger } from '@/composants/telecharger';
 import { batirCertificat, entreeCalcul } from '@/documents/certificat';
@@ -109,17 +110,17 @@ export function ApercuCertificat({ ouvert, sousTitre }: { ouvert: CertificatOuve
 		<CadreApercu libelle={TITRES_TYPES.CERTIFICAT_PAIEMENT} disposition="solo" onFermer={fermer}
 			surtitre={acompteId ? `Correction du certificat n° ${donnees.contenu.numero}` : TITRES_TYPES.CERTIFICAT_PAIEMENT} titre={sousTitre}
 			aide={lecture ? undefined : "Le cumul réalisé, le mois et la date se saisissent sur la feuille — le bleu ne s'imprime pas."}
-			notes={messages.map((m) => <p key={m} role="note" className="gen-note">{m}</p>)}
+			notes={messages.map((m) => <NoteApercu key={m}>{m}</NoteApercu>)}
 			actions={<>
-				<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
+				<Bouton variante="fantome" onClick={fermer}>Fermer</Bouton>
 				{!lecture && (
-					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || messages.length > 0 || !lu.cumul}>
+					<Bouton variante="primaire" onClick={generer} enCours={enCours} desactive={messages.length > 0 || !lu.cumul}>
 						<Icone.Telecharger />{enCours ? 'Génération…' : acompteId ? `Générer la v${(ouvert.derniereVersion ?? 0) + 1}` : 'Générer le PDF'}
-					</button>
+					</Bouton>
 				)}
 			</>}>
 			<CertificatPaiement donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
-			{alerte && <p role="note" className="gen-note">{alerte}</p>}
+			{alerte && <NoteApercu>{alerte}</NoteApercu>}
 		</CadreApercu>
 	);
 }
diff --git a/src/composants/ApercuCompteRendu.tsx b/src/composants/ApercuCompteRendu.tsx
index 065d36a..65980e5 100644
--- a/src/composants/ApercuCompteRendu.tsx
+++ b/src/composants/ApercuCompteRendu.tsx
@@ -6,7 +6,8 @@ import { toast } from 'sonner';
 import {
 	abandonnerBrouillonAction, changerConvocationAction, corrigerCompteRenduAction, enregistrerCompteRenduAction, modifierChampCompteRenduAction,
 } from '@/actions/comptesRendus';
-import { CadreApercu } from '@/composants/briques/CadreApercu';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
 import { useConfirmation } from '@/composants/briques/Confirmation';
 import * as Icone from '@/composants/briques/icones';
 import { telecharger } from '@/composants/telecharger';
@@ -153,24 +154,24 @@ export function ApercuCompteRendu({ ouvert, reference }: { ouvert: CompteRenduOu
 	return (
 		<CadreApercu libelle={TITRES_TYPES.COMPTE_RENDU} surtitre={entete} titre={reference} disposition="solo" onFermer={() => void fermer()}
 			aide={mode === 'brouillon' ? "Écrivez directement dans les zones bleues — le bleu ne s'imprime pas." : undefined}
-			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
+			notes={ouvert.blocage && <NoteApercu>{ouvert.blocage}</NoteApercu>}
 			actions={<>
-				<button type="button" className="btn btn-ghost" onClick={() => void fermer()}>Fermer</button>
+				<Bouton variante="fantome" onClick={() => void fermer()}>Fermer</Bouton>
 				{mode === 'brouillon' && (
 					<>
-						<button type="button" className="btn" onClick={repartir} disabled={enCours} title="Remplacer la coordination par les seuls intitulés des lots">Repartir des lots</button>
-						<button type="button" className="btn" onClick={abandonner} disabled={enCours}>Abandonner le brouillon</button>
-						<button type="button" className="btn btn-primary" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</button>
+						<Bouton onClick={repartir} desactive={enCours} title="Remplacer la coordination par les seuls intitulés des lots">Repartir des lots</Bouton>
+						<Bouton onClick={abandonner} desactive={enCours}>Abandonner le brouillon</Bouton>
+						<Bouton variante="primaire" onClick={enregistrer} enCours={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</Bouton>
 					</>
 				)}
 				{mode === 'correction' && (
-					<button type="button" className="btn btn-primary" onClick={corriger} disabled={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</button>
+					<Bouton variante="primaire" onClick={corriger} enCours={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</Bouton>
 				)}
 				{lecture && ouvert.dernier && (
-					<button type="button" className="btn" onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</button>
+					<Bouton onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</Bouton>
 				)}
 				{lecture && ouvert.derniere && (
-					<a className="btn btn-primary" href={`/api/documents/${ouvert.derniere.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
+					<Bouton variante="primaire" natif href={`/api/documents/${ouvert.derniere.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</Bouton>
 				)}
 			</>}>
 			<CompteRendu donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
diff --git a/src/composants/ApercuDocument.tsx b/src/composants/ApercuDocument.tsx
index 8c20c6a..bdd8657 100644
--- a/src/composants/ApercuDocument.tsx
+++ b/src/composants/ApercuDocument.tsx
@@ -9,7 +9,8 @@ import type { Resultat } from '@/actions/executer';
 import { modifierChampLotAction } from '@/actions/lots';
 import { ChampsMarche } from '@/composants/apercu/ChampsMarche';
 import { MenuVersions } from '@/composants/apercu/MenuVersions';
-import { CadreApercu } from '@/composants/briques/CadreApercu';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
 import * as Icone from '@/composants/briques/icones';
 import { FeuilleUnique } from '@/composants/planning/FeuilleUnique';
 import { telecharger } from '@/composants/telecharger';
@@ -74,22 +75,22 @@ export function ApercuDocument({ titre, sousTitre, donnees, source, manques = []
 	const courante = source.type === 'version' ? source.documentId : null;
 	const actions = (
 		<>
-			<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
+			<Bouton variante="fantome" onClick={fermer}>Fermer</Bouton>
 			<MenuVersions chantierId={chantierId} versions={versions} courante={courante} retourActuel={retourActuel} />
-			{source.type === 'recap' && <a className="btn" href={`/api/chantiers/${source.chantierId}/recap-xlsx`}><Icone.Telecharger />Télécharger le tableur</a>}
+			{source.type === 'recap' && <Bouton natif href={`/api/chantiers/${source.chantierId}/recap-xlsx`}><Icone.Telecharger />Télécharger le tableur</Bouton>}
 			{source.type === 'version' ? (
-				<a className="btn btn-primary" href={`/api/documents/${source.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
+				<Bouton variante="primaire" natif href={`/api/documents/${source.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</Bouton>
 			) : (
-				<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || manques.length > 0} title={manques.length ? `Manque : ${manques.join(', ')}` : undefined}>
+				<Bouton variante="primaire" onClick={generer} enCours={enCours} desactive={manques.length > 0} title={manques.length ? `Manque : ${manques.join(', ')}` : undefined}>
 					<Icone.Telecharger />{enCours ? 'Génération…' : 'Générer le PDF'}
-				</button>
+				</Bouton>
 			)}
 		</>
 	);
 	const notes = (
 		<>
-			{source.type === 'version' && <p role="note" className="gen-note est-info">Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.</p>}
-			{manques.length > 0 && <p role="note" className="gen-note">Pour générer {source.type === 'avenant' ? 'cette lettre' : 'ce marché'} : {manques.join(', ')}.</p>}
+			{source.type === 'version' && <NoteApercu info>Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.</NoteApercu>}
+			{manques.length > 0 && <NoteApercu>Pour générer {source.type === 'avenant' ? 'cette lettre' : 'ce marché'} : {manques.join(', ')}.</NoteApercu>}
 		</>
 	);
 	const saisirPuisRafraichir = (cle: CleZone, texte: string) => { void saisir(cle, texte)?.then(() => router.refresh()); };
diff --git a/src/composants/ApercuReception.tsx b/src/composants/ApercuReception.tsx
index 7189622..343541b 100644
--- a/src/composants/ApercuReception.tsx
+++ b/src/composants/ApercuReception.tsx
@@ -4,7 +4,8 @@ import { usePathname, useRouter } from 'next/navigation';
 import { useEffect, useRef, useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { genererReceptionsAction, modifierChampReceptionAction, modifierChampReceptionCommunAction, preparerReceptionsAction } from '@/actions/receptions';
-import { CadreApercu } from '@/composants/briques/CadreApercu';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { telecharger } from '@/composants/telecharger';
@@ -127,18 +128,18 @@ export function ApercuReception({ ouvert: initial, reference }: { ouvert: Recept
 		<CadreApercu libelle={TITRES_TYPES.PV_RECEPTION} surtitre={TITRES_TYPES.PV_RECEPTION} disposition="solo" onFermer={fermer}
 			titre={tous ? `${reference} — ${ouvert.pages.length} lots, une page chacun` : reference}
 			aide={ouvert.blocage ? undefined : "Chaque champ bleu s'enregistre aussitôt — le bleu ne s'imprime pas."}
-			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
+			notes={ouvert.blocage && <NoteApercu>{ouvert.blocage}</NoteApercu>}
 			actions={<>
 				{ouvert.options.length > 0 && (
 					<MenuDeroulant id="pv-lot" k="Procès-verbal pour" valeur={ouvert.cible} recherche largeur="large"
 						options={[...ouvert.options.map((o) => ({ v: o.lotId, t: o.libelle, meta: o.entreprise })), { sep: true as const }, { v: TOUS_LES_LOTS, t: 'Tous les lots attribués — une page chacun' }]}
 						onChoisir={aller} />
 				)}
-				<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
+				<Bouton variante="fantome" onClick={fermer}>Fermer</Bouton>
 				{!ouvert.blocage && (
-					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours}>
+					<Bouton variante="primaire" onClick={generer} enCours={enCours}>
 						<Icone.Telecharger />{enCours ? 'Génération…' : tous ? `Générer les ${ouvert.pages.length} PV` : 'Générer le PDF'}
-					</button>
+					</Bouton>
 				)}
 			</>}>
 			<div className="pv-pages">
diff --git a/src/composants/apercu/ChampsMarche.tsx b/src/composants/apercu/ChampsMarche.tsx
index 050d040..d448d36 100644
--- a/src/composants/apercu/ChampsMarche.tsx
+++ b/src/composants/apercu/ChampsMarche.tsx
@@ -1,14 +1,26 @@
 'use client';
 
 import { useState } from 'react';
+import { Champ, Saisie, ZoneTexte } from '@/composants/briques/Champ';
+import { Surtitre } from '@/composants/briques/Surtitre';
+import { CHIFFRES } from '@/composants/briques/typo';
 import type { CleZone } from '@/documents/gabarits/Gabarit';
 import type { DonneesDocument } from '@/documents/schemas';
 
 type Marche = Extract<DonneesDocument, { type: 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' }>;
 const dateFr = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : 'date de la génération');
 
+/** Une donnée reprise sur le marché, et d'où elle vient (ex-.frow, .src) ; le survol la relie à la feuille. */
 const Ligne = ({ dt, dd, src, num }: { dt: string; dd: string; src: string; num?: boolean }) => (
-	<dl className="frow"><dt>{dt}</dt><dd>{num ? <span className="num">{dd || '—'}</span> : dd || '—'}<br /><span className="src">{src}</span></dd></dl>
+	<dl className="grid cursor-default grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xs border border-transparent px-1.75 py-1.25 hover:border-accent hover:bg-accent-soft">
+		<dt className="text-12 text-muted">{dt}</dt>
+		<dd className="text-13 [word-break:break-word]">{num ? <span className={CHIFFRES}>{dd || '—'}</span> : dd || '—'}<br />
+			<span className="inline-block font-mono text-10 tracking-[0.02em] text-faint">{src}</span></dd>
+	</dl>
+);
+/** Un groupe de lignes sous son surtitre souligné (ex-.fgroup). */
+const Groupe = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
+	<div className="flex flex-col gap-1.5"><Surtitre filet>{titre}</Surtitre>{children}</div>
 );
 
 export function ChampsMarche({ donnees, saisir }: { donnees: Marche; saisir: (cle: CleZone, texte: string) => void }) {
@@ -19,51 +31,42 @@ export function ChampsMarche({ donnees, saisir }: { donnees: Marche; saisir: (cl
 	const [travaux, setTravaux] = useState('travaux' in c ? c.travaux : '');
 	return (
 		<>
-			<div className="fgroup">
-				<span className="eyebrow">Maître d&apos;ouvrage</span>
+			<Groupe titre="Maître d'ouvrage">
 				<Ligne dt="Mr / Mme" dd={c.maitreOuvrage} src="chantier · maitreOuvrage" />
 				{'adresseClient' in c && <Ligne dt="Demeurant" dd={c.adresseClient} src="chantier · adresseMO" />}
-			</div>
-			<div className="fgroup">
-				<span className="eyebrow">Entrepreneur</span>
+			</Groupe>
+			<Groupe titre="Entrepreneur">
 				<Ligne dt="Entreprise" dd={c.entreprise} src="référentiel artisans" />
 				<Ligne dt="Situé" dd={c.adresseEntreprise} src="référentiel artisans" />
-			</div>
-			<div className="fgroup">
-				<span className="eyebrow">Opération</span>
+			</Groupe>
+			<Groupe titre="Opération">
 				<Ligne dt="Construction" dd={c.natureTravaux} src="chantier · natureTravaux" />
 				<Ligne dt="Située" dd={c.adresseChantier} src="chantier · adresseChantier" />
 				{'lotTexte' in c && <Ligne dt="Lots" dd={c.lotTexte} src="lot · numero + designation" />}
 				{'destinataireFactures' in c && <Ligne dt="Factures adressées" dd={c.destinataireFactures} src="chantier · mission" />}
-			</div>
-			<div className="fgroup">
-				<span className="eyebrow">Montant</span>
+			</Groupe>
+			<Groupe titre="Montant">
 				<Ligne dt="Montant TTC" dd={c.montantTtcTexte} src="lot · montantHT + TVA" num />
 				<Ligne dt="T.V.A. au taux de" dd={c.tvaTexte} src="lot · tauxTva" />
 				<Ligne dt="Fait le" dd={dateFr(c.dateSignature)} src="lot · dateSignature, sinon chantier" />
-			</div>
+			</Groupe>
 			{gag ? (
-				<div className="fgroup">
-					<span className="eyebrow">Clause particulière</span>
-					<div className="field">
-						<textarea rows={3} placeholder="Texte libre imprimé en bas du marché…" aria-label="Clause particulière" value={clause}
+				<Groupe titre="Clause particulière">
+					<Champ>
+						<ZoneTexte rows={3} placeholder="Texte libre imprimé en bas du marché…" aria-label="Clause particulière" value={clause}
 							onChange={(e) => setClause(e.target.value)} onBlur={() => saisir('clauseParticuliere', clause)} />
-					</div>
-				</div>
+					</Champ>
+				</Groupe>
 			) : (
-				<div className="fgroup">
-					<span className="eyebrow">Sous-traitance</span>
-					<div className="field">
-						<label htmlFor="g-corps">Entrepreneur de</label>
-						<input id="g-corps" placeholder="escalier" value={corps} onChange={(e) => setCorps(e.target.value)} onBlur={() => saisir('corpsEtat', corps)} />
-						<span className="hint">Le corps d&apos;état, tel qu&apos;il s&apos;imprime sous le nom de l&apos;entreprise.</span>
-					</div>
-					<div className="field">
-						<label htmlFor="g-travaux">S&apos;engage à exécuter les travaux</label>
-						<textarea id="g-travaux" rows={2} placeholder="fourniture et pose d'un escalier" value={travaux}
+				<Groupe titre="Sous-traitance">
+					<Champ libelle="Entrepreneur de" pour="g-corps" aide={<>Le corps d&apos;état, tel qu&apos;il s&apos;imprime sous le nom de l&apos;entreprise.</>}>
+						<Saisie id="g-corps" placeholder="escalier" value={corps} onChange={(e) => setCorps(e.target.value)} onBlur={() => saisir('corpsEtat', corps)} />
+					</Champ>
+					<Champ libelle="S'engage à exécuter les travaux" pour="g-travaux">
+						<ZoneTexte id="g-travaux" rows={2} placeholder="fourniture et pose d'un escalier" value={travaux}
 							onChange={(e) => setTravaux(e.target.value)} onBlur={() => saisir('travaux', travaux)} />
-					</div>
-				</div>
+					</Champ>
+				</Groupe>
 			)}
 		</>
 	);
```

- [ ] **Step 6 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer src dm
npx tsx scripts/heritage.ts restes src/composants/documents/TableauDocuments.tsx src/composants/documents/CartesDocuments.tsx src/composants/documents/CaseDocument.tsx src/composants/briques/CadreApercu.tsx src/composants/apercu/ChampsMarche.tsx src/composants/ApercuDocument.tsx src/composants/ApercuCertificat.tsx src/composants/ApercuReception.tsx src/composants/ApercuCompteRendu.tsx src/composants/ActionsLevee.tsx src/composants/BoutonMarchesManquants.tsx "src/app/(app)/chantiers/[id]/documents/page.tsx"
```

Expected :
- `81 sélecteur(s) retiré(s), 180 restant(s).`
- puis `8 sélecteur(s) retiré(s), 172 restant(s).` : `.src` survit par le `src:url(…)` des polices de `src/documents/rendu.ts`, `table.dm` par le nom de variante `'dm'` ;
- puis `src/composants/apercu/ChampsMarche.tsx : g-corps`, un faux positif (un `id` ; les règles `g-*` partent à la Task 13).

- [ ] **Step 7 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert, dont « documents » au banc, et `e2e/financier.spec.ts`, `e2e/planning-documents.spec.ts`, `e2e/suivi.spec.ts`.

- [ ] **Step 8 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): Documents et aperçus sur les briques

CaseDocument (réserves sur les jetons d'alerte), Tableau dm, cartes compactes, LienAction.
CadreApercu se déclare surcouche (data-surcouche=apercu, verrou de base.css) et gagne NoteApercu ;
les champs des aperçus passent par Champ, Saisie et ZoneTexte.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13 : Planning (le Gantt, sa barre d'outils, ses panneaux)

Le Gantt est l'exception de la spec (§ 4). Ses règles (`.gantt`, `g-*`) et celles du tableau des périodes quittent l'héritage pour `src/composants/planning/planning.css`. Cette feuille est importée par `globals.css` dans la couche `components`. Elle ne garde que des jetons, sauf deux ombres du Gantt déjà écrites en dur dans la maquette, conservées telles quelles. Une couleur en dur part : le fond du lasso, `rgba(28, 78, 128, 0.08)` en clair seulement, devient `color-mix(in srgb, var(--accent) 8%, transparent)` et suit désormais le thème. Le tableau des périodes perd `table.plain.plain-mini` pour `table.periodes`. Ses lignes gardent `ligne-per`, `ligne-dep` et `est-vise`, et la flèche `::before` de la ligne de dépendance.

Le reste de l'écran passe sur les briques :
- la barre d'outils : segments, groupes à clé, surtitre `#g-resume`, bulle de sélection ;
- la légende, en utilitaires ;
- les actions, en `Bouton` ;
- l'aperçu du planning, avec `NoteApercu` ;
- le panneau du lot : palette de couleurs, `Bloc` « Périodes » ;
- la fenêtre des fermetures : `Bloc`, `Tableau mini`.

Le banc gagne deux écrans que la maquette sait montrer : le panneau du lot ouvert depuis le Gantt (`panneau-planning`) et la fenêtre des fermetures (`fermetures`). Leurs références sont capturées sur la maquette, et l'app doit déjà les passer avant la migration.

**Files :**
- Create : `src/composants/planning/planning.css`
- Create (par commande) : `e2e/conformite/references/panneau-planning.png`, `e2e/conformite/references/fermetures.png`
- Modify :
  - `src/app/globals.css:10` ;
  - `src/composants/planning/BarreOutilsPlanning.tsx`, `GrillePlanning.tsx`, `Planning.tsx` ;
  - `src/composants/planning/ApercuPlanning.tsx`, `PanneauLotPlanning.tsx`, `FenetreFermetures.tsx` ;
  - `e2e/conformite/ecrans.ts`.
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes :
  - `Bouton`, `BarreOutils etalee`, `Surtitre`, `Bloc` (`corps="nu"`), `Tableau mini`, `Vide mini` ;
  - `NoteApercu`, `CLE`, `CHIFFRES`, `cx`, `ChampEnLigne` (`montant-etroit`, `gras`), `MenuDeroulant largeur="large"`.
- Produces :
  - les classes `g-*` et `table.periodes`, que lisent `e2e/planning*.spec.ts` ;
  - `e2e/conformite/ecrans.ts` : `allerAuPlanning(page, cible)` et `masquesPlanning(page)`, partagés par `planning`, `panneau-planning` et `fermetures`.

- [ ] **Step 1 : deux écrans de plus au banc, avant de migrer**

```diff
diff --git a/e2e/conformite/ecrans.ts b/e2e/conformite/ecrans.ts
index 1cbf11c..e98730c 100644
--- a/e2e/conformite/ecrans.ts
+++ b/e2e/conformite/ecrans.ts
@@ -65,6 +65,13 @@ const onglet = (nom: string) => async (page: Page, cible: Cible) => {
 		page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) })).click();
 };
 
+/** Le Gantt au début du chantier ; la semaine en cours bouge avec la date, elle est masquée. */
+const allerAuPlanning = async (page: Page, cible: Cible) => {
+	await onglet('Planning')(page, cible);
+	await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
+};
+const masquesPlanning = (page: Page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')];
+
 /**
  * Playwright peint le masque sur la boîte de l'élément. Le menu compte de l'app est plus haut
  * (écart 1 : Paramètres, Comptes) : un masque sur le menu diffère. Clip de taille fixe,
@@ -113,9 +120,14 @@ export const ECRANS: Ecran[] = [
 		await selon(cible, page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent'),
 			page.getByRole('row').filter({ hasText: 'CONSTRUCTIONS REBOURS' }).getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ })).click();
 	} },
-	{ nom: 'planning', masques: (page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')], aller: async (page, cible) => {
-		await onglet('Planning')(page, cible);
-		await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
+	{ nom: 'planning', masques: masquesPlanning, aller: allerAuPlanning },
+	{ nom: 'panneau-planning', masques: masquesPlanning, aller: async (page, cible) => {
+		await allerAuPlanning(page, cible);
+		await page.locator('.g-fixe[title="Modifier les périodes et la couleur"]').first().click();
+	} },
+	{ nom: 'fermetures', masques: masquesPlanning, aller: async (page, cible) => {
+		await allerAuPlanning(page, cible);
+		await page.getByRole('button', { name: 'Fermetures' }).click();
 	} },
 	{ nom: 'documents', aller: onglet('Documents') },
 	{ nom: 'artisans', aller: async (page, cible) => {
```

```bash
CONFORMITE_CIBLE=maquette npx playwright test -c playwright.conformite.config.ts --update-snapshots -g "panneau-planning|fermetures"
npx playwright test -c playwright.conformite.config.ts -g "panneau-planning|fermetures"
```

Expected : 2 PNG créés depuis la maquette. Puis PASS (2 tests) : l'app actuelle passe déjà. Ouvrir les deux PNG pour vérifier :
- `panneau-planning` : « TERRASSEMENT — V.R.D. », palette et périodes ;
- `fermetures` : « Périodes de fermeture », deux congés.

- [ ] **Step 2 : la feuille du Gantt**

`src/composants/planning/planning.css`. Ce sont les règles `.gantt`, `g-*` et `table.plain.plain-mini … ligne-*` de l'héritage, regroupées. Le tableau des périodes y devient `table.periodes`, et le lasso suit l'accent.

```css
/*
 * Le Gantt et le tableau des périodes : la seule feuille de composant de l'interface.
 * Une grille de pistes, de bandes et de barres posées en position absolue se dit mieux en CSS
 * qu'en utilitaires ; les E2E du planning lisent aussi ces classes g-*. Tout le reste de l'écran
 * (barre d'outils, légende, panneaux) est en briques et en utilitaires.
 * Importée par src/app/globals.css, dans la couche components.
 */

/* ---------- le cadre ---------- */
.gantt {
	border: 1px solid var(--rule);
	border-radius: var(--r);
	box-shadow: var(--ombre);
	background: var(--raise);
	/* Un seul défilement vertical, celui de la page : le cadre prend toute la hauteur
	   de son contenu. Seul l'axe horizontal défile ici, ce qui garde la colonne des
	   lots collée à gauche. */
	overflow-x: auto;
	scroll-behavior: smooth;
	user-select: none;
	--sem-w: 46px;
}
/* L'outil courant se lit au curseur : la cible vise une semaine, la main saisit la nappe. */
.gantt.outil-main .g-piste { cursor: grab; }
.gantt.outil-main.est-saisi,
.gantt.outil-main.est-saisi .g-piste,
.gantt.outil-main.est-saisi .g-bar { cursor: grabbing; }
/* le défilement doux interpolerait chaque pas du glissement */
.gantt.est-saisi { scroll-behavior: auto; }

/* ---------- les lignes ---------- */
/* chaque ligne fait la largeur de son contenu, sinon les bordures, le survol
   et l'étendue du défilement s'arrêtent au bord visible */
.g-row {
	display: flex;
	align-items: stretch;
	width: max-content;
	min-width: 100%;
	border-bottom: 1px solid var(--rule);
}
.g-row:last-child { border-bottom: 0; }
.g-row:not(.g-head):not(.g-ferm-row):hover { background: var(--surface); }
/* hauteur fixe : les flèches sont dessinées d'après elle (HAUTEUR_LIGNE) */
.g-row[data-lot] { height: 3.75rem; }

/* colonne figée : le lot sur une ligne, l'entreprise dessous */
.g-fixe {
	position: sticky;
	left: 0;
	z-index: 6;
	flex: none;
	width: 21rem;
	display: grid;
	grid-template-columns: 0.625rem minmax(0, 1fr);
	align-content: center;
	gap: 0.125rem 0.625rem;
	padding: 0.625rem 1rem;
	background: var(--raise);
	border-right: 2px solid var(--rule-strong);
	cursor: pointer;
}
.g-row:not(.g-head):not(.g-ferm-row):hover .g-fixe { background: var(--surface); }
.g-puce { grid-column: 1; grid-row: 1; width: 0.625rem; height: 0.625rem; border-radius: var(--r-xs); align-self: center; }
.g-nom {
	grid-column: 2; grid-row: 1;
	font-size: 0.875rem; font-weight: 500;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.g-sous {
	grid-column: 2; grid-row: 2;
	font-size: 0.75rem; color: var(--muted);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ---------- l'en-tête : mois et semaines ---------- */
.g-head { position: sticky; top: 0; z-index: 8; background: var(--surface); border-bottom: 2px solid var(--rule-strong); }
/* l'angle doit passer au-dessus de l'en-tête ET de la colonne figée */
.g-head .g-fixe { background: var(--surface); cursor: default; align-content: end; z-index: 9; }
.g-th {
	grid-column: 1 / -1;
	font-family: 'Outfit', sans-serif;
	font-size: 0.6875rem; font-weight: 600;
	letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted);
}
.g-axe { flex: none; }
.g-mois, .g-sems { display: flex; }
.g-mois span {
	flex: none;
	font-family: 'Outfit', sans-serif;
	font-size: 0.8125rem; font-weight: 600;
	letter-spacing: 0.02em;
	padding: 0.4375rem 0.5rem 0.3125rem;
	border-left: 1px solid var(--rule-strong);
	color: var(--ink);
	overflow: hidden; white-space: nowrap;
}
.g-mois span.pair { background: var(--band); }
.g-sems span {
	flex: none;
	font-family: 'Spline Sans Mono', monospace;
	font-size: 0.6875rem;
	text-align: center;
	padding: 0.1875rem 0 0.375rem;
	border-left: 1px solid var(--rule);
	color: var(--muted);
}
.g-sems span.an-neuf { border-left-color: var(--ink); color: var(--ink); font-weight: 600; }
.g-sems span.auj { background: var(--accent); color: var(--on-accent); font-weight: 600; border-left-color: var(--accent); }

/* ---------- les pistes ---------- */
.g-corps { position: relative; }
/* la nappe des liens couvre les pistes, décalée de la colonne figée */
.g-liens {
	position: absolute; top: 0; left: 21rem;
	pointer-events: none;
	z-index: 4;
	overflow: visible;
}
.g-liens path { fill: none; stroke: var(--ink-2); stroke-width: 1.5; opacity: 0.55; }
.g-liens marker path { fill: var(--ink-2); stroke: none; opacity: 1; }
.g-piste {
	position: relative;
	flex: none;
	min-height: 3.5rem;
	background-image: repeating-linear-gradient(to right, var(--rule) 0 1px, transparent 1px var(--sem-w));
	cursor: crosshair;
}
.g-bmois {
	position: absolute; top: 0; bottom: 0;
	border-left: 1px solid var(--rule-strong);   /* la limite de mois se voit sur chaque ligne */
	pointer-events: none;
}
.g-bmois.pair { background: var(--band); }

/* ---------- les fermetures ---------- */
.g-ferm-row { background: var(--surface); }
.g-ferm-row .g-fixe { background: var(--surface); cursor: default; }
.g-fixe-lbl {
	display: block;
	font-family: 'Outfit', sans-serif;
	font-size: 0.625rem; font-weight: 600;
	letter-spacing: 0.08em; text-transform: uppercase; color: var(--faint);
	padding-top: 0.4375rem;
}
.g-piste-lbl { min-height: 1.75rem; cursor: default; background-image: none; }
.g-ferm-lbl {
	position: absolute; top: 0.25rem; bottom: 0.25rem;
	display: flex; align-items: center; justify-content: center;
	font-family: 'Outfit', sans-serif;
	font-size: 0.6875rem; font-weight: 600;
	letter-spacing: 0.05em;
	color: var(--muted);
	background: var(--idle-soft);
	border-radius: var(--r-xs);
	overflow: hidden; white-space: nowrap;
}
/* congés : hachures sur toute la hauteur */
.g-ferm {
	position: absolute; top: 0; bottom: 0;
	background: repeating-linear-gradient(135deg, var(--rule-strong) 0 2px, transparent 2px 7px);
	opacity: 0.5;
	pointer-events: none;
}
/* la semaine en cours */
.g-auj { position: absolute; top: 0; bottom: 0; border-left: 2px solid var(--accent); pointer-events: none; }

/* ---------- les barres ---------- */
.g-bar {
	position: absolute; top: 0.4375rem; bottom: 0.4375rem;
	border-radius: var(--r-xs);
	display: flex; align-items: center;
	padding: 0 0.5rem;
	font-size: 0.75rem;
	font-weight: 500;
	line-height: 1.2;
	cursor: grab;
	overflow: hidden;
	box-shadow: inset 0 0 0 1px var(--bar-ring), 0 1px 2px rgba(0, 0, 0, 0.12);
}
.g-bar:hover { filter: brightness(1.08); }
.g-bar:active { cursor: grabbing; }
/* Anneau neutre plutôt qu'un anneau d'accent : le bleu de plan et le bleu foncé
   du .ods sont trop proches, la sélection disparaîtrait sur ce lot-là. */
.g-bar.is-sel { box-shadow: inset 0 0 0 2px var(--raise), 0 0 0 2px var(--ink); }
/* barre temporaire pendant qu'on trace une période : elle ne capte pas la souris */
.g-bar.est-temp { pointer-events: none; }
.g-bar-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
/* nom d'une période trop courte pour le porter : posé à sa droite, hors de la souris */
.g-etiq {
	position: absolute; top: 50%;
	transform: translateY(-50%);
	margin-left: 0.4375rem;
	max-width: 14rem;
	font-size: 0.75rem;
	color: var(--ink-2);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	pointer-events: none;
}
.g-poignee { position: absolute; right: 0; top: 0; bottom: 0; width: 10px; cursor: ew-resize; }
.g-poignee::after {
	content: ''; position: absolute; right: 3px; top: 50%;
	width: 2px; height: 0.75rem; margin-top: -0.375rem;
	background: currentColor; opacity: 0; border-radius: 1px;
}
.g-bar:hover .g-poignee::after { opacity: 0.55; }
.g-fantome {
	position: absolute; top: 0.4375rem; bottom: 0.4375rem;
	background: var(--accent-soft);
	border: 2px dashed var(--accent);
	border-radius: var(--r-xs);
	pointer-events: none;
}
.g-vide { padding: 3rem 1.25rem; text-align: center; color: var(--muted); font-style: italic; }

/* ---------- les gestes ---------- */
/* le lasso de sélection ; la teinte suit l'accent du thème */
.g-lasso { position: fixed; z-index: 85; pointer-events: none; border: 1.5px dashed var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); border-radius: 3px; }
/* la pastille qui suit le curseur pendant un glisser — on lit les semaines sans lâcher */
.g-chip {
	position: fixed; z-index: 90; pointer-events: none;
	background: var(--ink); color: var(--paper);
	font-family: 'Spline Sans Mono', monospace; font-size: 0.75rem;
	padding: 0.25rem 0.5rem; border-radius: var(--r-xs); white-space: nowrap;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* ---------- le tableau des périodes (panneau du lot) ----------
   Deux rangs par période : les champs, puis « Commence après ». La brique Tableau ne convient pas :
   ses règles descendantes, en utilitaires, l'emporteraient sur celles des rangs. */
table.periodes { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
table.periodes thead th {
	text-align: left;
	padding: 0.375rem 0.5rem;
	background: var(--surface);
	border-bottom: 1px solid var(--rule-strong);
	font-family: 'Outfit', sans-serif;
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.07em;
	text-transform: uppercase;
	color: var(--muted);
	white-space: nowrap;
}
table.periodes tbody td { padding: 0.1875rem 0.25rem; border-bottom: 1px solid var(--rule); }
table.periodes tbody tr:hover { background: var(--surface); }
/* les colonnes de chiffres se serrent sur leur contenu — l'intitulé prend le reste */
table.periodes [data-droite] { text-align: right; width: 1%; white-space: nowrap; }
table.periodes [data-actions] { white-space: nowrap; }
table.periodes tr.ligne-per td { border-bottom: 0; }
/* le lien de précédence, en second rang sous sa période — c'est ce qui fait la chaîne */
table.periodes tr.ligne-dep td {
	position: relative;
	padding: 0 0.25rem 0.4375rem 1.375rem;
	border-bottom: 1px solid var(--rule);
}
table.periodes tr.ligne-dep td::before {
	content: '\21B3';
	position: absolute; left: 0.375rem; top: -0.0625rem;
	color: var(--faint); font-size: 0.8125rem;
}
/* la période venue de la grille : le bleu de la ligne ouverte, et un filet d'accent qui court sur les deux rangs */
table.periodes tr.est-vise td { background: var(--accent-soft); }
table.periodes tr.est-vise td:first-child { box-shadow: inset 2px 0 0 var(--accent); }
table.periodes tr.ligne-dep.est-vise td::before { color: var(--accent); }
```

```diff
diff --git a/src/app/globals.css b/src/app/globals.css
index fc9af15..02bd22c 100644
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -7,3 +7,4 @@
 @import '../styles/base.css';
 /* Au-dessus du preflight, sous les utilitaires : une règle restée là ne peut pas écraser une brique. */
 @import '../styles/heritage.css' layer(components);
+@import '../composants/planning/planning.css' layer(components);
```

- [ ] **Step 3 : la barre d'outils, la grille, l'écran et l'aperçu**

`BarreOutilsPlanning` :
- `segment(choisi, icone)` dessine les boutons des groupes « Outil » et « Densité » (ex-`.zoom-b`, `.zoom-ic`) ;
- `Groupe` pose la clé d'un groupe (ex-`.zoom-lbl`).

`GrillePlanning` : `unset` devient `text-faint`, et la légende passe en utilitaires.

```diff
diff --git a/src/composants/planning/ApercuPlanning.tsx b/src/composants/planning/ApercuPlanning.tsx
index 0f9c867..03c6fba 100644
--- a/src/composants/planning/ApercuPlanning.tsx
+++ b/src/composants/planning/ApercuPlanning.tsx
@@ -1,11 +1,11 @@
 'use client';
 
-import Link from 'next/link';
 import { usePathname, useRouter } from 'next/navigation';
 import { useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { genererPlanningAction, genererVisaAction } from '@/actions/documents';
-import { CadreApercu } from '@/composants/briques/CadreApercu';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
 import { telecharger } from '@/composants/telecharger';
 import { Gabarit } from '@/documents/gabarits/Gabarit';
 import { TITRES_TYPES } from '@/documents/libelles';
@@ -48,33 +48,33 @@ export function ApercuPlanning(props: Props) {
 	}
 
 	const planningDAbord = (
-		<Link href="?apercu=planning" replace scroll={false} className={planning ? 'btn' : 'btn btn-primary'}>
+		<Bouton variante={planning ? 'normal' : 'primaire'} href="?apercu=planning" replace scroll={false}>
 			Générer le planning d&apos;abord
-		</Link>
+		</Bouton>
 	);
 
 	return (
 		<CadreApercu libelle={titre} surtitre={titre} titre={reference} disposition="simple" onFermer={() => router.replace(chemin, { scroll: false })}
 			notes={<>
-				{erreur && <p role="note" className="gen-note est-info">{erreur}</p>}
-				{planning?.modifie && <p role="note" className="gen-note est-info">Le planning a changé depuis la v{planning.version} : ce visa portera sur la v{planning.version}.</p>}
-				{tropDeLots && <p role="note" className="gen-note">{TROP_DE_LOTS}</p>}
+				{erreur && <NoteApercu info>{erreur}</NoteApercu>}
+				{planning?.modifie && <NoteApercu info>Le planning a changé depuis la v{planning.version} : ce visa portera sur la v{planning.version}.</NoteApercu>}
+				{tropDeLots && <NoteApercu>{TROP_DE_LOTS}</NoteApercu>}
 			</>}
 			actions={<>
-				<button type="button" className="btn btn-ghost" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</button>
+				<Bouton variante="fantome" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</Bouton>
 				{mode === 'visa' && !planning && planningDAbord}
 				{mode === 'visa' && planning?.modifie && (
 					<>
 						{planningDAbord}
-						<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots}>
+						<Bouton variante="primaire" onClick={generer} enCours={enCours} desactive={!donnees || tropDeLots}>
 							{enCours ? 'Génération…' : `Générer le visa sur la v${planning.version}`}
-						</button>
+						</Bouton>
 					</>
 				)}
 				{(mode === 'planning' || (planning && !planning.modifie)) && (
-					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots} title={tropDeLots ? TROP_DE_LOTS : undefined}>
+					<Bouton variante="primaire" onClick={generer} enCours={enCours} desactive={!donnees || tropDeLots} title={tropDeLots ? TROP_DE_LOTS : undefined}>
 						{enCours ? 'Génération…' : 'Générer le PDF'}
-					</button>
+					</Bouton>
 				)}
 			</>}>
 			{donnees && (
diff --git a/src/composants/planning/BarreOutilsPlanning.tsx b/src/composants/planning/BarreOutilsPlanning.tsx
index 29ec9fa..8395909 100644
--- a/src/composants/planning/BarreOutilsPlanning.tsx
+++ b/src/composants/planning/BarreOutilsPlanning.tsx
@@ -1,7 +1,12 @@
 'use client';
 
+import { BarreOutils } from '@/composants/briques/BarreOutils';
+import { Bouton } from '@/composants/briques/Bouton';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
+import { Surtitre } from '@/composants/briques/Surtitre';
+import { CLE } from '@/composants/briques/typo';
 import type { LotPlanning } from '@/domaine/planningVue';
 import { DENSITES, LIBELLES_DENSITES, texteSelection, type Densite } from './geometrie';
 import type { Outil } from './preferences';
@@ -21,31 +26,41 @@ type Props = {
 	onAujourdhui: () => void;
 };
 
+/** Un bouton d'un groupe segmenté (ex-.zoom-b) : collé à son voisin, plein quand il est choisi. */
+const segment = (choisi: boolean, icone = false) => cx(
+	'-ml-px cursor-pointer rounded-xs border py-1.25 text-12 first-of-type:ml-0',
+	icone ? 'px-2 leading-[0] [&_svg]:size-3.75 [&_svg]:stroke-[1.4] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]' : 'px-2.5',
+	choisi ? 'border-accent bg-accent font-medium text-on-accent' : 'border-rule-strong bg-raise text-muted hover:bg-idle-soft hover:text-ink');
+/** Un groupe de boutons sous son libellé (ex-.zoom) : l'outil, la densité. */
+const Groupe = ({ libelle, children }: { libelle: string; children: React.ReactNode }) => (
+	<div className="inline-flex items-center gap-2" role="group" aria-label={libelle}><span className={CLE}>{libelle}</span>{children}</div>
+);
+
 export function BarreOutilsPlanning(p: Props) {
 	const caches = p.lots.filter((l) => p.masques.includes(l.id)).length;
 	const vus = p.lots.length - caches;
 	const outil = (valeur: Outil, libelle: string, icone: React.ReactNode) => (
-		<button type="button" className={p.outil === valeur ? 'zoom-b zoom-ic is-on' : 'zoom-b zoom-ic'} aria-pressed={p.outil === valeur}
+		<button type="button" className={segment(p.outil === valeur, true)} aria-pressed={p.outil === valeur}
 			title={libelle} aria-label={libelle} onClick={() => p.onOutil(valeur)}>
 			{icone}
 		</button>
 	);
 	return (
-		<div className="toolbar g-toolbar">
-			<div className="g-tete-g">
-				<span className="eyebrow" id="g-resume">{p.resume}</span>
+		<BarreOutils etalee>
+			<div className="flex min-w-0 flex-col gap-1">
+				<Surtitre id="g-resume">{p.resume}</Surtitre>
 				<span aria-live="polite">
 					{p.nbSelection > 1 ? (
-						<span className="g-sel">
+						<span className="inline-flex flex-wrap items-center gap-2 rounded-sm bg-accent-soft py-1 pr-1.5 pl-2.5 text-13 whitespace-nowrap text-accent-2">
 							<b>{texteSelection(p.nbSelection)}</b>
-							<button type="button" className="btn btn-sm" onClick={p.onDeselectionner}>Désélectionner</button>
+							<Bouton taille="sm" onClick={p.onDeselectionner}>Désélectionner</Bouton>
 						</span>
 					) : (
-						<span className="g-sel-aide">{texteSelection(p.nbSelection)}</span>
+						<span className="text-12 whitespace-nowrap text-muted">{texteSelection(p.nbSelection)}</span>
 					)}
 				</span>
 			</div>
-			<div className="g-outils">
+			<div className="flex items-center gap-3">
 				<MenuDeroulant id="lots-vus" k="Lots affichés" multi largeur="large" className="self-stretch"
 					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
 					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
@@ -54,21 +69,19 @@ export function BarreOutilsPlanning(p: Props) {
 						...p.lots.map((l) => ({ v: l.id, t: l.designation || 'Lot sans désignation', meta: l.periodes.length ? `${l.periodes.length} pér.` : '—' })),
 					]}
 					onChoisir={(v) => (v === '*' ? p.onToutAfficher() : p.onBasculerLot(v))} />
-				<div className="zoom" role="group" aria-label="Outil">
-					<span className="zoom-lbl">Outil</span>
+				<Groupe libelle="Outil">
 					{outil('main', 'Main — faire glisser le planning', <Icone.Main />)}
 					{outil('cible', 'Cible — tracer une période', <Icone.Cible />)}
-				</div>
-				<button type="button" className="btn btn-sm" onClick={p.onAujourdhui}>Aujourd&apos;hui</button>
-				<div className="zoom" role="group" aria-label="Densité">
-					<span className="zoom-lbl">Densité</span>
+				</Groupe>
+				<Bouton taille="sm" onClick={p.onAujourdhui}>Aujourd&apos;hui</Bouton>
+				<Groupe libelle="Densité">
 					{(Object.keys(DENSITES) as Densite[]).map((d) => (
-						<button key={d} type="button" className={p.densite === d ? 'zoom-b is-on' : 'zoom-b'} aria-pressed={p.densite === d} onClick={() => p.onDensite(d)}>
+						<button key={d} type="button" className={segment(p.densite === d)} aria-pressed={p.densite === d} onClick={() => p.onDensite(d)}>
 							{LIBELLES_DENSITES[d]}
 						</button>
 					))}
-				</div>
+				</Groupe>
 			</div>
-		</div>
+		</BarreOutils>
 	);
 }
diff --git a/src/composants/planning/GrillePlanning.tsx b/src/composants/planning/GrillePlanning.tsx
index fecced5..d9e084e 100644
--- a/src/composants/planning/GrillePlanning.tsx
+++ b/src/composants/planning/GrillePlanning.tsx
@@ -1,6 +1,8 @@
 'use client';
 
 import { Fragment, type CSSProperties, type PointerEvent, type RefObject } from 'react';
+import { Bouton } from '@/composants/briques/Bouton';
+import { CHIFFRES } from '@/composants/briques/typo';
 import { couleurDe } from '@/domaine/couleurs';
 import { colonnes, moisDesColonnes } from '@/domaine/planning';
 import { rangIso, type LotPlanning, type PlanningVue } from '@/domaine/planningVue';
@@ -101,8 +103,8 @@ export function GrillePlanning({
 										<i className="g-puce" style={{ background: couleur.fond }} />
 										<span className="g-nom">{l.designation || 'Lot sans désignation'}</span>
 										<span className="g-sous">
-											{l.entreprise ?? <i className="unset">à attribuer</i>}
-											{l.telephone && <>{' · '}<span className="num">{l.telephone}</span></>}
+											{l.entreprise ?? <i className="text-faint">à attribuer</i>}
+											{l.telephone && <>{' · '}<span className={`${CHIFFRES} text-11`}>{l.telephone}</span></>}
 										</span>
 									</div>
 									<div className="g-piste" data-lot={l.id} style={{ width: largeur }}>
@@ -143,14 +145,17 @@ export function GrillePlanning({
 				) : (
 					<div className="g-vide">
 						{planning.lots.length ? (
-							<>Tous les lots sont masqués. <button type="button" className="btn btn-sm" onClick={onToutAfficher}>Tout afficher</button></>
+							<>Tous les lots sont masqués. <Bouton taille="sm" onClick={onToutAfficher}>Tout afficher</Bouton></>
 						) : "Ce chantier n'a pas encore de lot. Ajoutez-les depuis l'écran Marchés."}
 					</div>
 				)}
 			</div>
-			<div className="g-legende">
+			{/* La légende des couleurs, sous la grille. */}
+			<div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
 				{lotsAffiches.map((l) => (
-					<span key={l.id} className="leg"><i style={{ background: couleurDe(l.couleur).fond }} />{l.designation || '—'}</span>
+					<span key={l.id} className="inline-flex items-center gap-1.75 text-12 text-muted">
+						<i className="size-3 flex-none rounded-xs" style={{ background: couleurDe(l.couleur).fond }} />{l.designation || '—'}
+					</span>
 				))}
 			</div>
 		</>
diff --git a/src/composants/planning/Planning.tsx b/src/composants/planning/Planning.tsx
index c07077c..ed73ea2 100644
--- a/src/composants/planning/Planning.tsx
+++ b/src/composants/planning/Planning.tsx
@@ -1,6 +1,5 @@
 'use client';
 
-import Link from 'next/link';
 import { useRouter } from 'next/navigation';
 import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
 import { toast } from 'sonner';
@@ -9,6 +8,7 @@ import {
 	ajouterFermetureAction, changerCouleurLotAction, creerPeriodeAction, deplacerPeriodesAction, lierPeriodeAction,
 	modifierFermetureAction, modifierPeriodeAction, supprimerFermetureAction, supprimerPeriodesAction,
 } from '@/actions/planning';
+import { Bouton } from '@/composants/briques/Bouton';
 import { useConfirmation } from '@/composants/briques/Confirmation';
 import { Ecran } from '@/composants/briques/Ecran';
 import * as Icone from '@/composants/briques/icones';
@@ -211,9 +211,9 @@ export function Planning({ planningInitial, aujourdhui, contexte }: { planningIn
 		<Ecran
 			titre="Planning des travaux"
 			actions={<>
-				<button type="button" className="btn" onClick={() => setFermeturesOuvertes(true)}><Icone.Calendrier />Fermetures</button>
-				<Link className="btn" href="?apercu=visa" scroll={false}><Icone.Visa />Feuille de visa</Link>
-				<Link className="btn btn-primary" href="?apercu=planning" scroll={false}><Icone.Imprimer />Planning imprimable</Link>
+				<Bouton onClick={() => setFermeturesOuvertes(true)}><Icone.Calendrier />Fermetures</Bouton>
+				<Bouton href="?apercu=visa" scroll={false}><Icone.Visa />Feuille de visa</Bouton>
+				<Bouton variante="primaire" href="?apercu=planning" scroll={false}><Icone.Imprimer />Planning imprimable</Bouton>
 			</>}
 			contexte={contexte}
 		>
```

- [ ] **Step 4 : le panneau du lot et la fenêtre des fermetures**

```diff
diff --git a/src/composants/planning/FenetreFermetures.tsx b/src/composants/planning/FenetreFermetures.tsx
index 5212ee4..87d92c6 100644
--- a/src/composants/planning/FenetreFermetures.tsx
+++ b/src/composants/planning/FenetreFermetures.tsx
@@ -2,8 +2,12 @@
 
 import type { Resultat } from '@/actions/executer';
 import { ChampEnLigne } from '@/composants/ChampEnLigne';
+import { Bloc } from '@/composants/briques/Bloc';
+import { Bouton } from '@/composants/briques/Bouton';
 import * as Icone from '@/composants/briques/icones';
 import { Panneau } from '@/composants/briques/Panneau';
+import { Tableau } from '@/composants/briques/Tableau';
+import { Vide } from '@/composants/briques/Vide';
 import { rangIso, type FermetureVue } from '@/domaine/planningVue';
 import { semaineDuRang } from '@/domaine/semaines';
 import type { ChampFermeture } from '@/donnees/planning';
@@ -20,35 +24,32 @@ type Props = {
 export function FenetreFermetures({ ouverte, onFermer, fermetures, onAjouter, onModifier, onSupprimer }: Props) {
 	return (
 		<Panneau ouvert={ouverte} surtitre="CHANTIER" titre="Périodes de fermeture" onFermer={onFermer}
-			pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
-			<p className="pal-note" style={{ margin: 0 }}>Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</p>
-			<div className="block">
-				<div className="block-head"><span className="eyebrow">Fermetures</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
-				<div className="block-body" style={{ padding: 0 }}>
+			pied={<Bouton variante="fantome" onClick={onFermer}>Fermer</Bouton>}>
+			<p className="text-12 text-muted">Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</p>
+			<Bloc titre="Fermetures" corps="nu" action={<Bouton taille="sm" onClick={onAjouter}>Ajouter</Bouton>}>
 					{fermetures.length ? (
-						<table className="plain plain-mini">
-							<thead><tr><th>Libellé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
+						<Tableau variante="mini">
+							<thead><tr><th>Libellé</th><th data-droite>Sem.</th><th data-droite>Année</th><th data-droite>Durée</th><th /></tr></thead>
 							<tbody>
 								{fermetures.map((f) => {
 									const s = semaineDuRang(rangIso(f.debut));
 									return (
 										<tr key={f.id}>
 											<td><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
-											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
-											<td className="ta-r cell-actions">
-												<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(f.id)}
-													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></button>
+											<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
+											<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
+											<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
+											<td data-droite data-actions>
+												<Bouton taille="sm" variante="danger" seulIcone onClick={() => onSupprimer(f.id)}
+													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></Bouton>
 											</td>
 										</tr>
 									);
 								})}
 							</tbody>
-						</table>
-					) : <p className="vide-mini">Aucune fermeture.</p>}
-				</div>
-			</div>
+						</Tableau>
+					) : <Vide variante="mini">Aucune fermeture.</Vide>}
+			</Bloc>
 		</Panneau>
 	);
 }
diff --git a/src/composants/planning/PanneauLotPlanning.tsx b/src/composants/planning/PanneauLotPlanning.tsx
index 3e39cf8..70c1d6b 100644
--- a/src/composants/planning/PanneauLotPlanning.tsx
+++ b/src/composants/planning/PanneauLotPlanning.tsx
@@ -3,10 +3,14 @@
 import { useEffect } from 'react';
 import type { Resultat } from '@/actions/executer';
 import { ChampEnLigne } from '@/composants/ChampEnLigne';
+import { Bloc } from '@/composants/briques/Bloc';
+import { Bouton } from '@/composants/briques/Bouton';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
 import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
 import { Panneau } from '@/composants/briques/Panneau';
 import { PANNEAU_OUVERT } from '@/composants/briques/surcouches';
+import { Vide } from '@/composants/briques/Vide';
 import { COULEURS } from '@/domaine/couleurs';
 import { rangIso, type LotPlanning, type PeriodeVue, type PlanningVue } from '@/domaine/planningVue';
 import { semaineDuRang } from '@/domaine/semaines';
@@ -29,35 +33,29 @@ export function PanneauLotPlanning({ lot, planning, principale, onFermer, onCoul
 	useEffect(() => { document.querySelector(`${PANNEAU_OUVERT} tr[data-vise]`)?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
 	return (
 		<Panneau ouvert={lot !== null} surtitre={lot?.numero ? `LOT ${lot.numero}` : 'LOT'} titre={lot?.designation || 'Désignation à saisir'}
-			libelle={lot?.designation || undefined} onFermer={onFermer} pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
+			libelle={lot?.designation || undefined} onFermer={onFermer} pied={<Bouton variante="fantome" onClick={onFermer}>Fermer</Bouton>}>
 			{lot && (
 				<>
-					<div className="block">
-						<div className="block-head"><span className="eyebrow">Couleur du lot</span></div>
-						<div className="block-body">
-							<div className="pal">
-								{COULEURS.map((c) => (
-									<button key={c.cle} type="button" className={c.cle === lot.couleur ? 'pal-c is-on' : 'pal-c'} style={{ background: c.fond }}
-										title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)} />
-								))}
-							</div>
-							<p className="pal-note">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
-						</div>
-					</div>
-					<div className="block">
-						<div className="block-head"><span className="eyebrow">Périodes</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
-						<div className="block-body" style={{ padding: 0 }}>
-							{lot.periodes.length ? (
-								<table className="plain plain-mini">
-									<thead><tr><th>Intitulé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
-									{lot.periodes.map((x) => (
-										<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
-											onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
-									))}
-								</table>
-							) : <p className="vide-mini">Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».</p>}
+					<Bloc titre="Couleur du lot">
+						<div className="flex flex-wrap gap-1.5">
+							{COULEURS.map((c) => (
+								<button key={c.cle} type="button" style={{ background: c.fond }} title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)}
+									className={cx('size-7 cursor-pointer rounded-xs border p-0', c.cle === lot.couleur ? 'border-accent ring-2 ring-accent' : 'border-rule-strong')} />
+							))}
 						</div>
-					</div>
+						<p className="mt-2.5 text-12 text-muted">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
+					</Bloc>
+					<Bloc titre="Périodes" corps="nu" action={<Bouton taille="sm" onClick={onAjouter}>Ajouter</Bouton>}>
+						{lot.periodes.length ? (
+							<table className="periodes">
+								<thead><tr><th>Intitulé</th><th data-droite>Sem.</th><th data-droite>Année</th><th data-droite>Durée</th><th /></tr></thead>
+								{lot.periodes.map((x) => (
+									<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
+										onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
+								))}
+							</table>
+						) : <Vide variante="mini">Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».</Vide>}
+					</Bloc>
 				</>
 			)}
 		</Panneau>
@@ -80,12 +78,12 @@ function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprim
 		<tbody data-periode={x.id}>
 			<tr className={vise ? 'ligne-per est-vise' : 'ligne-per'} data-vise={vise ? '1' : undefined}>
 				<td><ChampEnLigne gras={vise} libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
-				<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
-				<td className="ta-r cell-actions">
-					<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(x.id)}
-						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></button>
+				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
+				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
+				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
+				<td data-droite data-actions>
+					<Bouton taille="sm" variante="danger" seulIcone onClick={() => onSupprimer(x.id)}
+						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></Bouton>
 				</td>
 			</tr>
 			<tr className={vise ? 'ligne-dep est-vise' : 'ligne-dep'}>
```

- [ ] **Step 5 : élaguer l'héritage**

Les classes `g-*` restent écrites (elles vivent dans `planning.css`) : leurs règles d'héritage se retirent à la main.

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer 'g-*' gantt ligne-dep
npx tsx scripts/heritage.ts restes src/composants/planning/BarreOutilsPlanning.tsx src/composants/planning/GrillePlanning.tsx src/composants/planning/Planning.tsx src/composants/planning/ApercuPlanning.tsx src/composants/planning/PanneauLotPlanning.tsx src/composants/planning/FenetreFermetures.tsx
grep -c '\.g-\|\.gantt' src/styles/heritage.css
```

Expected :
- `41 sélecteur(s) retiré(s), 131 restant(s).`
- puis `56 sélecteur(s) retiré(s), 75 restant(s).`
- puis rien, puis `0`.

- [ ] **Step 6 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert. Le banc compte 20 tests ; « planning », « panneau-planning » et « fermetures » passent, comme `e2e/planning.spec.ts`, `e2e/planning-gestes.spec.ts` et `e2e/planning-documents.spec.ts`.

- [ ] **Step 7 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): Planning ; le Gantt dans planning.css

Le Gantt et le tableau des périodes quittent l'héritage pour planning.css (couche components,
jetons seulement ; le lasso suit l'accent du thème). Barre d'outils, légende, aperçu, panneau du lot
et fermetures passent sur les briques. Le banc gagne panneau-planning et fermetures, capturés sur
la maquette.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14 : Artisans

Le référentiel des entreprises passe sur les briques. La liste devient `BarreOutils`, `Surtitre`, `CadreTableau` et `Tableau plain`. Une entreprise archivée porte `data-inactif`, son nom est barré et suivi d'une `Pastille ton="neutre"`. La fiche passe en `GrilleChamps`, `Champ` et `Saisie`. Deux détails de rendu à garder :
- la ligne cliquable reçoit `cursor-pointer`. Dans la maquette, `tr[onclick]` le donnait, mais React n'écrit pas d'attribut `onclick` : l'app ne l'avait jamais eu ;
- l'espace `{' '}` entre « Modifier » et « Supprimer » reste. La maquette l'a ; sans elle, la colonne Actions rétrécit de 4 px et le banc échoue à 2-3 %.

Cet écran n'avait aucun E2E propre. Il en gagne deux :
- une raison sociale vide est refusée et annoncée sur son champ ;
- une entreprise s'archive, puis se réactive.

Le banc gagne la fiche ouverte (`fiche-artisan`).

**Files :**
- Modify : `src/composants/ReferentielArtisans.tsx`, `e2e/conformite/ecrans.ts`
- Create : `e2e/artisans.spec.ts`
- Create (par commande) : `e2e/conformite/references/fiche-artisan.png`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes :
  - `BarreOutils`, `Surtitre`, `CadreTableau`, `Tableau plain` (`data-droite`, `data-actions`, `data-inactif`, `data-vide`) ;
  - `Pastille`, `Bouton` (`sm`, `danger`, `primaire`, `fantome`), `Bloc` ;
  - `GrilleChamps`, `Champ`, `Saisie` (`chiffres`, `erreur`), `CHIFFRES`, `cx`.
- Produces : `e2e/conformite/ecrans.ts` gagne `allerAuxArtisans(page, cible)`.

- [ ] **Step 1 : écrire les E2E**

`e2e/artisans.spec.ts` :

```ts
import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

test('la raison sociale vide est refusée, sur son champ', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/artisans');
	await page.getByRole('button', { name: 'Ajouter une entreprise' }).click();
	const fiche = page.getByRole('dialog', { name: 'Ajouter au référentiel' });
	await fiche.getByRole('button', { name: 'Ajouter', exact: true }).click();
	const nom = fiche.getByRole('textbox', { name: 'Raison sociale' });
	await expect(nom).toBeFocused();
	await expect(nom).toHaveAccessibleDescription('La raison sociale est obligatoire.');
	await expect(nom).toHaveAttribute('aria-invalid', 'true');
});

test('ajoute une entreprise, l\'archive puis la réactive', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/artisans');
	await page.getByRole('button', { name: 'Ajouter une entreprise' }).click();
	const fiche = page.getByRole('dialog', { name: 'Ajouter au référentiel' });
	await fiche.getByRole('textbox', { name: 'Raison sociale' }).fill('ÉBÉNISTERIE DU BANC');
	await fiche.getByRole('textbox', { name: 'Commune' }).fill('DERVAL');
	await fiche.getByRole('button', { name: 'Ajouter', exact: true }).click();
	await expect(page.getByText('ÉBÉNISTERIE DU BANC ajoutée au référentiel.')).toBeVisible();

	const ligne = page.getByRole('row').filter({ hasText: 'ÉBÉNISTERIE DU BANC' });
	await ligne.getByRole('button', { name: 'Supprimer' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Archiver' }).click();
	await expect(ligne.getByText('Archivée', { exact: true })).toBeVisible();
	await expect(ligne.getByRole('cell').first()).toHaveCSS('text-decoration-line', 'line-through');

	await ligne.getByRole('button', { name: 'Réactiver' }).click();
	await expect(ligne.getByText('Archivée', { exact: true })).toHaveCount(0);
	await expect(ligne.getByRole('button', { name: 'Supprimer' })).toBeVisible();
});
```

Run : `npx playwright test e2e/artisans.spec.ts`
Expected : FAIL sur « la raison sociale vide est refusée, sur son champ » : l'erreur est un `span.erreur` que rien ne relie au champ.

- [ ] **Step 2 : la fiche ouverte au banc, avant de migrer**

```diff
diff --git a/e2e/conformite/ecrans.ts b/e2e/conformite/ecrans.ts
index e98730c..9eeb2d3 100644
--- a/e2e/conformite/ecrans.ts
+++ b/e2e/conformite/ecrans.ts
@@ -65,6 +65,10 @@ const onglet = (nom: string) => async (page: Page, cible: Cible) => {
 		page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) })).click();
 };
 
+const allerAuxArtisans = async (page: Page, cible: Cible) => {
+	await selon(cible, page.locator('.nav-b', { hasText: 'Artisans' }), page.getByRole('link', { name: /^Artisans/ })).click();
+};
+
 /** Le Gantt au début du chantier ; la semaine en cours bouge avec la date, elle est masquée. */
 const allerAuPlanning = async (page: Page, cible: Cible) => {
 	await onglet('Planning')(page, cible);
@@ -130,8 +134,10 @@ export const ECRANS: Ecran[] = [
 		await page.getByRole('button', { name: 'Fermetures' }).click();
 	} },
 	{ nom: 'documents', aller: onglet('Documents') },
-	{ nom: 'artisans', aller: async (page, cible) => {
-		await selon(cible, page.locator('.nav-b', { hasText: 'Artisans' }), page.getByRole('link', { name: /^Artisans/ })).click();
+	{ nom: 'artisans', aller: allerAuxArtisans },
+	{ nom: 'fiche-artisan', aller: async (page, cible) => {
+		await allerAuxArtisans(page, cible);
+		await page.getByRole('row').filter({ hasText: 'AM COUVERTURE' }).getByRole('cell').first().click();
 	} },
 ];
 
```

```bash
CONFORMITE_CIBLE=maquette npx playwright test -c playwright.conformite.config.ts --update-snapshots -g "fiche-artisan"
npx playwright test -c playwright.conformite.config.ts -g "fiche-artisan"
```

Expected : `fiche-artisan.png` créé depuis la maquette (la fiche d'AM COUVERTURE). Puis PASS : l'app actuelle passe déjà.

- [ ] **Step 3 : migrer le référentiel**

```diff
diff --git a/src/composants/ReferentielArtisans.tsx b/src/composants/ReferentielArtisans.tsx
index ee904a4..3ef9a49 100644
--- a/src/composants/ReferentielArtisans.tsx
+++ b/src/composants/ReferentielArtisans.tsx
@@ -5,10 +5,19 @@ import { useEffect, useState, useTransition } from 'react';
 import { toast } from 'sonner';
 import { changerActiviteArtisanAction, creerArtisanAction, modifierChampArtisanAction } from '@/actions/artisans';
 import { enregistrerArtisan, idArtisanOuverte, type FicheArtisan as Fiche } from '@/composants/ficheArtisan';
+import { BarreOutils } from '@/composants/briques/BarreOutils';
+import { Bloc } from '@/composants/briques/Bloc';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, GrilleChamps, Saisie } from '@/composants/briques/Champ';
 import { useConfirmation } from '@/composants/briques/Confirmation';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
 import { Panneau } from '@/composants/briques/Panneau';
+import { Pastille } from '@/composants/briques/Pastille';
 import { Recherche } from '@/composants/briques/Recherche';
+import { Surtitre } from '@/composants/briques/Surtitre';
+import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
+import { CHIFFRES } from '@/composants/briques/typo';
 import type { ArtisanFiche, ChampArtisan } from '@/donnees/artisans';
 import { normaliser } from '@/domaine/recherche';
 
@@ -27,7 +36,7 @@ const CHAMPS: { champ: ChampArtisan; id: string; libelle: string; placeholder: s
 	{ champ: 'telephone', id: 'e-tel', libelle: 'Téléphone', placeholder: '02-28-50-46-95', num: true },
 	{ champ: 'email', id: 'e-mail', libelle: 'Courriel (optionnel)', placeholder: 'contact@entreprise.fr', span: true, type: 'email' },
 ];
-const vide = (v: string, texte = '—') => v || <span className="dash">{texte}</span>;
+const vide = (v: string, texte = '—') => v || <span className="text-faint">{texte}</span>;
 
 export function ReferentielArtisans({ artisans, ficheInitiale }: { artisans: ArtisanFiche[]; ficheInitiale: string | null }) {
 	const router = useRouter();
@@ -102,61 +111,62 @@ export function ReferentielArtisans({ artisans, ficheInitiale }: { artisans: Art
 
 	return (
 		<>
-			<div className="toolbar">
+			<BarreOutils>
 				<Recherche placeholder="Rechercher une entreprise, une commune, un interlocuteur…" libelle="Rechercher une entreprise" valeur={requete} onChange={setRequete} />
-				<span className="eyebrow">
+				<Surtitre>
 					{`${vues.length} entreprise${vues.length > 1 ? 's' : ''}${vues.length !== artisans.length ? ` sur ${artisans.length}` : ''}${archivees ? ` · ${archivees} archivée${archivees > 1 ? 's' : ''}` : ''}`}
-				</span>
-			</div>
-			<div className="table-frame">
-				<table className="plain">
-					<thead><tr><th>Entreprise</th><th>Adresse</th><th>CP</th><th>Commune</th><th>Interlocuteur</th><th>Téléphone</th><th className="ta-r">Actions</th></tr></thead>
+				</Surtitre>
+			</BarreOutils>
+			<CadreTableau>
+				<Tableau variante="plain">
+					<thead><tr><th>Entreprise</th><th>Adresse</th><th>CP</th><th>Commune</th><th>Interlocuteur</th><th>Téléphone</th><th data-droite>Actions</th></tr></thead>
 					<tbody>
 						{vues.map((a) => (
-							<tr key={a.id} className={a.actif ? undefined : 'is-archived'} onClick={() => ouvrir(a)}>
-								<td className="ent-name">{a.nom}{!a.actif && <> <span className="pill pill-fini">Archivée</span></>}</td>
+							<tr key={a.id} data-inactif={a.actif ? undefined : ''} className="cursor-pointer" onClick={() => ouvrir(a)}>
+								<td className={cx('font-medium', !a.actif && 'line-through decoration-1')}>
+									{a.nom}{!a.actif && <> <Pastille ton="neutre" className="ml-1.5 align-[1px]">Archivée</Pastille></>}
+								</td>
 								<td>{vide(a.adresse)}</td>
-								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.cp)}</td>
+								<td className={cx(CHIFFRES, 'text-12')}>{vide(a.cp)}</td>
 								<td>{vide(a.commune)}</td>
 								<td>{vide(a.interlocuteur, 'non renseigné')}</td>
-								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.telephone)}</td>
-								<td className="ta-r nowrap cell-actions">
-									<button type="button" className="btn btn-sm" title="Modifier cette entreprise" onClick={(e) => { e.stopPropagation(); ouvrir(a); }}><Icone.Crayon />Modifier</button>
+								<td className={cx(CHIFFRES, 'text-12')}>{vide(a.telephone)}</td>
+								<td data-droite data-actions>
+									<Bouton taille="sm" title="Modifier cette entreprise" onClick={(e) => { e.stopPropagation(); ouvrir(a); }}><Icone.Crayon />Modifier</Bouton>
 									{' '}
 									{a.actif
-										? <button type="button" className="btn btn-sm btn-danger" title="Archiver cette entreprise" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Corbeille />Supprimer</button>
-										: <button type="button" className="btn btn-sm" title="Remettre cette entreprise en service" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Reactiver />Réactiver</button>}
+										? <Bouton taille="sm" variante="danger" title="Archiver cette entreprise" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Corbeille />Supprimer</Bouton>
+										: <Bouton taille="sm" title="Remettre cette entreprise en service" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Reactiver />Réactiver</Bouton>}
 								</td>
 							</tr>
 						))}
-						{!vues.length && <tr className="empty-row"><td colSpan={7}>Aucune entreprise ne correspond.</td></tr>}
+						{!vues.length && <tr><td data-vide colSpan={7}>Aucune entreprise ne correspond.</td></tr>}
 					</tbody>
-				</table>
-			</div>
+				</Tableau>
+			</CadreTableau>
 			<Panneau ouvert={ouverte !== null} surtitre={actuelle ? 'ENTREPRISE' : 'NOUVELLE ENTREPRISE'} titre={actuelle ? actuelle.nom : 'Ajouter au référentiel'} onFermer={fermer}
 				pied={<>
-					<button type="button" className="btn btn-primary" disabled={enCours} onClick={enregistrer}>{actuelle ? 'Enregistrer' : 'Ajouter'}</button>
-					{actuelle && <button type="button" className="btn btn-ghost" disabled={enCours} onClick={() => void supprimer(actuelle)}>{actuelle.actif ? 'Supprimer' : 'Réactiver'}</button>}
-					<button type="button" className="btn btn-ghost" onClick={fermer}>Annuler</button>
+					<Bouton variante="primaire" desactive={enCours} onClick={enregistrer}>{actuelle ? 'Enregistrer' : 'Ajouter'}</Bouton>
+					{actuelle && <Bouton variante="fantome" desactive={enCours} onClick={() => void supprimer(actuelle)}>{actuelle.actif ? 'Supprimer' : 'Réactiver'}</Bouton>}
+					<Bouton variante="fantome" onClick={fermer}>Annuler</Bouton>
 				</>}>
-				<div className="grid-2">
-					{CHAMPS.map((c) => (
-						<div key={c.champ} className={c.span ? 'field span' : 'field'}>
-							<label htmlFor={c.id}>{c.libelle}</label>
-							<input id={c.id} type={c.type ?? 'text'} placeholder={c.placeholder} value={fiche[c.champ]}
-								className={[c.num && 'num', erreur?.champ === c.champ && 'est-erreur'].filter(Boolean).join(' ') || undefined}
-								onChange={(e) => setFiche({ ...fiche, [c.champ]: e.target.value })} />
-							{c.aide && <span className="hint">{c.aide}</span>}
-							{erreur?.champ === c.champ && <span className="erreur">{erreur.message}</span>}
-						</div>
-					))}
-				</div>
+				<GrilleChamps>
+					{CHAMPS.map((c) => {
+						const message = erreur?.champ === c.champ ? erreur.message : undefined;
+						return (
+							<Champ key={c.champ} libelle={c.libelle} pour={c.id} aide={c.aide} erreur={message} pleineLargeur={c.span}>
+								<Saisie id={c.id} type={c.type ?? 'text'} placeholder={c.placeholder} value={fiche[c.champ]} chiffres={c.num} erreur={message}
+									onChange={(e) => setFiche({ ...fiche, [c.champ]: e.target.value })} />
+							</Champ>
+						);
+					})}
+				</GrilleChamps>
 				{actuelle && actuelle.nombreLots > 0 && (
-					<div className="block">
-						<div className="block-body" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
+					<Bloc>
+						<p className="text-13 text-muted">
 							Attribuée à <b>{actuelle.nombreLots} lot{actuelle.nombreLots > 1 ? 's' : ''}</b> dans vos chantiers. Renommer l&apos;entreprise met ces lots à jour ; la supprimer n&apos;est pas possible.
-						</div>
-					</div>
+						</p>
+					</Bloc>
 				)}
 			</Panneau>
 		</>
@@ -166,8 +176,8 @@ export function ReferentielArtisans({ artisans, ficheInitiale }: { artisans: Art
 /** « Ajouter une entreprise » de la barre de titre : ouvre la fiche vide du référentiel. */
 export function BoutonAjouterEntreprise() {
 	return (
-		<button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event(OUVRIR_FICHE_VIDE))}>
+		<Bouton variante="primaire" onClick={() => window.dispatchEvent(new Event(OUVRIR_FICHE_VIDE))}>
 			<Icone.Plus />Ajouter une entreprise
-		</button>
+		</Bouton>
 	);
 }
```

Run : `npx playwright test e2e/artisans.spec.ts`
Expected : PASS (2 tests).

- [ ] **Step 4 : élaguer l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts restes src/composants/ReferentielArtisans.tsx "src/app/(app)/artisans/page.tsx"
```

Expected : `8 sélecteur(s) retiré(s), 67 restant(s).`, puis `src/composants/ReferentielArtisans.tsx : plain`. C'est un faux positif : le nom de variante `"plain"`, alors que `table.plain` sert encore aux Comptes jusqu'à la Task 15.

- [ ] **Step 5 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert. E2E : 31 tests. Banc : 21 tests, dont « artisans » et « fiche-artisan ».

- [ ] **Step 6 : commit**

```bash
git add -A src/composants e2e src/styles
git commit -m "feat(interface): Artisans sur les briques, avec ses E2E

Liste en Tableau plain (archivée : data-inactif, nom barré, Pastille neutre), fiche en GrilleChamps,
Champ et Saisie : l'erreur s'annonce sur son champ. La ligne cliquable prend cursor-pointer, que
tr[onclick] donnait dans la maquette. E2E : raison sociale vide refusée ; archivage puis
réactivation. Le banc gagne la fiche ouverte.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15 : Comptes et Paramètres

Les deux derniers écrans n'existent que dans l'app (écart 1) : la maquette ne peut pas les juger. Leur référence est donc l'app elle-même, capturée **avant** la migration ; la migration ne doit pas la changer. Avec eux, l'héritage se vide : il ne reste que des faux positifs, retirés à la main.
- **Comptes** : `Tableau plain`, `Pastille` (Bloqué en neutre, Mot de passe provisoire et Actif en accent), `Bouton sm`.
  - La fiche de création passe en `GrilleChamps`, `Champ` et `Saisie`. Le rôle y devient un `ChoixSegmente` : la valeur vient de l'état, plus d'un `input` radio.
  - Le mot de passe provisoire s'affiche dans un `Bloc`.
  - « Mot de passe provisoire » garde son `ml-1`, l'ex-`.pill-modif`, pour que le rendu reste identique.
  - Contrairement à Artisans, ici les boutons d'action n'ont pas d'espace entre eux, comme avant.
- **Paramètres** : `ColonnesFormulaire`, `GroupeChamps`, `GrilleChamps` et `Champ`.

**Files :**
- Create : `e2e/conformite/app.spec.ts`
- Create (par commande) : `e2e/conformite/references/app-parametres.png`, `app-comptes.png`, `app-nouveau-compte.png`, `app-mot-de-passe-provisoire.png`
- Modify : `src/composants/GestionComptes.tsx`, `src/app/(app)/parametres/page.tsx`
- Modify (par commande) : `src/styles/heritage.css`, `src/styles/heritage.selecteurs.txt`

**Interfaces :**
- Consumes :
  - `CadreTableau`, `Tableau plain`, `Pastille`, `Bouton`, `Bloc` ;
  - `Champ`, `Saisie`, `Erreur alerte`, `GrilleChamps`, `GroupeChamps`, `ColonnesFormulaire` ;
  - `ChoixSegmente`, `CHIFFRES`, `cx`, `ChampEnLigne`.
- Produces : `e2e/conformite/app.spec.ts`, qui saute quand la cible n'est pas `app`. La Task 16 replie ses écrans dans `ECRANS`.

- [ ] **Step 1 : capturer l'app avant de migrer**

`e2e/conformite/app.spec.ts`. Le mot de passe provisoire est tiré au hasard : il est remplacé par un texte fixe de même longueur avant la capture.

```ts
import { expect, test, type Page } from '@playwright/test';
import { preparer, seConnecterSur, type Cible } from './ecrans';

/**
 * Les écrans qui n'existent que dans l'app (écart 1 : Paramètres, Comptes). Leurs références se capturent
 * sur l'app avant de les migrer (CONFORMITE_CIBLE=app … --update-snapshots -g "app :") : la migration ne les change pas.
 */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;
const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;

async function ouvrir(page: Page, chemin: string, titre: string) {
	await preparer(page, 'app');
	await seConnecterSur(page, 'app');
	await page.goto(chemin);
	await expect(page.getByRole('heading', { name: titre })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	await page.mouse.move(0, 0);
}

test.describe('écrans propres à l’app', () => {
	test.skip(CIBLE !== 'app', 'ces écrans n’existent pas dans la maquette');

	test('app : paramètres', async ({ page }) => {
		await ouvrir(page, '/parametres', 'Paramètres de l\'entreprise');
		await expect(page).toHaveScreenshot('app-parametres.png', OPTIONS);
	});

	test('app : comptes, création, mot de passe provisoire', async ({ page }) => {
		await ouvrir(page, '/admin/comptes', 'Comptes');
		await expect(page).toHaveScreenshot('app-comptes.png', OPTIONS);

		await page.getByRole('button', { name: 'Nouveau compte' }).click();
		await page.mouse.move(0, 0);
		await expect(page).toHaveScreenshot('app-nouveau-compte.png', OPTIONS);

		await page.getByLabel('Nom').fill('Camille Banc');
		await page.getByLabel('E-mail').fill('camille.banc@socoreve.local');
		await page.getByRole('button', { name: 'Créer le compte' }).click();
		const fenetre = page.getByRole('dialog', { name: 'Mot de passe provisoire' });
		// Tiré au hasard : on le remplace par un texte fixe de même longueur.
		await fenetre.getByTestId('mot-de-passe-provisoire').evaluate((el) => { el.textContent = 'ABCDEFGHJKMNPQRS'; });
		await page.mouse.move(0, 0);
		await expect(page).toHaveScreenshot('app-mot-de-passe-provisoire.png', OPTIONS);
	});
});
```

```bash
CONFORMITE_CIBLE=app npx playwright test -c playwright.conformite.config.ts --update-snapshots -g "app :"
```

Expected : PASS (2 tests) et 4 PNG `e2e/conformite/references/app-*.png`. Les ouvrir :
- la liste des comptes ;
- la fiche « Créer un compte » (Utilisateur choisi) ;
- le panneau du mot de passe provisoire, `ABCDEFGHJKMNPQRS` centré ;
- les Paramètres sur trois colonnes.

- [ ] **Step 2 : migrer les deux écrans**

```diff
diff --git a/src/app/(app)/parametres/page.tsx b/src/app/(app)/parametres/page.tsx
index f2de5ee..f79ab1a 100644
--- a/src/app/(app)/parametres/page.tsx
+++ b/src/app/(app)/parametres/page.tsx
@@ -1,6 +1,7 @@
 import { modifierParametreAction } from '@/actions/parametres';
 import { exigerPage } from '@/auth/session';
 import { ChampEnLigne } from '@/composants/ChampEnLigne';
+import { Champ, ColonnesFormulaire, GrilleChamps, GroupeChamps } from '@/composants/briques/Champ';
 import { Ecran } from '@/composants/briques/Ecran';
 import { lireParametres, type ChampParametres } from '@/donnees/parametres';
 
@@ -25,21 +26,18 @@ export default async function PageParametres() {
 	const p = await lireParametres();
 	return (
 		<Ecran titre="Paramètres de l'entreprise">
-			<div className="form-wrap">
-				<div className="fieldset">
-					<span className="eyebrow">En-tête des documents</span>
-					<p className="hint" style={{ margin: 0 }}>Imprimé sur les marchés, le récapitulatif, les certificats de paiement, les comptes rendus et les PV de réception. Chaque champ s&apos;enregistre quand on le quitte.</p>
-					<div className="grid-2">
+			<ColonnesFormulaire>
+				<GroupeChamps titre="En-tête des documents">
+					<p>Imprimé sur les marchés, le récapitulatif, les certificats de paiement, les comptes rendus et les PV de réception. Chaque champ s&apos;enregistre quand on le quitte.</p>
+					<GrilleChamps>
 						{CHAMPS.map(({ champ, libelle, aide }) => (
-							<div key={champ} className="field">
-								<label htmlFor={`p-${champ}`}>{libelle}</label>
+							<Champ key={champ} libelle={libelle} pour={`p-${champ}`} aide={aide}>
 								<ChampEnLigne id={`p-${champ}`} variante="champ" libelle={libelle} valeur={p[champ] ?? ''} enregistrer={modifierParametreAction.bind(null, champ)} />
-								{aide && <span className="hint">{aide}</span>}
-							</div>
+							</Champ>
 						))}
-					</div>
-				</div>
-			</div>
+					</GrilleChamps>
+				</GroupeChamps>
+			</ColonnesFormulaire>
 		</Ecran>
 	);
 }
diff --git a/src/composants/GestionComptes.tsx b/src/composants/GestionComptes.tsx
index bee99bb..925711a 100644
--- a/src/composants/GestionComptes.tsx
+++ b/src/composants/GestionComptes.tsx
@@ -4,11 +4,20 @@ import { useEffect, useState, useTransition, type FormEvent } from 'react';
 import { toast } from 'sonner';
 import { bloquerCompteAction, changerRoleAction, creerCompteAction, modifierTelephoneAction, reinitialiserMotDePasseAction } from '@/actions/comptes';
 import { ChampEnLigne } from './ChampEnLigne';
+import { Bloc } from '@/composants/briques/Bloc';
+import { Bouton } from '@/composants/briques/Bouton';
+import { Champ, Erreur, GrilleChamps, Saisie } from '@/composants/briques/Champ';
+import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
+import { cx } from '@/composants/briques/cx';
 import * as Icone from '@/composants/briques/icones';
 import { Panneau } from '@/composants/briques/Panneau';
+import { Pastille } from '@/composants/briques/Pastille';
+import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
+import { CHIFFRES } from '@/composants/briques/typo';
 import type { CompteListe } from '@/donnees/comptes';
 
 const OUVRIR_COMPTE = 'sentinelle:nouveau-compte';
+const ROLES = [{ v: 'user', t: 'Utilisateur' }, { v: 'admin', t: 'Administrateur' }] as const;
 
 export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moiId: string }) {
 	const [provisoire, setProvisoire] = useState<{ email: string; motDePasse: string } | null>(null);
@@ -27,7 +36,7 @@ export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moi
 		e.preventDefault();
 		const formulaire = e.currentTarget;
 		const f = new FormData(formulaire);
-		const saisie = { nom: String(f.get('nom')), email: String(f.get('email')), role: String(f.get('role')) };
+		const saisie = { nom: String(f.get('nom')), email: String(f.get('email')), role };
 		demarrer(async () => {
 			const r = await creerCompteAction(saisie);
 			if (r.ok) {
@@ -60,11 +69,11 @@ export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moi
 
 	return (
 		<>
-			<div className="table-frame">
-				<table className="plain">
+			<CadreTableau>
+				<Tableau variante="plain">
 					<thead>
 						<tr>
-							<th>Nom</th><th>E-mail</th><th>Portable</th><th>Rôle</th><th>État</th><th className="ta-r" />
+							<th>Nom</th><th>E-mail</th><th>Portable</th><th>Rôle</th><th>État</th><th data-droite />
 						</tr>
 					</thead>
 					<tbody>
@@ -78,56 +87,51 @@ export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moi
 								</td>
 								<td>{c.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</td>
 								<td>
-									{c.bloque ? <span className="pill pill-fini">Bloqué</span>
-										: c.doitChangerMotDePasse ? <span className="pill pill-modif">Mot de passe provisoire</span>
-										: <span className="pill pill-actif">Actif</span>}
+									{c.bloque ? <Pastille ton="neutre">Bloqué</Pastille>
+										: c.doitChangerMotDePasse ? <Pastille className="ml-1">Mot de passe provisoire</Pastille>
+										: <Pastille>Actif</Pastille>}
 								</td>
-								<td className="ta-r nowrap cell-actions">
-									<button type="button" className="btn btn-sm" disabled={enCours} onClick={() => reinitialiser(c)}>Réinitialiser le mot de passe</button>
+								<td data-droite data-actions>
+									<Bouton taille="sm" desactive={enCours} onClick={() => reinitialiser(c)}>Réinitialiser le mot de passe</Bouton>
 									{c.id !== moiId && (
 										<>
-											<button type="button" className="btn btn-sm" disabled={enCours} onClick={() => agir(() => changerRoleAction(c.id, c.role === 'admin' ? 'user' : 'admin'), 'Rôle modifié.')}>
+											<Bouton taille="sm" desactive={enCours} onClick={() => agir(() => changerRoleAction(c.id, c.role === 'admin' ? 'user' : 'admin'), 'Rôle modifié.')}>
 												{c.role === 'admin' ? 'Passer utilisateur' : 'Passer administrateur'}
-											</button>
-											<button type="button" className={c.bloque ? 'btn btn-sm' : 'btn btn-sm btn-danger'} disabled={enCours} onClick={() => agir(() => bloquerCompteAction(c.id, !c.bloque), c.bloque ? 'Compte débloqué.' : 'Compte bloqué.')}>
+											</Bouton>
+											<Bouton taille="sm" variante={c.bloque ? 'normal' : 'danger'} desactive={enCours} onClick={() => agir(() => bloquerCompteAction(c.id, !c.bloque), c.bloque ? 'Compte débloqué.' : 'Compte bloqué.')}>
 												{c.bloque ? 'Débloquer' : 'Bloquer'}
-											</button>
+											</Bouton>
 										</>
 									)}
 								</td>
 							</tr>
 						))}
 					</tbody>
-				</table>
-			</div>
+				</Tableau>
+			</CadreTableau>
 
 			<Panneau ouvert={creation} surtitre="NOUVEAU COMPTE" titre="Créer un compte" onFermer={() => setCreation(false)}
 				pied={<>
-					<button type="submit" form="f-compte" className="btn btn-primary" disabled={enCours}>Créer le compte</button>
-					<button type="button" className="btn btn-ghost" onClick={() => setCreation(false)}>Annuler</button>
+					<Bouton type="submit" form="f-compte" variante="primaire" desactive={enCours}>Créer le compte</Bouton>
+					<Bouton variante="fantome" onClick={() => setCreation(false)}>Annuler</Bouton>
 				</>}>
-				<form id="f-compte" onSubmit={creer} className="grid-2">
-					<div className="field span"><label htmlFor="nom">Nom</label><input id="nom" name="nom" required className={erreurs.nom ? 'est-erreur' : undefined} />{erreurs.nom && <span className="erreur">{erreurs.nom}</span>}</div>
-					<div className="field span"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className={erreurs.email ? 'est-erreur' : undefined} />{erreurs.email && <span className="erreur">{erreurs.email}</span>}</div>
-					<div className="field span">
-						<label>Rôle</label>
-						<div className="radio-row" role="radiogroup" aria-label="Rôle">
-							{(['user', 'admin'] as const).map((r) => (
-								<label key={r} className={role === r ? 'is-on' : undefined}><input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} /> {r === 'admin' ? 'Administrateur' : 'Utilisateur'}</label>
-							))}
-						</div>
-					</div>
-					{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
+				<form id="f-compte" onSubmit={creer}>
+					<GrilleChamps>
+						<Champ libelle="Nom" pour="nom" erreur={erreurs.nom} pleineLargeur><Saisie id="nom" name="nom" required erreur={erreurs.nom} /></Champ>
+						<Champ libelle="E-mail" pour="email" erreur={erreurs.email} pleineLargeur><Saisie id="email" name="email" type="email" required erreur={erreurs.email} /></Champ>
+						<Champ libelle="Rôle" pleineLargeur><ChoixSegmente libelle="Rôle" options={ROLES} valeur={role} onChoisir={setRole} /></Champ>
+						{erreurs.general && <Erreur alerte>{erreurs.general}</Erreur>}
+					</GrilleChamps>
 				</form>
 			</Panneau>
 
 			<Panneau ouvert={provisoire !== null} surtitre="MOT DE PASSE PROVISOIRE" titre={provisoire?.email ?? ''} libelle="Mot de passe provisoire" onFermer={() => {}} sansFermeture
 				pied={<>
-					<button type="button" className="btn btn-primary" onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast('Copié.'); }}>Copier</button>
-					<button type="button" className="btn btn-ghost" onClick={() => setProvisoire(null)}>Fermer</button>
+					<Bouton variante="primaire" onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast('Copié.'); }}>Copier</Bouton>
+					<Bouton variante="fantome" onClick={() => setProvisoire(null)}>Fermer</Bouton>
 				</>}>
-				<p className="hint" style={{ margin: 0 }}>Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.</p>
-				<div className="block"><div className="block-body num" data-testid="mot-de-passe-provisoire" style={{ fontSize: '1.125rem', letterSpacing: '0.08em', textAlign: 'center' }}>{provisoire?.motDePasse}</div></div>
+				<p>Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.</p>
+				<Bloc><p data-testid="mot-de-passe-provisoire" className={cx(CHIFFRES, 'text-center text-18 tracking-[0.08em]')}>{provisoire?.motDePasse}</p></Bloc>
 			</Panneau>
 		</>
 	);
@@ -136,8 +140,8 @@ export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moi
 /** « Nouveau compte » de la barre de titre : ouvre la fiche de création. */
 export function BoutonNouveauCompte() {
 	return (
-		<button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event(OUVRIR_COMPTE))}>
+		<Bouton variante="primaire" onClick={() => window.dispatchEvent(new Event(OUVRIR_COMPTE))}>
 			<Icone.Plus />Nouveau compte
-		</button>
+		</Bouton>
 	);
 }
```

Run : `npx playwright test -c playwright.conformite.config.ts -g "app :"` puis `npx playwright test e2e/comptes.spec.ts`
Expected : PASS (2 tests), puis PASS : le rôle se choisit toujours par `getByRole('radiogroup', { name: 'Rôle' })`.

- [ ] **Step 3 : vider l'héritage**

```bash
npx tsx scripts/heritage.ts elaguer
npx tsx scripts/heritage.ts retirer num block plain erreur
npx tsx scripts/heritage.ts elaguer
```

Expected :
- `59 sélecteur(s) retiré(s), 8 restant(s).` ;
- puis `8 sélecteur(s) retiré(s), 0 restant(s).` ;
- puis `0 sélecteur(s) retiré(s), 0 restant(s).`

Les huit derniers ne survivaient que par des mots :
- `num` : « numéro » ;
- `block` : `dark:block` dans `Sigle` ;
- `plain` : le nom de variante ;
- `erreur` : des messages.

`heritage.css` ne contient plus que des commentaires.

- [ ] **Step 4 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test
npm run test:e2e
npm run test:conformite
```

Expected : tout vert. E2E : 31 tests. Banc : 23 tests (13 écrans, 8 de vitrine, 2 de l'app).

- [ ] **Step 5 : commit**

```bash
git add -A src/composants src/app e2e src/styles
git commit -m "feat(interface): Comptes et Paramètres sur les briques ; l'héritage est vide

Comptes : Tableau plain, Pastille, fiche en Champ et Saisie, rôle en ChoixSegmente, mot de passe
provisoire dans un Bloc. Paramètres : ColonnesFormulaire, GroupeChamps, Champ. Ces écrans propres à
l'app sont comparés à leur capture d'avant la migration. Les huit derniers sélecteurs de l'héritage
ne survivaient que par des mots (num, block, plain, erreur) : retirés.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16 : la fin de l'héritage et la bascule du banc

L'héritage est vide : il disparaît avec sa liste, ses outils, ses tests et son script. Le banc cesse de comparer l'app à la maquette et devient un banc de non-régression sur l'app (spec § 6, « La bascule ») :
- `e2e/conformite/` devient `e2e/visuel/`, et ses scripts `test:visuel`, `visuel:references`, `visuel:serveur` ;
- tout ce qui capturait la maquette part : `CONFORMITE_CIBLE`, `policesLocales`, `selon`, la branche « maquette » ;
- les masques d'écarts partent : menu du compte, chargé d'affaire, pied de la connexion.

Seuls restent les masques de la semaine en cours du Gantt : « aujourd'hui » vient du serveur (`Planning` le reçoit de la page), pas de l'horloge figée du navigateur.

Les écrans propres à l'app (`app.spec.ts`) rejoignent `ECRANS`, et toutes les références sont régénérées depuis l'app. Le contrat de maintenance s'écrit : `docs/interface.md`, `docs/maquette/LISEZMOI.md` et un renvoi dans le README.

**Files :**
- Delete : `src/styles/heritage.css`, `heritage.selecteurs.txt`, `heritage.ts`, `heritage.test.ts`, `scripts/heritage.ts`, `e2e/conformite/app.spec.ts`, `e2e/conformite/references/app-*.png`
- Rename :
  - `e2e/conformite/` → `e2e/visuel/` ;
  - `e2e/visuel/conformite.spec.ts` → `e2e/visuel/ecrans.spec.ts` ;
  - `playwright.conformite.config.ts` → `playwright.visuel.config.ts`.
- Modify :
  - `src/app/globals.css`, `package.json`, `playwright.config.ts:6`, `playwright.visuel.config.ts` ;
  - `e2e/visuel/ecrans.ts` (réécrit), `e2e/visuel/ecrans.spec.ts`, `e2e/visuel/vitrine.spec.ts`, `e2e/visuel/preparer-maquette.ts:16` ;
  - `src/composants/briques/vitrine/Vitrine.tsx:36`, `README.md`.
- Create : `docs/interface.md`, `docs/maquette/LISEZMOI.md`
- Create / Modify (par commande) : `e2e/visuel/references/*.png`. Les 13 écrans sont recapturés sur l'app. 4 sont nouveaux : `parametres`, `comptes`, `nouveau-compte`, `mot-de-passe-provisoire`. La vitrine ne change pas.

**Interfaces :**
- Consumes : tout ce qui précède.
- Produces :
  - `e2e/visuel/ecrans.ts` :
    - `type Ecran = { nom; anonyme?; masques?: (page) => Locator[]; aller?: (page) => Promise<void> }` ;
    - `preparer(page)`, `seConnecterAdmin(page)`, `ECRANS` (17 écrans), `ouvrirEcran(page, ecran)`.
  - Scripts : `npm run test:visuel`, `npm run visuel:references`, `npm run visuel:serveur`.

- [ ] **Step 1 : supprimer l'héritage**

```bash
git rm -q src/styles/heritage.css src/styles/heritage.selecteurs.txt src/styles/heritage.ts src/styles/heritage.test.ts scripts/heritage.ts
```

```diff
diff --git a/src/app/globals.css b/src/app/globals.css
index 02bd22c..40c7ce8 100644
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -1,10 +1,9 @@
-/* L'entrée unique du style. Tailwind, puis l'identité (jetons → thème → base), puis l'héritage de la maquette.
+/* L'entrée unique du style. Tailwind, puis l'identité (jetons → thème → base), puis le Gantt.
    Un composant n'importe jamais de CSS : la doc de Next 16 prévient qu'une feuille globale importée par un
    composant n'est pas retirée quand on change de route. */
 @import 'tailwindcss';
 @import '../styles/jetons.css';
 @import '../styles/theme.css';
 @import '../styles/base.css';
-/* Au-dessus du preflight, sous les utilitaires : une règle restée là ne peut pas écraser une brique. */
-@import '../styles/heritage.css' layer(components);
+/* La seule feuille d'écran (docs/interface.md) : au-dessus du preflight, sous les utilitaires. */
 @import '../composants/planning/planning.css' layer(components);
```

Run : `npx tsc --noEmit && npm test`
Expected : PASS. Les tests de l'héritage ont disparu ; le garde-fou des briques reste.

- [ ] **Step 2 : renommer le banc**

```bash
git mv e2e/conformite e2e/visuel
git mv e2e/visuel/conformite.spec.ts e2e/visuel/ecrans.spec.ts
git mv playwright.conformite.config.ts playwright.visuel.config.ts
git rm -qf --ignore-unmatch e2e/visuel/app.spec.ts e2e/visuel/references/app-*.png
```

- [ ] **Step 3 : un banc pour l'app seule**

`e2e/visuel/ecrans.ts` (remplace le fichier). Les écrans de l'ancien `app.spec.ts` y entrent ; « mot-de-passe-provisoire » crée un compte et vient donc après « comptes ».

```ts
import { expect, type Locator, type Page } from '@playwright/test';
import 'dotenv/config';

/**
 * Un écran du banc visuel : comment y aller, et ce qui y change d'un jour à l'autre (masqué).
 * Sélecteurs : rôles, libellés, data-testid — jamais une classe de style (sauf g-* du Gantt).
 */
export type Ecran = {
	nom: string;
	/** Sans connexion (l'écran de connexion lui-même). */
	anonyme?: boolean;
	masques?: (page: Page) => Locator[];
	aller?: (page: Page) => Promise<void>;
};

/** Horloge figée, thème clair, aucun mouvement, polices chargées. */
export async function preparer(page: Page) {
	await page.clock.setFixedTime(new Date('2026-09-30T10:00:00+02:00'));
	await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
	await page.goto('/connexion');
	await page.evaluate(() => document.fonts.ready);
}

export async function seConnecterAdmin(page: Page) {
	await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL ?? '');
	await page.getByLabel('Mot de passe').fill(process.env.ADMIN_MOT_DE_PASSE ?? '');
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
}

const ouvrirPerrier = async (page: Page) => {
	await page.getByRole('button', { name: /^PERRIER — Louisfert/ }).click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
};
const onglet = (nom: string) => async (page: Page) => {
	await ouvrirPerrier(page);
	await page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) }).click();
};

/** Le Gantt au début du chantier. « Aujourd'hui » vient du serveur, pas de l'horloge figée : la semaine en cours est masquée. */
const allerAuPlanning = async (page: Page) => {
	await onglet('Planning')(page);
	await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
};
const masquesPlanning = (page: Page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')];

const allerAuxArtisans = (page: Page) => page.getByRole('link', { name: /^Artisans/ }).click();

const allerA = (chemin: string, titre: string) => async (page: Page) => {
	await page.goto(chemin);
	await expect(page.getByRole('heading', { name: titre })).toBeVisible();
};
const allerAuxComptes = allerA('/admin/comptes', 'Comptes');

export const ECRANS: Ecran[] = [
	{ nom: 'connexion', anonyme: true, aller: async (page) => {
		await page.getByLabel('Adresse e-mail').fill('a.jouan@socoreve.fr');
		await page.getByLabel('Mot de passe').fill('demonstration');
	} },
	{ nom: 'chantiers' },
	{ nom: 'selecteur', aller: (page) => page.getByRole('button', { name: /^Affichage/ }).click() },
	{ nom: 'compte', aller: (page) => page.getByRole('button', { name: 'Mon compte' }).click() },
	{ nom: 'nouveau', aller: (page) => page.getByRole('link', { name: 'Nouveau chantier', exact: true }).click() },
	{ nom: 'marches', aller: ouvrirPerrier },
	{ nom: 'panneau-lot', aller: async (page) => {
		await ouvrirPerrier(page);
		await page.getByRole('row').filter({ hasText: 'CONSTRUCTIONS REBOURS' }).getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ }).click();
	} },
	{ nom: 'planning', masques: masquesPlanning, aller: allerAuPlanning },
	{ nom: 'panneau-planning', masques: masquesPlanning, aller: async (page) => {
		await allerAuPlanning(page);
		await page.locator('.g-fixe[title="Modifier les périodes et la couleur"]').first().click();
	} },
	{ nom: 'fermetures', masques: masquesPlanning, aller: async (page) => {
		await allerAuPlanning(page);
		await page.getByRole('button', { name: 'Fermetures' }).click();
	} },
	{ nom: 'documents', aller: onglet('Documents') },
	{ nom: 'artisans', aller: allerAuxArtisans },
	{ nom: 'fiche-artisan', aller: async (page) => {
		await allerAuxArtisans(page);
		await page.getByRole('row').filter({ hasText: 'AM COUVERTURE' }).getByRole('cell').first().click();
	} },
	{ nom: 'parametres', aller: allerA('/parametres', 'Paramètres de l\'entreprise') },
	{ nom: 'comptes', aller: allerAuxComptes },
	{ nom: 'nouveau-compte', aller: async (page) => {
		await allerAuxComptes(page);
		await page.getByRole('button', { name: 'Nouveau compte' }).click();
	} },
	// Crée un compte : vient après « comptes », que ce compte ne doit pas encore changer.
	{ nom: 'mot-de-passe-provisoire', aller: async (page) => {
		await allerAuxComptes(page);
		await page.getByRole('button', { name: 'Nouveau compte' }).click();
		await page.getByLabel('Nom').fill('Camille Banc');
		await page.getByLabel('E-mail').fill('camille.banc@socoreve.local');
		await page.getByRole('button', { name: 'Créer le compte' }).click();
		// Tiré au hasard : remplacé par un texte fixe de même longueur.
		await page.getByRole('dialog', { name: 'Mot de passe provisoire' }).getByTestId('mot-de-passe-provisoire')
			.evaluate((el) => { el.textContent = 'ABCDEFGHJKMNPQRS'; });
	} },
];

export async function ouvrirEcran(page: Page, ecran: Ecran) {
	await preparer(page);
	if (!ecran.anonyme) await seConnecterAdmin(page);
	await ecran.aller?.(page);
	await page.mouse.move(0, 0);   // aucun survol dans la capture
}
```

`e2e/visuel/ecrans.spec.ts` (remplace le fichier) :

```ts
import { expect, test } from '@playwright/test';
import { ECRANS, ouvrirEcran } from './ecrans';

/** Chaque écran face à sa référence. Après un changement voulu : npm run visuel:references, puis relire les PNG du diff. */
for (const ecran of ECRANS) {
	test(`${ecran.nom} : inchangé`, async ({ page }) => {
		await ouvrirEcran(page, ecran);
		await expect(page).toHaveScreenshot(`${ecran.nom}.png`, {
			animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
			mask: ecran.masques?.(page) ?? [],
		});
	});
}
```

`e2e/visuel/vitrine.spec.ts` :

```diff
diff --git a/e2e/visuel/vitrine.spec.ts b/e2e/visuel/vitrine.spec.ts
--- a/e2e/visuel/vitrine.spec.ts
+++ b/e2e/visuel/vitrine.spec.ts
@@ -1,18 +1,14 @@
 import { expect, test, type Page } from '@playwright/test';
-import { preparer, seConnecterSur, type Cible } from './ecrans';
+import { preparer, seConnecterAdmin } from './ecrans';
 
-/**
- * La vitrine n'existe que dans l'app : ses références se capturent sur l'app
- * (CONFORMITE_CIBLE=app … --update-snapshots -g vitrine), puis se relisent à l'œil.
- */
-const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;
+/** Chaque brique, ses variantes et ses états, en clair et en sombre. Une brique ou une variante nouvelle y entre, puis npm run visuel:references. */
 const SECTIONS = ['boutons', 'etiquettes', 'champs', 'structure', 'navigation', 'tableaux', 'menus'];
 const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;
 
 async function ouvrirVitrine(page: Page, theme: 'light' | 'dark') {
-	await preparer(page, 'app');
+	await preparer(page);
 	await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
-	await seConnecterSur(page, 'app');
+	await seConnecterAdmin(page);
 	await page.goto('/vitrine');
 	await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
 	await page.evaluate(() => document.fonts.ready);
@@ -22,8 +18,6 @@
 	const suffixe = theme === 'light' ? 'clair' : 'sombre';
 
 	test.describe(`vitrine (${suffixe})`, () => {
-		test.skip(CIBLE !== 'app', 'la vitrine n’existe pas dans la maquette');
-
 		test(`vitrine ${suffixe} : sections`, async ({ page }) => {
 			await ouvrirVitrine(page, theme);
 			for (const section of SECTIONS) {
```

`playwright.visuel.config.ts` et `e2e/visuel/preparer-maquette.ts` :

```diff
diff --git a/playwright.visuel.config.ts b/playwright.visuel.config.ts
--- a/playwright.visuel.config.ts
+++ b/playwright.visuel.config.ts
@@ -1,15 +1,15 @@
 import { defineConfig, devices } from '@playwright/test';
 
-/** Banc de conformité à la maquette : sa propre base (les 4 chantiers de la maquette) ; jamais en même temps que test:e2e. */
+/** Banc visuel : chaque écran et la vitrine comparés à leurs références ; sa propre base (les 4 chantiers de la maquette) ; jamais en même temps que test:e2e. */
 export default defineConfig({
-	testDir: 'e2e/conformite',
+	testDir: 'e2e/visuel',
 	snapshotPathTemplate: '{testDir}/references/{arg}{ext}',
 	fullyParallel: false,
 	workers: 1,
 	use: { baseURL: 'http://localhost:3200', locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure',
 		...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
 	webServer: {
-		command: 'npm run conformite:serveur',
+		command: 'npm run visuel:serveur',
 		url: 'http://localhost:3200/connexion',
 		timeout: 300_000,
 		reuseExistingServer: false,
```

```diff
diff --git a/e2e/visuel/preparer-maquette.ts b/e2e/visuel/preparer-maquette.ts
--- a/e2e/visuel/preparer-maquette.ts
+++ b/e2e/visuel/preparer-maquette.ts
@@ -13,7 +13,7 @@
 	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
 	const ids = await insererMaquette(admin.id);
 	await documentsPerrier(ids['PERRIER — Louisfert'], admin.id);
-	console.log('Conformité : les 4 chantiers de la maquette sont prêts.');
+	console.log('Banc visuel : les 4 chantiers de la maquette sont prêts.');
 }
 
 /** Les 6 documents de PERRIER dans la maquette, à jour des données (même empreinte que l'état calculé). PDF factice : base de test. */
```

Les scripts, la config des E2E et le commentaire de la vitrine :

```diff
diff --git a/package.json b/package.json
index a818eee..659f612 100644
--- a/package.json
+++ b/package.json
@@ -10,9 +10,9 @@
     "test": "vitest run --project unit --passWithNoTests",
     "test:int": "vitest run --project integration --passWithNoTests",
     "test:e2e": "playwright test",
-    "conformite:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 BETTER_AUTH_URL=http://localhost:3200 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/conformite/preparer-maquette.ts && next build && next start -p 3200'",
-    "conformite:references": "CONFORMITE_CIBLE=maquette playwright test -c playwright.conformite.config.ts --update-snapshots",
-    "test:conformite": "playwright test -c playwright.conformite.config.ts",
+    "visuel:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 BETTER_AUTH_URL=http://localhost:3200 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/visuel/preparer-maquette.ts && next build && next start -p 3200'",
+    "visuel:references": "playwright test -c playwright.visuel.config.ts --update-snapshots",
+    "test:visuel": "playwright test -c playwright.visuel.config.ts",
     "db:seed": "tsx prisma/seed.ts",
     "db:demo": "tsx prisma/seed-demo.ts",
     "e2e:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/preparer-planning.ts && tsx e2e/preparer-financier.ts && tsx e2e/preparer-suivi.ts && next build && next start -p 3100'"
diff --git a/playwright.config.ts b/playwright.config.ts
index 25e060e..9f51c66 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -3,7 +3,7 @@ import { defineConfig, devices } from '@playwright/test';
 /** Le serveur E2E remet la base de test à zéro : ne pas lancer les tests d'intégration en même temps. */
 export default defineConfig({
 	testDir: 'e2e',
-	testIgnore: ['conformite/**'],
+	testIgnore: ['visuel/**'],
 	fullyParallel: false,
 	workers: 1,
 	use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', locale: 'fr-FR', timezoneId: 'Europe/Paris' },
diff --git a/src/composants/briques/vitrine/Vitrine.tsx b/src/composants/briques/vitrine/Vitrine.tsx
index fe55877..8ce6295 100644
--- a/src/composants/briques/vitrine/Vitrine.tsx
+++ b/src/composants/briques/vitrine/Vitrine.tsx
@@ -33,7 +33,7 @@ const ENTREPRISES = [
 	{ v: 'long', t: LONG, meta: 'Châteaubriant' },
 ];
 
-/** Une section : son surtitre, puis ses exemples ; data-testid sert aux captures (e2e/conformite/vitrine.spec.ts). */
+/** Une section : son surtitre, puis ses exemples ; data-testid sert aux captures (e2e/visuel/vitrine.spec.ts). */
 function Section({ nom, titre, children }: { nom: string; titre: string; children: React.ReactNode }) {
 	return (
 		<section data-testid={`vitrine-${nom}`} className="flex flex-col gap-4 bg-paper py-2">
```

```bash
grep -rn "conformite\|CONFORMITE\|heritage\|selon(" e2e src scripts playwright*.ts package.json --exclude-dir=generated
```

Expected : rien.

- [ ] **Step 4 : régénérer les références depuis l'app**

`--update-snapshots=all` réécrit chaque image ; le défaut (`changed`) ne réécrirait que celles qui dépassent 1 %.

```bash
npx playwright test -c playwright.visuel.config.ts --update-snapshots=all
git status --short e2e/visuel/references
```

Expected : 25 tests passés. Les 13 écrans d'avant sont modifiés, 4 sont nouveaux, et les 22 de la vitrine sont inchangés (mêmes octets).

Ouvrir `compte.png` (le menu du compte, entier, sans masque), `connexion.png` et `nouveau.png` (le chargé d'affaire visible).

- [ ] **Step 5 : le banc et les E2E**

```bash
npm run test:visuel
npm run test:e2e
```

Expected : 25 passés, puis 31 passés.

- [ ] **Step 6 : le contrat de maintenance**

`docs/interface.md` :

```markdown
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
| Tailles de texte | `text-9`, `10`, `11`, `12`, `13`, `14`, `15`, `16`, `17`, `18`, `22`, `24`, `40` : la taille en pixels. L'interligne s'hérite. |
| Rondeurs | `rounded-xs` (5 px), `rounded-sm` (9 px), `rounded-md` (14 px), `rounded-lg` (18 px) |
| Ombres | `shadow-ombre`, `shadow-ombre-h` (menus, panneaux), `shadow-ombre-toast` |
| Polices | `font-sans` (Figtree), `font-titre` (Outfit), `font-mono` (Spline Sans Mono) |
| Divers | `tracking-capitales`, `animate-monte`, point de rupture `max-etroit:` (60 rem) |

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
  jamais `false`.
- **Surcouches** : `data-surcouche="panneau" | "menu" | "confirmation" | "apercu"`, `data-ouvert`,
  `data-verrou-defilement` (fige la page), `data-bloque-clavier`. Échap ne ferme que la plus haute ; les
  sélecteurs sont dans `src/composants/briques/surcouches.ts`.
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
```

`docs/maquette/LISEZMOI.md` :

```markdown
# La maquette

`sentinelle-marches.html` est la maquette fonctionnelle d'origine : un seul fichier HTML, ses données dans le
navigateur. Elle a donné à l'app son identité (le « bleu de plan », les polices, les rondeurs) et ses écrans.

Elle est désormais une **référence**, et seulement cela :

- elle ne génère plus rien : ni CSS, ni jetons, ni captures ;
- elle ne se modifie plus pour faire évoluer l'app. Un changement d'interface se fait dans les jetons, le thème
  ou les briques (`docs/interface.md`), puis se vérifie au banc visuel (`npm run test:visuel`) ;
- ses notes d'en-tête (le commentaire en tête du fichier) restent valables pour le métier : à quoi sert chaque
  document, les règles de calcul, le vocabulaire.

Elle s'ouvre directement dans un navigateur, sans serveur.
```

Le README renvoie à `docs/interface.md` :

```diff
diff --git a/README.md b/README.md
index e215bc4..0b8467a 100644
--- a/README.md
+++ b/README.md
@@ -1,5 +1,10 @@
 This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
 
+## Interface
+
+Le style vit dans les jetons, le thème Tailwind et les briques : lire [docs/interface.md](docs/interface.md)
+avant de toucher à un écran. La maquette (`docs/maquette/`) n'est plus qu'une référence.
+
 ## Getting Started
 
 First, run the development server:
```

La note de mémoire de l'assistant (`maquette-est-le-front.md`) dit déjà, depuis le 2026-10-01, que les briques et Tailwind font foi et que la maquette sert de référence. La relire ; la corriger seulement si elle a dérivé.

- [ ] **Step 7 : vérifications**

```bash
npx tsc --noEmit && npm run lint && npm test && npm run test:int
```

Expected : tout vert. `npm run test:visuel` et `npm run test:e2e` l'ont été au Step 5.

- [ ] **Step 8 : commit**

```bash
git add -A src e2e scripts docs README.md package.json playwright.config.ts playwright.visuel.config.ts
git commit -m "feat(interface): fin de l'héritage, le banc devient visuel

L'héritage vide disparaît avec sa liste, ses outils et ses tests. e2e/conformite devient
e2e/visuel (test:visuel, visuel:references, visuel:serveur) : plus de capture de la maquette ni de
masque d'écart ; les écrans propres à l'app rejoignent ECRANS ; références régénérées depuis l'app.
docs/interface.md (où vit le style, règles, recettes) et docs/maquette/LISEZMOI.md.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
