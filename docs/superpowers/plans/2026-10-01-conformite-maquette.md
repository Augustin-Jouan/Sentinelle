# Sentinelle Marchés — Conformité à la maquette : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reproduire trait pour trait, dans l'application Next.js, l'interface de la maquette `docs/maquette/sentinelle-marches.html` : barre de navigation, écrans, panneaux, menus, aperçus. Une capture de chaque écran de l'app doit être identique à la même capture de la maquette, sur les mêmes données.

**Architecture :**
- **Le CSS de la maquette devient celui de l'app, sans retouche.** Un script l'extrait tel quel dans `src/app/maquette.css`, en écartant seulement les feuilles imprimables, que `src/documents/styles.ts` porte déjà. Un test vérifie que le fichier n'a pas été édité à la main.
- **Chaque écran est réécrit avec le balisage et les classes de la maquette.** Ce balisage se trouve dans le HTML statique de la maquette ou dans ses fonctions `render*`.
- **Le métier ne change pas.** Actions serveur, validations et données restent celles d'aujourd'hui. Seuls s'ajoutent la suppression d'un chantier, le tri « Numéro de lot » et quelques champs de lecture.
- **Un banc de conformité fait foi.** Il charge dans une base de test les données de démonstration de la maquette (ses 4 chantiers). Playwright capture chaque écran de la maquette : ces captures sont les références. Il capture ensuite les mêmes écrans dans l'app et les compare aux références.

**Tech Stack :** Next.js 16.3.7 (App Router), React 19, Prisma 7.10, PostgreSQL 17, postcss 8.5 (déjà installé, dépendance de `@tailwindcss/postcss`), sonner, Playwright 1.63 (`toHaveScreenshot`, `page.clock`, `page.route`), Vitest 5.

**Spec :** la maquette elle-même, `docs/maquette/sentinelle-marches.html` : son balisage (l. 2093-2852), son CSS (l. 161-2053) et ses fonctions de rendu (l. 2854-7518), notes d'en-tête comprises (l. 1-156). Les specs des sous-projets (`docs/superpowers/specs/2026-09-2*-*.md`, `2026-09-30-*.md`) restent la référence du comportement.

**Origine :** le 2026-09-30, l'utilisateur a constaté que l'app « ne ressemble pas du tout à la maquette ». Sa décision : « la maquette EST le front, il faut la reproduire trait pour trait ». Il a aussi tranché trois points :
- les écrans hors maquette vont dans le menu du compte ;
- la corbeille d'un chantier ne supprime que si aucun document n'a été généré ;
- l'exécution est confiée à Cursor.

**Prérequis :** `main` à jour (fusion de `fix/correctifs-revue`, 12facd0 ou plus récent), `npm test`, `npm run test:int`, `npm run test:e2e` verts.

## Global Constraints

- La maquette `docs/maquette/sentinelle-marches.html` ne se modifie jamais : elle est la référence.
- `src/app/maquette.css` est généré par `node scripts/extraire-css-maquette.mjs` et ne s'édite jamais à la main (le test `src/app/maquette.test.ts` le vérifie).
- Tout style propre à l'app (un état que la maquette n'a pas : « modifié », « périmé », erreur de saisie…) va dans `src/app/maquette-ajouts.css`. Chaque règle y est précédée d'un commentaire qui dit pourquoi la maquette ne la contient pas. Il utilise les jetons de la maquette (`--accent`, `--rule`…), jamais une couleur en dur.
- Dans les composants réécrits, **aucune classe utilitaire Tailwind** : seulement les classes de la maquette et celles de `maquette-ajouts.css`. La classe utilitaire `block` est interdite partout : elle entre en collision avec le `.block` de la maquette (test statique en Task 1).
- Les textes à l'écran sont ceux de la maquette, mot pour mot : libellés, surtitres, infobulles, messages vides, confirmations. Seules exceptions : les écarts listés ci-dessous.
- Les icônes sont les SVG de la maquette (`src/composants/maquette/icones.tsx`, Task 2). Plus de `lucide-react` dans les écrans.
- Le comportement métier ne change pas : mêmes Server Actions, mêmes validations, mêmes messages d'erreur métier. Les tests unitaires et d'intégration existants restent verts sans modification, sauf ceux explicitement cités.
- Les surcouches gardent `role="dialog"` et un `aria-label`, pour que les parcours E2E continuent de les trouver.
- Pas de migration Prisma. Jamais `prisma migrate reset` ni `prisma migrate dev`.
- Tout en français (noms, commentaires, messages). Un commit par tâche, avec seulement les fichiers de la tâche.

### Écarts assumés avec la maquette (les seuls autorisés)

1. **Menu du compte :** « Changer de compte » et « Réinitialiser la maquette » (propres à la démo) sont remplacés par, dans l'ordre :
   - « Changer mon mot de passe » ;
   - « Paramètres » (admin) ;
   - « Comptes » (admin) ;
   - « Se déconnecter ».

   Le rôle affiché est « Administrateur » ou « Maître d'œuvre ».
2. **Pied de l'écran de connexion :** « Maquette — aucune donnée réelle, aucun compte créé. » devient « Accès réservé aux comptes SOCOREVE. ».
3. **En-tête du chantier modifiable :** la maquette ne permet pas de modifier l'en-tête après la création. Dans l'app, un clic sur le bandeau `.context` ouvre le panneau latéral « En-tête du chantier », avec les champs du formulaire de création.
4. **Chargé d'affaire :** c'est un compte de l'app, pas un texte libre. Il se choisit dans un menu `dd` (création et en-tête), au lieu du champ texte de la maquette.
5. **États que l'app a et que la maquette n'a pas :** « modifié depuis la génération », visa « périmé », acompte « hors appli », « Corriger » un certificat ou un compte rendu, versions précédentes d'un document, levée des réserves. Ils se dessinent avec les composants de la maquette (`.pill`, `.dm-case`, `.dd`, `.btn-sm`) ; leurs quelques règles vont dans `maquette-ajouts.css`.
6. **« Supprimer » une entreprise l'archive :** l'app ne supprime jamais une entreprise. Le bouton garde le libellé et l'icône de la maquette, avec le texte de confirmation de la maquette pour une entreprise attribuée.
7. **Supprimer un chantier** n'est permis que s'il n'a aucun document généré. Sinon : « Ce chantier a déjà des documents générés : il ne peut plus être supprimé. Marquez-le terminé. ».
8. **« Aperçu plein écran »** (un simple toast dans la maquette) n'est pas reproduit ; **« Imprimer »** devient « Télécharger le PDF ». Les documents sortent en PDF.

## Review Focus

1. **Un compteur de la barre qui ne suit pas une action** (ajout d'un lot, d'une période, génération d'un document) : après la Server Action, le compteur de l'onglet doit changer sans rechargement. Test : Task 4, E2E « les compteurs suivent ».
2. **Suppression d'un chantier pendant qu'un collègue génère un document** : la génération gagne, et la suppression est refusée avec le message métier, jamais « Erreur inattendue ». La suppression est une seule instruction, et c'est la clé étrangère `Document.chantierId` (`onDelete: Restrict`) qui tranche : pas de fenêtre entre un comptage et l'effacement. Test : Task 6, intégration « refuse de supprimer un chantier qui a un document, sans rien effacer ».
3. **Thème sombre choisi puis rechargement** : aucun flash clair au chargement. Le planning suit le même thème que le reste (ses jetons sont maintenant ceux de la maquette). Test : Task 1, E2E « le thème choisi tient au rechargement ».
4. **Menu déroulant ouvert près du bord de l'écran ou dans le panneau latéral** : il ne doit jamais être rogné. Entrée choisit le premier résultat de la recherche ; Échap referme. Test : Task 2, fonctions pures `filtrerOptions` et `placerMenu` ; Task 9, E2E attribution au clavier.
5. **Deux confirmations enchaînées, ou Échap sur une confirmation** : une seule fenêtre `.ask` à la fois ; Annuler, Échap et un clic hors de la carte ne font rien. Test : Task 2 (`Confirmation`) et Task 9 (suppression d'un avenant annulée).

---

### Task 1 : La feuille de style de la maquette, le thème, les polices

**Files :**
- Create: `scripts/extraire-css-maquette.mjs`, `src/app/maquette.css` (généré), `src/app/maquette-ajouts.css`, `src/app/maquette.test.ts`, `src/composants/maquette/theme.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/composants/planning/Planning.tsx`, `package.json`
- Delete: `src/composants/planning/gantt.css`

**Interfaces :**
- Produces :
  - `src/app/maquette.css` (classes de la maquette : `.nav`, `.btn`, `.dd`, `.panel`, `.gen`, `.chantier`, `.dm-*`, `.g-*`…) ;
  - `CLE_THEME = 'sentinelle-theme'`, `SCRIPT_THEME: string`, `basculerTheme(): void` (`src/composants/maquette/theme.ts`) ;
  - attribut `data-theme="light" | "dark"` sur `<html>`.

- [ ] **Step 1 : Le test de la feuille générée**

Créer `src/app/maquette.test.ts` :

```ts
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' ? [] : sources(chemin);
		return /\.tsx$/.test(e.name) ? [chemin] : [];
	});
}

describe('feuille de style de la maquette', () => {
	it('maquette.css est exactement ce que produit le script (jamais édité à la main)', () => {
		const attendu = execFileSync('node', ['scripts/extraire-css-maquette.mjs', '--stdout'], { encoding: 'utf8' });
		expect(readFileSync('src/app/maquette.css', 'utf8')).toBe(attendu);
	});

	it('reprend l\'interface et écarte les feuilles imprimables', () => {
		const css = readFileSync('src/app/maquette.css', 'utf8');
		for (const present of ['.nav-haut', '.picker-btn', '.chantier-grid', '.totals', '.panel', '.gen-head', '.dm-case.est-alerte', '.g-bar', '.synth-cell', '.toast']) {
			expect(css, present).toContain(present);
		}
		for (const absent of ['.sheet .col-r', '.cr-tete', '.cp-titre', '.pv-cadre', '@media print']) expect(css, absent).not.toContain(absent);
	});

	// `.block` de la maquette (cadre d'un bloc du panneau) : l'utilitaire Tailwind du même nom lui prendrait sa place.
	it.each(sources('src'))('%s : pas d\'utilitaire Tailwind « block »', (fichier) => {
		const classes = [...readFileSync(fichier, 'utf8').matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)]
			.map((m) => m[1] ?? m[2] ?? m[3]);
		for (const c of classes) expect(c.split(/\s+/), `${fichier} : « ${c} »`).not.toContain('block');
	});
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm test -- src/app/maquette.test.ts`
Expected : FAIL. Le script n'existe pas encore, `maquette.css` non plus, et des composants shadcn utilisent `block` (`<small className="block …">` dans `TableauLots.tsx`…). La partie « block » passera au fil des tâches : un fichier réécrit n'en contient plus. En fin de Task 16, le test est entièrement vert.

- [ ] **Step 3 : Le script d'extraction**

Créer `scripts/extraire-css-maquette.mjs` :

```js
// Extrait la feuille de style de la maquette vers src/app/maquette.css, sans rien réécrire.
// On n'écarte que ce que src/documents/styles.ts porte déjà (les feuilles imprimables)
// et les règles d'impression de la maquette (l'app imprime des PDF).
// Usage : node scripts/extraire-css-maquette.mjs          → écrit le fichier
//         node scripts/extraire-css-maquette.mjs --stdout → l'affiche (test)
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const html = readFileSync('docs/maquette/sentinelle-marches.html', 'utf8');
// La grande feuille : le <style> en début de ligne, pas ceux que citent les notes d'en-tête.
const source = html.match(/^<style>\n([\s\S]*?)^<\/style>/m)[1];

/** Racine d'un sélecteur, sans le préfixe de thème : « :root[data-theme='dark'] .dm-case.est-alerte » → « .dm-case.est-alerte ». */
const racine = (s) => s.trim().replace(/^:root(\[[^\]]*\]|:not\([^)]*\))*\s+/, '').split(/[\s>+~:]/)[0].replace(/\[.*$/, '');

/** Les feuilles imprimables et leur saisie : styles.ts les porte pour l'écran comme pour le PDF. */
const FEUILLE = [
	/^\.sheet(-[a-z]+)?(\.sheet-[a-z]+)?$/, /^\.fill(\.[a-z]+)?$/, /^\.sign-row(-2)?$/, /^\.recap-[a-z]+$/,
	/^table\.(recap|d-avenant|d-gantt|d-visa|cr-lots|cp-t|cp-prec|cp-titu)$/, /^\.av-(lieu|kv|objet)$/, /^\.d-[a-z-]+$/,
	/^\.cr-[a-z-]+(\.[a-z-]+)?$/, /^\.cp-(?!alerte$)[a-z-]+$/, /^\.pv-[a-z-]+$/, /^\.doc-(entete|kv|titre|phrase|note|feuille)$/,
	/^\.dp-pages$/, /^\.print-on$/, /^#(cr|cp|pv|gen)(\.lecture)?$/, /^(div)?\.zone$/, /^(button)?\.saisie$/,
	/^(div|p)?\.imprime$/, /^\.ecran$/, /^\.est-cache$/,
];
const estFeuille = (r) => r.selectors.every((s) => FEUILLE.some((re) => re.test(racine(s))));

const racineCss = postcss.parse(source);
racineCss.walkAtRules('media', (m) => { if (/print/.test(m.params)) m.remove(); });
racineCss.walkRules((r) => {
	if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return;
	if (estFeuille(r)) r.remove();
});
racineCss.walkAtRules('media', (m) => { if (!m.nodes?.length) m.remove(); });

const entete = `/* GÉNÉRÉ par scripts/extraire-css-maquette.mjs depuis docs/maquette/sentinelle-marches.html.
   Ne pas éditer : relancer le script. Les ajouts propres à l'app vont dans maquette-ajouts.css. */\n`;
const sortie = entete + racineCss.toString().trim() + '\n';
if (process.argv.includes('--stdout')) process.stdout.write(sortie);
else writeFileSync('src/app/maquette.css', sortie);
```

Ajouter dans `package.json`, section `scripts` : `"maquette:css": "node scripts/extraire-css-maquette.mjs"`.

Run : `npm run maquette:css && grep -c "{" src/app/maquette.css`
Expected : le fichier existe, plusieurs centaines de règles.

- [ ] **Step 4 : Brancher la feuille, retirer gantt.css**

1. `src/app/globals.css` :
   - garder `@import "tailwindcss";`, `@import "tw-animate-css";` et les `@font-face` (polices servies depuis `public/polices`, les mêmes que la maquette) ;
   - remplacer `@custom-variant dark (@media (prefers-color-scheme: dark));` par :

   ```css
   /* Le thème suit l'interrupteur de la barre (data-theme), sinon le système — comme la maquette. */
   @custom-variant dark {
   	&:where([data-theme='dark'], [data-theme='dark'] *) { @slot; }
   	@media (prefers-color-scheme: dark) { &:where(:root:not([data-theme='light']), :root:not([data-theme='light']) *) { @slot; } }
   }
   ```

   - dupliquer le bloc sombre des variables shadcn : `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }` et `:root[data-theme='dark'] { … }`, mêmes valeurs qu'aujourd'hui ;
   - en fin de fichier, **hors de toute couche** (pour primer sur les couches de Tailwind, comme la maquette prime sur tout), ajouter :

   ```css
   @import './maquette.css';
   @import './maquette-ajouts.css';
   ```

   Si Tailwind v4 refuse un `@import` après d'autres règles, déplacer ces deux lignes juste après `@import "tw-animate-css";`. Elles restent sans `layer(...)` : une règle hors couche l'emporte toujours sur une règle en couche.
2. Supprimer `src/composants/planning/gantt.css` et la ligne `import './gantt.css';` de `src/composants/planning/Planning.tsx`. Ses 72 règles identiques sont maintenant dans `maquette.css`. Ses deux règles divergentes (`.gantt`, `.g-poignee`) prennent la version de la maquette. Le wrapper `.planning` et ses jetons `--p-*` disparaissent. Reste une règle propre à l'app, `.g-bar.est-temp`, qui passe dans `maquette-ajouts.css` (Step 5).
3. `git grep -n "\-\-p-" src` doit ne rien renvoyer. Sinon, remplacer `var(--p-xxx)` par `var(--xxx)`.
4. `git grep -n "poignee\|8px\|46" src/composants/planning/*.ts` : si un calcul suppose une poignée de 8 px, le passer à 10 px (valeur de la maquette). La largeur de semaine `--sem-w: 46px` ne change pas.

- [ ] **Step 5 : Les ajouts et le thème**

Créer `src/app/maquette-ajouts.css` :

```css
/* Ajouts propres à l'app : des états que la maquette n'a pas (voir « Écarts assumés » du plan).
   Uniquement les jetons de la maquette, jamais une couleur en dur. */

/* Barre temporaire pendant qu'on trace une période (planning) : elle ne capte pas la souris. */
.g-bar.est-temp { pointer-events: none; }

/* Saisie refusée par le serveur : le champ garde le texte et se voit en erreur (la maquette remettait l'ancienne valeur). */
.text-input.est-erreur, .money-input.est-erreur, .field input.est-erreur { border-color: var(--danger); background: var(--danger-soft); }
.field .erreur { font-size: 0.6875rem; color: var(--danger); }

/* Pendant l'enregistrement d'une saisie. */
.est-en-cours { opacity: 0.7; }

/* Document modifié depuis sa dernière version, visa périmé : la pastille de la maquette, en accent. */
.pill-modif { background: var(--accent-soft); color: var(--accent-2); margin-left: 0.25rem; }
/* Acompte saisi hors de l'application : une case sans lien. */
.dm-case.est-hors { background: var(--idle-soft); color: var(--muted); cursor: default; }
/* Action secondaire sous une case (Corriger, Régénérer, Lever les réserves). */
.dm-sous { display: flex; gap: 0.5rem; margin-top: 0.1875rem; }
.dm-sous .dm-th-action { margin-left: 0; }

/* Bouton désactivé : la maquette n'en avait pas. */
.btn:disabled, .btn[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }
.btn:disabled:hover { background: var(--raise); border-color: var(--rule-strong); }
.btn-primary:disabled:hover { background: var(--accent); border-color: var(--accent); }

/* Bandeau du chantier cliquable : il ouvre l'en-tête du chantier (écart 3). */
button.context { width: 100%; margin: 0; padding: 0; border: 0; border-top: 1px solid var(--rule); border-radius: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
button.context:hover { background: var(--idle-soft); }

/* Lien d'une barre d'aperçu (« Télécharger le PDF » est un <a>). */
a.btn { text-decoration: none; }
```

Créer `src/composants/maquette/theme.ts` :

```ts
/** Clé du thème choisi par l'interrupteur (préférence de ce navigateur seulement). */
export const CLE_THEME = 'sentinelle-theme';

/** Posé en tête de <head>, avant tout rendu : pas de flash clair quand le sombre est choisi. */
export const SCRIPT_THEME = `try{var t=localStorage.getItem('${CLE_THEME}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

/** Bascule clair / sombre, comme flipTheme() de la maquette, et s'en souvient. */
export function basculerTheme(): void {
	const racine = document.documentElement;
	const sombre = racine.getAttribute('data-theme') === 'dark'
		|| (!racine.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
	const suivant = sombre ? 'light' : 'dark';
	racine.setAttribute('data-theme', suivant);
	try { localStorage.setItem(CLE_THEME, suivant); } catch { /* stockage indisponible : le choix vaut pour la page */ }
}
```

Modifier `src/app/layout.tsx` :

```tsx
import type { Metadata } from 'next';
import { Toasts } from '@/composants/maquette/Toasts';
import { SCRIPT_THEME } from '@/composants/maquette/theme';
import './globals.css';

export const metadata: Metadata = {
	title: 'Sentinelle Marchés',
	description: "Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu'il le faut.",
};

export default function LayoutRacine({ children }: { children: React.ReactNode }) {
	return (
		// data-theme est posé par SCRIPT_THEME avant l'hydratation : React ne doit pas s'en offusquer.
		<html lang="fr" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
			</head>
			<body>
				{children}
				<Toasts />
			</body>
		</html>
	);
}
```

`Toasts` est créé en Task 2. En attendant, garder l'import de `Toaster` de `@/components/ui/sonner` et le remplacer en Task 2.

- [ ] **Step 6 : Vérifier**

Run : `npm run maquette:css && npm test -- src/app/maquette.test.ts -t "maquette.css est exactement|reprend" && npx tsc --noEmit && npm run test:e2e -- e2e/planning.spec.ts e2e/planning-gestes.spec.ts`
Expected : les deux premiers tests passent (le test « block » échoue encore sur les fichiers pas encore réécrits) ; les E2E du planning passent.

- [ ] **Step 7 : Commit**

```bash
git add scripts/extraire-css-maquette.mjs src/app/maquette.css src/app/maquette-ajouts.css src/app/maquette.test.ts src/composants/maquette/theme.ts src/app/globals.css src/app/layout.tsx src/composants/planning/Planning.tsx src/composants/planning/gantt.css package.json
git commit -m "feat(interface): feuille de style de la maquette reprise telle quelle, thème clair/sombre mémorisé"
```

---

### Task 2 : Les composants de base de la maquette

**Files :**
- Create: `src/composants/maquette/icones.tsx`, `src/composants/maquette/Sigle.tsx`, `src/composants/maquette/MenuDeroulant.tsx`, `src/composants/maquette/menu.ts`, `src/composants/maquette/menu.test.ts`, `src/composants/maquette/Recherche.tsx`, `src/composants/maquette/Interrupteur.tsx`, `src/composants/maquette/Confirmation.tsx`, `src/composants/maquette/Panneau.tsx`, `src/composants/maquette/Toasts.tsx`
- Modify: `src/app/layout.tsx`, `src/composants/ChampEnLigne.tsx`

**Interfaces :**
- Produces :
  - `Icone.*` : `Maison`, `Artisans`, `Soleil`, `Marches`, `Planning`, `Documents`, `Plus`, `Telecharger`, `Imprimer`, `Calendrier`, `Visa`, `Coche`, `Rouvrir`, `Corbeille`, `Loupe`, `Crayon`, `Reactiver`, `Doc`, `Main`, `Cible`, `Chevron` — composants sans props, `<svg viewBox="0 0 16 16">` ;
  - `<SigleDefs />` (sprite, une fois par page) et `<Sigle grand? />` ;
  - `type OptionMenu = { v: string; t: string; meta?: string } | { sep: true } | { tete: string }` ;
  - `filtrerOptions(options, requete): OptionMenu[]` et `placerMenu(bouton: DOMRect, menu: { largeur: number; hauteur: number }, fenetre: { largeur: number; hauteur: number }): { top?: number; bottom?: number; left: number; largeur: number; versHaut: boolean }` (`menu.ts`) ;
  - `<MenuDeroulant id k valeur options onChoisir recherche? classe? multi? valeurs? libelle? vide? desactive? />` ;
  - `<Recherche placeholder valeur onChange libelle />` ;
  - `<Interrupteur coche onChange>{texte}</Interrupteur>` ;
  - `<ConfirmationFournisseur>` et `useConfirmation(): (o: { texte: React.ReactNode; libelle: string; dangereux?: boolean }) => Promise<boolean>` ;
  - `<Panneau ouvert surtitre titre onFermer pied libelle>{corps}</Panneau>` ;
  - `<Toasts />` ;
  - `ChampEnLigne` : nouvelles props `variante: 'texte' | 'texte-mini' | 'montant' | 'montant-mini' | 'champ'` et `id?: string` ; `className` s'ajoute aux classes de la maquette.

- [ ] **Step 1 : Tests des fonctions pures du menu**

Créer `src/composants/maquette/menu.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { filtrerOptions, placerMenu, type OptionMenu } from './menu';

const OPTIONS: OptionMenu[] = [
	{ v: '', t: '— non attribué —' }, { sep: true },
	{ v: 'a', t: 'PLÂTRERIE DELAUNAY', meta: 'MOISDON-LA-RIVIÈRE' },
	{ v: 'b', t: 'AM COUVERTURE', meta: 'DERVAL' },
	{ tete: 'Archivées' },
	{ v: 'c', t: 'ISSÉ MENUISERIE', meta: 'ISSÉ' },
];

describe('filtrerOptions (ddFiltre de la maquette)', () => {
	it('sans recherche : tout, séparateurs et intertitres compris', () => {
		expect(filtrerOptions(OPTIONS, '  ')).toEqual(OPTIONS);
	});
	it('sans accents ni casse, sur le libellé et le complément ; les séparateurs disparaissent', () => {
		expect(filtrerOptions(OPTIONS, 'platrerie')).toEqual([OPTIONS[2]]);
		expect(filtrerOptions(OPTIONS, 'derval')).toEqual([OPTIONS[3]]);
		expect(filtrerOptions(OPTIONS, 'isse menui')).toEqual([OPTIONS[5]]);
	});
	it('aucun résultat : liste vide', () => {
		expect(filtrerOptions(OPTIONS, 'zzz')).toEqual([]);
	});
});

describe('placerMenu (ddPlace de la maquette)', () => {
	const fenetre = { largeur: 1440, hauteur: 900 };
	it('sous le bouton quand la place suffit, au moins 240 px de large', () => {
		const bouton = { top: 100, bottom: 140, left: 50, width: 180 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 240, hauteur: 300 }, fenetre)).toEqual({ top: 146, left: 50, largeur: 240, versHaut: false });
	});
	it('au-dessus quand le bas manque et que le haut suffit', () => {
		const bouton = { top: 700, bottom: 740, left: 50, width: 300 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 300, hauteur: 300 }, fenetre)).toEqual({ bottom: 206, left: 50, largeur: 300, versHaut: true });
	});
	it('jamais au-delà du bord droit', () => {
		const bouton = { top: 100, bottom: 140, left: 1300, width: 200 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 320, hauteur: 200 }, fenetre).left).toBe(1440 - 320 - 8);
	});
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm test -- src/composants/maquette/menu.test.ts`
Expected : FAIL, `./menu` introuvable.

- [ ] **Step 3 : `menu.ts`**

Créer `src/composants/maquette/menu.ts` :

```ts
import { normaliser } from '@/domaine/recherche';

export type OptionMenu = { v: string; t: string; meta?: string } | { sep: true } | { tete: string };
export const estChoix = (o: OptionMenu): o is { v: string; t: string; meta?: string } => 'v' in o;

/** ddFiltre : chaque mot doit figurer, sans accents ni casse, dans le libellé ou le complément ; pendant une recherche, plus de séparateurs. */
export function filtrerOptions(options: OptionMenu[], requete: string): OptionMenu[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	if (!mots.length) return options;
	return options.filter((o) => estChoix(o) && mots.every((m) => normaliser(`${o.t} ${o.meta ?? ''}`).includes(m)));
}

/** ddPlace : sous le bouton s'il y a la place, au-dessus sinon, jamais au-delà d'un bord ; 240 px de large au moins. */
export function placerMenu(
	bouton: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
	menu: { largeur: number; hauteur: number },
	fenetre: { largeur: number; hauteur: number },
): { top?: number; bottom?: number; left: number; largeur: number; versHaut: boolean } {
	const largeur = Math.max(bouton.width, 240);
	const versHaut = bouton.bottom + menu.hauteur + 10 > fenetre.hauteur && bouton.top - menu.hauteur - 10 > 0;
	const left = Math.max(8, Math.min(bouton.left, fenetre.largeur - Math.max(largeur, menu.largeur) - 8));
	return versHaut
		? { bottom: fenetre.hauteur - bouton.top + 6, left, largeur, versHaut }
		: { top: bouton.bottom + 6, left, largeur, versHaut };
}
```

Run : `npm test -- src/composants/maquette/menu.test.ts`
Expected : PASS.

- [ ] **Step 4 : Icônes et sigle**

Créer `src/composants/maquette/icones.tsx`. Chaque tracé est copié de la maquette, à la ligne indiquée :

```tsx
/* Les icônes de la maquette (docs/maquette/sentinelle-marches.html), tracé pour tracé. Le trait vient du CSS (.btn svg, .nav-b svg…). */
const svg = (d: React.ReactNode) => function Icone() { return <svg viewBox="0 0 16 16" aria-hidden="true">{d}</svg>; };

export const Maison = svg(<path d="M2 13V6l6-4 6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />);                                   // l. 2134
export const Artisans = svg(<><circle cx="6" cy="5.5" r="2.5" /><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M11 3.2a2.5 2.5 0 0 1 0 4.6" /></>); // l. 2149
export const Soleil = svg(<><circle cx="8" cy="8" r="3.25" /><path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.9 3.1l-1 1M4.1 11.9l-1 1M12.9 12.9l-1-1M4.1 4.1l-1-1" /></>); // l. 2153
export const Marches = svg(<><path d="M2.5 2.5h11v11h-11z" /><path d="M2.5 6h11M6 6v7.5" /></>);                           // l. 2174
export const Planning = svg(<><path d="M2 4.5h12M2 8h12M2 11.5h12" /><path d="M4 3v3M9 6.5v3M6 10v3" /></>);            // l. 2178
export const Documents = svg(<><path d="M4 1.5h5l3 3v10H4z" /><path d="M9 1.5v3h3" /></>);                               // l. 2182
export const Doc = Documents;
export const Plus = svg(<path d="M8 3v10M3 8h10" />);                                                                       // l. 2198
export const Telecharger = svg(<path d="M8 2v8M5 7l3 3 3-3M2.5 13.5h11" />);                                               // l. 2345
export const Imprimer = svg(<><path d="M4.5 6V2h7v4" /><path d="M4.5 11.5h-2v-4h11v4h-2" /><path d="M4.5 9.5h7v5h-7z" /></>); // l. 2405
export const Calendrier = svg(<><path d="M2.5 3.5h11v10h-11z" /><path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" /></>);        // l. 2397
export const Visa = svg(<path d="M2 12c2-1 3-6 5-6s1 5 3 5 2-3 4-3" />);                                                   // l. 2401
export const Coche = svg(<path d="m3.5 8.5 3 3 6-6.5" />);                                                                  // l. 3536
export const Rouvrir = svg(<><path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.2" /><path d="M13.5 2v3h-3" /></>);                     // l. 3535
export const Corbeille = svg(<path d="M2.8 4.3h10.4M6.4 4.3V2.8h3.2v1.5M4.2 4.3l.6 8.9h6.4l.6-8.9" />);                    // l. 3539
export const Loupe = svg(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></>);                              // l. 2208
export const Crayon = svg(<path d="M11.2 2.3a1.3 1.3 0 0 1 1.8 1.8L5.6 11.5l-2.4.6.6-2.4z" />);                            // l. 4835
export const Reactiver = svg(<><path d="M2.5 8a5.5 5.5 0 1 0 1.9-4.2" /><path d="M2.5 2v3h3" /></>);                       // l. 4840
export const Main = svg(<><path d="M5 7.5V3.2a1.1 1.1 0 0 1 2.2 0v3.6" /><path d="M7.2 6.8V2.6a1.1 1.1 0 0 1 2.2 0v4.2" /><path d="M9.4 7V4.1a1.1 1.1 0 0 1 2.2 0v4.6" /><path d="M11.6 8.7V6.9a1.1 1.1 0 0 1 2.2 0v3.2c0 2.4-1.8 4.4-4.2 4.4H8.2c-1 0-1.8-.4-2.4-1.1L2.6 9.9a1.1 1.1 0 0 1 1.6-1.5L5 9.2" /></>); // l. 2424
export const Cible = svg(<><circle cx="8" cy="8" r="5" /><circle cx="8" cy="8" r="1.4" /><path d="M8 .8v2.4M8 12.8v2.4M.8 8h2.4M12.8 8h2.4" /></>); // l. 2428
export const Chevron = svg(<path d="m4 6 4 4 4-4" />);                                                                      // l. 2142
```

Créer `src/composants/maquette/Sigle.tsx`. On y recopie le sprite de la maquette (l. 2060-2091) en JSX : `stop-color` devient `stopColor`, `href` reste `href`.

```tsx
const S = '0,17 15.5,0 70.5,0 86,17 19.8,17 19.8,41.5 86,41.5 86,83 70.5,100 15.5,100 0,83 66.2,83 66.2,58.5 0,58.5';

/** Le sprite du sigle (la plaque gravée, claire et sombre) : une fois par page, dans le layout. */
export function SigleDefs() {
	return (
		<svg className="sigle-defs" width="0" height="0" aria-hidden="true">
			<defs>
				<linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#8ea9c3" /><stop offset="0.38" stopColor="#b8cadd" /><stop offset="0.7" stopColor="#cfdcea" /><stop offset="1" stopColor="#f2f7fb" />
				</linearGradient>
				<linearGradient id="wall-d" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#0b1319" /><stop offset="0.38" stopColor="#17242f" /><stop offset="0.7" stopColor="#22323f" /><stop offset="1" stopColor="#3b5064" />
				</linearGradient>
				<symbol id="plaque-clair" viewBox="0 0 160 160">
					<rect width="160" height="160" rx="6" fill="currentColor" />
					<g transform="translate(33 27)">
						<polygon points={S} fill="#6d89a7" /><polygon points={S} fill="#ffffff" transform="translate(6 6)" /><polygon points={S} fill="url(#wall-l)" transform="translate(3 3)" />
					</g>
				</symbol>
				<symbol id="plaque-sombre" viewBox="0 0 160 160">
					<rect width="160" height="160" rx="6" fill="currentColor" />
					<g transform="translate(33 27)">
						<polygon points={S} fill="#05090d" /><polygon points={S} fill="#4e6d87" transform="translate(6 6)" /><polygon points={S} fill="url(#wall-d)" transform="translate(3 3)" />
					</g>
				</symbol>
			</defs>
		</svg>
	);
}

export function Sigle({ grand = false }: { grand?: boolean }) {
	return (
		<svg className={grand ? 'sigle sigle-lg' : 'sigle'} viewBox="0 0 160 160" aria-hidden="true">
			<use className="pl-clair" href="#plaque-clair" /><use className="pl-sombre" href="#plaque-sombre" />
		</svg>
	);
}
```

- [ ] **Step 5 : Menu déroulant, recherche, interrupteur**

Créer `src/composants/maquette/MenuDeroulant.tsx`. Il reprend `menuDeroulant()`, `ddBascule`, `ddFiltre`, `ddRechercheClavier`, `ddClavier` et `ddPlace` de la maquette (l. 3882-4089) :

```tsx
'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Chevron } from './icones';
import { estChoix, filtrerOptions, placerMenu, type OptionMenu } from './menu';

type Props = {
	id: string;
	/** Le surtitre (« Trier par », « Attribuée à »…). */
	k: string;
	options: OptionMenu[];
	onChoisir: (v: string) => void;
	valeur?: string;
	/** Choix multiple : les valeurs cochées ; le menu ne se referme pas au clic. */
	multi?: boolean;
	valeurs?: string[];
	/** Remplace la valeur affichée sur le bouton (choix multiple). */
	libelle?: string;
	vide?: string;
	/** true : « Rechercher… » ; un texte : son invite. */
	recherche?: boolean | string;
	classe?: string;
	desactive?: boolean;
};

export function MenuDeroulant(p: Props) {
	const [ouvert, setOuvert] = useState(false);
	const [requete, setRequete] = useState('');
	const racine = useRef<HTMLDivElement>(null);
	const bouton = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const [place, setPlace] = useState<React.CSSProperties>({});
	const choisie = p.options.find((o) => estChoix(o) && o.v === p.valeur);
	const libelle = p.libelle ?? (choisie && estChoix(choisie) ? choisie.t : (p.vide ?? '—'));
	const visibles = filtrerOptions(p.options, requete);
	const choix = visibles.filter(estChoix);

	function placer() {
		if (!bouton.current || !menu.current) return;
		const r = placerMenu(bouton.current.getBoundingClientRect(), { largeur: menu.current.offsetWidth, hauteur: menu.current.offsetHeight },
			{ largeur: window.innerWidth, hauteur: window.innerHeight });
		setPlace({ top: r.top, bottom: r.bottom, left: r.left, width: r.largeur });
	}

	useLayoutEffect(() => { if (ouvert) placer(); }, [ouvert, requete]);

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) fermer(); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); bouton.current?.focus(); } };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche, true);
		window.addEventListener('scroll', placer, true);
		window.addEventListener('resize', placer);
		// Un menu avec recherche s'ouvre prêt à taper ; les autres, sur l'entrée courante.
		const champ = menu.current?.querySelector<HTMLInputElement>('.dd-recherche input');
		const courant = menu.current?.querySelector<HTMLElement>('.dd-item.is-current') ?? menu.current?.querySelector<HTMLElement>('.dd-item');
		(champ ?? courant)?.focus({ preventScroll: true });
		return () => {
			document.removeEventListener('click', dehors);
			document.removeEventListener('keydown', touche, true);
			window.removeEventListener('scroll', placer, true);
			window.removeEventListener('resize', placer);
		};
	}, [ouvert]);

	function fermer() { setOuvert(false); setRequete(''); }

	function choisir(v: string) {
		p.onChoisir(v);
		if (!p.multi) fermer();
	}

	/** Les flèches parcourent la liste, comme sur un <select>. */
	function clavierListe(e: React.KeyboardEvent) {
		const items = [...(menu.current?.querySelectorAll<HTMLElement>('.dd-item') ?? [])];
		const i = items.indexOf(document.activeElement as HTMLElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			(e.key === 'Home' ? items[0] : items.at(-1))?.focus();
		}
	}

	return (
		<div ref={racine} id={p.id} className={['dd', p.classe, ouvert && 'is-open est-flottant'].filter(Boolean).join(' ')}>
			<button ref={bouton} type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={ouvert} disabled={p.desactive}
				title={`${p.k} : ${libelle}`} onClick={(e) => { e.stopPropagation(); if (ouvert) fermer(); else setOuvert(true); }}
				onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ouvert) { e.preventDefault(); setOuvert(true); } }}>
				<span className="dd-k">{p.k}</span>
				<span className="dd-v">{libelle}</span>
				<svg className="dd-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			{ouvert && (
				<div ref={menu} className="dd-menu" role="listbox" aria-label={p.k} style={place} onKeyDown={clavierListe}>
					{p.recherche && (
						<div className="dd-recherche">
							<input type="search" placeholder={p.recherche === true ? 'Rechercher…' : p.recherche} aria-label={`Rechercher dans ${p.k}`}
								autoComplete="off" value={requete} onChange={(e) => setRequete(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); if (choix[0]) choisir(choix[0].v); }
									else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); menu.current?.querySelector<HTMLElement>('.dd-item')?.focus(); }
								}} />
						</div>
					)}
					{visibles.map((o, i) => {
						if ('sep' in o) return <hr key={`sep${i}`} className="dd-sep" />;
						if ('tete' in o) return <div key={`tete${i}`} className="dd-head">{o.tete}</div>;
						const courant = p.multi ? (p.valeurs ?? []).includes(o.v) : o.v === p.valeur;
						return (
							<button key={o.v} type="button" role="option" aria-selected={courant} data-v={o.v}
								className={['dd-item', courant && 'is-current', p.multi && 'dd-coche'].filter(Boolean).join(' ')}
								onClick={(e) => { e.stopPropagation(); choisir(o.v); }}>
								<span className="dd-item-name">{o.t}</span>
								{o.meta && <span className="dd-item-meta">{o.meta}</span>}
							</button>
						);
					})}
					{!choix.length && <p className="dd-aucun">Aucun résultat.</p>}
				</div>
			)}
		</div>
	);
}
```

`Chevron` n'est pas utilisé ici (le caret a sa classe propre) : retirer son import si ESLint le signale.

Créer `src/composants/maquette/Recherche.tsx` :

```tsx
import { Loupe } from './icones';

/** La barre de recherche de la maquette (.search) : loupe et champ nu. */
export function Recherche({ placeholder, valeur, onChange, libelle, id }: { placeholder: string; valeur: string; onChange: (v: string) => void; libelle?: string; id?: string }) {
	return (
		<div className="search">
			<Loupe />
			<input id={id} type="search" placeholder={placeholder} aria-label={libelle ?? placeholder} value={valeur} onChange={(e) => onChange(e.target.value)} />
		</div>
	);
}
```

Créer `src/composants/maquette/Interrupteur.tsx` :

```tsx
/** L'interrupteur de la maquette (.switch) : une case à cocher habillée. */
export function Interrupteur({ coche, onChange, children, id }: { coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode; id?: string }) {
	return (
		<label className="switch">
			<input type="checkbox" id={id} checked={coche} onChange={(e) => onChange(e.target.checked)} />
			<span className="switch-box" aria-hidden="true" />
			{children}
		</label>
	);
}
```

- [ ] **Step 6 : Confirmation, panneau, toasts**

Créer `src/composants/maquette/Confirmation.tsx`. C'est `demande()` de la maquette (l. 3238) : une seule fenêtre `.ask` à la fois, qui remplace `window.confirm`.

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Demande = { texte: React.ReactNode; libelle: string; dangereux?: boolean };
type EnCours = Demande & { resoudre: (oui: boolean) => void };

const Contexte = createContext<((d: Demande) => Promise<boolean>) | null>(null);

/** La fenêtre de confirmation de la maquette (.ask). Annuler, Échap ou un clic hors de la carte : non. */
export function ConfirmationFournisseur({ children }: { children: React.ReactNode }) {
	const [enCours, setEnCours] = useState<EnCours | null>(null);
	const oui = useRef<HTMLButtonElement>(null);

	const demander = useCallback((d: Demande) => new Promise<boolean>((resoudre) => {
		setEnCours((avant) => {
			avant?.resoudre(false);   // jamais deux fenêtres : la précédente vaut « non »
			return { ...d, resoudre };
		});
	}), []);

	function repondre(r: boolean) {
		enCours?.resoudre(r);
		setEnCours(null);
	}

	useEffect(() => {
		if (!enCours) return;
		oui.current?.focus();
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); repondre(false); } };
		window.addEventListener('keydown', touche, true);
		return () => window.removeEventListener('keydown', touche, true);
	});

	return (
		<Contexte.Provider value={demander}>
			{children}
			{/* data-bloque-clavier, seulement ouverte : le planning ignore ses raccourcis tant qu'un tel élément existe (useClavier). */}
			<div className={enCours ? 'ask is-on' : 'ask'} role="dialog" aria-modal="true" aria-labelledby="ask-txt"
				data-bloque-clavier={enCours ? '' : undefined}
				onClick={(e) => { if (e.target === e.currentTarget) repondre(false); }}>
				{enCours && (
					<div className="ask-card">
						<p className="ask-txt" id="ask-txt">{enCours.texte}</p>
						<div className="ask-actions">
							<button type="button" className="btn" onClick={() => repondre(false)}>Annuler</button>
							<button ref={oui} type="button" className={enCours.dangereux ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => repondre(true)}>{enCours.libelle}</button>
						</div>
					</div>
				)}
			</div>
		</Contexte.Provider>
	);
}

export function useConfirmation() {
	const demander = useContext(Contexte);
	if (!demander) throw new Error('useConfirmation hors de ConfirmationFournisseur');
	return demander;
}
```

Créer `src/composants/maquette/Panneau.tsx`. C'est le panneau latéral de la maquette (`.scrim` + `aside.panel`, l. 2506-2527) :

```tsx
'use client';

import { useEffect } from 'react';

type Props = {
	ouvert: boolean;
	/** L'eyebrow (« LOT 02 », « ENTREPRISE »). */
	surtitre: string;
	titre: string;
	onFermer: () => void;
	pied?: React.ReactNode;
	/** Nom accessible de la surcouche ; par défaut le titre. */
	libelle?: string;
	children: React.ReactNode;
};

/** Échap le ferme, le fond le ferme, la page derrière ne défile plus (html:has(.panel.is-on) dans la maquette). */
export function Panneau({ ouvert, surtitre, titre, onFermer, pied, libelle, children }: Props) {
	useEffect(() => {
		if (!ouvert) return;
		// Une confirmation ouverte garde Échap pour elle.
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on')) onFermer(); };
		window.addEventListener('keydown', touche);
		return () => window.removeEventListener('keydown', touche);
	}, [ouvert, onFermer]);
	return (
		<>
			<div className={ouvert ? 'scrim is-on' : 'scrim'} onClick={onFermer} />
			{/* data-bloque-clavier, seulement ouvert : sinon les raccourcis du planning seraient coupés en permanence (useClavier). */}
			<aside className={ouvert ? 'panel is-on' : 'panel'} role="dialog" aria-label={libelle ?? titre} aria-hidden={!ouvert}
				data-bloque-clavier={ouvert ? '' : undefined}>
				<div className="panel-head">
					<div>
						<div className="eyebrow">{surtitre}</div>
						<h2 style={{ fontSize: '1.125rem' }}>{titre}</h2>
					</div>
					<button type="button" className="btn btn-ghost btn-sm" onClick={onFermer} aria-label="Fermer">✕</button>
				</div>
				<div className="panel-body">{ouvert && children}</div>
				{pied && <div className="panel-foot">{pied}</div>}
			</aside>
		</>
	);
}
```

Créer `src/composants/maquette/Toasts.tsx`. Ce sont les toasts de la maquette (`.toast-zone` / `.toast`, en bas au centre, 3,6 s), portés par sonner sans son habillage :

```tsx
'use client';

import { Toaster } from 'sonner';

export function Toasts() {
	return (
		<Toaster position="bottom-center" duration={3600} gap={8}
			toastOptions={{ unstyled: true, classNames: { toast: 'toast', title: '', description: '' } }} />
	);
}
```

Dans `src/app/layout.tsx`, `<Toasts />` remplace le `Toaster` de shadcn. Les appels `toast.success(…)` et `toast.error(…)` existants restent tels quels.

- [ ] **Step 7 : ChampEnLigne aux classes de la maquette**

Dans `src/composants/ChampEnLigne.tsx` :
1. retirer l'import de `cn` ;
2. ajouter la prop `variante?: 'texte' | 'texte-mini' | 'montant' | 'montant-mini' | 'champ'` (défaut `'texte'`) ;
3. retirer la prop `alignement` : la variante `montant` porte l'alignement ;
4. ajouter la prop `id?: string`, posée sur le champ, pour qu'un `<label htmlFor>` de la maquette le désigne (`communs.id = id`) ;
5. remplacer le calcul de `classes` par :

```ts
const CLASSES = { texte: 'text-input', 'texte-mini': 'text-input mini', montant: 'money-input', 'montant-mini': 'money-input mini', champ: '' } as const;
// …
const classes = [CLASSES[variante], enErreur && 'est-erreur', enCours && 'est-en-cours', className].filter(Boolean).join(' ');
```

Puis, dans tout le dépôt, remplacer `alignement="droite"` par `variante="montant"` (`git grep -n 'alignement="droite"' src`). Les écrans sont réécrits dans les tâches suivantes : cette substitution garde l'app compilable d'ici là.

- [ ] **Step 8 : Vérifier**

Run : `npx tsc --noEmit && npm test -- src/composants/maquette && npx eslint src/composants/maquette src/composants/ChampEnLigne.tsx`
Expected : aucune erreur ; PASS.

- [ ] **Step 9 : Commit**

```bash
git add src/composants/maquette src/composants/ChampEnLigne.tsx src/app/layout.tsx $(git grep -l 'variante="montant"' src)
git commit -m "feat(interface): composants de la maquette (icônes, sigle, menu déroulant, confirmation, panneau, toasts)"
```

---

### Task 3 : Le banc de conformité (références de la maquette)

**Files :**
- Create: `e2e/conformite/preparer-maquette.ts`, `e2e/conformite/ecrans.ts`, `e2e/conformite/conformite.spec.ts`, `playwright.conformite.config.ts`, `e2e/conformite/references/*.png` (générées)
- Modify: `package.json`

**Interfaces :**
- Consumes : `lundiIso(annee, semaine)` (`src/domaine/semaines.ts`), `construireDonneesMarche(lotId, maintenant)`, `construireDonneesRecap(chantierId, maintenant)` (`src/documents/donnees.ts`), `empreinteDocument(donnees)` (`src/documents/batir.ts`), `SERIES.RECAPITULATIF` (`src/documents/series.ts`).
- Produces :
  - `npm run conformite:references` (captures de la maquette) et `npm run test:conformite` (comparaison de l'app) ;
  - `ECRANS: Ecran[]` et `ouvrirEcran(page, cible, ecran)` (`e2e/conformite/ecrans.ts`), que chaque tâche d'écran fait passer au vert.

Le banc charge dans la base de test **les données de démonstration de la maquette** (`seed()`, l. 3075-3150) et rien d'autre. Il ne tourne donc jamais en même temps que `npm run test:e2e`, qui remplit la même base avec d'autres chantiers. Les captures sont faites à 1440 × 900, en thème clair, horloge figée au 2026-09-30 10:00 (heure de Paris), polices servies depuis `public/polices` pour les deux cibles.

- [ ] **Step 1 : Les données de la maquette en base**

Créer `e2e/conformite/preparer-maquette.ts` :

```ts
import 'dotenv/config';
import { construireDonneesMarche, construireDonneesRecap } from '../../src/documents/donnees';
import { empreinteDocument } from '../../src/documents/batir';
import { SERIES } from '../../src/documents/series';
import { lundiIso } from '../../src/domaine/semaines';
import { prisma } from '../../src/donnees/prisma';

/*
 * Le jeu de démonstration de la maquette (seed(), l. 3075-3150), à l'identique : les 4 chantiers, leurs lots,
 * avenants, périodes, fermetures et les 6 documents de PERRIER. Base de test seulement.
 */
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);
type L = [numero: string | null, designation: string, entreprise: string | null, ht: number, nature?: 'SOUS_TRAITANCE', plus?: { dateSignature?: string; avenants?: [devis: string, ht: number, date: string, objet: string][] }];

const PLAN: Record<string, [couleur: string, periodes: [string, number, number, number][]]> = {
	'TERRASSEMENT — V.R.D.': ['noir', [['Accès et plateforme', 2026, 15, 1], ['Terrassements finaux', 2026, 42, 2]]],
	'GROS ŒUVRE': ['noir', [['Fondations et soubassements', 2026, 16, 3], ['Élévation RDC', 2026, 20, 4], ['Plancher intermédiaire', 2026, 25, 2], ['Élévation étage', 2026, 28, 3], ['Appuis et seuils', 2026, 38, 1]]],
	'CHARPENTE': ['vert-clair', [['Montage charpente', 2026, 33, 2]]],
	'COUVERTURE': ['bleu-fonce', [['Couverture et gouttières', 2026, 36, 2]]],
	'MENUISERIES EXTÉRIEURES': ['vert-fonce', [['Pose des menuiseries', 2026, 38, 2], ['Réglages de fin de chantier', 2027, 8, 1]]],
	'ENDUIT EXTÉRIEUR': ['orange', [['Dégrossi des façades', 2026, 41, 2]]],
	'PLÂTRERIE — ISOLATION': ['jaune', [['Isolation périphérique', 2026, 43, 2], ['Plafonds et cloisons', 2026, 46, 3]]],
	'PLOMBERIE — CHAUFFAGE — V.M.C.': ['rouge', [['Réseaux avant doublage', 2026, 40, 1], ['Pose des appareils', 2026, 48, 2]]],
	'ÉLECTRICITÉ': ['rouge', [['Passage des réseaux', 2026, 40, 1], ['Appareillage', 2026, 49, 2]]],
	'CARRELAGE — FAÏENCE': ['violet', [['Chape', 2026, 50, 1], ['Carrelage et faïence', 2027, 2, 3]]],
	'ESCALIER': ['vert-fonce', [['Fourniture et pose', 2027, 3, 1]]],
	'MENUISERIES INTÉRIEURES': ['vert-fonce', [['Pose des portes', 2027, 5, 2]]],
	'PEINTURE': ['bleu-clair', [['Peintures', 2027, 7, 3]]],
};
const CHAINE = ['Accès et plateforme', 'Fondations et soubassements', 'Élévation RDC', 'Plancher intermédiaire', 'Élévation étage',
	'Montage charpente', 'Couverture et gouttières', 'Pose des menuiseries', 'Isolation périphérique', 'Plafonds et cloisons', 'Chape',
	'Carrelage et faïence', 'Pose des portes', 'Peintures'];

const CHANTIERS: { reference: string; maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string;
	mission: 'COMPLETE' | 'PARTIELLE'; dateSignaturePrevue: string | null; termine: boolean; creeLe: string; lots: L[]; planning?: true }[] = [
	{ reference: 'PERRIER — Louisfert', maitreOuvrage: 'M. et Mme PERRIER', adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
		natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT',
		mission: 'COMPLETE', dateSignaturePrevue: '2026-04-03', termine: false, creeLe: '2026-08-31', planning: true, lots: [
			['01', 'TERRASSEMENT — V.R.D.', 'GILLOT TP', 18400],
			['02', 'GROS ŒUVRE', 'CONSTRUCTIONS REBOURS', 96250, undefined, { dateSignature: '2026-04-03', avenants: [['106', 3720, '2026-05-18', 'Reprise de fondations en terrain hétérogène']] }],
			['03', 'CHARPENTE', 'CHARPENTE ET CONSTRUCTIONS BOIS', 21900],
			['04', 'COUVERTURE', 'AM COUVERTURE', 27480],
			['05', 'MENUISERIES EXTÉRIEURES', 'ISSÉ MENUISERIE', 34150, undefined, { dateSignature: '2026-04-10', avenants: [['241', -280, '2026-06-02', 'Volet roulant abandonné sur la porte de service']] }],
			['06', 'PLÂTRERIE — ISOLATION', 'PLÂTRERIE DELAUNAY', 29700],
			['07', 'MENUISERIES INTÉRIEURES', 'MENUISERIES DU DON', 16250],
			['08', 'ÉLECTRICITÉ', 'MATELEC', 14900],
			['09', 'PLOMBERIE — CHAUFFAGE — V.M.C.', 'CMP PLUMEJEAU', 23800],
			['10', 'CARRELAGE — FAÏENCE', 'MD CARRELAGE', 12600],
			['11', 'PEINTURE', "LA DÉCO'TECH", 9450],
			[null, 'ESCALIER', 'PASSION BOIS', 6800, 'SOUS_TRAITANCE'],
			['12', 'ENDUIT EXTÉRIEUR', null, 0],
		] },
	{ reference: 'GUÉRIN — Erbray', maitreOuvrage: 'M. GUÉRIN', adresseClient: '3 rue des Forges, 44110 ERBRAY', natureTravaux: 'Extension et surélévation — 68 m²',
		adresse: 'La Rivaudière', cp: '44110', commune: 'ERBRAY', mission: 'PARTIELLE', dateSignaturePrevue: '2026-02-10', termine: true, creeLe: '2026-08-01', lots: [
			// « LORAND MACONNERIE » dans la maquette (faute de frappe, hors référentiel) : l'entreprise du référentiel la remplace ; le chantier est terminé, donc masqué.
			['01', 'GROS ŒUVRE', 'LORAND MAÇONNERIE', 41200], ['02', 'CHARPENTE — COUVERTURE', 'BD COUVERTURE', 38600],
			['03', 'MENUISERIES EXTÉRIEURES', 'MENUISERIE SAVOURÉ', 22400], ['04', 'PLÂTRERIE', 'PLÂTRERIE DELAUNAY', 21300],
		] },
	{ reference: 'SCI LES CHÊNES — Derval', maitreOuvrage: 'SCI LES CHÊNES', adresseClient: '4 rue du Bourg, 44590 DERVAL', natureTravaux: "Réhabilitation d'un corps de ferme",
		adresse: '4 rue du Bourg', cp: '44590', commune: 'DERVAL', mission: 'COMPLETE', dateSignaturePrevue: null, termine: false, creeLe: '2026-07-02', lots: [
			['01', 'DÉMOLITION — TERRASSEMENT', 'HERVÉ TP', 26800], ['02', 'MAÇONNERIE', 'SOCIÉTÉ MAÇONNERIE GLAINOISE', 118400],
			['03', 'CHARPENTE', 'MC3 BOIS', 44900], ['04', 'COUVERTURE', 'FERRÉ COUVERTURE', 51200], ['05', 'ENDUIT EXTÉRIEUR', 'ROBERT ENDUIT', 33500],
			['06', 'ÉLECTRICITÉ', null, 0],
		] },
	{ reference: 'MOREAU — Soudan', maitreOuvrage: 'M. et Mme MOREAU', adresseClient: '', natureTravaux: 'Maison individuelle — 96 m²', adresse: 'Le Bois Joli',
		cp: '44110', commune: 'SOUDAN', mission: 'COMPLETE', dateSignaturePrevue: null, termine: false, creeLe: '2026-06-02', lots: [] },
];

async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
	const artisans = new Map((await prisma.artisan.findMany({ select: { id: true, nom: true } })).map((a) => [a.nom, a.id]));

	for (const c of CHANTIERS) {
		const chantier = await prisma.chantier.create({ data: {
			reference: c.reference, maitreOuvrage: c.maitreOuvrage, adresseClient: c.adresseClient, natureTravaux: c.natureTravaux,
			adresse: c.adresse, cp: c.cp, commune: c.commune, mission: c.mission, termine: c.termine, creeLe: jour(c.creeLe),
			dateSignaturePrevue: c.dateSignaturePrevue ? jour(c.dateSignaturePrevue) : null, chargeAffaireId: admin.id, creeParId: admin.id,
		} });
		const periodes = new Map<string, string>();
		for (const [i, [numero, designation, entreprise, ht, nature, plus]] of c.lots.entries()) {
			const artisanId = entreprise ? artisans.get(entreprise) : null;
			if (entreprise && !artisanId) throw new Error(`Entreprise absente du référentiel : ${entreprise}`);
			const plan = c.planning ? PLAN[designation] : undefined;
			const lot = await prisma.lot.create({ data: {
				chantierId: chantier.id, ordre: i + 1, numero, designation, nature: nature ?? 'GRE_A_GRE', artisanId, montantHtInitial: ht,
				exemplaires: nature ? 2 : 3, couleur: plan?.[0] ?? 'noir', dateSignature: plus?.dateSignature ? jour(plus.dateSignature) : null,
				dernierNumeroAvenant: plus?.avenants?.length ?? 0,
			} });
			for (const [n, [devis, montantHt, date, objet]] of (plus?.avenants ?? []).entries()) {
				await prisma.avenant.create({ data: { lotId: lot.id, numero: n + 1, devis, montantHt, date: jour(date), objet } });
			}
			for (const [intitule, annee, semaine, duree] of plan?.[1] ?? []) {
				const p = await prisma.periode.create({ data: { lotId: lot.id, intitule, debut: lundiIso(annee, semaine), duree } });
				periodes.set(intitule, p.id);
			}
		}
		// L'enchaînement de la maquette : chaque intitulé attend la fin du précédent.
		for (const [i, nom] of CHAINE.entries()) {
			const id = periodes.get(nom), avant = periodes.get(CHAINE[i - 1] ?? '');
			if (i && id && avant) await prisma.periode.update({ where: { id }, data: { dependDeId: avant } });
		}
		if (c.planning) {
			await prisma.fermeture.createMany({ data: [
				{ chantierId: chantier.id, libelle: "Congés d'été", debut: lundiIso(2026, 31), duree: 2 },
				{ chantierId: chantier.id, libelle: 'Congés de Noël', debut: lundiIso(2026, 52), duree: 2 },
			] });
			await documentsPerrier(chantier.id, admin.id);
		}
	}
	console.log('Conformité : les 4 chantiers de la maquette sont prêts.');
}

/** Les 6 documents de PERRIER dans la maquette, à jour des données (même empreinte que l'état calculé). PDF factice : base de test. */
async function documentsPerrier(chantierId: string, creeParId: string) {
	const lots = await prisma.lot.findMany({ where: { chantierId }, select: { id: true, numero: true, designation: true, nature: true } });
	const lot = (designation: string) => lots.find((l) => l.designation === designation)!;
	const maintenant = new Date('2026-09-30T08:00:00Z');
	const marche = async (designation: string, version: number, le: string) => {
		const l = lot(designation);
		const { donnees } = await construireDonneesMarche(l.id, maintenant);
		await prisma.document.create({ data: {
			chantierId, lotId: l.id, serie: l.id, type: donnees.type, version, donnees: donnees as object, empreinte: empreinteDocument(donnees),
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: `PERRIER-${l.numero ?? 'ST'}-v${version}.pdf`, creeParId, creeLe: new Date(`${le}T09:00:00Z`),
		} });
	};
	const recap = async (version: number, le: string) => {
		const { donnees } = await construireDonneesRecap(chantierId, maintenant);
		await prisma.document.create({ data: {
			chantierId, lotId: null, serie: SERIES.RECAPITULATIF, type: 'RECAPITULATIF', version, donnees: donnees as object, empreinte: empreinteDocument(donnees),
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: `PERRIER-Recap-v${version}.pdf`, creeParId, creeLe: new Date(`${le}T09:00:00Z`),
		} });
	};
	await recap(1, '2026-03-26');
	await marche('GROS ŒUVRE', 2, '2026-04-02');
	await marche('ESCALIER', 1, '2026-04-02');
	await marche('PLOMBERIE — CHAUFFAGE — V.M.C.', 1, '2026-04-02');
	await marche('PEINTURE', 1, '2026-04-02');
	await recap(3, '2026-06-18');
}

main()
	.catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
	.finally(() => prisma.$disconnect());
```

Si l'état calculé par `etatsDocumentsChantier` diffère (une case « modifié » apparaît pour un de ces documents), c'est que son empreinte dépend de la date du jour. Dans ce cas, passer à `construireDonnees*` la même date que celle utilisée par la page Documents. Le résultat attendu est un écran identique à la maquette, sans « modifié ».

- [ ] **Step 2 : Les écrans et leurs chemins**

Créer `e2e/conformite/ecrans.ts`. Les mêmes clics mènent à chaque écran dans la maquette et dans l'app, puisque l'app en reprend les libellés. Seule la connexion diffère.

```ts
import { expect, type Page } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Cible = 'maquette' | 'app';
export type Ecran = { nom: string; masques?: string[]; aller?: (page: Page) => Promise<void> };

const MAQUETTE = pathToFileURL(path.resolve('docs/maquette/sentinelle-marches.html')).href;
const POLICES: Record<string, string> = {
	'Figtree:400': 'figtree-400', 'Figtree:500': 'figtree-500', 'Figtree:600': 'figtree-600',
	'Outfit:500': 'outfit-500', 'Outfit:600': 'outfit-600', 'Outfit:700': 'outfit-700',
	'Spline Sans Mono:400': 'spline-sans-mono-400', 'Spline Sans Mono:500': 'spline-sans-mono-500', 'Spline Sans Mono:600': 'spline-sans-mono-600',
};

/** Mêmes polices des deux côtés, sans réseau : la feuille Google Fonts de la maquette pointe vers public/polices. */
async function policesLocales(page: Page) {
	const css = Object.entries(POLICES).map(([cle, fichier]) => {
		const [famille, poids] = cle.split(':');
		return `@font-face{font-family:'${famille}';font-weight:${poids};font-display:block;src:url('https://fonts.gstatic.com/local/${fichier}.woff2') format('woff2')}`;
	}).join('\n');
	await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: css }));
	await page.route('https://fonts.gstatic.com/local/**', (r) => r.fulfill({
		path: `public/polices/${path.basename(new URL(r.request().url()).pathname)}`,
		contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' },
	}));
}

export async function preparer(page: Page, cible: Cible) {
	await page.clock.setFixedTime(new Date('2026-09-30T10:00:00+02:00'));
	await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
	if (cible === 'maquette') await policesLocales(page);
	await page.goto(cible === 'maquette' ? MAQUETTE : '/connexion');
	await page.evaluate(() => document.fonts.ready);
}

export async function seConnecterSur(page: Page, cible: Cible) {
	if (cible === 'app') {
		await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL ?? '');
		await page.getByLabel('Mot de passe').fill(process.env.ADMIN_MOT_DE_PASSE ?? '');
	}
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
}

const ouvrirPerrier = async (page: Page) => {
	await page.locator('.chantier', { hasText: 'PERRIER — Louisfert' }).first().click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
};
const onglet = (nom: string) => async (page: Page) => {
	await ouvrirPerrier(page);
	await page.locator('.nav-o', { hasText: nom }).click();
};

export const ECRANS: Ecran[] = [
	{ nom: 'connexion', masques: ['.login-foot'] },
	{ nom: 'chantiers', aller: async () => {} },
	{ nom: 'selecteur', aller: async (page) => { await page.locator('.picker-btn').click(); } },
	{ nom: 'compte', masques: ['.compte-menu'], aller: async (page) => { await page.locator('.avatar').click(); } },
	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
	{ nom: 'nouveau', masques: ['.field:has(#f-ca)'], aller: async (page) => { await page.locator('.topbar-actions .btn-primary', { hasText: 'Nouveau chantier' }).click(); } },
	{ nom: 'marches', aller: ouvrirPerrier },
	{ nom: 'panneau-lot', aller: async (page) => { await ouvrirPerrier(page); await page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent').click(); } },
	{ nom: 'planning', masques: ['.g-auj', '.g-sems .auj'], aller: async (page) => {
		await onglet('Planning')(page);
		await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
	} },
	{ nom: 'documents', aller: onglet('Documents') },
	{ nom: 'artisans', aller: async (page) => { await page.locator('.nav-b', { hasText: 'Artisans' }).click(); } },
];

export async function ouvrirEcran(page: Page, cible: Cible, ecran: Ecran) {
	await preparer(page, cible);
	if (ecran.nom === 'connexion') {
		// L'app n'a pas de valeurs préremplies : on tape celles que montre la maquette.
		if (cible === 'app') {
			await page.getByLabel('Adresse e-mail').fill('a.jouan@socoreve.fr');
			await page.getByLabel('Mot de passe').fill('demonstration');
		}
		return;
	}
	await seConnecterSur(page, cible);
	await ecran.aller?.(page);
	await page.mouse.move(0, 0);   // aucun survol dans la capture
}
```

Le menu du compte est masqué dans la comparaison : ses entrées diffèrent (écart 1). Seuls l'avatar et la position du menu sont comparés.

- [ ] **Step 3 : La comparaison**

Créer `e2e/conformite/conformite.spec.ts` :

```ts
import { expect, test } from '@playwright/test';
import { ECRANS, ouvrirEcran, type Cible } from './ecrans';

/** « maquette » : capture les références (avec --update-snapshots) ; « app » (défaut) : compare l'app aux références. */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;

for (const ecran of ECRANS) {
	test(`${ecran.nom} : l'app est la maquette`, async ({ page }) => {
		await ouvrirEcran(page, CIBLE, ecran);
		await expect(page).toHaveScreenshot(`${ecran.nom}.png`, {
			animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
			mask: (ecran.masques ?? []).map((m) => page.locator(m)),
		});
	});
}
```

Créer `playwright.conformite.config.ts` :

```ts
import { defineConfig, devices } from '@playwright/test';

/** Banc de conformité à la maquette : sa propre base (les 4 chantiers de la maquette) ; jamais en même temps que test:e2e. */
export default defineConfig({
	testDir: 'e2e/conformite',
	snapshotPathTemplate: '{testDir}/references/{arg}{ext}',
	fullyParallel: false,
	workers: 1,
	use: { baseURL: 'http://localhost:3200', locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure',
		...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
	webServer: {
		command: 'npm run conformite:serveur',
		url: 'http://localhost:3200/connexion',
		timeout: 300_000,
		reuseExistingServer: false,
	},
});
```

Dans `package.json`, section `scripts` :

```json
"conformite:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 BETTER_AUTH_URL=http://localhost:3200 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/conformite/preparer-maquette.ts && next build && next start -p 3200'",
"conformite:references": "CONFORMITE_CIBLE=maquette playwright test -c playwright.conformite.config.ts --update-snapshots",
"test:conformite": "playwright test -c playwright.conformite.config.ts"
```

Exclure le dossier du banc de la configuration E2E habituelle : dans `playwright.config.ts`, ajouter `testIgnore: ['conformite/**'],`.

- [ ] **Step 4 : Capturer les références**

Run : `npm run conformite:references`
Expected : 10 fichiers dans `e2e/conformite/references/` (`connexion.png` … `artisans.png`). Les tests « échouent » à ce premier passage parce que les références manquaient ; c'est normal avec `--update-snapshots`. Ouvrir 3 captures (`chantiers.png`, `marches.png`, `documents.png`) et vérifier qu'elles montrent bien la maquette : cartes MOREAU / PERRIER / SCI LES CHÊNES, barre des totaux, 4 cartes Documents.

- [ ] **Step 5 : Constater l'écart de l'app**

Run : `npm run test:conformite`
Expected : FAIL sur les 10 écrans (l'app n'a pas encore la barre de la maquette). C'est l'état de départ ; chaque tâche suivante fait passer ses écrans au vert.

- [ ] **Step 6 : Commit**

```bash
git add e2e/conformite playwright.conformite.config.ts playwright.config.ts package.json
git commit -m "test(interface): banc de conformité, captures de la maquette sur ses données de démonstration"
```


---

### Task 4 : La barre de navigation et le cadre de l'application

**Files :**
- Create: `src/donnees/navigation.ts`, `src/donnees/navigation.int.test.ts`, `src/composants/maquette/Ecran.tsx`, `src/composants/navigation/BarreNavigation.tsx`, `src/composants/navigation/SelecteurChantier.tsx`, `src/composants/navigation/MenuCompte.tsx`, `src/composants/navigation/chantierOuvert.ts`, `e2e/navigation.spec.ts`
- Modify: `src/app/(app)/layout.tsx`, `src/app/(app)/chantiers/[id]/layout.tsx`
- Delete: `src/composants/EnTeteApp.tsx`, `src/composants/EnTeteChantier.tsx`

**Interfaces :**
- Consumes : `UtilisateurConnecte` (`src/auth/session.ts`), `deconnexionAction` (`src/actions/session.ts`), `Sigle`, `SigleDefs`, `Icone.*`, `basculerTheme` (Tasks 1-2).
- Produces :
  - `type ChantierNavigation = { id: string; reference: string; termine: boolean; lots: number; periodes: number; documents: number }` ;
  - `type VueNavigation = { chantiers: ChantierNavigation[]; artisans: number }` et `lireNavigation(): Promise<VueNavigation>` ;
  - `<Ecran titre sousTitre? actions? contexte?>{corps}</Ecran>` (`src/composants/maquette/Ecran.tsx`), utilisé par tous les écrans ;
  - `CLE_CHANTIER_OUVERT = 'sentinelle-chantier-ouvert'`, `lireChantierOuvert(): string | null`, `<MemoriserChantierOuvert id />` (`chantierOuvert.ts`), lus par la Task 6 (pastille « Ouvert »).

La barre est celle de `header.nav` (l. 2123-2195). Au-dessus du filet : le sigle, l'accueil, le sélecteur de chantier, les Artisans, le thème, le compte. En dessous, sur les trois écrans d'un chantier seulement : les onglets Marchés, Planning et Documents avec leurs compteurs. Ailleurs, `.app` porte `sans-onglets`, comme `majOnglets()`.

- [ ] **Step 1 : Test d'intégration des compteurs**

Créer `src/donnees/navigation.int.test.ts` (mêmes aides que `src/donnees/chantiers.int.test.ts`) :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { lundiIso } from '@/domaine/semaines';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { lireNavigation } from './navigation';
import { prisma } from './prisma';

describe('lireNavigation', () => {
	beforeEach(viderBase);

	it('compte les lots, les périodes et les documents de chaque chantier, et toutes les entreprises', async () => {
		const admin = await creerUtilisateurTest();
		const a = await prisma.chantier.create({ data: { reference: 'A — Test', maitreOuvrage: 'A', chargeAffaireId: admin.id, creeParId: admin.id, creeLe: new Date('2026-01-01') } });
		const b = await prisma.chantier.create({ data: { reference: 'B — Test', maitreOuvrage: 'B', termine: true, chargeAffaireId: admin.id, creeParId: admin.id, creeLe: new Date('2026-02-01') } });
		const lot = await prisma.lot.create({ data: { chantierId: a.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.lot.create({ data: { chantierId: a.id, ordre: 2, designation: 'CHARPENTE' } });
		await prisma.periode.createMany({ data: [
			{ lotId: lot.id, intitule: 'Fondations', debut: lundiIso(2026, 16), duree: 3 },
			{ lotId: lot.id, intitule: 'Élévation', debut: lundiIso(2026, 20), duree: 4 },
		] });
		await prisma.artisan.createMany({ data: [{ nom: 'X' }, { nom: 'Y', actif: false }] });

		const vue = await lireNavigation();

		// Du plus récent au plus ancien, comme la liste de la maquette (un nouveau chantier arrive en tête).
		expect(vue.chantiers).toEqual([
			{ id: b.id, reference: 'B — Test', termine: true, lots: 0, periodes: 0, documents: 0 },
			{ id: a.id, reference: 'A — Test', termine: false, lots: 2, periodes: 2, documents: 0 },
		]);
		expect(vue.artisans).toBe(2);   // archivées comprises : la maquette les compte (state.artisans.length)
	});
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm run test:int -- src/donnees/navigation.int.test.ts`
Expected : FAIL, `./navigation` introuvable.

- [ ] **Step 3 : `lireNavigation`**

Créer `src/donnees/navigation.ts` :

```ts
import { prisma } from './prisma';

export type ChantierNavigation = { id: string; reference: string; termine: boolean; lots: number; periodes: number; documents: number };
export type VueNavigation = { chantiers: ChantierNavigation[]; artisans: number };

/** Ce que la barre montre partout : le sélecteur de chantier (renderPicker) et les compteurs des onglets (renderRail). */
export async function lireNavigation(): Promise<VueNavigation> {
	const [chantiers, lots, artisans] = await Promise.all([
		prisma.chantier.findMany({
			orderBy: { creeLe: 'desc' },
			select: { id: true, reference: true, termine: true, _count: { select: { lots: true, documents: true } } },
		}),
		prisma.lot.findMany({ select: { chantierId: true, _count: { select: { periodes: true } } } }),
		prisma.artisan.count(),
	]);
	const periodes = new Map<string, number>();
	for (const l of lots) periodes.set(l.chantierId, (periodes.get(l.chantierId) ?? 0) + l._count.periodes);
	return {
		chantiers: chantiers.map((c) => ({
			id: c.id, reference: c.reference, termine: c.termine,
			lots: c._count.lots, periodes: periodes.get(c.id) ?? 0, documents: c._count.documents,
		})),
		artisans,
	};
}
```

Run : `npm run test:int -- src/donnees/navigation.int.test.ts`
Expected : PASS.

- [ ] **Step 4 : L'écran type et le chantier ouvert**

Créer `src/composants/maquette/Ecran.tsx` :

```tsx
/** Un écran de la maquette : section.screen, sa barre de titre (.topbar) et son corps (.body-pad). */
export function Ecran({ titre, sousTitre, actions, contexte, children }: {
	titre: string;
	/** Sous le titre : le surtitre « 6 documents produits… » de l'écran Documents. */
	sousTitre?: React.ReactNode;
	actions?: React.ReactNode;
	/** Le bandeau .context du chantier (Marchés, Planning). */
	contexte?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="screen is-on">
			<div className="topbar">
				<div className="topbar-row">
					<div>
						<h1 className="page-title">{titre}</h1>
						{sousTitre}
					</div>
					{actions && <div className="topbar-actions">{actions}</div>}
				</div>
				{contexte}
			</div>
			<div className="body-pad">{children}</div>
		</section>
	);
}
```

Créer `src/composants/navigation/chantierOuvert.ts` :

```ts
'use client';

import { useEffect } from 'react';

/** Le dernier chantier ouvert dans ce navigateur : la pastille « Ouvert » de l'accueil (state.currentId de la maquette). */
export const CLE_CHANTIER_OUVERT = 'sentinelle-chantier-ouvert';

export function lireChantierOuvert(): string | null {
	try { return localStorage.getItem(CLE_CHANTIER_OUVERT); } catch { return null; }
}

/** Posé par le layout d'un chantier : ouvrir un chantier en fait le chantier courant. */
export function MemoriserChantierOuvert({ id }: { id: string }) {
	useEffect(() => {
		try { localStorage.setItem(CLE_CHANTIER_OUVERT, id); } catch { /* stockage indisponible : pas de pastille */ }
	}, [id]);
	return null;
}
```

- [ ] **Step 5 : Le sélecteur de chantier**

Créer `src/composants/navigation/SelecteurChantier.tsx`, d'après `renderPicker()` et `togglePicker()` (l. 3823-3870) :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChantierNavigation } from '@/donnees/navigation';

/** Le sélecteur nomme ce qu'on regarde : le chantier sur ses trois écrans, « Tous les chantiers » partout ailleurs. */
export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierNavigation[]; courant: ChantierNavigation | null }) {
	const router = useRouter();
	const [ouvert, setOuvert] = useState(false);
	const racine = useRef<HTMLDivElement>(null);
	const nom = courant ? courant.reference : 'Tous les chantiers';

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		return () => { document.removeEventListener('click', dehors); document.removeEventListener('keydown', touche); };
	}, [ouvert]);

	function aller(href: string) {
		setOuvert(false);
		router.push(href);
	}

	const ligne = (x: ChantierNavigation) => {
		const estCourant = courant?.id === x.id;
		return (
			<button key={x.id} type="button" role="option" aria-selected={estCourant}
				className={['picker-item', estCourant && 'is-current', x.termine && 'is-done'].filter(Boolean).join(' ')}
				onClick={() => aller(`/chantiers/${x.id}/marches`)}>
				<span className="picker-item-name">{x.reference}</span>
				<span className="picker-item-meta">{x.lots ? `${x.lots} lot${x.lots > 1 ? 's' : ''}` : '—'}</span>
			</button>
		);
	};
	const actifs = chantiers.filter((x) => !x.termine);
	const finis = chantiers.filter((x) => x.termine);

	return (
		<div ref={racine} className={ouvert ? 'picker is-open' : 'picker'}>
			<button type="button" className="picker-btn" aria-haspopup="listbox" aria-expanded={ouvert}
				title={courant ? `Chantier ouvert : ${nom}` : 'Tous les chantiers — en ouvrir un'}
				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
				<span className="picker-k">{courant ? 'Chantier ouvert' : 'Affichage'}</span>
				<span className="picker-v">{nom}</span>
				<svg className="picker-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			<div className="picker-menu" role="listbox" aria-label="Choisir un chantier">
				<button type="button" role="option" aria-selected={!courant} className={courant ? 'picker-item' : 'picker-item is-current'} onClick={() => aller('/chantiers')}>
					<span className="picker-item-name">Tous les chantiers</span>
					<span className="picker-item-meta">{chantiers.length}</span>
				</button>
				<hr className="picker-sep" />
				{actifs.length ? actifs.map(ligne) : <div className="picker-head">Aucun chantier en cours</div>}
				{finis.length > 0 && <><hr className="picker-sep" /><div className="picker-head">Terminés</div>{finis.map(ligne)}</>}
				<hr className="picker-sep" />
				<button type="button" className="picker-item picker-new" onClick={() => aller('/chantiers/nouveau')}>
					<span className="picker-item-name">+ Nouveau chantier</span>
				</button>
			</div>
		</div>
	);
}
```

- [ ] **Step 6 : Le menu du compte**

Créer `src/composants/navigation/MenuCompte.tsx`, d'après `renderCompte()` / `toggleCompte()` (l. 4109-4135), avec les entrées de l'écart 1 :

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { deconnexionAction } from '@/actions/session';
import type { UtilisateurConnecte } from '@/auth/session';

/** « Augustin Jouan » → « AJ » (initiales() de la maquette). */
export function initiales(nom: string): string {
	const mots = nom.trim().split(/\s+/).filter(Boolean);
	if (!mots.length) return '—';
	return (mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2)).toUpperCase();
}

export function MenuCompte({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
	const [ouvert, setOuvert] = useState(false);
	const racine = useRef<HTMLDivElement>(null);
	const role = utilisateur.role === 'admin' ? 'Administrateur' : "Maître d'œuvre";

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		return () => { document.removeEventListener('click', dehors); document.removeEventListener('keydown', touche); };
	}, [ouvert]);

	const fermer = () => setOuvert(false);
	return (
		<div ref={racine} className={ouvert ? 'compte is-open' : 'compte'}>
			<button type="button" className="avatar" aria-haspopup="menu" aria-expanded={ouvert} title={`${utilisateur.nom} — ${role}`}
				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
				{initiales(utilisateur.nom)}
			</button>
			<div className="compte-menu" role="menu">
				<div className="compte-id">
					<span className="compte-nom">{utilisateur.nom}</span>
					<span className="compte-role">{role}</span>
					<span className="compte-mail">{utilisateur.email}</span>
				</div>
				<hr className="picker-sep" />
				<Link className="compte-item" role="menuitem" href="/mot-de-passe" onClick={fermer}>Changer mon mot de passe</Link>
				{utilisateur.role === 'admin' && (
					<>
						<Link className="compte-item" role="menuitem" href="/parametres" onClick={fermer}>Paramètres</Link>
						<Link className="compte-item" role="menuitem" href="/admin/comptes" onClick={fermer}>Comptes</Link>
					</>
				)}
				<form action={deconnexionAction}>
					<button type="submit" className="compte-item" role="menuitem">Se déconnecter</button>
				</form>
			</div>
		</div>
	);
}
```

Un `<a class="compte-item">` doit se dessiner comme le `<button>` de la maquette. Ajouter à `src/app/maquette-ajouts.css` :

```css
/* Menu du compte : les entrées de l'app sont des liens et un formulaire (écart 1) — même dessin que les boutons de la maquette. */
a.compte-item { display: block; text-decoration: none; color: inherit; }
.compte-menu form { margin: 0; }
.compte-menu form .compte-item { width: 100%; }
```

- [ ] **Step 7 : La barre**

Créer `src/composants/navigation/BarreNavigation.tsx` :

```tsx
'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { UtilisateurConnecte } from '@/auth/session';
import * as Icone from '@/composants/maquette/icones';
import { Sigle, SigleDefs } from '@/composants/maquette/Sigle';
import { basculerTheme } from '@/composants/maquette/theme';
import type { VueNavigation } from '@/donnees/navigation';
import { MenuCompte } from './MenuCompte';
import { SelecteurChantier } from './SelecteurChantier';

const ONGLETS = [
	{ suffixe: 'marches', texte: 'Marchés', icone: <Icone.Marches />, compte: 'lots' },
	{ suffixe: 'planning', texte: 'Planning', icone: <Icone.Planning />, compte: 'periodes' },
	{ suffixe: 'documents', texte: 'Documents', icone: <Icone.Documents />, compte: 'documents' },
] as const;

/** header.nav de la maquette. Les onglets n'existent que sur les trois écrans d'un chantier (majOnglets). */
export function BarreNavigation({ utilisateur, navigation, children }: { utilisateur: UtilisateurConnecte; navigation: VueNavigation; children: React.ReactNode }) {
	const chemin = usePathname();
	const { id } = useParams<{ id?: string }>();
	const courant = (id && navigation.chantiers.find((c) => c.id === id)) || null;
	const surChantier = courant !== null && ONGLETS.some((o) => chemin.startsWith(`/chantiers/${courant.id}/${o.suffixe}`));
	const accueil = chemin === '/chantiers';

	return (
		<div className={surChantier ? 'app is-on' : 'app is-on sans-onglets'}>
			<SigleDefs />
			<div className="main">
				<header className="nav">
					<div className="nav-haut">
						<Link className="nav-marque" href="/chantiers" title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle /></Link>
						<Link className={accueil ? 'nav-ic is-on' : 'nav-ic'} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
						<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
						<div className="nav-fin">
							<Link className={chemin.startsWith('/artisans') ? 'nav-b is-on' : 'nav-b'} href="/artisans">
								<Icone.Artisans /><span className="nav-txt">Artisans</span><span className="count">{navigation.artisans}</span>
							</Link>
							<button type="button" className="nav-ic" onClick={basculerTheme} title="Basculer clair / sombre" aria-label="Basculer clair / sombre"><Icone.Soleil /></button>
							<MenuCompte utilisateur={utilisateur} />
						</div>
					</div>
					{courant && (
						<div className="nav-onglets">
							{ONGLETS.map((o) => {
								const href = `/chantiers/${courant.id}/${o.suffixe}`;
								return (
									<Link key={o.suffixe} href={href} className={chemin.startsWith(href) ? 'nav-o is-on' : 'nav-o'}>
										{o.icone}{o.texte}<span className="count">{courant[o.compte]}</span>
									</Link>
								);
							})}
						</div>
					)}
				</header>
				{children}
			</div>
		</div>
	);
}
```

Les boutons de la maquette (`button.nav-b`, `button.nav-ic`, `button.nav-o`) deviennent des liens. Ajouter à `maquette-ajouts.css` :

```css
/* Barre de navigation : l'app navigue par liens là où la maquette avait des boutons. */
a.nav-marque, a.nav-ic, a.nav-b, a.nav-o { text-decoration: none; }
```

- [ ] **Step 8 : Les layouts**

Remplacer `src/app/(app)/layout.tsx` :

```tsx
import { exigerPage } from '@/auth/session';
import { ConfirmationFournisseur } from '@/composants/maquette/Confirmation';
import { BarreNavigation } from '@/composants/navigation/BarreNavigation';
import { lireNavigation } from '@/donnees/navigation';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
	const utilisateur = await exigerPage();
	return (
		<ConfirmationFournisseur>
			<BarreNavigation utilisateur={utilisateur} navigation={await lireNavigation()}>{children}</BarreNavigation>
		</ConfirmationFournisseur>
	);
}
```

Remplacer `src/app/(app)/chantiers/[id]/layout.tsx` :

```tsx
import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { MemoriserChantierOuvert } from '@/composants/navigation/chantierOuvert';
import { lireEnTeteChantier } from '@/donnees/chantiers';

export default async function LayoutChantier({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
	await exigerPage();
	const { id } = await params;
	if (!(await lireEnTeteChantier(id))) notFound();
	return (
		<>
			<MemoriserChantierOuvert id={id} />
			{children}
		</>
	);
}
```

Supprimer `src/composants/EnTeteApp.tsx` et `src/composants/EnTeteChantier.tsx`. L'en-tête modifiable revient en Task 8, dans le bandeau `.context`. « Marquer terminé » passe sur la carte du chantier (Task 6).

En attendant les Tasks 6 à 15, les pages gardent leur contenu actuel, dans la barre de la maquette.

- [ ] **Step 9 : Les compteurs suivent**

Créer `e2e/navigation.spec.ts` :

```ts
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Un chantier sans lot, par le formulaire de la Task 7 (ses libellés sont ceux de la maquette). */
async function creerChantierVide(page: Page, reference: string) {
	await page.goto('/chantiers/nouveau');
	await page.getByLabel('Nom du client').fill('M. NAVIGATION');
	await page.getByLabel('Référence dossier').fill(reference);
	await page.getByText('Partir des 13 lots de base').click();
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
}

test('les compteurs de la barre suivent les actions, sans rechargement', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await creerChantierVide(page, `NAV-${Date.now()}`);
	const onglet = (nom: string) => page.locator('.nav-o', { hasText: nom }).locator('.count');
	await expect(onglet('Marchés')).toHaveText('0');
	await page.getByRole('button', { name: 'Ajouter un lot' }).first().click();
	await expect(onglet('Marchés')).toHaveText('1');
	// Hors d'un chantier, pas d'onglets ; le sélecteur dit « Affichage ».
	await page.getByRole('link', { name: 'Tous les chantiers' }).click();
	await expect(page.locator('.nav-onglets')).toBeHidden();
	await expect(page.locator('.picker-k')).toHaveText('Affichage');
});

test('le thème choisi tient au rechargement', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.getByRole('button', { name: 'Basculer clair / sombre' }).click();
	const theme = await page.locator('html').getAttribute('data-theme');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', theme ?? '');
});
```

Ce test ne passe qu'une fois le formulaire (Task 7) et l'écran Marchés (Task 8) refaits : le lancer à la fin de la Task 8. Ici, seul le second test (thème) doit passer.

Run : `npx tsc --noEmit && npm run test:e2e -- e2e/navigation.spec.ts -g thème`
Expected : PASS. En Task 8 (Step 9), le premier test aussi. S'il échoue parce que « Marchés » reste à `0` après l'ajout, c'est que `revalidatePath('/chantiers/…', 'layout')` ne rafraîchit pas le layout `(app)`. Dans ce cas, ajouter `revalidatePath('/', 'layout')` dans le `rafraichir` de `src/actions/lots.ts`, dans les actions de `src/actions/planning.ts` et dans celles de `src/actions/documents.ts`, puis relancer.

- [ ] **Step 10 : Conformité**

Run : `npm run test:conformite -- -g "selecteur|compte"`
Expected : `selecteur` et `compte` restent en échec tant que l'accueil n'est pas refait (Task 6), mais la barre doit déjà être identique. Ouvrir `test-results/**/selecteur-diff.png` : aucune différence ne doit toucher la bande du haut (hauteur de `.nav`).

- [ ] **Step 11 : Commit**

```bash
git add src/donnees/navigation.ts src/donnees/navigation.int.test.ts src/composants/maquette/Ecran.tsx src/composants/navigation "src/app/(app)/layout.tsx" "src/app/(app)/chantiers/[id]/layout.tsx" src/composants/EnTeteApp.tsx src/composants/EnTeteChantier.tsx src/app/maquette-ajouts.css e2e/navigation.spec.ts
git commit -m "feat(interface): barre de navigation de la maquette (sélecteur, onglets et compteurs, compte, thème)"
```

---

### Task 5 : Connexion et mot de passe

**Files :**
- Modify: `src/app/connexion/page.tsx`, `src/app/mot-de-passe/page.tsx`, `src/composants/FormulaireMotDePasse.tsx`, `src/app/maquette-ajouts.css`

**Interfaces :**
- Consumes : `Sigle`, `SigleDefs` (Task 2), `authClient` (`src/auth/client.ts`), `changerMotDePasseAction`, `deconnexionAction`.
- Produces : rien de nouveau ; les libellés « Adresse e-mail », « Mot de passe », « Ouvrir mes chantiers » ne changent pas (E2E).

- [ ] **Step 1 : Constater l'échec**

Run : `npm run test:conformite -- -g connexion`
Expected : FAIL (formulaire shadcn).

- [ ] **Step 2 : L'écran de connexion**

Dans `src/app/connexion/page.tsx`, garder `soumettre` à l'identique et remplacer le `return` par le balisage de `#s-login` (l. 2096-2117), avec l'écart 2 :

```tsx
	return (
		<div className="screen is-on">
			<SigleDefs />
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark"><Sigle grand />Sentinelle</div>
						<p className="login-tag">Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</p>
					</div>
					<form className="login-form" onSubmit={soumettre}>
						<div className="field">
							<label htmlFor="email">Adresse e-mail</label>
							<input id="email" name="email" type="email" autoComplete="username" required />
						</div>
						<div className="field">
							<label htmlFor="motDePasse">Mot de passe</label>
							<input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
						</div>
						{erreur && <p role="alert" className="erreur">{erreur}</p>}
						<button className="btn btn-primary" type="submit" disabled={envoi} style={{ justifyContent: 'center', padding: '0.5625rem' }}>
							{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}
						</button>
					</form>
					<p className="login-foot">Accès réservé aux comptes SOCOREVE.</p>
				</div>
			</div>
		</div>
	);
```

Retirer les imports de `Button`, `Input` et `Label`, et importer `Sigle`, `SigleDefs` depuis `@/composants/maquette/Sigle`.

Ajouter à `maquette-ajouts.css` :

```css
/* Message d'erreur d'un formulaire (connexion, mot de passe, création) : la maquette n'échouait jamais. */
.erreur { margin: 0; font-size: 0.75rem; color: var(--danger); }
```

- [ ] **Step 3 : Le mot de passe**

`src/app/mot-de-passe/page.tsx` rend `<FormulaireMotDePasse />` seul, sans `<main>` : le cadre `.login` est dans le composant. Dans `src/composants/FormulaireMotDePasse.tsx`, garder `soumettre` et remplacer le rendu par :

```tsx
	const champ = (nom: string, libelle: string, autoComplete: string) => (
		<div className="field">
			<label htmlFor={nom}>{libelle}</label>
			<input id={nom} name={nom} type="password" autoComplete={autoComplete} required aria-invalid={Boolean(erreurs[nom])} className={erreurs[nom] ? 'est-erreur' : undefined} />
			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
		</div>
	);

	return (
		<div className="screen is-on">
			<SigleDefs />
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark"><Sigle grand />Sentinelle</div>
						<p className="login-tag">Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</p>
					</div>
					<form className="login-form" onSubmit={soumettre}>
						{champ('ancien', 'Mot de passe actuel', 'current-password')}
						{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
						{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
						{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
						<button className="btn btn-primary" type="submit" disabled={enCours} style={{ justifyContent: 'center', padding: '0.5625rem' }}>Enregistrer</button>
					</form>
					<form action={deconnexionAction} className="login-foot">
						<button type="submit" className="btn btn-ghost btn-sm">Se déconnecter</button>
					</form>
				</div>
			</div>
		</div>
	);
```

Le même écran sert au mot de passe provisoire et à « Changer mon mot de passe » (menu du compte).

- [ ] **Step 4 : Vérifier**

Run : `npx tsc --noEmit && npm run test:conformite -- -g connexion && npm run test:e2e -- e2e/connexion.spec.ts e2e/comptes.spec.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**

```bash
git add src/app/connexion/page.tsx src/app/mot-de-passe/page.tsx src/composants/FormulaireMotDePasse.tsx src/app/maquette-ajouts.css
git commit -m "feat(interface): écrans de connexion et de mot de passe de la maquette"
```

---

### Task 6 : Mes chantiers (l'accueil)

**Files :**
- Create: `src/domaine/accueil.ts`, `src/domaine/accueil.test.ts`, `src/donnees/accueil.ts`, `src/donnees/accueil.int.test.ts`, `src/composants/accueil/AccueilChantiers.tsx`, `src/composants/accueil/CarteChantier.tsx`, `src/composants/accueil/Synthese.tsx`, `src/composants/maquette/preference.ts`
- Modify: `src/app/(app)/chantiers/page.tsx`, `src/actions/chantiers.ts`, `src/donnees/chantiers.ts`
- Delete: `src/composants/ListeChantiers.tsx`

**Interfaces :**
- Consumes : `Ecran` (Task 4), `lireChantierOuvert` (Task 4), `Recherche`, `Interrupteur`, `MenuDeroulant`, `useConfirmation`, `Icone.*` (Task 2), `marquerTermineAction`, `formatEuros`, `totalArrondi`, `ttcEngage`, `sommeAvenants`, `normaliser`, `estCleEtrangere`, `estIntrouvable`.
- Produces :
  - `type TriChantiers = 'ref' | 'montant' | 'lots' | 'signature' | 'recent' | 'commune'`, `TRIS_CHANTIERS: { v: TriChantiers; t: string }[]` ;
  - `type CarteChantier` (ci-dessous), `chantiersVisibles(cartes, requete, masquerTermines, tri): CarteChantier[]`, `synthese(cartes): Synthese`, `pertesSuppression(c): string[]` (`src/domaine/accueil.ts`) ;
  - `lireAccueil(): Promise<CarteChantier[]>` (`src/donnees/accueil.ts`) ;
  - `supprimerChantier(id): Promise<void>` (`src/donnees/chantiers.ts`), `supprimerChantierAction(id): Promise<Resultat>` ;
  - `SUPPRESSION_IMPOSSIBLE` (`src/domaine/accueil.ts`, lu aussi côté client) : « Ce chantier a déjà des documents générés : il ne peut plus être supprimé. Marquez-le terminé. » ;
  - `usePreference<T>(cle, defaut, valide): [T, (v: T) => void]` (`src/composants/maquette/preference.ts`), réutilisé par le tri des lots (Task 8).

L'accueil reprend `renderSynthese()` et `renderChantiers()` (l. 3482-3585). À la connexion, on arrive sur **tous** ses chantiers ; on n'entre dans un chantier qu'en cliquant sa carte.

- [ ] **Step 1 : Tests du domaine**

Créer `src/domaine/accueil.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { chantiersVisibles, pertesSuppression, synthese, type CarteChantier } from './accueil';
import { formatEuros } from './montants';

const carte = (o: Partial<CarteChantier>): CarteChantier => ({
	id: o.reference ?? 'x', reference: 'X', maitreOuvrage: '', natureTravaux: '', adresse: '', cp: '', commune: '', chargeAffaire: 'Augustin Jouan',
	dateSignature: '', termine: false, creeLe: '2026-01-01T00:00:00.000Z', lots: 0, attribues: 0, periodes: 0, documents: 0, ttc: '0', ...o,
});
const PERRIER = carte({ reference: 'PERRIER — Louisfert', commune: 'LOUISFERT', dateSignature: '2026-04-03', lots: 13, attribues: 12, periodes: 24, documents: 6, ttc: '417048.00', creeLe: '2026-08-31T00:00:00.000Z' });
const GUERIN = carte({ reference: 'GUÉRIN — Erbray', commune: 'ERBRAY', termine: true, lots: 4, attribues: 4, ttc: '148200.00' });
const SCI = carte({ reference: 'SCI LES CHÊNES — Derval', commune: 'DERVAL', lots: 6, attribues: 5, ttc: '290856.00', creeLe: '2026-07-02T00:00:00.000Z' });
const MOREAU = carte({ reference: 'MOREAU — Soudan', maitreOuvrage: 'M. et Mme MOREAU', commune: 'SOUDAN', creeLe: '2026-06-02T00:00:00.000Z' });
const TOUS = [PERRIER, GUERIN, SCI, MOREAU];

describe('chantiersVisibles (chantiersVisibles() de la maquette)', () => {
	it('par défaut : terminés masqués, référence de A à Z', () => {
		expect(chantiersVisibles(TOUS, '', true, 'ref').map((c) => c.reference)).toEqual(['MOREAU — Soudan', 'PERRIER — Louisfert', 'SCI LES CHÊNES — Derval']);
	});
	it('recherche sans accents sur référence, client, nature, adresse, commune, chargé d\'affaire', () => {
		expect(chantiersVisibles(TOUS, 'chenes', false, 'ref')).toEqual([SCI]);
		expect(chantiersVisibles(TOUS, 'moreau soudan', false, 'ref')).toEqual([MOREAU]);
		expect(chantiersVisibles(TOUS, 'erbray', true, 'ref')).toEqual([]);
	});
	it('les tris de la maquette ; sans date de signature, en dernier', () => {
		expect(chantiersVisibles(TOUS, '', false, 'montant').map((c) => c.reference)[0]).toBe('PERRIER — Louisfert');
		expect(chantiersVisibles(TOUS, '', false, 'lots').map((c) => c.lots)).toEqual([13, 6, 4, 0]);
		expect(chantiersVisibles(TOUS, '', false, 'signature')[0]).toBe(PERRIER);
		expect(chantiersVisibles(TOUS, '', false, 'recent')[0]).toBe(PERRIER);
		expect(chantiersVisibles(TOUS, '', false, 'commune').map((c) => c.commune)).toEqual(['DERVAL', 'ERBRAY', 'LOUISFERT', 'SOUDAN']);
	});
});

describe('synthese (renderSynthese() de la maquette)', () => {
	it('ne compte que les chantiers en cours', () => {
		expect(synthese(TOUS)).toEqual({
			enCours: 3, termines: 1, ttcTexte: formatEuros('707904'), lots: 19, aAttribuer: 2, documents: 6,
		});
	});
});

describe('pertesSuppression (removeChantier() de la maquette)', () => {
	it('dit ce que la suppression emporte, au pluriel près', () => {
		expect(pertesSuppression(PERRIER)).toEqual(['13 lots', '24 périodes de planning', '6 documents']);
		expect(pertesSuppression(carte({ lots: 1, periodes: 1 }))).toEqual(['1 lot', '1 période de planning']);
		expect(pertesSuppression(MOREAU)).toEqual([]);
	});
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm test -- src/domaine/accueil.test.ts`
Expected : FAIL, `./accueil` introuvable.

- [ ] **Step 3 : Le domaine de l'accueil**

Créer `src/domaine/accueil.ts` :

```ts
import Decimal from 'decimal.js';
import { formatEuros, totalArrondi } from './montants';
import { normaliser } from './recherche';

export type TriChantiers = 'ref' | 'montant' | 'lots' | 'signature' | 'recent' | 'commune';

/** Les ordres de la barre d'outils, libellés de la maquette (TRIS_CH_LIBELLES). */
export const TRIS_CHANTIERS: { v: TriChantiers; t: string }[] = [
	{ v: 'ref', t: 'Référence (A → Z)' },
	{ v: 'montant', t: 'Montant décroissant' },
	{ v: 'lots', t: 'Nombre de lots' },
	{ v: 'signature', t: 'Signature la plus proche' },
	{ v: 'recent', t: 'Ajout le plus récent' },
	{ v: 'commune', t: 'Commune' },
];

/** Une carte de l'accueil. `dateSignature` : AAAA-MM-JJ ou '' ; `creeLe` : ISO ; `ttc` : total engagé, décimal. */
export type CarteChantier = {
	id: string; reference: string; maitreOuvrage: string; natureTravaux: string;
	adresse: string; cp: string; commune: string; chargeAffaire: string;
	dateSignature: string; termine: boolean; creeLe: string;
	lots: number; attribues: number; periodes: number; documents: number; ttc: string;
};

const TRIS: Record<TriChantiers, (a: CarteChantier, b: CarteChantier) => number> = {
	ref: (a, b) => a.reference.localeCompare(b.reference, 'fr'),
	montant: (a, b) => new Decimal(b.ttc).comparedTo(a.ttc),
	lots: (a, b) => b.lots - a.lots,
	// Un chantier sans date de signature passe en dernier plutôt que de remonter en tête.
	signature: (a, b) => (a.dateSignature || '9999').localeCompare(b.dateSignature || '9999'),
	recent: (a, b) => b.creeLe.localeCompare(a.creeLe),
	commune: (a, b) => (a.commune || 'zzz').localeCompare(b.commune || 'zzz', 'fr'),
};

export function chantiersVisibles(cartes: CarteChantier[], requete: string, masquerTermines: boolean, tri: TriChantiers): CarteChantier[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	return cartes
		.filter((c) => !masquerTermines || !c.termine)
		.filter((c) => {
			const texte = normaliser([c.reference, c.maitreOuvrage, c.natureTravaux, c.adresse, c.cp, c.commune, c.chargeAffaire].join(' '));
			return mots.every((m) => texte.includes(m));
		})
		.sort(TRIS[tri]);
}

export type Synthese = { enCours: number; termines: number; ttcTexte: string; lots: number; aAttribuer: number; documents: number };

/** Ce qu'on veut savoir en arrivant ; les chantiers terminés ne comptent pas. */
export function synthese(cartes: CarteChantier[]): Synthese {
	const actifs = cartes.filter((c) => !c.termine);
	return {
		enCours: actifs.length,
		termines: cartes.length - actifs.length,
		ttcTexte: formatEuros(totalArrondi(actifs.map((c) => c.ttc))),
		lots: actifs.reduce((n, c) => n + c.lots, 0),
		aAttribuer: actifs.reduce((n, c) => n + c.lots - c.attribues, 0),
		documents: actifs.reduce((n, c) => n + c.documents, 0),
	};
}

/** Un composant client l'affiche sans appeler le serveur : il vit ici, pas dans donnees/ (Prisma). */
export const SUPPRESSION_IMPOSSIBLE = 'Ce chantier a déjà des documents générés : il ne peut plus être supprimé. Marquez-le terminé.';

const pluriel = (n: number, mot: string, suite = '') => `${n} ${mot}${n > 1 ? 's' : ''}${suite}`;

/** Ce que la suppression emporte, pour la confirmation. */
export function pertesSuppression(c: CarteChantier): string[] {
	return [
		c.lots ? pluriel(c.lots, 'lot') : '',
		c.periodes ? pluriel(c.periodes, 'période', ' de planning') : '',
		c.documents ? pluriel(c.documents, 'document') : '',
	].filter(Boolean);
}
```

Run : `npm test -- src/domaine/accueil.test.ts`
Expected : PASS.

- [ ] **Step 4 : Tests d'intégration de la lecture et de la suppression**

Créer `src/donnees/accueil.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { lundiIso } from '@/domaine/semaines';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { SUPPRESSION_IMPOSSIBLE } from '@/domaine/accueil';
import { lireAccueil } from './accueil';
import { supprimerChantier } from './chantiers';
import { prisma } from './prisma';

let ca: { id: string };

async function chantier(reference: string) {
	return prisma.chantier.create({ data: {
		reference, maitreOuvrage: 'M. TEST', commune: 'ISSÉ', dateSignaturePrevue: new Date('2026-10-02T00:00:00Z'),
		chargeAffaireId: ca.id, creeParId: ca.id,
	} });
}

describe('accueil', () => {
	beforeEach(async () => {
		await viderBase();
		ca = await creerUtilisateurTest({ nom: 'Augustin Jouan' });
	});

	it('lit une carte par chantier : lots, attribués, périodes, documents, TTC engagé avenants compris', async () => {
		const c = await chantier('TEST — Issé');
		const artisan = await prisma.artisan.create({ data: { nom: 'MATELEC' } });
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'ÉLECTRICITÉ', artisanId: artisan.id, montantHtInitial: 1000 } });
		await prisma.lot.create({ data: { chantierId: c.id, ordre: 2, designation: 'PEINTURE' } });
		await prisma.avenant.create({ data: { lotId: lot.id, numero: 1, montantHt: 100 } });
		await prisma.periode.create({ data: { lotId: lot.id, intitule: 'Réseaux', debut: lundiIso(2026, 40), duree: 1 } });

		const [carte] = await lireAccueil();

		expect(carte).toMatchObject({
			id: c.id, reference: 'TEST — Issé', commune: 'ISSÉ', chargeAffaire: 'Augustin Jouan', dateSignature: '2026-10-02',
			termine: false, lots: 2, attribues: 1, periodes: 1, documents: 0, ttc: '1320.00',
		});
	});

	it('supprime un chantier sans document, avec ses lots, périodes et fermetures', async () => {
		const c = await chantier('TEST — Vide');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.periode.create({ data: { lotId: lot.id, intitule: 'Fondations', debut: lundiIso(2026, 16), duree: 3 } });
		await prisma.fermeture.create({ data: { chantierId: c.id, libelle: 'Congés', debut: lundiIso(2026, 31), duree: 2 } });

		await supprimerChantier(c.id);

		expect(await prisma.chantier.count()).toBe(0);
		expect(await prisma.lot.count()).toBe(0);
		expect(await prisma.periode.count()).toBe(0);
	});

	it('refuse de supprimer un chantier qui a un document, sans rien effacer', async () => {
		const c = await chantier('TEST — Documenté');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		await prisma.document.create({ data: {
			chantierId: c.id, lotId: lot.id, serie: lot.id, type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: 'x.pdf', creeParId: ca.id,
		} });

		await expect(supprimerChantier(c.id)).rejects.toThrow(SUPPRESSION_IMPOSSIBLE);
		expect(await prisma.lot.count()).toBe(1);
	});
});
```

Run : `npm run test:int -- src/donnees/accueil.int.test.ts`
Expected : FAIL, `./accueil` introuvable et `supprimerChantier` non exporté.

- [ ] **Step 5 : Lecture et suppression**

Créer `src/donnees/accueil.ts` :

```ts
import type { CarteChantier } from '@/domaine/accueil';
import { sommeAvenants } from '@/domaine/avenants';
import { totalArrondi, ttcEngage } from '@/domaine/montants';
import { versSaisieDate } from './chantiers';
import { prisma } from './prisma';

export async function lireAccueil(): Promise<CarteChantier[]> {
	const lignes = await prisma.chantier.findMany({
		orderBy: { creeLe: 'desc' },
		include: {
			chargeAffaire: { select: { name: true } },
			_count: { select: { documents: true } },
			lots: { select: {
				artisanId: true, montantHtInitial: true, tauxTva: true,
				avenants: { select: { montantHt: true } }, _count: { select: { periodes: true } },
			} },
		},
	});
	return lignes.map((c) => ({
		id: c.id, reference: c.reference, maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux,
		adresse: c.adresse, cp: c.cp, commune: c.commune, chargeAffaire: c.chargeAffaire.name,
		dateSignature: versSaisieDate(c.dateSignaturePrevue), termine: c.termine, creeLe: c.creeLe.toISOString(),
		lots: c.lots.length,
		attribues: c.lots.filter((l) => l.artisanId).length,
		periodes: c.lots.reduce((n, l) => n + l._count.periodes, 0),
		documents: c._count.documents,
		ttc: totalArrondi(c.lots.map((l) => ttcEngage(
			l.montantHtInitial.toString(), l.tauxTva.toString(),
			sommeAvenants(l.avenants.map((a) => ({ montantHt: a.montantHt.toString() }))),
		))).toFixed(2),
	}));
}
```

Dans `src/donnees/chantiers.ts`, ajouter `estCleEtrangere` et `estIntrouvable` à l'import de `./erreursPrisma`, importer `SUPPRESSION_IMPOSSIBLE` depuis `@/domaine/accueil`, puis :

```ts
/**
 * Lots, périodes, fermetures et comptes rendus partent en cascade ; un document généré l'interdit
 * (clé étrangère Restrict). La base tranche en une seule instruction : un document produit par un collègue
 * pendant la suppression la fait échouer proprement, sans rien effacer.
 */
export async function supprimerChantier(id: string): Promise<void> {
	try {
		await prisma.chantier.delete({ where: { id } });
	} catch (e) {
		if (estCleEtrangere(e)) throw new ErreurMetier(SUPPRESSION_IMPOSSIBLE);
		if (estIntrouvable(e)) throw new ErreurMetier('Ce chantier a déjà été supprimé.');
		throw e;
	}
}
```

Dans `src/actions/chantiers.ts` :

```ts
export async function supprimerChantierAction(id: string): Promise<Resultat> {
	return executer({}, async () => {
		await supprimerChantier(id);
		revalidatePath('/', 'layout');
		return null;
	});
}
```

(importer `supprimerChantier` depuis `@/donnees/chantiers`). Ajouter aussi `revalidatePath('/', 'layout')` à `creerChantierAction` et à `marquerTermineAction` : le sélecteur de la barre les liste.

Run : `npm run test:int -- src/donnees/accueil.int.test.ts src/donnees/chantiers.int.test.ts`
Expected : PASS.

- [ ] **Step 6 : Les préférences d'affichage**

Créer `src/composants/maquette/preference.ts`. La maquette garde le tri et « Masquer les terminés » d'une visite à l'autre (`save()`) ; ici, c'est une préférence de ce navigateur.

```ts
'use client';

import { useEffect, useState } from 'react';

/** Lue après le montage (le rendu serveur prend le défaut) ; une valeur illisible ou d'une ancienne version est ignorée. */
export function usePreference<T>(cle: string, defaut: T, valide: (v: unknown) => v is T): [T, (v: T) => void] {
	const [valeur, setValeur] = useState<T>(defaut);
	useEffect(() => {
		try {
			const lu: unknown = JSON.parse(localStorage.getItem(cle) ?? 'null');
			if (valide(lu)) setValeur(lu);
		} catch { /* stockage indisponible ou valeur corrompue : le défaut reste */ }
	}, [cle]);   // eslint-disable-line react-hooks/exhaustive-deps -- `valide` est une fonction stable du module appelant
	function changer(v: T) {
		setValeur(v);
		try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* le choix vaut pour la page */ }
	}
	return [valeur, changer];
}
```

- [ ] **Step 7 : Les composants de l'accueil**

Créer `src/composants/accueil/Synthese.tsx` :

```tsx
import type { Synthese as S } from '@/domaine/accueil';

const cellule = (k: string, v: React.ReactNode, sous: string, alerte = false) => (
	<div className={alerte ? 'synth-cell alerte' : 'synth-cell'}>
		<span className="synth-k">{k}</span><span className="synth-v">{v}</span><span className="synth-sous">{sous}</span>
	</div>
);

export function Synthese({ s }: { s: S }) {
	return (
		<div className="synthese">
			{cellule('Chantiers en cours', s.enCours, s.termines ? `${s.termines} terminé${s.termines > 1 ? 's' : ''} par ailleurs` : 'aucun terminé')}
			{cellule('Marchés engagés', s.ttcTexte, `${s.lots} lot${s.lots > 1 ? 's' : ''} au total`)}
			{cellule('Lots à attribuer', s.aAttribuer, s.aAttribuer ? 'aucune entreprise désignée' : 'tous les lots ont leur entreprise', s.aAttribuer > 0)}
			{cellule('Documents produits', s.documents, 'marchés et récapitulatifs')}
		</div>
	);
}
```

Créer `src/composants/accueil/CarteChantier.tsx` :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, supprimerChantierAction } from '@/actions/chantiers';
import * as Icone from '@/composants/maquette/icones';
import { useConfirmation } from '@/composants/maquette/Confirmation';
import { pertesSuppression, SUPPRESSION_IMPOSSIBLE, type CarteChantier as Carte } from '@/domaine/accueil';
import { formatEuros } from '@/domaine/montants';

const dateFr = (iso: string) => iso.split('-').reverse().join('.');

export function CarteChantier({ c, ouvert }: { c: Carte; ouvert: boolean }) {
	const router = useRouter();
	const confirmer = useConfirmation();
	const [, demarrer] = useTransition();
	const ouvrir = () => router.push(`/chantiers/${c.id}/marches`);

	function terminer(e: React.MouseEvent) {
		e.stopPropagation();
		demarrer(async () => {
			const r = await marquerTermineAction(c.id, !c.termine);
			if (!r.ok) toast.error(r.erreur);
			else toast(c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>);
		});
	}

	async function supprimer(e: React.MouseEvent) {
		e.stopPropagation();
		// Refus d'emblée, sans faire confirmer une suppression qui échouerait (le serveur vérifie de toute façon).
		if (c.documents) { toast.error(SUPPRESSION_IMPOSSIBLE); return; }
		const pertes = pertesSuppression(c);
		const oui = await confirmer({
			texte: <>Supprimer <b>{c.reference}</b>&nbsp;? {pertes.length ? `${pertes.join(', ')} seront perdus. ` : ''}La suppression est définitive.</>,
			libelle: 'Supprimer', dangereux: true,
		});
		if (!oui) return;
		demarrer(async () => {
			const r = await supprimerChantierAction(c.id);
			if (!r.ok) toast.error(r.erreur);
			else toast(<><b>{c.reference}</b> supprimé.</>);
		});
	}

	const adresse = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	return (
		<div className={c.termine ? 'chantier is-done' : 'chantier'} role="button" tabIndex={0} onClick={ouvrir}
			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } }}>
			<div className="chantier-top">
				<span className="chantier-ref">{c.reference}</span>
				<span className="chantier-actions">
					{c.termine ? <span className="pill pill-fini">Terminé</span> : ouvert && <span className="pill pill-actif">Ouvert</span>}
					<button type="button" className="btn btn-sm" onClick={terminer} title={c.termine ? 'Rouvrir ce chantier' : 'Marquer ce chantier terminé'}>
						{c.termine ? <><Icone.Rouvrir />Rouvrir</> : <><Icone.Coche />Terminer</>}
					</button>
					<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={supprimer} title="Supprimer ce chantier" aria-label={`Supprimer ${c.reference}`}>
						<Icone.Corbeille />
					</button>
				</span>
			</div>
			<div className="chantier-meta">
				{c.maitreOuvrage || '—'}<br />
				{c.natureTravaux || 'Nature des travaux non renseignée'}<br />
				{adresse || 'Adresse non renseignée'}
				{c.dateSignature && <><br /><span className="chantier-sig">Signature le {dateFr(c.dateSignature)}</span></>}
			</div>
			<div className="chantier-foot">
				<div className="chantier-lots">{c.lots === 0 ? 'Aucun lot' : `${c.lots} lot${c.lots > 1 ? 's' : ''} · ${c.attribues} attribué${c.attribues > 1 ? 's' : ''}`}</div>
				<div className="chantier-total"><small>Marchés TTC</small>{c.lots ? formatEuros(c.ttc) : '—'}</div>
			</div>
		</div>
	);
}
```

Créer `src/composants/accueil/AccueilChantiers.tsx` :

```tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Interrupteur } from '@/composants/maquette/Interrupteur';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';
import { usePreference } from '@/composants/maquette/preference';
import { Recherche } from '@/composants/maquette/Recherche';
import { lireChantierOuvert } from '@/composants/navigation/chantierOuvert';
import { chantiersVisibles, synthese, TRIS_CHANTIERS, type CarteChantier as Carte, type TriChantiers } from '@/domaine/accueil';
import { CarteChantier } from './CarteChantier';
import { Synthese } from './Synthese';

const estTri = (v: unknown): v is TriChantiers => TRIS_CHANTIERS.some((t) => t.v === v);
const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';

export function AccueilChantiers({ cartes }: { cartes: Carte[] }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = usePreference<TriChantiers>('sentinelle-tri-chantiers', 'ref', estTri);
	const [masquer, setMasquer] = usePreference('sentinelle-masquer-termines', true, estBooleen);
	const [ouvert, setOuvert] = useState<string | null>(null);
	useEffect(() => { setOuvert(lireChantierOuvert()); }, []);

	const visibles = chantiersVisibles(cartes, requete, masquer, tri);
	const q = requete.trim();
	return (
		<>
			<Synthese s={synthese(cartes)} />
			<div className="toolbar">
				<Recherche placeholder="Rechercher un chantier, un client, une commune…" libelle="Rechercher un chantier" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="ch-sort" k="Trier par" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<Interrupteur coche={masquer} onChange={setMasquer}>Masquer les terminés</Interrupteur>
				<span className="eyebrow">{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</span>
			</div>
			<div className="chantier-grid">
				{visibles.map((c) => <CarteChantier key={c.id} c={c} ouvert={c.id === ouvert} />)}
				{!visibles.length && (
					<div className="empty-list">{q ? `Aucun chantier ne correspond à « ${q} ».` : 'Tous les chantiers sont terminés. Décochez le filtre pour les revoir.'}</div>
				)}
				<Link className="chantier chantier-new" href="/chantiers/nouveau">
					<span className="plus">+</span>
					<span className="chantier-ref">Nouveau chantier</span>
					<div className="chantier-meta">Saisissez l&apos;en-tête une fois, il alimentera tous les documents.</div>
				</Link>
			</div>
		</>
	);
}
```

Sans aucun chantier en base, la maquette montre aussi « Tous les chantiers sont terminés… » : c'est son texte, on le garde.

Ajouter à `maquette-ajouts.css` :

```css
/* La carte « Nouveau chantier » est un lien dans l'app (un bouton dans la maquette). */
a.chantier-new { text-decoration: none; color: inherit; }
```

- [ ] **Step 8 : La page**

Remplacer `src/app/(app)/chantiers/page.tsx` :

```tsx
import Link from 'next/link';
import { exigerPage } from '@/auth/session';
import { AccueilChantiers } from '@/composants/accueil/AccueilChantiers';
import { Ecran } from '@/composants/maquette/Ecran';
import * as Icone from '@/composants/maquette/icones';
import { lireAccueil } from '@/donnees/accueil';

export default async function PageChantiers() {
	await exigerPage();
	return (
		<Ecran titre="Mes chantiers" actions={<Link className="btn btn-primary" href="/chantiers/nouveau"><Icone.Plus />Nouveau chantier</Link>}>
			<AccueilChantiers cartes={await lireAccueil()} />
		</Ecran>
	);
}
```

Supprimer `src/composants/ListeChantiers.tsx`. `src/app/(app)/page.tsx` redirige déjà vers `/chantiers`, et la connexion y mène (`router.replace('/chantiers')`) : l'utilisateur arrive bien sur tous ses chantiers.

- [ ] **Step 9 : Vérifier**

Run : `npx tsc --noEmit && npm test -- src/domaine/accueil.test.ts && npm run test:conformite -- -g "chantiers|selecteur|compte"`
Expected : PASS pour les trois captures. S'il reste une différence, ouvrir le `*-diff.png` de `test-results/` et corriger le balisage : jamais la référence, jamais `maquette.css`.

- [ ] **Step 10 : Commit**

```bash
git add src/domaine/accueil.ts src/domaine/accueil.test.ts src/donnees/accueil.ts src/donnees/accueil.int.test.ts src/donnees/chantiers.ts src/actions/chantiers.ts src/composants/accueil src/composants/maquette/preference.ts "src/app/(app)/chantiers/page.tsx" src/composants/ListeChantiers.tsx src/app/maquette-ajouts.css
git commit -m "feat(interface): accueil « Mes chantiers » de la maquette — synthèse, cartes, tris, terminer, supprimer sans document"
```

---

### Task 7 : Nouveau chantier

**Files :**
- Modify: `src/composants/FormulaireChantier.tsx`, `src/app/(app)/chantiers/nouveau/page.tsx`

**Interfaces :**
- Consumes : `Ecran` (Task 4), `Interrupteur`, `MenuDeroulant` (Task 2), `creerChantierAction(saisie: SaisieChantier)`.
- Produces : `FormulaireChantier({ chargesAffaire, moi })`, avec `moi: { id: string; nom: string }`. Libellés conservés pour les E2E : « Nom du client », « Référence dossier », « Créer le chantier ».

Le formulaire reprend `#v-nouveau` (l. 2213-2330), `syncAdresseClient()`, `pickMission()`, `fillExample()` et `createChantier()` (l. 3600-3660). Deux écarts : le chargé d'affaire est un menu de comptes (écart 4), et les erreurs du serveur s'affichent sous leur champ.

- [ ] **Step 1 : Constater l'échec**

Run : `npm run test:conformite -- -g nouveau`
Expected : FAIL.

- [ ] **Step 2 : Le formulaire**

Remplacer `src/composants/FormulaireChantier.tsx` :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { creerChantierAction } from '@/actions/chantiers';
import { Interrupteur } from '@/composants/maquette/Interrupteur';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';

type Props = { chargesAffaire: { id: string; nom: string }[]; moi: { id: string; nom: string } };
type Saisie = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };

const VIDE: Saisie = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
/** fillExample() de la maquette. */
const EXEMPLE: Saisie = {
	maitreOuvrage: 'M. et Mme BLANCHARD', adresseClient: '7 rue des Tilleuls, 44110 CHÂTEAUBRIANT', natureTravaux: "Construction d'une maison individuelle — 118 m²",
	adresse: 'La Grande Noë', cp: '44520', commune: 'ISSÉ', dateSignaturePrevue: '2026-10-02', reference: 'BLANCHARD — Issé',
};

export function FormulaireChantier({ chargesAffaire, moi }: Props) {
	const router = useRouter();
	const [s, setS] = useState<Saisie>(VIDE);
	const [surPlace, setSurPlace] = useState(false);
	const [mission, setMission] = useState<'COMPLETE' | 'PARTIELLE'>('COMPLETE');
	const [chargeAffaireId, setChargeAffaireId] = useState(moi.id);
	const [lotsDeBase, setLotsDeBase] = useState(true);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();
	const maj = (champ: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [champ]: e.target.value });
	// Rénovation, extension : le client vit sur le chantier, son adresse en est recopiée (syncAdresseClient).
	const adresseChantier = [s.adresse.trim(), [s.cp.trim(), s.commune.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	const adresseClient = surPlace ? adresseChantier : s.adresseClient;

	function creer() {
		if (!s.maitreOuvrage.trim()) {
			document.getElementById('f-mo')?.focus();
			toast("Renseignez au moins le maître d'ouvrage.");
			return;
		}
		demarrer(async () => {
			const r = await creerChantierAction({
				...s, adresseClient, reference: s.reference.trim() || s.maitreOuvrage.trim(),
				clientHabiteSurPlace: surPlace, mission, chargeAffaireId, partirDesLotsDeBase: lotsDeBase,
			});
			if (r.ok) router.push(`/chantiers/${r.donnees.id}/marches`);
			else { setErreurs(r.champs ?? {}); toast.error(r.erreur); }
		});
	}

	const champ = (id: string, nom: keyof Saisie, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; span?: boolean; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
		<div className={o.span ? 'field span' : 'field'}>
			<label htmlFor={id}>{libelle}</label>
			<input id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
				className={[o.num && 'num', erreurs[nom] && 'est-erreur'].filter(Boolean).join(' ') || undefined} aria-invalid={Boolean(erreurs[nom])} />
			{o.aide && <span className="hint">{o.aide}</span>}
			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
		</div>
	);

	return (
		<>
			<div className="topbar">
				<div className="topbar-row">
					<div><h1 className="page-title">Nouveau chantier</h1></div>
					<div className="topbar-actions">
						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
					</div>
				</div>
			</div>
			<div className="body-pad">
				<div className="form-wrap">
					<div className="fieldset">
						<span className="eyebrow">Client</span>
						<div className="grid-2">
							{champ('f-mo', 'maitreOuvrage', 'Nom du client', { span: true, placeholder: 'M. et Mme MARTIN — ou SCI LES CHÊNES',
								aide: "Imprimé sous la mention « Maître d'Ouvrage » dans les marchés, et « Mr/Mme » en tête du récap." })}
							{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { span: true, placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
								aide: <>Là où lui écrire <b>aujourd&apos;hui</b> — pas le chantier. En construction neuve il n&apos;y habite pas encore. Imprimée sous « Demeurant » sur les marchés.</> })}
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Chantier</span>
						<div className="grid-2">
							{champ('f-nat', 'natureTravaux', 'Nature des travaux', { span: true, placeholder: "Construction d'une maison individuelle — 120 m²" })}
							{champ('f-adr', 'adresse', 'Adresse du chantier', { span: true, placeholder: 'Le Haut Bois', aide: 'Là où les travaux ont lieu. Imprimée sous « Située » sur les marchés.' })}
							{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
							{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
							<div className="field span">
								<Interrupteur id="f-meme" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
								<span className="hint">Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</span>
							</div>
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Mission</span>
						<div className="grid-2">
							<div className="field span">
								<label>Type de mission</label>
								<div className="radio-row" role="radiogroup" aria-label="Type de mission">
									{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
										<label key={m} className={mission === m ? 'is-on' : undefined}>
											<input type="radio" name="mission" checked={mission === m} onChange={() => setMission(m)} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
										</label>
									))}
								</div>
							</div>
							{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
							<div className="field">
								<label htmlFor="f-ca">Chargé d&apos;affaire</label>
								<MenuDeroulant id="f-ca" k="Compte" classe="dd-plein" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
									options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
								<span className="hint">Chez vous, pas chez le client.</span>
								{erreurs.chargeAffaireId && <span className="erreur">{erreurs.chargeAffaireId}</span>}
							</div>
							{champ('f-ref', 'reference', 'Référence dossier', { placeholder: "Repris du maître d'ouvrage si vide" })}
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Lots</span>
						<div className="field">
							<Interrupteur id="f-lots-base" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
							<span className="hint">Terrassement, gros œuvre, charpente… jusqu&apos;à l&apos;escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.</span>
						</div>
					</div>

					<div className="form-actions">
						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
						<button type="button" className="btn" onClick={() => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); }}>Remplir un exemple</button>
						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
					</div>
				</div>
			</div>
		</>
	);
}
```

Deux boutons portent « Créer le chantier », comme dans la maquette : les E2E prennent `.first()`. Pour la même raison, mettre à jour tout `getByRole('button', { name: 'Créer le chantier' })` de `e2e/` en ajoutant `.first()`.

- [ ] **Step 3 : La page**

Remplacer `src/app/(app)/chantiers/nouveau/page.tsx` :

```tsx
import { exigerPage } from '@/auth/session';
import { FormulaireChantier } from '@/composants/FormulaireChantier';
import { listerChargesAffaire } from '@/donnees/chantiers';

export default async function PageNouveauChantier() {
	const moi = await exigerPage();
	return (
		<section className="screen is-on">
			<FormulaireChantier chargesAffaire={await listerChargesAffaire()} moi={{ id: moi.id, nom: moi.nom }} />
		</section>
	);
}
```

`Ecran` n'est pas employé ici : les boutons de la barre de titre partagent l'état du formulaire.

- [ ] **Step 4 : Vérifier**

Run : `npx tsc --noEmit && npm run test:conformite -- -g nouveau && npm run test:e2e -- e2e/chantiers.spec.ts`
Expected : PASS. `e2e/chantiers.spec.ts` peut chercher des libellés de l'ancien formulaire (« Le client habite déjà à l'adresse du chantier », un `select` de chargé d'affaire). Les remplacer par ceux de la maquette : « Le client habite déjà à cette adresse », le menu `#f-ca`.

- [ ] **Step 5 : Commit**

```bash
git add src/composants/FormulaireChantier.tsx "src/app/(app)/chantiers/nouveau/page.tsx" e2e
git commit -m "feat(interface): formulaire « Nouveau chantier » de la maquette"
```

---

### Task 8 : Marchés & récapitulatif

**Files :**
- Create: `src/composants/chantier/BandeauChantier.tsx`, `src/domaine/lots.test.ts` (ou le compléter s'il existe)
- Modify: `src/app/(app)/chantiers/[id]/marches/page.tsx`, `src/composants/TableauLots.tsx`, `src/composants/BoutonMarchesManquants.tsx`, `src/domaine/lots.ts`, `src/domaine/montants.test.ts`

**Interfaces :**
- Consumes : `Ecran` (Task 4), `Panneau`, `MenuDeroulant`, `Recherche`, `ChampEnLigne` (`variante`, `id`), `Icone.*` (Task 2), `usePreference` (Task 6), `lireEnTeteChantier`, `listerChargesAffaire`, `modifierChampChantierAction`, `marquerTermineAction`.
- Produces :
  - `TriLots` gagne `'numero'` ; `TRIS_LOTS: { v: TriLots; t: string }[]` remplace `LIBELLES_TRI`, avec les libellés de la maquette ;
  - `<BandeauChantier chantier chargesAffaire />` : le `.context` cliquable et le panneau « En-tête du chantier » (écart 3), réutilisé par le Planning (Task 10) ;
  - `<BoutonMarchesManquants chantierId forme />`, avec `forme: 'barre' | 'entete'` (bouton primaire de la barre de titre, ou `dm-th-action` du tableau Documents en Task 11).

L'écran reprend `#v-marches` (l. 2333-2388), `renderLots()` (l. 3729-3800) et `renderContexte()` (l. 5491).

- [ ] **Step 1 : Tests du tri par numéro et de la lecture du taux**

Dans `src/domaine/lots.test.ts` (le créer s'il n'existe pas), ajouter :

```ts
import { describe, expect, it } from 'vitest';
import { lotsVisibles, TRIS_LOTS, type LotTriable } from './lots';

const lot = (numero: string | null, designation: string): LotTriable => ({
	ordre: 0, numero, designation, entreprise: null, corpsEtat: '', nature: 'GRE_A_GRE', htEngage: '0',
});

describe('tri « Numéro de lot » (TRIS_LOT.numero de la maquette)', () => {
	it('numéros dans l\'ordre naturel, puis désignation ; sans numéro en tête', () => {
		const lots = [lot('10', 'CARRELAGE'), lot('02', 'GROS ŒUVRE'), lot(null, 'ESCALIER'), lot('9', 'PLOMBERIE')];
		expect(lotsVisibles(lots, '', 'numero').map((l) => l.designation)).toEqual(['ESCALIER', 'GROS ŒUVRE', 'PLOMBERIE', 'CARRELAGE']);
	});
	it('les libellés du menu sont ceux de la maquette, dans son ordre', () => {
		expect(TRIS_LOTS.map((t) => t.t)).toEqual(['Ordre du chantier', 'Numéro de lot', 'Désignation (A → Z)', 'Entreprise (A → Z)', 'Montant décroissant', "À attribuer d'abord"]);
	});
});
```

Dans `src/domaine/montants.test.ts`, ajouter (le taux s'affiche « 20.00 » comme dans la maquette et doit se relire tel quel) :

```ts
it('relit un taux affiché à la façon de la maquette (« 20.00 », « 5.50 »)', () => {
	expect(lireNombreFr('20.00').toString()).toBe('20');
	expect(lireNombreFr('5.50').toString()).toBe('5.5');
});
```

Run : `npm test -- src/domaine/lots.test.ts src/domaine/montants.test.ts`
Expected : FAIL sur `TRIS_LOTS` et `'numero'`. Le test de `lireNombreFr` doit déjà passer. S'il échoue, **arrêter et le signaler** : `lireNombreFr` ne se modifie pas dans ce plan.

- [ ] **Step 2 : Le tri**

Dans `src/domaine/lots.ts` :

```ts
export type TriLots = 'saisie' | 'numero' | 'lot' | 'entreprise' | 'montant' | 'attribuer';

/** Les ordres du menu « Trier par », libellés et ordre de la maquette (TRIS_LOT_LIBELLES). */
export const TRIS_LOTS: { v: TriLots; t: string }[] = [
	{ v: 'saisie', t: 'Ordre du chantier' },
	{ v: 'numero', t: 'Numéro de lot' },
	{ v: 'lot', t: 'Désignation (A → Z)' },
	{ v: 'entreprise', t: 'Entreprise (A → Z)' },
	{ v: 'montant', t: 'Montant décroissant' },
	{ v: 'attribuer', t: "À attribuer d'abord" },
];
```

Supprimer `LIBELLES_TRI` : `git grep -n LIBELLES_TRI` ne doit plus rien renvoyer une fois `TableauLots` réécrit. Ajouter à `TRIS` :

```ts
	numero: (a, b) => cmpTexte(a.numero ?? '', b.numero ?? '') || cmpTexte(a.designation, b.designation),
```

Run : `npm test -- src/domaine/lots.test.ts`
Expected : PASS.

- [ ] **Step 3 : Le bandeau du chantier**

Créer `src/composants/chantier/BandeauChantier.tsx`. Ce sont `renderContexte()` et l'écart 3 : le bandeau ouvre l'en-tête modifiable.

```tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, modifierChampChantierAction } from '@/actions/chantiers';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';
import { Panneau } from '@/composants/maquette/Panneau';
import type { ChampChantier, EnTeteChantierVue } from '@/donnees/chantiers';

const CHAMPS: { champ: ChampChantier; libelle: string; type?: 'date'; span?: boolean; num?: boolean }[] = [
	{ champ: 'maitreOuvrage', libelle: 'Nom du client', span: true },
	{ champ: 'adresseClient', libelle: 'Adresse actuelle du client', span: true },
	{ champ: 'natureTravaux', libelle: 'Nature des travaux', span: true },
	{ champ: 'adresse', libelle: 'Adresse du chantier', span: true },
	{ champ: 'cp', libelle: 'Code postal', num: true },
	{ champ: 'commune', libelle: 'Commune' },
	{ champ: 'dateSignaturePrevue', libelle: 'Signature des marchés prévue le', type: 'date' },
	{ champ: 'reference', libelle: 'Référence dossier' },
];

const dateFr = (iso: string) => iso.split('-').reverse().join('.');

export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnTeteChantierVue; chargesAffaire: { id: string; nom: string }[] }) {
	const [ouvert, setOuvert] = useState(false);
	const [, demarrer] = useTransition();
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, succes?: React.ReactNode) => demarrer(async () => {
		const r = await fn();
		if (!r.ok) toast.error(r.erreur);
		else if (succes) toast(succes);
	});
	const situee = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—';
	const cellules: [string, string, boolean][] = [
		['Client', c.maitreOuvrage || '—', false],
		['Construction', c.natureTravaux || '—', false],
		['Située', situee, false],
		['Mission', c.mission === 'COMPLETE' ? 'Complète' : 'Partielle', false],
		['Signature', c.dateSignaturePrevue ? dateFr(c.dateSignaturePrevue) : 'non fixée', Boolean(c.dateSignaturePrevue)],
	];
	return (
		<>
			<button type="button" className="context" title="Modifier l'en-tête du chantier" onClick={() => setOuvert(true)}>
				{cellules.map(([k, v, mono]) => (
					<div key={k} className="context-cell"><span className="context-k">{k}</span><span className={mono ? 'context-v num' : 'context-v'}>{v}</span></div>
				))}
			</button>
			<Panneau ouvert={ouvert} surtitre="CHANTIER" titre="En-tête du chantier" onFermer={() => setOuvert(false)}
				pied={<>
					<button type="button" className="btn" onClick={() => agir(() => marquerTermineAction(c.id, !c.termine),
						c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>)}>
						{c.termine ? 'Rouvrir le chantier' : 'Marquer terminé'}
					</button>
					<button type="button" className="btn btn-ghost" onClick={() => setOuvert(false)}>Fermer</button>
				</>}>
				<div className="grid-2">
					{CHAMPS.map((f) => (
						<div key={f.champ} className={f.span ? 'field span' : 'field'}>
							<label htmlFor={`e-${f.champ}`}>{f.libelle}</label>
							<ChampEnLigne id={`e-${f.champ}`} variante="champ" className={f.num ? 'num' : undefined} libelle={f.libelle} type={f.type}
								valeur={c[f.champ] as string} enregistrer={modifierChampChantierAction.bind(null, c.id, f.champ)} />
						</div>
					))}
					<div className="field span">
						<label>Type de mission</label>
						<div className="radio-row" role="radiogroup" aria-label="Type de mission">
							{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
								<label key={m} className={c.mission === m ? 'is-on' : undefined}>
									<input type="radio" name="e-mission" checked={c.mission === m} onChange={() => agir(() => modifierChampChantierAction(c.id, 'mission', m))} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
								</label>
							))}
						</div>
					</div>
					<div className="field span">
						<label htmlFor="e-ca">Chargé d&apos;affaire</label>
						<MenuDeroulant id="e-ca" k="Compte" classe="dd-plein" valeur={c.chargeAffaireId}
							options={chargesAffaire.map((x) => ({ v: x.id, t: x.nom }))}
							onChoisir={(v) => agir(() => modifierChampChantierAction(c.id, 'chargeAffaireId', v))} />
					</div>
				</div>
			</Panneau>
		</>
	);
}
```

`.field input` de la maquette dessine les champs du panneau : la variante `champ` de `ChampEnLigne` ne pose aucune classe (Task 2). Ajouter `revalidatePath('/', 'layout')` dans `modifierChampChantierAction` (`src/actions/chantiers.ts`) : la référence apparaît dans le sélecteur de la barre.

- [ ] **Step 4 : Le tableau des lots**

Remplacer `src/composants/TableauLots.tsx` :

```tsx
'use client';

import Decimal from 'decimal.js';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterLotAction, modifierChampLotAction } from '@/actions/lots';
import * as Icone from '@/composants/maquette/icones';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';
import { usePreference } from '@/composants/maquette/preference';
import { Recherche } from '@/composants/maquette/Recherche';
import type { VueMarches } from '@/donnees/marches';
import { lotsVisibles, TRIS_LOTS, type TriLots } from '@/domaine/lots';
import { formatMontantSaisie } from '@/domaine/montants';
import { ChampEnLigne } from './ChampEnLigne';
import { PanneauLot } from './PanneauLot';

const estTri = (v: unknown): v is TriLots => TRIS_LOTS.some((t) => t.v === v);
/** « 20.00 » : le taux tel que la maquette l'affiche (toFixed(2)) ; lireNombreFr le relit. */
export const tauxAffiche = (v: string) => new Decimal(v).toFixed(2);

const OUVRIR_LOT = 'sentinelle:ouvrir-lot';

/** « Ajouter un lot » de la barre de titre (rendue par la page) : crée le lot, puis demande au tableau d'ouvrir son panneau. */
export function BoutonAjouterLot({ chantierId }: { chantierId: string }) {
	const [enCours, demarrer] = useTransition();
	return (
		<button type="button" className="btn" disabled={enCours} onClick={() => demarrer(async () => {
			const r = await ajouterLotAction(chantierId);
			if (!r.ok) { toast.error(r.erreur); return; }
			window.dispatchEvent(new CustomEvent(OUVRIR_LOT, { detail: r.donnees.id }));
		})}>
			<Icone.Plus />Ajouter un lot
		</button>
	);
}

export function TableauLots({ vue }: { vue: VueMarches }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = usePreference<TriLots>('sentinelle-tri-lots', 'saisie', estTri);
	const [lotOuvert, setLotOuvert] = useState<string | null>(null);
	useEffect(() => {
		const ouvrir = (e: Event) => setLotOuvert((e as CustomEvent<string>).detail);
		window.addEventListener(OUVRIR_LOT, ouvrir);
		return () => window.removeEventListener(OUVRIR_LOT, ouvrir);
	}, []);
	const [, demarrer] = useTransition();
	const vus = lotsVisibles(vue.lots, requete, tri);
	const ouvert = vue.lots.find((l) => l.id === lotOuvert);
	const champ = (id: string, c: 'numero' | 'designation' | 'montantHt' | 'tauxTva' | 'montantTtc') => modifierChampLotAction.bind(null, id, c);
	const arreter = (e: React.MouseEvent) => e.stopPropagation();
	const q = requete.trim();

	function ajouter() {
		demarrer(async () => {
			const r = await ajouterLotAction(vue.chantierId);
			if (r.ok) setLotOuvert(r.donnees.id);
			else toast.error(r.erreur);
		});
	}

	return (
		<>
			<div className="toolbar">
				<Recherche placeholder="Rechercher un lot, une entreprise, un numéro…" libelle="Rechercher un lot" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="lot-sort" k="Trier par" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<span className="eyebrow">{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</span>
			</div>
			<div className="table-frame">
				<table className="lots">
					<thead>
						<tr><th>N°</th><th>Lot</th><th>Entreprise</th><th className="ta-r">Montant HT</th><th className="ta-r">TVA</th><th className="ta-r">Montant TTC</th></tr>
					</thead>
					<tbody>
						{vus.map((l) => {
							const nbAv = l.avenants.length;
							const classes = [!l.entreprise && 'is-unassigned', l.id === lotOuvert && 'is-open'].filter(Boolean).join(' ') || undefined;
							return (
								<tr key={l.id} data-lot={l.designation} className={classes} onClick={() => setLotOuvert(l.id)}>
									<td className="cell-num is-editable" onClick={arreter}>
										<ChampEnLigne variante="texte-mini" libelle="Numéro du lot" placeholder="—" valeur={l.numero ?? ''} enregistrer={champ(l.id, 'numero')} />
									</td>
									<td className="cell-lot is-editable" onClick={arreter}>
										<div className="lot-wrap">
											<ChampEnLigne libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
											{l.nature === 'SOUS_TRAITANCE' && <span className="nature-tag st">Sous-traitance</span>}
											{nbAv > 0 && <span className="nature-tag av" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</span>}
										</div>
									</td>
									<td className="cell-ent">
										{l.entreprise
											? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}{l.commune && <small>{l.commune}</small>}</>
											: <span className="unset">à attribuer</span>}
									</td>
									<td className="ta-r cell-ht is-editable" onClick={arreter}>
										<ChampEnLigne variante="montant" libelle="Montant HT" valeur={formatMontantSaisie(l.htInitial)} enregistrer={champ(l.id, 'montantHt')} />
									</td>
									<td className="ta-r cell-tva is-editable" onClick={arreter}>
										<ChampEnLigne variante="montant-mini" libelle="Taux de TVA" valeur={tauxAffiche(l.tauxTva)} enregistrer={champ(l.id, 'tauxTva')} />
									</td>
									<td className="ta-r cell-ht is-editable" onClick={arreter} title={nbAv ? 'Avenants compris — le montant initial HT est recalculé' : undefined}>
										<ChampEnLigne variante="montant" libelle="Montant TTC" valeur={formatMontantSaisie(l.ttcEngage)} enregistrer={champ(l.id, 'montantTtc')} />
									</td>
								</tr>
							);
						})}
						{!vus.length && (
							<tr className="empty-row">
								<td colSpan={6}>
									{q ? <>Aucun lot ne correspond à « {q} ». <button type="button" className="btn btn-sm" onClick={() => setRequete('')}>Effacer la recherche</button></>
										: <>Aucun lot pour l&apos;instant. <button type="button" className="btn btn-sm btn-primary" onClick={ajouter}>Ajouter le premier lot</button></>}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="totals">
				<div className="total-cell"><span className="total-k">Total marchés HT</span><span className="total-v num" data-testid="total-ht">{vue.totalHtTexte}</span></div>
				<div className="total-cell"><span className="total-k">TVA</span><span className="total-v num">{vue.totalTvaTexte}</span></div>
				<div className="total-cell"><span className="total-k">Total marchés TTC</span><span className="total-v grand num" data-testid="total-ttc">{vue.totalTtcTexte}</span></div>
			</div>
			{ouvert && <PanneauLot lot={ouvert} vue={vue} onFermer={() => setLotOuvert(null)} />}
		</>
	);
}
```

Le bouton « Ajouter un lot » de la barre de titre et celui de la ligne vide ouvrent tous deux le panneau du lot créé.

- [ ] **Step 5 : « Générer les marchés manquants »**

Dans `src/composants/BoutonMarchesManquants.tsx`, ajouter la prop `forme: 'barre' | 'entete'`, retirer `Button` et rendre :

```tsx
	const clic = () => demarrer(async () => { /* corps actuel, inchangé */ });
	return forme === 'barre' ? (
		<button type="button" className="btn btn-primary" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : 'Générer les marchés manquants'}</button>
	) : (
		<button type="button" className="dm-th-action" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : texte}</button>
	);
```

avec une prop `texte?: string` pour la forme `entete` (« Générer les 3 manquants », Task 11). Après un succès, appeler `router.refresh()` (importer `useRouter`) : les cases de l'écran Documents doivent passer « fait ».

- [ ] **Step 6 : La page**

Dans `src/app/(app)/chantiers/[id]/marches/page.tsx`, garder `siPresent`, `apercuAvenant`, `apercuCertificat` et le calcul des aperçus. Remplacer le `return` et les lectures :

```tsx
	const [vue, chantier, chargesAffaire] = await Promise.all([lireVueMarches(id), lireEnTeteChantier(id), listerChargesAffaire()]);
	if (!vue || !chantier) notFound();
	// … lot, donnees, autreApercu : inchangés …
	return (
		<Ecran
			titre="Marchés & récapitulatif"
			actions={<>
				<BoutonAjouterLot chantierId={id} />
				<a className="btn" href={`/api/chantiers/${id}/recap-xlsx`}><Icone.Telecharger />Exporter le récap</a>
				<BoutonMarchesManquants chantierId={id} forme="barre" />
			</>}
			contexte={<BandeauChantier chantier={chantier} chargesAffaire={chargesAffaire} />}
		>
			<TableauLots vue={vue} />
			{lot && donnees && (
				<ApercuDocument titre={TITRES_TYPES[donnees.type]} sousTitre={`Lot ${lot.numero ?? '—'} — ${lot.designation} — ${lot.entreprise ?? 'non attribué'}`}
					donnees={donnees} source={{ type: 'marche', lotId: lot.id }} manques={lot.manques.map((m) => LIBELLES_MANQUES[m])} />
			)}
			{autreApercu}
		</Ecran>
	);
```

Imports : `Ecran`, `* as Icone`, `BandeauChantier`, `BoutonAjouterLot` (depuis `@/composants/TableauLots`), `lireEnTeteChantier` et `listerChargesAffaire` (depuis `@/donnees/chantiers`). Retirer `buttonVariants`.

- [ ] **Step 7 : Vérifier**

Run : `npx tsc --noEmit && npm test && npm run test:conformite -- -g marches`
Expected : PASS. Le panneau du lot (capture `panneau-lot`) reste en échec jusqu'à la Task 9.

- [ ] **Step 8 : E2E de l'écran**

Run : `npm run test:e2e -- e2e/marches.spec.ts e2e/parcours.spec.ts e2e/navigation.spec.ts`
Expected : PASS. Pour chaque échec, adapter le **sélecteur** au libellé de la maquette, jamais l'assertion métier. Changements connus :
- « Modifier l'en-tête » devient un clic sur le bandeau (`page.getByTitle("Modifier l'en-tête du chantier")`) ;
- « Trier par » est un menu `MenuDeroulant` (`page.locator('#lot-sort .dd-btn').click()` puis `getByRole('option', { name: '…' })`) ;
- la recherche garde son nom accessible « Rechercher un lot ».

- [ ] **Step 9 : Commit**

```bash
git add src/composants/chantier/BandeauChantier.tsx src/composants/TableauLots.tsx src/composants/BoutonMarchesManquants.tsx src/domaine/lots.ts src/domaine/lots.test.ts src/domaine/montants.test.ts src/actions/chantiers.ts "src/app/(app)/chantiers/[id]/marches/page.tsx" e2e
git commit -m "feat(interface): écran Marchés de la maquette — bandeau du chantier, tableau des lots, totaux"
```

---

### Task 9 : Le panneau du lot

**Files :**
- Modify: `src/composants/PanneauLot.tsx`, `src/donnees/marches.ts`, `src/domaine/montants.ts`, `src/composants/TableauLots.tsx`
- Delete: `src/composants/MenuArtisan.tsx`

**Interfaces :**
- Consumes : `Panneau`, `MenuDeroulant`, `useConfirmation`, `Icone.*`, `ChampEnLigne` (`variante`, `id`), `artisansProposables`, `confirmationSuppression`, `numeroAvenantTexte`, `CERTIFICAT_IMPOSSIBLE`, `LIBELLES_MANQUES`.
- Produces :
  - `ArtisanOption` gagne `adresse: string; cp: string` ;
  - `formatTauxPoint(v: Valeur): string` (« 20.00 ») dans `src/domaine/montants.ts`. Il remplace `tauxAffiche` de la Task 8 : `TableauLots` l'importe de là, pour que `PanneauLot` et `TableauLots` ne s'importent pas l'un l'autre ;
  - la surcouche garde `role="dialog"` et le nom de la désignation (« GROS ŒUVRE ») ; le menu d'entreprise garde le nom « Attribuée à ».

Le panneau reprend `openLot()` (l. 4310-4420), bloc pour bloc. Il ajoute ce que l'app a en plus : « Corriger le certificat n° XX » (écart 5) et les manques qui empêchent d'ouvrir le marché.

- [ ] **Step 1 : Constater l'échec**

Run : `npm run test:conformite -- -g panneau-lot`
Expected : FAIL.

- [ ] **Step 2 : Le taux et les adresses**

Dans `src/domaine/montants.ts` :

```ts
/** 20.00 — un taux tel que la maquette l'affiche dans ses champs (toFixed(2)) ; lireNombreFr le relit. */
export function formatTauxPoint(v: Valeur): string {
	return new Decimal(v).toFixed(2);
}
```

Dans `src/composants/TableauLots.tsx`, supprimer `tauxAffiche` et l'import de `Decimal`, puis importer `formatTauxPoint` depuis `@/domaine/montants` à sa place.

Dans `src/donnees/marches.ts`, ajouter `adresse: string; cp: string` au type `ArtisanOption` et `adresse: a.adresse, cp: a.cp` à son remplissage dans `lireVueMarches`.

- [ ] **Step 3 : Le panneau**

Remplacer `src/composants/PanneauLot.tsx` :

```tsx
'use client';

import Decimal from 'decimal.js';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
import { attribuerArtisanAction, changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { useConfirmation } from '@/composants/maquette/Confirmation';
import * as Icone from '@/composants/maquette/icones';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';
import { Panneau } from '@/composants/maquette/Panneau';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie, formatTauxPoint, htEngage } from '@/domaine/montants';
import { artisansProposables } from '@/domaine/recherche';
import { LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';

type Avenant = LotVue['avenants'][number];
const NATURES = [['GRE_A_GRE', 'Gré à gré'], ['SOUS_TRAITANCE', 'Sous-traitance']] as const;
const dateFr = (iso: string) => iso.split('-').reverse().join('.');
const note = { margin: 0, fontSize: '0.75rem', color: 'var(--muted)' } as const;

export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarches; onFermer: () => void }) {
	const [enCours, demarrer] = useTransition();
	const confirmer = useConfirmation();
	const artisan = vue.artisans.find((a) => a.id === lot.artisanId);
	const champ = (c: 'montantHt' | 'tauxTva' | 'montantTtc' | 'retenueGarantie' | 'dateSignature') => modifierChampLotAction.bind(null, lot.id, c);
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, apres?: () => void) => demarrer(async () => {
		const r = await fn();
		if (r.ok) apres?.();
		else toast.error(r.erreur);
	});
	const avecAvenants = lot.avenants.length > 0;
	const somme = new Decimal(lot.sommeAvenants);

	const options = [
		{ v: '', t: '— non attribué —' }, { sep: true as const },
		...artisansProposables(vue.artisans, lot.artisanId).map((a) => ({ v: a.id, t: `${a.nom}${a.actif ? '' : ' (archivée)'}`, meta: a.commune })),
	];

	async function supprimerAvenant(a: Avenant) {
		const autres = lot.avenants.filter((x) => x.id !== a.id);
		if (!(await confirmer({ texte: confirmationSuppression(a.numero, lot.htInitial, autres), libelle: 'Supprimer', dangereux: true }))) return;
		agir(() => supprimerAvenantAction(a.id));
	}

	async function supprimerLot() {
		const oui = await confirmer({
			texte: <>Supprimer le lot <b>{lot.numero || lot.designation}</b>&nbsp;? Ses périodes du planning partiront avec lui.</>,
			libelle: 'Supprimer', dangereux: true,
		});
		if (oui) agir(() => supprimerLotAction(lot.id), () => { onFermer(); toast('Lot supprimé.'); });
	}

	const pied = (
		<>
			{lot.manques.length === 0 ? (
				<Link className="btn btn-primary" href={`?apercu=${lot.id}`} scroll={false} onClick={onFermer}><Icone.Doc />Ouvrir le marché</Link>
			) : (
				<button type="button" className="btn" onClick={() => toast(lot.artisanId
					? `Pour générer le marché : ${lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.`
					: "Attribuez d'abord une entreprise.")}>Ouvrir le marché</button>
			)}
			{lot.artisanId && (lot.certificat.possible
				? <Link className="btn" href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer}>Certificat de paiement</Link>
				: <button type="button" className="btn" onClick={() => toast(CERTIFICAT_IMPOSSIBLE)}>Certificat de paiement</button>)}
			{lot.certificat.dernier && (
				<Link className="btn" href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer}>
					{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
				</Link>
			)}
			{lot.artisanId && <Link className="btn" href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer}>PV de réception</Link>}
			<button type="button" className="btn btn-ghost" disabled={enCours} onClick={supprimerLot}>Supprimer le lot</button>
		</>
	);

	return (
		<Panneau ouvert surtitre={lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'} titre={lot.designation || 'Désignation à saisir'}
			libelle={lot.designation} onFermer={onFermer} pied={pied}>
			<div className="radio-row" role="radiogroup" aria-label="Nature du marché">
				{NATURES.map(([n, t]) => (
					<label key={n} role="radio" aria-checked={lot.nature === n} tabIndex={0} className={lot.nature === n ? 'is-on' : undefined}
						onClick={() => lot.nature !== n && agir(() => changerNatureAction(lot.id, n))}
						onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && lot.nature !== n) { e.preventDefault(); agir(() => changerNatureAction(lot.id, n)); } }}>
						{t}
					</label>
				))}
			</div>
			<p style={{ margin: '-0.5rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Détermine le gabarit imprimé pour ce lot.</p>

			<div className="block">
				<div className="block-head">
					<span className="eyebrow">Entreprise</span>
					{artisan && <Link className="btn btn-ghost btn-sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Link>}
				</div>
				<div className="block-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
					<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" classe="dd-plein" desactive={enCours}
						options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
					{artisan && (
						<>
							<dl className="kv">
								<dt>Adresse</dt><dd>{artisan.adresse || '—'}</dd>
								<dt>Commune</dt><dd>{artisan.cp} {artisan.commune || '—'}</dd>
								<dt>Interlocuteur</dt><dd>{artisan.interlocuteur || <span className="dash">non renseigné</span>}</dd>
								<dt>Téléphone</dt><dd className="num">{artisan.telephone || <span className="dash">—</span>}</dd>
							</dl>
							<p style={note}>Ces lignes sont lues dans le référentiel au moment de l&apos;impression. Elles ne sont pas recopiées dans le marché.</p>
						</>
					)}
				</div>
			</div>

			<div className="block">
				<div className="block-head"><span className="eyebrow">Marché</span></div>
				<div className="block-body">
					<dl className="kv">
						<dt><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></dt>
						<dd><ChampEnLigne id="pl-ht" variante="montant" className="champ-kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
						{avecAvenants && (
							<><dt>Avenants</dt><dd className={somme.isNegative() ? 'num moins' : 'num'} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</dd></>
						)}
						<dt><label htmlFor="pl-tva">T.V.A.</label></dt>
						<dd><ChampEnLigne id="pl-tva" variante="montant" className="champ-kv etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className="unite">%</span></dd>
						<dt><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></dt>
						<dd>
							<ChampEnLigne id="pl-ttc" variante="montant" className="champ-kv est-gras" libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
							{avecAvenants && <span className="hint-inline">avenants compris : le montant initial HT est recalculé</span>}
						</dd>
						<dt><label htmlFor="pl-rg">Retenue de garantie</label></dt>
						<dd>
							<ChampEnLigne id="pl-rg" variante="montant" className="champ-kv etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
							<span className="unite">%</span>
							<span className="calcule">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
						</dd>
						<dt>Exemplaires</dt>
						<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
						<dt>Signé le</dt>
						<dd>
							<ChampEnLigne variante="champ" className="date-lot" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
							{!lot.dateSignature && <span className="hint-inline">à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</span>}
						</dd>
					</dl>
				</div>
			</div>

			<div className="block">
				<div className="block-head">
					<span className="eyebrow">Avenants</span>
					<button type="button" className="btn btn-sm" disabled={enCours} aria-label="Ajouter un avenant" onClick={() => demarrer(async () => {
						const r = await ajouterAvenantAction(lot.id);
						if (r.ok) toast(r.donnees.message);
						else toast.error(r.erreur);
					})}>Ajouter</button>
				</div>
				<div className="block-body" style={{ padding: 0 }}>
					{avecAvenants ? (
						<>
							<table className="plain plain-mini">
								<thead><tr><th>N°</th><th>Devis</th><th className="ta-r">Montant HT</th><th>Date</th><th /></tr></thead>
								<tbody>
									{lot.avenants.map((a) => {
										const n = numeroAvenantTexte(a.numero);
										return (
											<tr key={a.id} data-avenant={n}>
												<td className="num" style={{ color: 'var(--muted)' }}>{n}</td>
												<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
												<td className="ta-r is-editable"><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
												<td><ChampEnLigne variante="champ" className="date-lot" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
												<td className="ta-r cell-actions nowrap">
													<Link className="btn btn-sm btn-ico" href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
														title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Link>
													<button type="button" className="btn btn-sm btn-danger btn-ico" disabled={enCours} onClick={() => supprimerAvenant(a)}
														title="Supprimer cet avenant" aria-label={`Supprimer l'avenant n° ${n}`}><Icone.Corbeille /></button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							<p className="av-note">Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine&nbsp;; c&apos;est l&apos;avenant qui porte la différence.</p>
						</>
					) : (
						<p className="vide-mini">Aucun avenant. Le marché vaut son montant d&apos;origine.</p>
					)}
				</div>
			</div>
		</Panneau>
	);
}
```

Ajouter à `maquette-ajouts.css` :

```css
/* Le TTC du panneau est en gras (style en ligne dans la maquette, que ChampEnLigne ne porte pas). */
.champ-kv.est-gras { font-weight: 600; }
/* Les liens-boutons du pied du panneau et des lignes d'avenant. */
.panel-foot a.btn, .cell-actions a.btn { text-decoration: none; }
/* Nature du marché : des libellés sans bouton radio, comme la maquette ; focus visible au clavier. */
.radio-row label[role='radio']:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

Supprimer `src/composants/MenuArtisan.tsx` : `MenuDeroulant` le remplace. `git grep -n MenuArtisan src` ne doit plus rien renvoyer.

- [ ] **Step 4 : Attribution au clavier (Review Focus 4)**

Ajouter à `e2e/marches.spec.ts` (le fichier a déjà `nouveauChantier(page, reference)` et importe `ADMIN`, `seConnecter`) :

```ts
test('attribuer une entreprise au clavier : recherche, Entrée choisit le premier résultat, Échap referme le menu seul', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — CLAVIER');
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: 'à attribuer' }).click();
	const panneau = page.getByRole('dialog', { name: 'GROS ŒUVRE' });
	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
	await page.getByRole('searchbox', { name: 'Rechercher dans Attribuée à' }).fill('rebours');
	await page.keyboard.press('Enter');
	await expect(panneau.locator('#dd-ent .dd-v')).toHaveText('CONSTRUCTIONS REBOURS');
	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox', { name: 'Attribuée à' })).toBeHidden();
	await expect(panneau).toBeVisible();   // Échap ferme le menu, pas le panneau
});

test('supprimer un avenant puis annuler par Échap : rien ne change', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — AVENANT');
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: 'à attribuer' }).click();
	const panneau = page.getByRole('dialog', { name: 'GROS ŒUVRE' });
	await panneau.getByRole('button', { name: 'Ajouter un avenant' }).click();
	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
	await panneau.getByRole('button', { name: "Supprimer l'avenant n° 01" }).click();
	await expect(page.locator('.ask.is-on')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.locator('.ask.is-on')).toBeHidden();
	await expect(panneau).toBeVisible();   // Échap annule la confirmation, pas le panneau
	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
});
```

Dans le test existant « attribue une entreprise par recherche… », `toHaveText('CONSTRUCTIONS REBOURS')` sur le bouton devient `expect(page.locator('#dd-ent .dd-v')).toHaveText('CONSTRUCTIONS REBOURS')` : le bouton porte aussi le surtitre « Attribuée à ».

Échap ne doit pas fermer le panneau quand un menu est ouvert. `MenuDeroulant` intercepte Échap en phase de capture (`addEventListener('keydown', …, true)` + `stopPropagation`), avant l'écouteur du `Panneau`. La confirmation fait de même, et `Panneau` ignore Échap tant qu'une `.ask.is-on` existe.

- [ ] **Step 5 : Vérifier**

Run : `npx tsc --noEmit && npm run test:conformite -- -g "panneau-lot|marches" && npm run test:e2e -- e2e/marches.spec.ts e2e/financier.spec.ts`
Expected : PASS. Adapter les sélecteurs des E2E existants :
- « Ajouter un avenant » garde ce nom accessible ;
- `window.confirm` n'existe plus : remplacer `page.once('dialog', …)` par un clic sur `page.locator('.ask.is-on').getByRole('button', { name: 'Supprimer' })` ;
- « Ouvrir le marché » n'est plus désactivé quand il manque quelque chose : il affiche un toast.

- [ ] **Step 6 : Commit**

```bash
git add src/composants/PanneauLot.tsx src/composants/TableauLots.tsx src/composants/MenuArtisan.tsx src/donnees/marches.ts src/domaine/montants.ts src/app/maquette-ajouts.css e2e
git commit -m "feat(interface): panneau du lot de la maquette (nature, entreprise, marché, avenants)"
```

---

### Task 10 : Planning

**Files :**
- Modify: `src/app/(app)/chantiers/[id]/planning/page.tsx`, `src/composants/planning/Planning.tsx`, `src/composants/planning/BarreOutilsPlanning.tsx`, `src/composants/planning/FenetreFermetures.tsx`, `src/composants/planning/PanneauLotPlanning.tsx`
- Delete: `src/composants/planning/MenuLotsAffiches.tsx`

**Interfaces :**
- Consumes : `Ecran` (Task 4), `BandeauChantier` (Task 8), `Panneau`, `MenuDeroulant`, `useConfirmation`, `Icone.*` (Task 2), `optionsGroupees` (`geometrie.ts`).
- Produces : `Planning({ planningInitial, aujourdhui, contexte })`, où `contexte: React.ReactNode` est le bandeau rendu par la page. Noms accessibles conservés : « Périodes de fermeture », la désignation du lot, « Main — faire glisser le planning », « Cible — tracer une période ».

La grille (`GrillePlanning`) a déjà le balisage de la maquette ; seul change son habillage. Il reprend `#v-planning` (l. 2391-2450), `menuLotsVus()` (l. 5391), `openLotPlanning()` (l. 5841) et `openFermetures()` (l. 5909).

- [ ] **Step 1 : Constater l'échec**

Run : `npm run test:conformite -- -g planning`
Expected : FAIL.

- [ ] **Step 2 : La page**

Dans `src/app/(app)/chantiers/[id]/planning/page.tsx`, lire aussi `listerChargesAffaire()` (en parallèle de `lirePlanning` et `lireEnTeteChantier`) et passer le bandeau :

```tsx
			<Planning planningInitial={planning} aujourdhui={versIso(dateParis(new Date()))}
				contexte={<BandeauChantier chantier={chantier} chargesAffaire={chargesAffaire} />} />
```

- [ ] **Step 3 : L'écran**

Dans `src/composants/planning/Planning.tsx` :
1. ajouter la prop `contexte: React.ReactNode` ;
2. remplacer `const [confirmation, setConfirmation] = useState(false);` par `const confirmer = useConfirmation();` ;
3. remplacer `onSupprimer: () => (choisies.length === 1 ? supprimer(choisies) : setConfirmation(true)),` par :

```ts
		onSupprimer: () => {
			if (choisies.length === 1) { supprimer(choisies); return; }
			const ids = choisies;
			void confirmer({ texte: `Supprimer les ${ids.length} périodes sélectionnées ?`, libelle: 'Supprimer', dangereux: true })
				.then((oui) => { if (oui) supprimer(ids); });
		},
```

4. remplacer le `return` par :

```tsx
	return (
		<Ecran
			titre="Planning des travaux"
			actions={<>
				<button type="button" className="btn" onClick={() => setFermeturesOuvertes(true)}><Icone.Calendrier />Fermetures</button>
				<Link className="btn" href="?apercu=visa" scroll={false}><Icone.Visa />Feuille de visa</Link>
				<Link className="btn btn-primary" href="?apercu=planning" scroll={false}><Icone.Imprimer />Planning imprimable</Link>
			</>}
			contexte={contexte}
		>
			<BarreOutilsPlanning /* props inchangées */ />
			<GrillePlanning /* props inchangées */ />
			{rendu.lasso && <div className="g-lasso" style={rendu.lasso} />}
			{rendu.pastille && <div className="g-chip" style={{ left: rendu.pastille.x, top: rendu.pastille.y }}>{rendu.pastille.texte}</div>}
			<PanneauLotPlanning /* props inchangées */ />
			<FenetreFermetures /* props inchangées */ />
		</Ecran>
	);
```

Recopier les props telles qu'elles sont aujourd'hui (les commentaires `/* props inchangées */` désignent le code existant, à garder mot pour mot). Supprimer le `<Dialog>` de confirmation et les imports de `Button`, `buttonVariants`, `Dialog*`. Importer `Ecran`, `* as Icone` et `useConfirmation`.

- [ ] **Step 4 : La barre d'outils**

Dans `src/composants/planning/BarreOutilsPlanning.tsx` :
- remplacer `<Hand />` par `<Icone.Main />` et `<Crosshair />` par `<Icone.Cible />`, et retirer l'import de `lucide-react` ;
- remplacer les deux `<Button size="sm" variant="outline" …>` par `<button type="button" className="btn btn-sm" …>` ;
- retirer `cn` : `className={p.outil === valeur ? 'zoom-b zoom-ic is-on' : 'zoom-b zoom-ic'}` et, pour la densité, `className={p.densite === d ? 'zoom-b is-on' : 'zoom-b'}` ;
- remplacer `<MenuLotsAffiches … />` par ce menu, qui reprend `menuLotsVus()` :

```tsx
				<MenuDeroulant id="lots-vus" k="Lots affichés" multi classe="dd-large"
					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
					options={[
						...(caches ? [{ v: '*', t: 'Tout afficher' }, { sep: true as const }] : []),
						...p.lots.map((l) => ({ v: l.id, t: l.designation || 'Lot sans désignation', meta: l.periodes.length ? `${l.periodes.length} pér.` : '—' })),
					]}
					onChoisir={(v) => (v === '*' ? p.onToutAfficher() : p.onBasculerLot(v))} />
```

avec, en tête de la fonction, `const caches = p.lots.filter((l) => p.masques.includes(l.id)).length; const vus = p.lots.length - caches;`. Supprimer `MenuLotsAffiches.tsx`.

- [ ] **Step 5 : Fermetures et lot, en panneaux**

Remplacer le rendu de `FenetreFermetures` (props inchangées) :

```tsx
	return (
		<Panneau ouvert={ouverte} surtitre="CHANTIER" titre="Périodes de fermeture" onFermer={onFermer}
			pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
			<p className="pal-note" style={{ margin: 0 }}>Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</p>
			<div className="block">
				<div className="block-head"><span className="eyebrow">Fermetures</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
				<div className="block-body" style={{ padding: 0 }}>
					{fermetures.length ? (
						<table className="plain plain-mini">
							<thead><tr><th>Libellé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
							<tbody>
								{fermetures.map((f) => {
									const s = semaineDuRang(rangIso(f.debut));
									return (
										<tr key={f.id}>
											<td><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
											<td className="ta-r cell-actions">
												<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(f.id)}
													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : <p className="vide-mini">Aucune fermeture.</p>}
				</div>
			</div>
		</Panneau>
	);
```


Remplacer le rendu de `PanneauLotPlanning` de la même façon (props inchangées), d'après `openLotPlanning()`. La structure :

```tsx
	return (
		<Panneau ouvert={lot !== null} surtitre={lot?.numero ? `LOT ${lot.numero}` : 'LOT'} titre={lot?.designation || 'Désignation à saisir'}
			libelle={lot?.designation} onFermer={onFermer} pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
			{lot && (
				<>
					<div className="block">
						<div className="block-head"><span className="eyebrow">Couleur du lot</span></div>
						<div className="block-body">
							<div className="pal">
								{COULEURS.map((c) => (
									<button key={c.cle} type="button" className={c.cle === lot.couleur ? 'pal-c is-on' : 'pal-c'} style={{ background: c.fond }}
										title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)} />
								))}
							</div>
							<p className="pal-note">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
						</div>
					</div>
					<div className="block">
						<div className="block-head"><span className="eyebrow">Périodes</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
						<div className="block-body" style={{ padding: 0 }}>
							{lot.periodes.length ? (
								<table className="plain plain-mini">
									<thead><tr><th>Intitulé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
									{lot.periodes.map((x) => (
										<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
											onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
									))}
								</table>
							) : <p className="vide-mini">Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».</p>}
						</div>
					</div>
				</>
			)}
		</Panneau>
	);
```

Remplacer `LignePeriode` (même `LigneProps`) par les deux lignes de la maquette. Un `<tbody>` par période garde le `data-periode` qu'emploient les E2E :

```tsx
/** Deux rangs par période : les champs, puis « Commence après » (openLotPlanning de la maquette). */
function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprimer }: LigneProps) {
	const s = semaineDuRang(rangIso(x.debut));
	return (
		<tbody data-periode={x.id}>
			<tr className={vise ? 'ligne-per est-vise' : 'ligne-per'} data-vise={vise ? '1' : undefined}>
				<td><ChampEnLigne libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
				<td className="ta-r cell-actions">
					<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(x.id)}
						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></button>
				</td>
			</tr>
			<tr className={vise ? 'ligne-dep est-vise' : 'ligne-dep'}>
				<td colSpan={5}>
					<MenuDeroulant id={`dd-dep-${x.id}`} k="Commence après" classe="dd-large" valeur={x.dependDeId ?? ''}
						options={[
							{ v: '', t: '— rien, date libre —' },
							// optionsDep() de la maquette : un séparateur et le nom du lot, puis ses périodes (« Fondations » · « S16 2026 »).
							...options.flatMap((g) => [{ sep: true as const }, { tete: g.lot }, ...g.periodes.map((o) => {
								const [t, meta] = o.libelle.split(' — ');
								return { v: o.id, t, meta };
							})]),
						]}
						onChoisir={(v) => onLier(x.id, v || null)} />
				</td>
			</tr>
		</tbody>
	);
}
```

Les champs de la période gardent leurs noms (`ChampPeriode` : `intitule`, `semaine`, `annee`, `duree`). À l'ouverture, faire défiler la ligne visée dans la vue, comme la maquette :

```tsx
useEffect(() => { document.querySelector('.panel.is-on tr[data-vise]')?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
```

Retirer les imports de `lucide-react`, `Button`, `Sheet*`, `Dialog*` et `cn` de ces fichiers.

- [ ] **Step 6 : Vérifier**

Run : `npx tsc --noEmit && npm test -- src/composants/planning && npm run test:conformite -- -g planning && npm run test:e2e -- e2e/planning.spec.ts e2e/planning-gestes.spec.ts e2e/planning-documents.spec.ts`
Expected : PASS. Adapter les sélecteurs :
- « Supprimer les périodes » (nom de la fenêtre) devient la confirmation `.ask` : `page.locator('.ask.is-on')`, texte « Supprimer les N périodes sélectionnées ? », bouton « Supprimer » ;
- « Tout afficher » et les cases des lots sont des options du menu `#lots-vus` (`role="option"`).

Les raccourcis clavier du planning doivent rester actifs panneau fermé. Si un test de gestes échoue au clavier, vérifier qu'aucun élément `[data-bloque-clavier]` ne reste dans la page quand panneau et confirmation sont fermés.

- [ ] **Step 7 : Commit**

```bash
git add "src/app/(app)/chantiers/[id]/planning/page.tsx" src/composants/planning e2e
git commit -m "feat(interface): écran Planning de la maquette (barre de titre, bandeau, panneaux fermetures et lot)"
```

---

### Task 11 : Documents du chantier

**Files :**
- Create: `src/composants/documents/CartesDocuments.tsx`, `src/composants/documents/TableauDocuments.tsx`
- Modify: `src/documents/etats.ts`, `src/documents/etats.int.test.ts`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `src/composants/ActionsLevee.tsx`, `src/app/maquette-ajouts.css`
- Delete: `src/composants/TableauDocuments.tsx`, `src/composants/CarteComptesRendus.tsx`

**Interfaces :**
- Consumes : `Ecran`, `BoutonMarchesManquants` (`forme="entete"`, Task 8), `creerBrouillonAction`, `etatsDocumentsChantier`, `lirePlanning` + `etendueDuPlanning` + `semaineDuRang`, `dateDuJourTexte`.
- Produces :
  - `LigneDocuments` gagne `numero: string | null; designation: string; nature: Nature; entreprise: string | null` ;
  - `CaseAvenant` gagne `montantHt: string` ;
  - `VueDocuments` gagne `lots: LigneDocuments[]`, dans l'ordre du chantier. `entreprises` reste pour les tests existants ; Task 16 le retire s'il ne sert plus ;
  - attributs conservés pour les E2E : `data-lot`, `data-case`, `data-etat`, `data-serie`, `data-testid="resume-documents"`, `data-testid="suite-comptes-rendus"`.

L'écran reprend `#v-documents` (l. 2452-2470) et `renderDocs()` (l. 4683-4822) : quatre cartes pour le chantier entier, puis **un seul** tableau, une ligne par lot dans l'ordre du chantier. Les états propres à l'app (modifié, périmé, hors appli, corriger, levée des réserves) sont des pastilles et des actions secondaires (écart 5).

- [ ] **Step 1 : Test des nouveaux champs**

Dans `src/documents/etats.int.test.ts`, ajouter :

```ts
	it('liste les lots dans l\'ordre du chantier, avec numéro, désignation, nature, entreprise et montant des avenants', async () => {
		const vue = (await etatsDocumentsChantier(p.chantierId, deps.maintenant))!;
		const ordre = await prisma.lot.findMany({ where: { chantierId: p.chantierId }, orderBy: { ordre: 'asc' }, select: { id: true } });
		expect(vue.lots.map((l) => l.lotId)).toEqual(ordre.map((l) => l.id));
		const go = vue.lots.find((l) => l.lotId === p.lots['GROS ŒUVRE'])!;
		expect(go).toMatchObject({ designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', entreprise: 'CONSTRUCTIONS REBOURS' });
		const avenant = await prisma.avenant.create({ data: { lotId: p.lots['GROS ŒUVRE'], numero: 1, montantHt: '3720' } });
		const apres = (await etatsDocumentsChantier(p.chantierId, deps.maintenant))!;
		expect(apres.lots.find((l) => l.lotId === p.lots['GROS ŒUVRE'])!.avenants).toEqual([expect.objectContaining({ avenantId: avenant.id, montantHt: '3720' })]);
	});
```

Run : `npm run test:int -- src/documents/etats.int.test.ts`
Expected : FAIL, `vue.lots` indéfini.

- [ ] **Step 2 : Les champs**

Dans `src/documents/etats.ts` :
- importer `type Nature` depuis `@/domaine/regles` ;
- ajouter les champs aux types `LigneDocuments` et `CaseAvenant`, et `lots: LigneDocuments[]` à `VueDocuments` ;
- dans la boucle `for (const lot of lots)`, ajouter à `ligne` : `numero: lot.numero, designation: lot.designation, nature: lot.nature, entreprise: lot.artisan?.nom ?? null` ;
- ajouter à chaque case d'avenant : `montantHt: new Decimal(a.montantHt).toFixed()` (importer `Decimal` depuis `decimal.js`) ;
- avant la boucle, déclarer `const enOrdre: LigneDocuments[] = [];`, puis faire `enOrdre.push(ligne)` à côté de `groupes.set(…)`. Retourner `lots: enOrdre`. `lireSources` lit déjà les lots par `ordre` croissant.

Run : `npm run test:int -- src/documents`
Expected : PASS.

- [ ] **Step 3 : Les cartes**

Créer `src/composants/documents/CartesDocuments.tsx` :

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { creerBrouillonAction } from '@/actions/comptesRendus';
import type { SerieDocuments, SerieVisa, VueDocuments } from '@/documents/etats';
import { numeroTexte } from '@/domaine/compteRendu';
import type { Semaine } from '@/domaine/semaines';
import { dateDuJourTexte } from '@/domaine/regles';

type Carte = { k: string; n: string; v: React.ReactNode; vide: boolean; ouvrir?: string; s: string; bouton: React.ReactNode; serie: string; idSuite?: string };

function DmCarte(c: Carte) {
	return (
		<div className={c.vide ? 'dm-carte est-vide' : 'dm-carte'} data-serie={c.serie}>
			<div className="dm-carte-tete"><span className="dm-carte-k">{c.k}</span><span className="dm-carte-n">{c.n}</span></div>
			{c.vide || !c.ouvrir ? <div className={c.vide ? 'dm-carte-v est-vide' : 'dm-carte-v'}>{c.v}</div> : <Link className="dm-carte-v" href={c.ouvrir} scroll={false}>{c.v}</Link>}
			<div className="dm-carte-s" data-testid={c.idSuite}>{c.s}</div>
			{c.bouton}
		</div>
	);
}

const le = (iso: string) => dateDuJourTexte(new Date(iso));
const pastille = (texte: string) => <span className="pill pill-modif">{texte}</span>;

export function CartesDocuments({ vue, etendue, attribues }: { vue: VueDocuments; etendue: { debut: Semaine; fin: Semaine }; attribues: number }) {
	const router = useRouter();
	const [enCours, demarrer] = useTransition();
	const cr = vue.comptesRendus;
	const dernier = cr.liste[0];
	const planning = `/chantiers/${vue.chantierId}/planning`;
	const derniere = (s: SerieDocuments | SerieVisa) => s.versions[0];
	const recap = derniere(vue.recap), plan = derniere(vue.planning), visa = derniere(vue.visa);
	const nbRecap = vue.recap.versions.length;

	function nouveauCompteRendu() {
		demarrer(async () => {
			const r = await creerBrouillonAction(vue.chantierId);
			if (!r.ok) { toast.error(r.erreur); return; }
			router.push('?cr=brouillon', { scroll: false });
		});
	}

	return (
		<div className="dm-cartes">
			<DmCarte serie="comptes-rendus" idSuite="suite-comptes-rendus" k="Comptes rendus" n={cr.liste.length ? String(cr.liste.length) : ''} vide={!dernier}
				v={dernier ? `n° ${numeroTexte(dernier.numero)} · ${dernier.date.replace(/\//g, '.')}` : "Aucun pour l'instant"}
				ouvrir={dernier ? `?cr=${dernier.id}` : undefined}
				s={cr.brouillon ? `Brouillon n° ${numeroTexte(cr.brouillon.numero)} en cours`
					: cr.prochainRdv === null ? 'Le premier reprend lots et entreprises'
					: cr.prochainRdv ? `Prochain : ${cr.prochainRdv}` : 'Prochain rendez-vous non fixé'}
				bouton={cr.brouillon
					? <Link className="btn btn-sm btn-primary" href="?cr=brouillon" scroll={false}>Reprendre le brouillon</Link>
					: <button type="button" className="btn btn-sm btn-primary" disabled={enCours} onClick={nouveauCompteRendu}>Nouveau compte rendu</button>} />
			<DmCarte serie="recap" k="Récap des marchés" n={recap ? `v${recap.version}` : ''} vide={!recap}
				v={recap ? <>{le(recap.creeLe)}{vue.recap.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore exporté'} ouvrir="?apercu=recap"
				s={recap ? `${nbRecap} version${nbRecap > 1 ? 's' : ''} enregistrée${nbRecap > 1 ? 's' : ''}` : `${vue.lots.length} lots à récapituler`}
				bouton={<Link className="btn btn-sm" href="?apercu=recap" scroll={false}>Exporter à jour</Link>} />
			<DmCarte serie="planning" k="Planning" n={plan ? `v${plan.version}` : ''} vide={!plan}
				v={plan ? <>{le(plan.creeLe)}{vue.planning.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore imprimé'} ouvrir={`${planning}?apercu=planning`}
				s={`Semaine ${etendue.debut.semaine} · ${etendue.debut.annee} à ${etendue.fin.semaine} · ${etendue.fin.annee}`}
				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=planning`}>Planning imprimable</Link>} />
			<DmCarte serie="visa" k="Feuille de visa" n={visa ? `v${visa.version}` : ''} vide={!visa}
				v={visa ? <>{le(visa.creeLe)}{vue.visa.etat === 'perime' && pastille('périmé')}</> : 'Pas encore produite'} ouvrir={`${planning}?apercu=visa`}
				s={`À faire signer aux ${attribues} entreprise${attribues > 1 ? 's' : ''}`}
				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=visa`}>{visa ? 'Réimprimer' : 'Produire'}</Link>} />
		</div>
	);
}
```


- [ ] **Step 4 : Le tableau**

Créer `src/composants/documents/TableauDocuments.tsx` :

```tsx
import Decimal from 'decimal.js';
import Link from 'next/link';
import type { CaseAvenant, LigneDocuments, VueDocuments } from '@/documents/etats';
import type { ManqueAvenant } from '@/domaine/avenants';
import { formatEuros } from '@/domaine/montants';
import { dateDuJourTexte } from '@/domaine/regles';
import { ActionsLevee } from '../ActionsLevee';
import { BoutonMarchesManquants } from '../BoutonMarchesManquants';

const deux = (n: number) => String(n).padStart(2, '0');
/** « 02.04 » : le jour et le mois de la dernière version (courtDate de la maquette). */
const court = (iso: string) => dateDuJourTexte(new Date(iso)).slice(0, 5);
/** « + 3 720 € », « − 280 € » (signe() de la maquette : sans les centimes nuls). */
const signe = (v: string) => {
	const d = new Decimal(v);
	return `${d.isNegative() ? '−' : '+'} ${formatEuros(d.abs()).replace(',00\u00a0€', '\u00a0€')}`;
};
const MANQUES_CASE: Record<ManqueAvenant, string> = { entreprise: "pas d'entreprise", montantAvenant: 'montant nul' };
const modifie = <span className="pill pill-modif">modifié</span>;

function Fait({ href, titre, alerte, children, cas, etat }: { href: string; titre?: string; alerte?: boolean; children: React.ReactNode; cas: string; etat?: string }) {
	return <Link className={alerte ? 'dm-case est-alerte' : 'dm-case est-fait'} href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>;
}
function Manque({ href, titre, children, cas, etat }: { href?: string; titre?: string; children: React.ReactNode; cas: string; etat?: string }) {
	return href
		? <Link className="dm-case est-manque" href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>
		: <span className="dm-case est-manque" title={titre} data-case={cas}>{children}</span>;
}

function CaseMarche({ base, l }: { base: string; l: LigneDocuments }) {
	const ouvrir = `${base}/marches?apercu=${l.lotId}`;
	const d = l.marche.versions[0];
	if (!d) return <Manque cas="marche" href={ouvrir} titre="Ouvrir le marché de ce lot pour le produire">+ Générer</Manque>;
	return (
		<span className="dm-pile">
			<Fait cas="marche" href={ouvrir} titre={l.marche.versions.length > 1 ? `${l.marche.versions.length} versions — la dernière s'ouvre` : undefined}>{`v${d.version} · ${court(d.creeLe)}`}</Fait>
			{l.marche.etat === 'modifie' && modifie}
		</span>
	);
}

function CaseAv({ base, a }: { base: string; a: CaseAvenant }) {
	const texte = `n° ${deux(a.numero)} · ${signe(a.montantHt)}`;
	const ouvrir = `${base}/marches?avenant=${a.avenantId}`;
	if (a.etat === 'a-produire') {
		return a.manques.length
			? <Manque cas="avenant">{`n° ${deux(a.numero)} · ${a.manques.map((m) => MANQUES_CASE[m]).join(', ')}`}</Manque>
			: <Manque cas="avenant" href={ouvrir} titre="Cet avenant n'a pas encore été enregistré dans les documents">{`${texte} à éditer`}</Manque>;
	}
	return <span className="dm-pile"><Fait cas="avenant" href={ouvrir}>{texte}</Fait>{a.etat === 'modifie' && modifie}</span>;
}

function CasesCertificats({ base, l }: { base: string; l: LigneDocuments }) {
	const visibles = l.certificats.slice(-2);
	return (
		<div className="dm-pile">
			{l.certificats.length > 2 && <span className="dm-plus">{l.certificats.length - 2} avant</span>}
			{visibles.map((c) => {
				const n = `n° ${deux(c.numero)}`;
				const d = c.versions[0];
				if (c.manuel || !d) return <span key={c.acompteId} className="dm-case est-hors" data-case="certificat">{`${n} · hors appli`}</span>;
				return (
					<span key={c.acompteId}>
						<Fait cas="certificat" href={`?version=${d.id}`} titre={`Certificat n° ${c.numero}`}>{c.versions.length > 1 ? `${n} · v${d.version}` : n}</Fait>
						{c.corrigeable && <span className="dm-sous"><Link className="dm-th-action" href={`${base}/marches?corriger=${c.acompteId}`}>Corriger</Link></span>}
					</span>
				);
			})}
			{l.certificatPossible
				? <Link className="dm-ajout" href={`${base}/marches?certificat=${l.lotId}`} title="Nouveau certificat de paiement" aria-label={`Nouveau certificat de paiement pour ${l.entreprise}`}>+</Link>
				: <span className="dm-ajout" aria-disabled="true" title="Lot sans entreprise ou sans montant">+</span>}
		</div>
	);
}

function CaseReception({ l }: { l: LigneDocuments }) {
	const r = l.reception!;
	if (!r.derniere) return <Manque cas="reception" etat={r.etat} href={`?pv=${l.lotId}`}>{r.texte}</Manque>;
	return (
		<span>
			<Fait cas="reception" etat={r.etat} href={`?version=${r.derniere.id}`} alerte={r.alerte}>{r.texte}</Fait>
			<span className="dm-sous">
				<Link className="dm-th-action" href={`?pv=${l.lotId}`} scroll={false}>Nouveau PV</Link>
				<ActionsLevee lotId={l.lotId} etat={r.etat} />
			</span>
		</span>
	);
}

export function TableauDocuments({ vue }: { vue: VueDocuments }) {
	const base = `/chantiers/${vue.chantierId}`;
	const attribues = vue.lots.filter((l) => l.entreprise).length;
	const sansMarche = vue.lots.filter((l) => l.entreprise && l.marche.etat === 'a-produire').length;
	return (
		<div className="dm-cadre">
			<table className="dm">
				<thead><tr>
					<th scope="col" className="dm-lot">Lot et entreprise</th>
					<th scope="col">Marché{sansMarche > 0 && <> <BoutonMarchesManquants chantierId={vue.chantierId} forme="entete" texte={`Générer les ${sansMarche} manquants`} /></>}</th>
					<th scope="col">Avenants</th>
					<th scope="col">Certificats de paiement</th>
					<th scope="col">Réception{attribues > 1 && <> <Link className="dm-th-action" href="?pv=tous" scroll={false}>Tous les lots</Link></>}</th>
				</tr></thead>
				<tbody>
					{vue.lots.map((l) => {
						const st = l.nature === 'SOUS_TRAITANCE';
						const lot = (
							<th scope="row" className="dm-lot">
								<div className="dm-lot-in">
									<span className="dm-lot-n">{l.numero || (st ? 'ST' : '—')}</span>
									<span className="dm-lot-d">{l.designation || 'Lot sans désignation'}{st && <> <span className="nature-tag st">Sous-traitance</span></>}</span>
									<span className="dm-lot-e">{l.entreprise ?? <i>à attribuer</i>}</span>
								</div>
							</th>
						);
						if (!l.entreprise) {
							return <tr key={l.lotId} className="dm-inactif" data-lot={l.lotTexte}>{lot}<td colSpan={4} className="dm-note">Attribuez une entreprise depuis l&apos;écran Marchés pour produire ses documents.</td></tr>;
						}
						return (
							<tr key={l.lotId} data-lot={l.lotTexte}>
								{lot}
								<td><CaseMarche base={base} l={l} /></td>
								<td><div className="dm-pile">{l.avenants.length ? l.avenants.map((a) => <CaseAv key={a.avenantId} base={base} a={a} />) : <span className="dm-rien" aria-label="aucun">—</span>}</div></td>
								<td><CasesCertificats base={base} l={l} /></td>
								<td><CaseReception l={l} /></td>
							</tr>
						);
					})}
					{!vue.lots.length && <tr><td colSpan={5} className="dm-note">Ce chantier n&apos;a pas encore de lot.</td></tr>}
				</tbody>
			</table>
			<div className="dm-pied">
				<span className="dm-legende">
					<span className="dm-case est-fait">fait</span> s&apos;ouvre · <span className="dm-case est-manque">à produire</span> se produit · <span className="dm-case est-alerte">réserves</span> demande un suivi
				</span>
				<span>{attribues} entreprise{attribues > 1 ? 's' : ''} sur {vue.lots.length} lot{vue.lots.length > 1 ? 's' : ''}</span>
			</div>
		</div>
	);
}

/** Ce que le tableau ne range pas : les comptes rendus enregistrés (« Autres documents » de la maquette). */
export function AutresDocuments({ vue }: { vue: VueDocuments }) {
	const liste = vue.comptesRendus.liste;
	if (!liste.length) return null;
	return (
		<div className="dm-cadre">
			<div className="dm-autres-t">Autres documents</div>
			{liste.map((c) => {
				const d = c.versions[0];
				return (
					<div key={c.id} className="dm-autre">
						<Link className="doc-link" href={`?cr=${c.id}`} scroll={false}>{`Compte rendu n° ${deux(c.numero)}`}</Link>
						<span>
							{d ? `v${d.version} · ${c.date.replace(/\//g, '.')}` : c.date}
							{c.dernier && <> · <Link className="dm-th-action" href={`?corriger-cr=${c.id}`} scroll={false}>{`Corriger le n° ${deux(c.numero)}`}</Link></>}
						</span>
					</div>
				);
			})}
		</div>
	);
}
```

`formatEuros` sépare le symbole par une espace insécable `\u00a0` (`INSECABLE` dans `montants.ts`) : c'est elle que `signe` remplace.

Dans `src/composants/ActionsLevee.tsx`, remplacer les trois `Button` (« Annuler la levée », « Réserves levées… », « Enregistrer la levée ») par `<button type="button" className="dm-th-action">` (`type="submit"` pour le dernier), et retirer l'import de `Button`.

Ajouter à `maquette-ajouts.css` :

```css
/* Écran Documents : les cases et actions sont des liens dans l'app (des boutons dans la maquette). */
a.dm-case, a.dm-ajout, a.dm-carte-v, a.dm-th-action, a.doc-link { text-decoration: none; }
span.dm-ajout[aria-disabled='true'] { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 5 : La page**

Dans `src/app/(app)/chantiers/[id]/documents/page.tsx`, garder le calcul de `apercuDocument`, remplacer `texteResume` et le `return` :

```tsx
/** « 6 documents produits · dernier le 18.06.2026 » (renderDocs de la maquette). */
function texteResume({ nombre, dernierLe }: VueDocuments['resume']): string {
	if (!nombre || !dernierLe) return 'Aucun document produit pour ce chantier.';
	return `${nombre} document${nombre > 1 ? 's' : ''} produit${nombre > 1 ? 's' : ''} · dernier le ${dateDuJourTexte(new Date(dernierLe))}`;
}
	// … dans PageDocuments, après etatsDocumentsChantier :
	const planning = await lirePlanning(id);
	const e = etendueDuPlanning(planning!, versIso(dateParis(new Date())));
	const etendue = { debut: semaineDuRang(e.debut), fin: semaineDuRang(e.fin) };
	// …
	return (
		<Ecran
			titre="Documents du chantier"
			sousTitre={<span className="eyebrow" data-testid="resume-documents">{texteResume(vue.resume)}</span>}
			actions={vue.resume.nombre
				? <a className="btn" href={`/api/chantiers/${id}/archive`} download><Icone.Telecharger />Tout télécharger</a>
				: <button type="button" className="btn" disabled title="Aucun document à télécharger"><Icone.Telecharger />Tout télécharger</button>}
		>
			<div className="doc-sections">
				<CartesDocuments vue={vue} etendue={etendue} attribues={vue.lots.filter((l) => l.entreprise).length} />
				<TableauDocuments vue={vue} />
				<AutresDocuments vue={vue} />
			</div>
			{apercuDocument}
		</Ecran>
	);
```

Imports : `Ecran`, `* as Icone`, `CartesDocuments`, `TableauDocuments`, `AutresDocuments`, `lirePlanning` (`@/donnees/planning`), `etendueDuPlanning` (`@/domaine/planningVue`), `dateParis`, `semaineDuRang`, `versIso` (`@/domaine/semaines`). Retirer `Button` et `buttonVariants`. `etendueDuPlanning` renvoie un `Etendue` (`{ debut, fin, nb }`, des rangs de semaine, `src/domaine/planning.ts`).

Supprimer `src/composants/TableauDocuments.tsx` et `src/composants/CarteComptesRendus.tsx`.

- [ ] **Step 6 : Vérifier**

Run : `npx tsc --noEmit && npm run test:conformite -- -g documents && npm run test:e2e -- e2e/planning-documents.spec.ts e2e/suivi.spec.ts e2e/financier.spec.ts`
Expected : PASS pour la capture : « 6 documents produits · dernier le 18.06.2026 », 4 cartes, 13 lignes. Pour les E2E, adapter les sélecteurs :
- le résumé a le nouveau texte ;
- « Voir la v1 », « Ouvrir le récapitulatif » et « Ouvrir la feuille de visa » deviennent les liens des cartes (`[data-serie="recap"] .dm-carte-v`, « Exporter à jour », « Planning imprimable », « Produire » / « Réimprimer ») ;
- `Régénérer` devient la case du marché elle-même, qui rouvre l'aperçu ;
- l'historique des versions passe dans l'aperçu (Task 12). Les tests qui l'ouvrent dans le tableau sont à reprendre en Task 12.

- [ ] **Step 7 : Commit**

```bash
git add src/documents/etats.ts src/documents/etats.int.test.ts src/composants/documents src/composants/ActionsLevee.tsx src/composants/TableauDocuments.tsx src/composants/CarteComptesRendus.tsx "src/app/(app)/chantiers/[id]/documents/page.tsx" src/app/maquette-ajouts.css e2e
git commit -m "feat(interface): écran Documents de la maquette — cartes du chantier, tableau par lot, autres documents"
```

---

### Task 12 : L'aperçu des documents (marché, avenant, récapitulatif, version)

**Files :**
- Create: `src/composants/maquette/CadreApercu.tsx`, `src/composants/apercu/ChampsMarche.tsx`, `src/composants/apercu/MenuVersions.tsx`
- Modify: `src/composants/ApercuDocument.tsx`, `src/documents/etats.ts`, `src/documents/etats.int.test.ts`, `src/app/(app)/chantiers/[id]/marches/page.tsx`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `src/app/maquette-ajouts.css`

**Interfaces :**
- Consumes : `Icone.*`, `MenuDeroulant` (Task 2), `VersionResume`, `SERIES`, `serieAvenant`, `avenantDeLaSerie` (`src/documents/series.ts`), `dateDuJourTexte`.
- Produces :
  - `<CadreApercu libelle surtitre titre aide? notes? actions disposition onFermer champs?>{feuille}</CadreApercu>`, avec `disposition: 'champs' | 'solo' | 'simple'`. C'est le `.gen` de la maquette (`gen-head`, puis `gen-split` avec `gen-fields`, `gen-split solo` ou `gen-preview` seul). Il bloque le défilement derrière et ferme sur Échap. Réutilisé en Task 13 ;
  - `versionsDeLaSerie(chantierId: string, serie: string): Promise<VersionResume[]>` (du plus récent au plus ancien) ;
  - `lireDocument` renvoie aussi `serie: string` et `type: TypeDocument` ;
  - `ApercuDocument` gagne les props `chantierId: string`, `versions?: VersionResume[]` et `retourActuel?: string`. Ce dernier est le lien vers l'aperçu des données actuelles, depuis une version.

Le marché reprend `#gen` (l. 2530-2603) : une colonne de champs lus, les zones de saisie, puis la feuille. L'avenant et le récapitulatif reprennent `#docplan` et `#recap` : la feuille seule. L'historique des versions, qui était dans le tableau Documents, devient le menu « Version » de la barre de l'aperçu (écart 5).

- [ ] **Step 1 : Test des versions d'une série**

Dans `src/documents/etats.int.test.ts`, ajouter :

```ts
	it('liste les versions d\'une série, de la plus récente à la plus ancienne', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { clauseParticuliere: 'Autre clause' } });
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const versions = await versionsDeLaSerie(p.chantierId, p.lots['GROS ŒUVRE']);
		expect(versions.map((v) => v.version)).toEqual([2, 1]);
		expect(versions[0]).toMatchObject({ type: 'MARCHE_GRE_A_GRE', auteur: 'Augustin Jouan' });
		expect(await versionsDeLaSerie(p.chantierId, 'serie-inconnue')).toEqual([]);
	});
```

(importer `versionsDeLaSerie` depuis `./etats`).

Run : `npm run test:int -- src/documents/etats.int.test.ts`
Expected : FAIL, `versionsDeLaSerie` n'existe pas.

- [ ] **Step 2 : Les versions**

Dans `src/documents/etats.ts` :

```ts
/** Les versions d'une série (le menu « Version » de l'aperçu), de la plus récente à la plus ancienne. */
export async function versionsDeLaSerie(chantierId: string, serie: string): Promise<VersionResume[]> {
	const docs = await prisma.document.findMany({ where: { chantierId, serie }, orderBy: { version: 'desc' }, select: SELECTION });
	return docs.map(resume);
}
```

Dans `lireDocument`, ajouter `serie: true, type: true` au `select` et `serie: string; type: TypeDocument` au type de retour.

Run : `npm run test:int -- src/documents`
Expected : PASS.

- [ ] **Step 3 : Le cadre**

Créer `src/composants/maquette/CadreApercu.tsx` :

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { CSS_DOCUMENTS } from '@/documents/styles';

type Props = {
	/** Nom accessible de la surcouche (les E2E le cherchent) : le titre du type de document. */
	libelle: string;
	surtitre: string;
	titre: string;
	/** « Les zones bleues s'écrivent directement sur le marché — le bleu ne s'imprime pas. » */
	aide?: string;
	/** Ce qui empêche de générer, ou une précision sur la version affichée. */
	notes?: React.ReactNode;
	actions: React.ReactNode;
	/** 'champs' : colonne gen-fields + feuille (le marché) ; 'solo' : gen-split solo (compte rendu, certificat, PV) ; 'simple' : la feuille seule. */
	disposition: 'champs' | 'solo' | 'simple';
	champs?: React.ReactNode;
	onFermer: () => void;
	children: React.ReactNode;
};

/** L'aperçu .gen de la maquette : la page de derrière ne défile plus, Échap le ferme (sauf menu ou confirmation ouverts, qui le gardent). */
export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, disposition, champs, onFermer, children }: Props) {
	const fermer = useRef(onFermer);
	useEffect(() => { fermer.current = onFermer; });
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on, .dd.is-open, .panel.is-on')) fermer.current(); };
		window.addEventListener('keydown', touche);
		return () => { document.body.style.overflow = avant; window.removeEventListener('keydown', touche); };
	}, []);
	const feuille = <div className="gen-preview">{children}</div>;
	return (
		<div className="gen is-on" role="dialog" aria-label={libelle} data-bloque-clavier="">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<div className="gen-head">
				<div>
					<div className="eyebrow">{surtitre}</div>
					<h2 style={{ fontSize: '1.0625rem' }}>{titre}</h2>
					{aide && <p className="saisie-aide">{aide}</p>}
					{notes}
				</div>
				<div className="topbar-actions">{actions}</div>
			</div>
			{disposition === 'champs' ? <div className="gen-split"><div className="gen-fields">{champs}</div>{feuille}</div>
				: disposition === 'solo' ? <div className="gen-split solo">{feuille}</div>
				: feuille}
		</div>
	);
}
```

Ajouter à `maquette-ajouts.css` :

```css
/* Sous le titre d'un aperçu : ce qui empêche de générer (danger) ou une précision sur la version (discret). */
.gen-note { margin: 0.375rem 0 0; font-size: 0.75rem; color: var(--danger); }
.gen-note.est-info { color: var(--muted); }
.gen-head a.btn { text-decoration: none; }
```

- [ ] **Step 4 : Les champs du marché**

Créer `src/composants/apercu/ChampsMarche.tsx`, qui reprend `.gen-fields` et `openGen()` (l. 4433-4480). Les `src` sont ceux de la maquette.

```tsx
'use client';

import { useState } from 'react';
import type { CleZone } from '@/documents/gabarits/Gabarit';
import type { DonneesDocument } from '@/documents/schemas';

type Marche = Extract<DonneesDocument, { type: 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' }>;
const dateFr = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : 'date de la génération');

const Ligne = ({ dt, dd, src, num }: { dt: string; dd: string; src: string; num?: boolean }) => (
	<dl className="frow"><dt>{dt}</dt><dd>{num ? <span className="num">{dd || '—'}</span> : dd || '—'}<br /><span className="src">{src}</span></dd></dl>
);

export function ChampsMarche({ donnees, saisir }: { donnees: Marche; saisir: (cle: CleZone, texte: string) => void }) {
	const c = donnees.contenu;
	const gag = donnees.type === 'MARCHE_GRE_A_GRE';
	const [clause, setClause] = useState('clauseParticuliere' in c ? c.clauseParticuliere : '');
	const [corps, setCorps] = useState('corpsEtat' in c ? c.corpsEtat : '');
	const [travaux, setTravaux] = useState('travaux' in c ? c.travaux : '');
	return (
		<>
			<div className="fgroup">
				<span className="eyebrow">Maître d&apos;ouvrage</span>
				<Ligne dt="Mr / Mme" dd={c.maitreOuvrage} src="chantier · maitreOuvrage" />
				{'adresseClient' in c && <Ligne dt="Demeurant" dd={c.adresseClient} src="chantier · adresseMO" />}
			</div>
			<div className="fgroup">
				<span className="eyebrow">Entrepreneur</span>
				<Ligne dt="Entreprise" dd={c.entreprise} src="référentiel artisans" />
				<Ligne dt="Situé" dd={c.adresseEntreprise} src="référentiel artisans" />
			</div>
			<div className="fgroup">
				<span className="eyebrow">Opération</span>
				<Ligne dt="Construction" dd={c.natureTravaux} src="chantier · natureTravaux" />
				<Ligne dt="Située" dd={c.adresseChantier} src="chantier · adresseChantier" />
				{'lotTexte' in c && <Ligne dt="Lots" dd={c.lotTexte} src="lot · numero + designation" />}
				{'destinataireFactures' in c && <Ligne dt="Factures adressées" dd={c.destinataireFactures} src="chantier · mission" />}
			</div>
			<div className="fgroup">
				<span className="eyebrow">Montant</span>
				<Ligne dt="Montant TTC" dd={c.montantTtcTexte} src="lot · montantHT + TVA" num />
				<Ligne dt="T.V.A. au taux de" dd={c.tvaTexte} src="lot · tauxTva" />
				<Ligne dt="Fait le" dd={dateFr(c.dateSignature)} src="lot · dateSignature, sinon chantier" />
			</div>
			{gag ? (
				<div className="fgroup">
					<span className="eyebrow">Clause particulière</span>
					<div className="field">
						<textarea rows={3} placeholder="Texte libre imprimé en bas du marché…" aria-label="Clause particulière" value={clause}
							onChange={(e) => setClause(e.target.value)} onBlur={() => saisir('clauseParticuliere', clause)} />
					</div>
				</div>
			) : (
				<div className="fgroup">
					<span className="eyebrow">Sous-traitance</span>
					<div className="field">
						<label htmlFor="g-corps">Entrepreneur de</label>
						<input id="g-corps" placeholder="escalier" value={corps} onChange={(e) => setCorps(e.target.value)} onBlur={() => saisir('corpsEtat', corps)} />
						<span className="hint">Le corps d&apos;état, tel qu&apos;il s&apos;imprime sous le nom de l&apos;entreprise.</span>
					</div>
					<div className="field">
						<label htmlFor="g-travaux">S&apos;engage à exécuter les travaux</label>
						<textarea id="g-travaux" rows={2} placeholder="fourniture et pose d'un escalier" value={travaux}
							onChange={(e) => setTravaux(e.target.value)} onBlur={() => saisir('travaux', travaux)} />
					</div>
				</div>
			)}
		</>
	);
}
```

Si le schéma type `dateSignature` autrement qu'en chaîne AAAA-MM-JJ (voir `date` dans `src/documents/schemas.ts`), adapter `dateFr` pour afficher `JJ.MM.AAAA`. Les zones de la feuille et ces champs écrivent la même donnée : `ApercuDocument` rafraîchit la page après chaque enregistrement (Step 6), pour que l'un suive l'autre.

- [ ] **Step 5 : Le menu des versions**

Créer `src/composants/apercu/MenuVersions.tsx` :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { MenuDeroulant } from '@/composants/maquette/MenuDeroulant';
import type { VersionResume } from '@/documents/etats';
import { dateDuJourTexte } from '@/domaine/regles';

/** L'historique d'une série : choisir une version l'ouvre telle qu'émise ; « Données actuelles » revient à l'aperçu vivant. */
export function MenuVersions({ chantierId, versions, courante, retourActuel }: { chantierId: string; versions: VersionResume[]; courante: string | null; retourActuel?: string }) {
	const router = useRouter();
	if (!versions.length) return null;
	return (
		<MenuDeroulant id="dd-version" k="Version" valeur={courante ?? 'actuel'}
			options={[
				...(retourActuel ? [{ v: 'actuel', t: 'Données actuelles' }, { sep: true as const }] : []),
				...versions.map((v) => ({ v: v.id, t: `v${v.version} · ${dateDuJourTexte(new Date(v.creeLe))}${v.libelle ? ` · ${v.libelle}` : ''}`, meta: v.auteur })),
			]}
			onChoisir={(v) => router.push(v === 'actuel' ? (retourActuel ?? '') : `/chantiers/${chantierId}/documents?version=${v}`, { scroll: false })} />
	);
}
```

- [ ] **Step 6 : `ApercuDocument`**

Dans `src/composants/ApercuDocument.tsx` :
1. retirer le `useEffect` de défilement et d'Échap : `CadreApercu` s'en charge ;
2. retirer les imports de `Button` et `buttonVariants` ;
3. faire renvoyer à `saisir` sa promesse `enregistrement` (ou `null`) ;
4. ajouter les props ;
5. remplacer le `return` :

```tsx
	const fermer = () => router.replace(chemin, { scroll: false });
	const estMarche = donnees.type === 'MARCHE_GRE_A_GRE' || donnees.type === 'MARCHE_SOUS_TRAITANCE';
	const courante = source.type === 'version' ? source.documentId : null;
	const actions = (
		<>
			<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
			<MenuVersions chantierId={chantierId} versions={versions} courante={courante} retourActuel={retourActuel} />
			{source.type === 'recap' && <a className="btn" href={`/api/chantiers/${source.chantierId}/recap-xlsx`}><Icone.Telecharger />Télécharger le tableur</a>}
			{source.type === 'version' ? (
				<a className="btn btn-primary" href={`/api/documents/${source.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
			) : (
				<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || manques.length > 0} title={manques.length ? `Manque : ${manques.join(', ')}` : undefined}>
					<Icone.Telecharger />{enCours ? 'Génération…' : 'Générer le PDF'}
				</button>
			)}
		</>
	);
	const notes = (
		<>
			{source.type === 'version' && <p role="note" className="gen-note est-info">Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.</p>}
			{manques.length > 0 && <p role="note" className="gen-note">Pour générer {source.type === 'avenant' ? 'cette lettre' : 'ce marché'} : {manques.join(', ')}.</p>}
		</>
	);
	const saisirPuisRafraichir = (cle: CleZone, texte: string) => { void saisir(cle, texte)?.then(() => router.refresh()); };
	return (
		<CadreApercu libelle={titre} surtitre={titre} titre={sousTitre} notes={notes} actions={actions} onFermer={fermer}
			aide={ecrit ? `Les zones bleues s'écrivent directement sur ${source.type === 'avenant' ? 'la lettre' : 'le marché'} — le bleu ne s'imprime pas.` : undefined}
			disposition={estMarche && source.type === 'marche' ? 'champs' : 'simple'}
			champs={estMarche && source.type === 'marche' ? <ChampsMarche donnees={donnees} saisir={saisirPuisRafraichir} /> : undefined}>
			{donnees.type === 'PLANNING' || donnees.type === 'VISA_PLANNING' ? (
				<FeuilleUnique key={sousTitre}><Gabarit donnees={donnees} mode="lecture" /></FeuilleUnique>
			) : (
				<Gabarit donnees={donnees} mode={ecrit ? 'edition' : 'lecture'} onSaisie={saisirPuisRafraichir} />
			)}
		</CadreApercu>
	);
```

`ChampsMarche` attend un `Marche` : TypeScript rétrécit `donnees` grâce à `estMarche` s'il est écrit en garde de type. Sinon, écrire `donnees.type === 'MARCHE_GRE_A_GRE' || donnees.type === 'MARCHE_SOUS_TRAITANCE'` en ligne dans le JSX.

- [ ] **Step 7 : Les pages passent les versions**

Dans `src/app/(app)/chantiers/[id]/marches/page.tsx` :
- aperçu du marché : `chantierId={id} versions={await versionsDeLaSerie(id, lot.id)}` ;
- `apercuAvenant` : `chantierId={chantierId} versions={await versionsDeLaSerie(chantierId, serieAvenant(avenantId))}`.

Dans `src/app/(app)/chantiers/[id]/documents/page.tsx` :
- récapitulatif : `chantierId={id} versions={await versionsDeLaSerie(id, SERIES.RECAPITULATIF)}` ;
- version : `chantierId={id} versions={await versionsDeLaSerie(id, doc.serie)} retourActuel={retourActuel(id, doc)}`, avec :

```ts
/** D'une version, le lien vers l'aperçu des données actuelles de sa série ; aucun pour un acte figé (certificat, compte rendu, PV). */
function retourActuel(chantierId: string, doc: { serie: string; type: TypeDocument; lotId: string | null }): string | undefined {
	const base = `/chantiers/${chantierId}`;
	if (doc.type === 'MARCHE_GRE_A_GRE' || doc.type === 'MARCHE_SOUS_TRAITANCE') return doc.lotId ? `${base}/marches?apercu=${doc.lotId}` : undefined;
	if (doc.type === 'AVENANT') { const a = avenantDeLaSerie(doc.serie); return a ? `${base}/marches?avenant=${a}` : undefined; }
	if (doc.type === 'RECAPITULATIF') return `${base}/documents?apercu=recap`;
	if (doc.type === 'PLANNING') return `${base}/planning?apercu=planning`;
	if (doc.type === 'VISA_PLANNING') return `${base}/planning?apercu=visa`;
	return undefined;
}
```

Une lettre d'avenant dont l'avenant a été supprimé garde sa version : `retourActuel` n'offre alors que les versions, puisque `?avenant=` n'ouvrirait rien.

- [ ] **Step 8 : Vérifier**

Run : `npx tsc --noEmit && npm run test:int -- src/documents && npm run test:e2e -- e2e/marches.spec.ts e2e/planning-documents.spec.ts e2e/financier.spec.ts`
Expected : PASS. Adapter les sélecteurs :
- l'historique « N versions » (un `<details>`) devient le menu « Version » de l'aperçu (`#dd-version .dd-btn`, puis l'option `v1 · …`) ;
- « Voir la v1 » devient l'ouverture de la carte, puis le menu « Version ».

Les noms des surcouches ne changent pas (« Marché de travaux de gré à gré », « … — version 1 », « Récapitulatif des marchés », « Avenant n° 01 »).

- [ ] **Step 9 : Commit**

```bash
git add src/composants/maquette/CadreApercu.tsx src/composants/apercu src/composants/ApercuDocument.tsx src/documents/etats.ts src/documents/etats.int.test.ts "src/app/(app)/chantiers/[id]/marches/page.tsx" "src/app/(app)/chantiers/[id]/documents/page.tsx" src/app/maquette-ajouts.css e2e
git commit -m "feat(interface): aperçu des documents de la maquette (champs du marché, menu des versions)"
```

---

### Task 13 : Les autres aperçus (certificat, compte rendu, réception, planning et visa)

**Files :**
- Modify: `src/composants/ApercuCertificat.tsx`, `src/composants/ApercuCompteRendu.tsx`, `src/composants/ApercuReception.tsx`, `src/composants/planning/ApercuPlanning.tsx`

**Interfaces :**
- Consumes : `CadreApercu` (Task 12), `useConfirmation`, `MenuDeroulant`, `Icone.*`.
- Produces : rien de nouveau. Les noms des surcouches restent `TITRES_TYPES.*` et le titre du planning ou du visa.

Seul change l'habillage : la logique (saisies, génération, correction) reste ligne pour ligne celle d'aujourd'hui. Pour chaque fichier :
1. retirer le `useEffect` de défilement et d'Échap ;
2. remplacer `<div role="dialog" …><style …/><header>…</header>{notes}<div …>{feuille}</div></div>` par `<CadreApercu …>{feuille}</CadreApercu>` ;
3. convertir les boutons : `<Button>` → `<button type="button" className="btn btn-primary">`, `variant="outline"` → `className="btn"`, « Fermer » → `className="btn btn-ghost"` placé **en premier**, comme dans la maquette ; un `<a className={buttonVariants(…)}>` → `<a className="btn">` ;
4. convertir chaque note `<p role="note" className="border-b bg-… px-6 py-2 text-sm">` en `<p role="note" className="gen-note">`, avec `est-info` pour une note sur fond `bg-accent` ;
5. retirer les imports de `Button`, `buttonVariants` et `CSS_DOCUMENTS`.

- [ ] **Step 1 : Certificat de paiement** (`#cp`, l. 2800)

```tsx
	return (
		<CadreApercu libelle={TITRES_TYPES.CERTIFICAT_PAIEMENT} disposition="solo" onFermer={fermer}
			surtitre={acompteId ? `Correction du certificat n° ${donnees.contenu.numero}` : TITRES_TYPES.CERTIFICAT_PAIEMENT} titre={sousTitre}
			aide={lecture ? undefined : "Le cumul réalisé, le mois et la date se saisissent sur la feuille — le bleu ne s'imprime pas."}
			notes={messages.map((m) => <p key={m} role="note" className="gen-note">{m}</p>)}
			actions={<>
				<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
				{!lecture && (
					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || messages.length > 0 || !lu.cumul}>
						<Icone.Telecharger />{enCours ? 'Génération…' : acompteId ? `Générer la v${(ouvert.derniereVersion ?? 0) + 1}` : 'Générer le PDF'}
					</button>
				)}
			</>}>
			<CertificatPaiement donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
			{alerte && <p role="note" className="gen-note">{alerte}</p>}
		</CadreApercu>
	);
```

`fermer` est la fonction qui fermait l'aperçu (`router.replace(chemin, { scroll: false })`) : la garder, ou la déclarer telle quelle si elle était en ligne dans le `useEffect` retiré.

- [ ] **Step 2 : Compte rendu** (`#cr`, l. 2773)

Remplacer les trois `window.confirm` par la confirmation de la maquette (`const confirmer = useConfirmation();`) :

```ts
	async function fermer(confirmerSortie = true) {
		if (confirmerSortie && mode === 'correction' && modifie
			&& !(await confirmer({ texte: 'Fermer sans enregistrer la correction ?', libelle: 'Fermer' }))) return;
		// … suite actuelle de fermer, inchangée …
	}
	// repartir : if (!(await confirmer({ texte: 'Remplacer la coordination par les seuls intitulés des lots ? Le texte saisi sera perdu.', libelle: 'Repartir des lots', dangereux: true }))) return;
	// abandonner : if (!(await confirmer({ texte: 'Abandonner ce brouillon ? Son contenu sera perdu.', libelle: 'Abandonner', dangereux: true }))) return;
```

`fermer`, `repartir` et `abandonner` deviennent `async`. Garder le nom et les paramètres qu'ils ont aujourd'hui : seule la ligne du `window.confirm` change, en `await confirmer(…)`. Puis :

```tsx
	return (
		<CadreApercu libelle={TITRES_TYPES.COMPTE_RENDU} surtitre={entete} titre={reference} disposition="solo" onFermer={() => void fermer()}
			aide={mode === 'brouillon' ? "Écrivez directement dans les zones bleues — le bleu ne s'imprime pas." : undefined}
			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
			actions={<>
				<button type="button" className="btn btn-ghost" onClick={() => void fermer()}>Fermer</button>
				{mode === 'brouillon' && (
					<>
						<button type="button" className="btn" onClick={repartir} disabled={enCours} title="Remplacer la coordination par les seuls intitulés des lots">Repartir des lots</button>
						<button type="button" className="btn" onClick={abandonner} disabled={enCours}>Abandonner le brouillon</button>
						<button type="button" className="btn btn-primary" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</button>
					</>
				)}
				{mode === 'correction' && (
					<button type="button" className="btn btn-primary" onClick={corriger} disabled={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</button>
				)}
				{lecture && ouvert.dernier && (
					<button type="button" className="btn" onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</button>
				)}
				{lecture && ouvert.derniere && (
					<a className="btn btn-primary" href={`/api/documents/${ouvert.derniere.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
				)}
			</>}>
			<CompteRendu donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
		</CadreApercu>
	);
```

Le `fermerRef` du code actuel ne sert plus qu'à Échap, que `CadreApercu` gère : le retirer s'il ne reste pas d'autre usage.

- [ ] **Step 3 : Procès-verbal de réception** (`#pv`, l. 2827)

Le choix du lot (`#pv-lot-slot` de la maquette) devient un `MenuDeroulant` dans la barre d'actions :

```tsx
	return (
		<CadreApercu libelle={TITRES_TYPES.PV_RECEPTION} surtitre={TITRES_TYPES.PV_RECEPTION} disposition="solo" onFermer={fermer}
			titre={tous ? `${reference} — ${ouvert.pages.length} lots, une page chacun` : reference}
			aide={ouvert.blocage ? undefined : "Chaque champ bleu s'enregistre aussitôt — le bleu ne s'imprime pas."}
			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
			actions={<>
				{ouvert.options.length > 0 && (
					<MenuDeroulant id="pv-lot" k="Procès-verbal pour" valeur={ouvert.cible} recherche classe="dd-large"
						options={[...ouvert.options.map((o) => ({ v: o.lotId, t: o.libelle, meta: o.entreprise })), { sep: true as const }, { v: TOUS_LES_LOTS, t: 'Tous les lots attribués — une page chacun' }]}
						onChoisir={aller} />
				)}
				<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
				{!ouvert.blocage && (
					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours}>
						<Icone.Telecharger />{enCours ? 'Génération…' : tous ? `Générer les ${ouvert.pages.length} PV` : 'Générer le PDF'}
					</button>
				)}
			</>}>
			<div className="pv-pages">
				{ouvert.pages.map((p) => (
					<div key={p.lotId} data-entreprise={p.entreprise}>
						<ProcesVerbalReception donnees={batirReception(p.source, saisies[p.lotId] ?? p.saisies, commun)} mode="edition" edition={edition(p.lotId)} />
					</div>
				))}
			</div>
		</CadreApercu>
	);
```

Les E2E qui font `selectOption` sur « Procès-verbal pour » passent à `page.locator('#pv-lot .dd-btn').click()`, puis `getByRole('option', { name: '…' })`.

- [ ] **Step 4 : Planning et feuille de visa** (`#docplan`, l. 2748)

```tsx
	return (
		<CadreApercu libelle={titre} surtitre={titre} titre={reference} disposition="simple" onFermer={() => router.replace(chemin, { scroll: false })}
			notes={<>
				{erreur && <p role="note" className="gen-note est-info">{erreur}</p>}
				{planning?.modifie && <p role="note" className="gen-note est-info">Le planning a changé depuis la v{planning.version} : ce visa portera sur la v{planning.version}.</p>}
				{tropDeLots && <p role="note" className="gen-note">{TROP_DE_LOTS}</p>}
			</>}
			actions={<>
				<button type="button" className="btn btn-ghost" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</button>
				{mode === 'visa' && !planning && planningDAbord}
				{mode === 'visa' && planning?.modifie && (
					<>
						{planningDAbord}
						<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots}>
							{enCours ? 'Génération…' : `Générer le visa sur la v${planning.version}`}
						</button>
					</>
				)}
				{(mode === 'planning' || (planning && !planning.modifie)) && (
					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots} title={tropDeLots ? TROP_DE_LOTS : undefined}>
						{enCours ? 'Génération…' : 'Générer le PDF'}
					</button>
				)}
			</>}>
			{donnees && (
				<FeuilleUnique key={JSON.stringify(donnees)} onMesure={setMesure}>
					<Gabarit donnees={donnees} mode="lecture" />
				</FeuilleUnique>
			)}
		</CadreApercu>
	);
```

Dans `planningDAbord` (le lien vers l'aperçu du planning), remplacer `className={buttonVariants({ variant: planning ? 'outline' : 'default' })}` par `className={planning ? 'btn' : 'btn btn-primary'}`.

- [ ] **Step 5 : Vérifier**

Run : `npx tsc --noEmit && npm run test:e2e -- e2e/suivi.spec.ts e2e/financier.spec.ts e2e/planning-documents.spec.ts`
Expected : PASS. Dans `e2e/suivi.spec.ts:61`, remplacer `page.once('dialog', (d) => void d.accept());` par un clic sur le bouton de confirmation, placé **après** le clic qui l'ouvre :

```ts
await page.locator('.ask.is-on').getByRole('button', { name: 'Repartir des lots' }).click();
```

(prendre le libellé de l'action que ce test confirme : « Repartir des lots », « Abandonner » ou « Fermer »).

- [ ] **Step 6 : Commit**

```bash
git add src/composants/ApercuCertificat.tsx src/composants/ApercuCompteRendu.tsx src/composants/ApercuReception.tsx src/composants/planning/ApercuPlanning.tsx e2e
git commit -m "feat(interface): aperçus du certificat, du compte rendu, du PV et du planning dans le cadre de la maquette"
```

---

### Task 14 : Artisans

**Files :**
- Modify: `src/composants/ReferentielArtisans.tsx`, `src/app/(app)/artisans/page.tsx`, `src/actions/artisans.ts`

**Interfaces :**
- Consumes : `Ecran`, `Panneau`, `Recherche`, `useConfirmation`, `Icone.*`, `creerArtisanAction`, `modifierChampArtisanAction`, `changerActiviteArtisanAction`, `filtrerArtisans`.
- Produces : `ReferentielArtisans({ artisans, ficheInitiale })`, où `ficheInitiale: string | null` est l'id de `?fiche=` (lien « Voir la fiche » du panneau du lot, Task 9).

L'écran reprend `#v-artisans` (l. 2472-2500), `renderEnts()` (l. 4825), `openArtisan()` (l. 4881), `saveArtisan()` et `removeArtisan()`. « Supprimer » archive (écart 6) : l'app ne supprime jamais une entreprise.

- [ ] **Step 1 : Constater l'échec**

Run : `npm run test:conformite -- -g artisans`
Expected : FAIL.

- [ ] **Step 2 : Le référentiel**

Remplacer `src/composants/ReferentielArtisans.tsx` :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changerActiviteArtisanAction, creerArtisanAction, modifierChampArtisanAction } from '@/actions/artisans';
import { useConfirmation } from '@/composants/maquette/Confirmation';
import * as Icone from '@/composants/maquette/icones';
import { Panneau } from '@/composants/maquette/Panneau';
import { Recherche } from '@/composants/maquette/Recherche';
import type { ArtisanFiche, ChampArtisan } from '@/donnees/artisans';
import { normaliser } from '@/domaine/recherche';

type Fiche = Record<ChampArtisan, string>;
const VIDE: Fiche = { nom: '', adresse: '', cp: '', commune: '', interlocuteur: '', telephone: '', email: '' };
const versFiche = (a: ArtisanFiche | undefined): Fiche => (a
	? { nom: a.nom, adresse: a.adresse, cp: a.cp, commune: a.commune, interlocuteur: a.interlocuteur, telephone: a.telephone, email: a.email }
	: VIDE);
/** « Ajouter une entreprise » est dans la barre de titre, rendue par la page : il ouvre la fiche vide par cet événement. */
const OUVRIR_FICHE_VIDE = 'sentinelle:nouvelle-entreprise';
const CHAMPS: { champ: ChampArtisan; id: string; libelle: string; placeholder: string; span?: boolean; num?: boolean; type?: string; aide?: string }[] = [
	{ champ: 'nom', id: 'e-nom', libelle: 'Raison sociale', placeholder: 'AM COUVERTURE', span: true, aide: 'Le nom imprimé sur le marché. Il doit être unique.' },
	{ champ: 'adresse', id: 'e-adr', libelle: 'Adresse', placeholder: 'Z.I. Le Champ Jubin', span: true },
	{ champ: 'cp', id: 'e-cp', libelle: 'Code postal', placeholder: '44590', num: true },
	{ champ: 'commune', id: 'e-com', libelle: 'Commune', placeholder: 'DERVAL' },
	{ champ: 'interlocuteur', id: 'e-int', libelle: 'Interlocuteur', placeholder: 'Stéphane BIORET' },
	{ champ: 'telephone', id: 'e-tel', libelle: 'Téléphone', placeholder: '02-28-50-46-95', num: true },
	{ champ: 'email', id: 'e-mail', libelle: 'Courriel (optionnel)', placeholder: 'contact@entreprise.fr', span: true, type: 'email' },
];
const vide = (v: string, texte = '—') => v || <span className="dash">{texte}</span>;

export function ReferentielArtisans({ artisans, ficheInitiale }: { artisans: ArtisanFiche[]; ficheInitiale: string | null }) {
	const router = useRouter();
	const confirmer = useConfirmation();
	const [requete, setRequete] = useState('');
	/** null : fermé ; 'nouvelle' : fiche vide ; sinon l'id de l'entreprise. */
	const [ouverte, setOuverte] = useState<string | null>(ficheInitiale);
	const [fiche, setFiche] = useState<Fiche>(() => versFiche(artisans.find((a) => a.id === ficheInitiale)));
	const [erreur, setErreur] = useState<{ champ: string; message: string } | null>(null);
	const [enCours, demarrer] = useTransition();
	const actuelle = artisans.find((a) => a.id === ouverte) ?? null;

	// Tout est listé, archivées comprises : les masquer reviendrait à les supprimer (visiblesEnts de la maquette).
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	const vues = artisans.filter((a) => mots.every((m) => normaliser([a.nom, a.adresse, a.cp, a.commune, a.interlocuteur, a.telephone].join(' ')).includes(m)));
	const archivees = artisans.filter((a) => !a.actif).length;

	function ouvrir(a: ArtisanFiche | null) {
		setOuverte(a ? a.id : 'nouvelle');
		setFiche(versFiche(a ?? undefined));
		setErreur(null);
	}
	useEffect(() => {
		const nouvelle = () => ouvrir(null);
		window.addEventListener(OUVRIR_FICHE_VIDE, nouvelle);
		return () => window.removeEventListener(OUVRIR_FICHE_VIDE, nouvelle);
	}, []);
	function fermer() {
		setOuverte(null);
		if (ficheInitiale) router.replace('/artisans', { scroll: false });
	}

	/** Enregistre champ par champ (les règles du serveur sont par champ) ; s'arrête au premier refus, sur son champ. */
	function enregistrer() {
		if (!fiche.nom.trim()) { setErreur({ champ: 'nom', message: 'La raison sociale est obligatoire.' }); document.getElementById('e-nom')?.focus(); return; }
		demarrer(async () => {
			let id = actuelle?.id ?? null;
			if (!id) {
				const r = await creerArtisanAction(fiche.nom);
				if (!r.ok) { setErreur({ champ: 'nom', message: r.erreur }); return; }
				id = r.donnees.id;
			}
			for (const { champ } of CHAMPS) {
				const avant = actuelle ? actuelle[champ] : (champ === 'nom' ? fiche.nom : '');
				if (fiche[champ] === avant) continue;
				const r = await modifierChampArtisanAction(id, champ, fiche[champ]);
				if (!r.ok) { setErreur({ champ, message: r.erreur }); document.getElementById(CHAMPS.find((c) => c.champ === champ)!.id)?.focus(); return; }
			}
			toast(actuelle ? <><b>{fiche.nom}</b> mise à jour. Les prochains documents la porteront.</> : <><b>{fiche.nom}</b> ajoutée au référentiel.</>);
			fermer();
		});
	}

	/** removeArtisan() de la maquette : une archivée se réactive ; une active s'archive (jamais de suppression, écart 6). */
	async function supprimer(a: ArtisanFiche) {
		if (a.actif) {
			const oui = await confirmer(a.nombreLots
				? { texte: <><b>{a.nom}</b> est attribuée à {a.nombreLots} lot{a.nombreLots > 1 ? 's' : ''}. Elle ne peut pas être supprimée sans trahir ces marchés.<br /><br />L&apos;archiver&nbsp;? Elle disparaîtra des listes d&apos;attribution mais restera lisible sur les documents déjà établis.</>, libelle: 'Archiver' }
				: { texte: <>Archiver <b>{a.nom}</b>&nbsp;? Elle disparaîtra des listes d&apos;attribution ; « Réactiver » la fera revenir.</>, libelle: 'Archiver' });
			if (!oui) return;
		}
		demarrer(async () => {
			const r = await changerActiviteArtisanAction(a.id, !a.actif);
			if (!r.ok) { toast.error(r.erreur); return; }
			toast(a.actif ? <><b>{a.nom}</b> archivée{a.nombreLots ? ` — ${a.nombreLots} lot(s) conservent son nom` : ''}.</> : <><b>{a.nom}</b> réactivée.</>);
			if (ouverte === a.id) fermer();
		});
	}

	return (
		<>
			<div className="toolbar">
				<Recherche placeholder="Rechercher une entreprise, une commune, un interlocuteur…" libelle="Rechercher une entreprise" valeur={requete} onChange={setRequete} />
				<span className="eyebrow">
					{`${vues.length} entreprise${vues.length > 1 ? 's' : ''}${vues.length !== artisans.length ? ` sur ${artisans.length}` : ''}${archivees ? ` · ${archivees} archivée${archivees > 1 ? 's' : ''}` : ''}`}
				</span>
			</div>
			<div className="table-frame">
				<table className="plain">
					<thead><tr><th>Entreprise</th><th>Adresse</th><th>CP</th><th>Commune</th><th>Interlocuteur</th><th>Téléphone</th><th className="ta-r">Actions</th></tr></thead>
					<tbody>
						{vues.map((a) => (
							<tr key={a.id} className={a.actif ? undefined : 'is-archived'} onClick={() => ouvrir(a)}>
								<td className="ent-name">{a.nom}{!a.actif && <> <span className="pill pill-fini">Archivée</span></>}</td>
								<td>{vide(a.adresse)}</td>
								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.cp)}</td>
								<td>{vide(a.commune)}</td>
								<td>{vide(a.interlocuteur, 'non renseigné')}</td>
								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.telephone)}</td>
								<td className="ta-r nowrap cell-actions">
									<button type="button" className="btn btn-sm" title="Modifier cette entreprise" onClick={(e) => { e.stopPropagation(); ouvrir(a); }}><Icone.Crayon />Modifier</button>
									{a.actif
										? <button type="button" className="btn btn-sm btn-danger" title="Archiver cette entreprise" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Corbeille />Supprimer</button>
										: <button type="button" className="btn btn-sm" title="Remettre cette entreprise en service" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Reactiver />Réactiver</button>}
								</td>
							</tr>
						))}
						{!vues.length && <tr className="empty-row"><td colSpan={7}>Aucune entreprise ne correspond.</td></tr>}
					</tbody>
				</table>
			</div>
			<Panneau ouvert={ouverte !== null} surtitre={actuelle ? 'ENTREPRISE' : 'NOUVELLE ENTREPRISE'} titre={actuelle ? actuelle.nom : 'Ajouter au référentiel'} onFermer={fermer}
				pied={<>
					<button type="button" className="btn btn-primary" disabled={enCours} onClick={enregistrer}>{actuelle ? 'Enregistrer' : 'Ajouter'}</button>
					{actuelle && <button type="button" className="btn btn-ghost" disabled={enCours} onClick={() => void supprimer(actuelle)}>{actuelle.actif ? 'Supprimer' : 'Réactiver'}</button>}
					<button type="button" className="btn btn-ghost" onClick={fermer}>Annuler</button>
				</>}>
				<div className="grid-2">
					{CHAMPS.map((c) => (
						<div key={c.champ} className={c.span ? 'field span' : 'field'}>
							<label htmlFor={c.id}>{c.libelle}</label>
							<input id={c.id} type={c.type ?? 'text'} placeholder={c.placeholder} value={fiche[c.champ]}
								className={[c.num && 'num', erreur?.champ === c.champ && 'est-erreur'].filter(Boolean).join(' ') || undefined}
								onChange={(e) => setFiche({ ...fiche, [c.champ]: e.target.value })} />
							{c.aide && <span className="hint">{c.aide}</span>}
							{erreur?.champ === c.champ && <span className="erreur">{erreur.message}</span>}
						</div>
					))}
				</div>
				{actuelle && actuelle.nombreLots > 0 && (
					<div className="block">
						<div className="block-body" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
							Attribuée à <b>{actuelle.nombreLots} lot{actuelle.nombreLots > 1 ? 's' : ''}</b> dans vos chantiers. Renommer l&apos;entreprise met ces lots à jour ; la supprimer n&apos;est pas possible.
						</div>
					</div>
				)}
			</Panneau>
		</>
	);
}

/** « Ajouter une entreprise » de la barre de titre : ouvre la fiche vide du référentiel. */
export function BoutonAjouterEntreprise() {
	return (
		<button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event(OUVRIR_FICHE_VIDE))}>
			<Icone.Plus />Ajouter une entreprise
		</button>
	);
}
```

`filtrerArtisans` n'est plus importé ici : la recherche de la maquette porte aussi sur l'adresse, l'interlocuteur et le téléphone.

- [ ] **Step 3 : La page**

Remplacer `src/app/(app)/artisans/page.tsx` :

```tsx
import { exigerPage } from '@/auth/session';
import { Ecran } from '@/composants/maquette/Ecran';
import { BoutonAjouterEntreprise, ReferentielArtisans } from '@/composants/ReferentielArtisans';
import { listerArtisans } from '@/donnees/artisans';

export default async function PageArtisans({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
	await exigerPage();
	const { fiche } = await searchParams;
	return (
		<Ecran titre="Artisans" actions={<BoutonAjouterEntreprise />}>
			<ReferentielArtisans artisans={await listerArtisans()} ficheInitiale={fiche ?? null} />
		</Ecran>
	);
}
```

Ajouter `revalidatePath('/', 'layout')` dans `creerArtisanAction` : le compteur « Artisans » de la barre compte les entreprises.

- [ ] **Step 4 : Vérifier**

Run : `npx tsc --noEmit && npm run test:conformite -- -g artisans && npm run test:e2e`
Expected : PASS. Les E2E qui ajoutaient une entreprise par le petit formulaire en ligne passent par « Ajouter une entreprise », « Raison sociale », puis « Ajouter ». L'interrupteur « actif » devient « Supprimer » (archiver, confirmé par « Archiver ») et « Réactiver ».

- [ ] **Step 5 : Commit**

```bash
git add src/composants/ReferentielArtisans.tsx "src/app/(app)/artisans/page.tsx" src/actions/artisans.ts e2e
git commit -m "feat(interface): référentiel des artisans de la maquette (tableau, fiche en panneau, archiver)"
```

---

### Task 15 : Comptes et Paramètres (écrans hors maquette)

**Files :**
- Modify: `src/composants/GestionComptes.tsx`, `src/app/(app)/admin/comptes/page.tsx`, `src/app/(app)/parametres/page.tsx`, `src/composants/maquette/Panneau.tsx`

**Interfaces :**
- Consumes : `Ecran`, `Panneau`, `MenuDeroulant`, `ChampEnLigne` (`variante="champ"`, `id`), les actions de `src/actions/comptes.ts` et `modifierParametreAction`.
- Produces : noms conservés pour les E2E : « Créer le compte », `data-testid="mot-de-passe-provisoire"`, « Copier », « Réinitialiser le mot de passe », « Bloquer », « Débloquer ».

Ces deux écrans n'existent pas dans la maquette. On y accède par le menu du compte (écart 1), et ils sont dessinés avec ses composants : `Ecran`, `table.plain`, `.form-wrap` / `.fieldset` / `.field`, `.panel`, `.pill`. Il n'y a pas de capture de conformité pour eux.

- [ ] **Step 1 : Paramètres**

Dans `src/app/(app)/parametres/page.tsx`, garder `CHAMPS` et remplacer le `return` :

```tsx
	return (
		<Ecran titre="Paramètres de l'entreprise">
			<div className="form-wrap">
				<div className="fieldset">
					<span className="eyebrow">En-tête des documents</span>
					<p className="hint" style={{ margin: 0 }}>Imprimé sur les marchés, le récapitulatif, les certificats de paiement, les comptes rendus et les PV de réception. Chaque champ s&apos;enregistre quand on le quitte.</p>
					<div className="grid-2">
						{CHAMPS.map(({ champ, libelle, aide }) => (
							<div key={champ} className="field">
								<label htmlFor={`p-${champ}`}>{libelle}</label>
								<ChampEnLigne id={`p-${champ}`} variante="champ" libelle={libelle} valeur={p[champ] ?? ''} enregistrer={modifierParametreAction.bind(null, champ)} />
								{aide && <span className="hint">{aide}</span>}
							</div>
						))}
					</div>
				</div>
			</div>
		</Ecran>
	);
```

Garder la suite du fichier s'il y a d'autres blocs après le `<dl>` actuel (paramètres du suivi, par exemple) : chacun devient un `.fieldset` de plus dans le même `.form-wrap`, avec le même balisage `.field`.

- [ ] **Step 2 : Comptes**

Dans `src/composants/GestionComptes.tsx`, garder `creer`, `agir` et `reinitialiser`. Remplacer :
- le formulaire de création par une fiche en panneau, ouverte par le bouton « Nouveau compte » (`BoutonNouveauCompte`, même mécanisme d'événement qu'en Task 14, événement `sentinelle:nouveau-compte`) :

```tsx
			<Panneau ouvert={creation} surtitre="NOUVEAU COMPTE" titre="Créer un compte" onFermer={() => setCreation(false)}
				pied={<>
					<button type="submit" form="f-compte" className="btn btn-primary" disabled={enCours}>Créer le compte</button>
					<button type="button" className="btn btn-ghost" onClick={() => setCreation(false)}>Annuler</button>
				</>}>
				<form id="f-compte" onSubmit={creer} className="grid-2">
					<div className="field span"><label htmlFor="nom">Nom</label><input id="nom" name="nom" required className={erreurs.nom ? 'est-erreur' : undefined} />{erreurs.nom && <span className="erreur">{erreurs.nom}</span>}</div>
					<div className="field span"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className={erreurs.email ? 'est-erreur' : undefined} />{erreurs.email && <span className="erreur">{erreurs.email}</span>}</div>
					<div className="field span">
						<label>Rôle</label>
						<div className="radio-row" role="radiogroup" aria-label="Rôle">
							{(['user', 'admin'] as const).map((r) => (
								<label key={r} className={role === r ? 'is-on' : undefined}><input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} /> {r === 'admin' ? 'Administrateur' : 'Utilisateur'}</label>
							))}
						</div>
					</div>
					{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
				</form>
			</Panneau>
```

(état `const [creation, setCreation] = useState(false); const [role, setRole] = useState<'user' | 'admin'>('user');`, et `setCreation(false)` après un succès dans `creer`) ;
- le tableau par un `table.plain` dans un `.table-frame`, avec les mêmes colonnes et les mêmes boutons en `btn btn-sm` (« Bloquer » en `btn btn-sm btn-danger`). L'état devient une pastille : `<span className="pill pill-fini">Bloqué</span>`, `<span className="pill pill-modif">Mot de passe provisoire</span>`, `<span className="pill pill-actif">Actif</span>`. Le portable reste un `ChampEnLigne` (`variante="texte"`) ;
- la fenêtre du mot de passe provisoire par un `Panneau` qui ne se ferme que par « Fermer » (`onFermer` ne fait rien, pas de scrim cliquable) :

```tsx
			<Panneau ouvert={provisoire !== null} surtitre="MOT DE PASSE PROVISOIRE" titre={provisoire?.email ?? ''} libelle="Mot de passe provisoire" onFermer={() => {}} sansFermeture
				pied={<>
					<button type="button" className="btn btn-primary" onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast('Copié.'); }}>Copier</button>
					<button type="button" className="btn btn-ghost" onClick={() => setProvisoire(null)}>Fermer</button>
				</>}>
				<p className="hint" style={{ margin: 0 }}>Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.</p>
				<div className="block"><div className="block-body num" data-testid="mot-de-passe-provisoire" style={{ fontSize: '1.125rem', letterSpacing: '0.08em', textAlign: 'center' }}>{provisoire?.motDePasse}</div></div>
			</Panneau>
```

Le mot de passe ne s'affiche qu'une fois : seul « Fermer » doit fermer le panneau. `onFermer` ne fait donc rien : Échap et le fond sont inertes. Ajouter à `Panneau` une prop `sansFermeture?: boolean`, qui retire le bouton ✕ de `panel-head` (`{!sansFermeture && <button … aria-label="Fermer">✕</button>}`).

La page `src/app/(app)/admin/comptes/page.tsx` devient :

```tsx
		<Ecran titre="Comptes" actions={<BoutonNouveauCompte />}>
			<GestionComptes comptes={await listerComptes()} moiId={moi.id} />
		</Ecran>
```

Retirer de `GestionComptes.tsx` les imports de `Badge`, `Button`, `Dialog*`, `Input` et `Label`.

- [ ] **Step 3 : Vérifier**

Run : `npx tsc --noEmit && npm run test:e2e -- e2e/comptes.spec.ts e2e/gardes.spec.ts`
Expected : PASS. Adapter les sélecteurs à « Nouveau compte » (ouvre le panneau), au rôle en boutons radio et au panneau du mot de passe provisoire (`getByRole('dialog', { name: 'Mot de passe provisoire' })`).

- [ ] **Step 4 : Commit**

```bash
git add src/composants/GestionComptes.tsx "src/app/(app)/admin/comptes/page.tsx" "src/app/(app)/parametres/page.tsx" src/composants/maquette/Panneau.tsx e2e
git commit -m "feat(interface): comptes et paramètres avec les composants de la maquette"
```

---

### Task 16 : Nettoyage et vérification complète

**Files :**
- Delete: les composants `src/components/ui/*` qui ne sont plus importés, `src/lib/utils.ts` s'il n'a plus d'usage
- Modify: `e2e/*.spec.ts` (sélecteurs restants), `package.json` (dépendances devenues inutiles)

**Interfaces :**
- Consumes : tout ce qui précède.
- Produces : un dépôt sans shadcn dans les écrans, où toutes les suites passent, conformité comprise.

- [ ] **Step 1 : Ce qui ne sert plus**

Run :

```bash
for f in src/components/ui/*.tsx; do n=$(basename "$f" .tsx); git grep -q "components/ui/$n" -- src ':!src/components/ui' || echo "inutilisé : $f"; done
git grep -n "lucide-react" -- src
git grep -n "from '@/lib/utils'" -- src
git grep -n "window.confirm\|LIBELLES_TRI\|EnTeteApp\|EnTeteChantier\|ListeChantiers\|MenuArtisan\|MenuLotsAffiches\|CarteComptesRendus" -- src e2e
```

Expected :
- supprimer chaque fichier « inutilisé » ;
- aucune ligne `lucide-react` dans les écrans (sinon, remplacer par `Icone.*`) ;
- si `@/lib/utils` n'a plus d'import, supprimer `src/lib/utils.ts` ;
- aucune ligne pour la dernière commande.

Retirer de `package.json` les dépendances qui n'ont plus aucun import : `lucide-react`, `cmdk`, et le paquet des primitives shadcn (`@base-ui-components/react` ou celui que listent les fichiers supprimés). Vérifier chacune avec `git grep -n "<paquet>" -- src` avant de la retirer, puis `npm install` pour mettre `package-lock.json` à jour. Garder `sonner`, `tailwindcss`, `tw-animate-css` et `@tailwindcss/postcss`.

Dans `src/documents/etats.ts`, si `git grep -n "\.entreprises" -- src` ne renvoie plus que des tests, faire passer ces tests par `vue.lots` (comme `etatDe` : `vue!.lots.find(…)`), puis retirer `entreprises` du type et du retour.

- [ ] **Step 2 : Pas d'utilitaire Tailwind dans les écrans**

Run : `npm test -- src/app/maquette.test.ts`
Expected : PASS, y compris le test « pas d'utilitaire Tailwind « block » » pour chaque fichier. Puis :

```bash
git grep -nE "className=\"[^\"]*\b(flex|grid|p-[0-9]|px-|py-|m[trblxy]?-[0-9]|text-(xs|sm|lg)|rounded|border-|bg-|gap-|w-\[|max-w-)" -- 'src/app/**/*.tsx' 'src/composants/**/*.tsx'
```

Expected : aucune ligne dans les écrans. Les feuilles imprimables (`src/documents/gabarits/*`) ne sont pas concernées. S'il en reste, remplacer par la classe de la maquette équivalente, ou par un style en ligne si la maquette en a un au même endroit.

- [ ] **Step 3 : Toutes les suites**

Run :

```bash
npx tsc --noEmit && npm run lint && npm test && npm run test:int && npm run test:e2e && npm run test:conformite
```

Expected : tout passe ; lint sans erreur. `test:conformite` : les 10 captures sont identiques à la maquette (`maxDiffPixelRatio` 0,01). **Ne jamais régénérer les références pour faire passer un test** : `npm run conformite:references` ne se relance que si la maquette elle-même change. Pour une capture en échec, ouvrir son `*-diff.png` dans `test-results/` et corriger le balisage.

- [ ] **Step 4 : Le thème sombre, à l'œil**

Le banc compare le thème clair. Lancer l'app (`npx dotenv -e .env.test -- npx next dev -p 3100`), basculer en sombre, parcourir Mes chantiers, Marchés, le panneau d'un lot, Planning, Documents, un aperçu, Artisans. Aucun élément ne doit rester clair : tout vient des jetons de la maquette, et les composants shadcn restants suivent `data-theme` (Task 1). Recharger : le sombre tient, sans flash clair.

- [ ] **Step 5 : Commit**

```bash
git add -A src e2e package.json package-lock.json
git status --short   # vérifier qu'aucun fichier hors de ce plan n'est ajouté (AGENTS.md, notes locales…)
git commit -m "chore(interface): retrait de shadcn et des icônes lucide, sélecteurs E2E à jour, conformité complète"
```

Avant ce commit, retirer de l'index tout fichier que `git status --short` montre et qui n'appartient pas à ce plan (`git restore --staged <fichier>`).
