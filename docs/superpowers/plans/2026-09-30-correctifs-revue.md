# Sentinelle Marchés — Correctifs de la revue générale : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Corriger les défauts trouvés par la revue des sous-projets 1 à 3 : pages qui livrent les données des chantiers sans session valide (critique), interblocage entre le verrou du lot et celui du chantier, suppression d'un lot en course avec une génération, montants « 96.250 » lus 96,25, avertissements du linter.

**Architecture:** Aucune nouvelle fonctionnalité. Chaque page et layout de `src/app/(app)` appelle `exigerPage()` avant toute lecture, et un test statique l'impose aux pages futures. Tous les verrous de ligne passent de `FOR UPDATE` à `FOR NO KEY UPDATE`, qui sérialise toujours les écritures mais ne bloque plus les insertions qui référencent la ligne (clés étrangères) ; un verrou du chantier partagé remplace les trois copies. Les autres correctifs sont locaux.

**Tech Stack:** inchangée (Next.js 16.3.7, React 19, Prisma 7.10, PostgreSQL 17, Vitest 5, Playwright 1.63).

**Origine :** revue générale du 2026-09-30, faite sur `22227e2` (fin du Suivi financier). Deux défauts ont été reproduits :
- **Fuite** : build de production, requête sans compte avec un cookie `better-auth.session_token` inventé → `307` vers `/connexion`, mais le corps (payload RSC) contient la liste des chantiers, les lots, les montants et le nom des clients (`/chantiers`, `/chantiers/<id>/marches`, `/documents`, `/planning`). Cause : `src/proxy.ts` ne vérifie que la présence du cookie ; la vraie vérification est dans `(app)/layout.tsx`, or un layout n'empêche pas les pages de s'exécuter ni d'apparaître dans le payload (doc Next 16, `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, « Layouts and auth checks »). Un compte bloqué ou une session expirée sont dans le même cas (le navigateur garde son cookie).
- **Interblocage** : transaction A = `SELECT … FROM "Lot" … FOR UPDATE` puis insertion d'un `Document` du chantier ; transaction B = `SELECT … FROM "Chantier" … FOR UPDATE` puis insertion d'une `Periode` du lot → PostgreSQL tue A (`40P01`). Avec `FOR NO KEY UPDATE`, les deux passent. Cas réels : génération d'un certificat (A) pendant un geste du planning sur le même lot (B) ; avec le sous-projet 4, « Tous les lots » des PV (A, 12 lots) pendant un geste du planning.

**Prérequis :** le plan du Suivi de chantier (`docs/superpowers/plans/2026-09-30-suivi-chantier.md`) est **entièrement exécuté** et `npm test`, `npm run test:int`, `npm run test:e2e` passent. Ce plan modifie des fichiers qu'il livre (`src/donnees/comptesRendus.ts`, `src/donnees/verrouLot.ts` avec `sousVerrouLots`, la page Documents, `ApercuCompteRendu`, `ApercuReception`, `ApercuCertificat`). Si le code livré diffère sur un détail (nom d'une variable locale, ordre des imports), appliquer la même modification au code réel ; les tests de ce plan font foi.

## Global Constraints

- Tout en français : noms, commentaires, messages.
- Aucun changement de comportement pour un utilisateur connecté, hormis : le message de suppression d'un lot (Task 3) et le refus d'un nombre ambigu (Task 4).
- Jamais `prisma migrate reset` ni `prisma migrate dev` ; ce plan ne touche pas au schéma.
- Chaque commit n'ajoute que les fichiers de sa tâche (`git add <chemins>`), et se termine par `Co-Authored-By` selon l'outil.
- Messages nouveaux, exacts : « Ce lot a déjà des documents générés : il ne peut plus être supprimé. » ; « « 96.250 » est ambigu : écrivez 96 250 ou 96,25. » (la saisie et les deux lectures, calculées).

## Review Focus

1. **Page ajoutée plus tard sans garde** : le test statique de la Task 1 refuse toute page ou tout layout de `src/app/(app)` dont la première attente n'est pas `exigerPage()`, et toute route d'API (hors `auth` et `sante`) dont la première attente n'est pas `utilisateurConnecte()`. Test : Task 1 (`src/app/gardes.test.ts`).
2. **Écriture en base déclenchée par une page sans session** (`?pv=tous` remplit les champs communs du PV et crée des brouillons) : la garde passe avant `preparerReceptions`. Test : Task 1 (E2E, `?pv=tous` avec un cookie inventé → `307`, aucune donnée).
3. **Verrou de ligne ajouté plus tard en `FOR UPDATE`** : le test statique de la Task 2 refuse `FOR UPDATE` non précédé de `NO KEY` dans `src/`, commentaires compris. Test : Task 2 (`src/donnees/verrous.test.ts`).
4. **Deux « Tous les lots » simultanés, ou un champ du PV saisi pendant la génération** : `FOR NO KEY UPDATE` reste exclusif entre verrouilleurs ; les tests de concurrence existants (`receptions.int.test.ts`, `acomptes.int.test.ts`, `avenants.int.test.ts`, `planning.int.test.ts`, `comptesRendus.int.test.ts`) doivent rester verts. Test : Task 2, Step 6.
5. **Taux ou montant saisi « 0.125 », « 12.5 », « 1.234,50 »** : toujours acceptés ; seul un nombre à 1-3 chiffres (sans zéro de tête), un point et exactement trois chiffres est refusé. Test : Task 4.

---

### Task 1: Chaque page vérifie la session avant de lire

**Files:**
- Create: `src/app/gardes.test.ts`, `e2e/gardes.spec.ts`
- Modify: `src/app/(app)/page.tsx`, `src/app/(app)/chantiers/page.tsx`, `src/app/(app)/chantiers/[id]/layout.tsx`, `src/app/(app)/chantiers/[id]/page.tsx`, `src/app/(app)/chantiers/[id]/marches/page.tsx`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `src/app/(app)/chantiers/[id]/planning/page.tsx`

**Interfaces:**
- Consumes: `exigerPage(opts?)`, `utilisateurConnecte()` (`src/auth/session.ts`, Socle) ; `seConnecter`, `ADMIN` (`e2e/aide.ts`) ; chantier E2E `FINANCIER` (copie seedée de PERRIER, Suivi financier).
- Produces: règle vérifiée par test — dans `src/app/(app)`, la première attente de chaque `page.tsx` et `layout.tsx` (à partir de `export default`) est `exigerPage(` ; dans `src/app/api` (hors `api/auth`, `api/sante`), la première attente de chaque `route.ts` est `utilisateurConnecte(`.

- [x] **Step 1: Les tests**

Créer `src/app/gardes.test.ts` :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Tous les fichiers `nom` sous `dossier`, récursivement. */
function trouver(dossier: string, noms: string[]): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return trouver(chemin, noms);
		return noms.includes(e.name) ? [chemin] : [];
	});
}

/** La première attente du composant exporté (les fonctions d'aide définies au-dessus ne comptent pas). */
function premiereAttente(fichier: string): string {
	const texte = readFileSync(fichier, 'utf8');
	const corps = texte.slice(Math.max(0, texte.search(/export (default |async function GET)/)));
	return /await\s+([\w.]+)/.exec(corps)?.[1] ?? '(aucune)';
}

/*
 * Un layout n'empêche pas ses pages de s'exécuter ni d'envoyer leurs données (doc Next 16, « Layouts and auth
 * checks ») : sans garde propre, une page lit la base et livre ses données dans le corps de la redirection, même
 * à qui n'a qu'un cookie inventé. Chaque page et chaque layout vérifie donc la session AVANT toute lecture.
 */
describe('gardes de session', () => {
	it.each(trouver(path.join('src', 'app', '(app)'), ['page.tsx', 'layout.tsx']))('%s commence par exigerPage()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('exigerPage');
	});

	const routes = trouver(path.join('src', 'app', 'api'), ['route.ts'])
		.filter((f) => !f.includes(`${path.sep}auth${path.sep}`) && !f.includes(`${path.sep}sante${path.sep}`));

	it.each(routes)('%s commence par utilisateurConnecte()', (fichier) => {
		expect(premiereAttente(fichier)).toBe('utilisateurConnecte');
	});

	it('les listes ne sont pas vides (le test voit bien les fichiers)', () => {
		expect(trouver(path.join('src', 'app', '(app)'), ['page.tsx']).length).toBeGreaterThan(8);
		expect(routes.length).toBeGreaterThanOrEqual(4);
	});
});
```

Créer `e2e/gardes.spec.ts` :

```ts
import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Les deux noms possibles du cookie de Better Auth (avec et sans préfixe sécurisé), avec une valeur inventée. */
const COOKIE_INVENTE = 'better-auth.session_token=invente; __Secure-better-auth.session_token=invente';
const SECRETS = ['M. et Mme PERRIER', 'CONSTRUCTIONS REBOURS', 'FINANCIER'];

// Revue du 2026-09-30 : ces pages livraient leurs données dans le corps de la redirection.
test('sans session valide, aucune page ne livre de données, même avec un cookie inventé', async ({ page, playwright }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.getByRole('link', { name: 'FINANCIER', exact: true }).click();
	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
	const chantier = new URL(page.url()).pathname.replace(/\/marches$/, '');

	const inconnu = await playwright.request.newContext({ baseURL: 'http://localhost:3100', extraHTTPHeaders: { Cookie: COOKIE_INVENTE } });
	const chemins = [
		'/', '/chantiers', '/chantiers/nouveau', '/artisans', '/parametres', '/admin/comptes',
		chantier, `${chantier}/marches`, `${chantier}/documents`, `${chantier}/documents?pv=tous`, `${chantier}/planning`,
	];
	for (const chemin of chemins) {
		const r = await inconnu.get(chemin, { maxRedirects: 0 });
		expect(r.status(), chemin).toBe(307);
		expect(r.headers().location, chemin).toMatch(/\/connexion$/);
		const corps = await r.text();
		for (const secret of SECRETS) expect(corps, `${chemin} livre « ${secret} »`).not.toContain(secret);
	}
	await inconnu.dispose();
});
```

- [x] **Step 2: Vérifier l'échec**

Run: `npm test -- src/app/gardes.test.ts`
Expected: FAIL pour `(app)/page.tsx`, `chantiers/page.tsx`, `chantiers/[id]/layout.tsx`, `chantiers/[id]/page.tsx`, `marches/page.tsx`, `documents/page.tsx`, `planning/page.tsx` (première attente `params` ou `listerChantiers`, ou aucune) ; PASS pour les autres.

Run: `npm run test:e2e -- e2e/gardes.spec.ts`
Expected: FAIL — le corps de `/chantiers` contient « M. et Mme PERRIER ».

- [x] **Step 3: Les gardes**

Dans chacun des sept fichiers, importer `exigerPage` (`import { exigerPage } from '@/auth/session';`) et faire de `await exigerPage();` la **première instruction** du composant exporté, avant `await params` et avant toute lecture.

`src/app/(app)/page.tsx` devient :

```tsx
import { redirect } from 'next/navigation';
import { exigerPage } from '@/auth/session';

export default async function Accueil() {
	await exigerPage();
	redirect('/chantiers');
}
```

`src/app/(app)/chantiers/page.tsx` :

```tsx
export default async function PageChantiers() {
	await exigerPage();
	return (
		// … inchangé …
```

`src/app/(app)/chantiers/[id]/layout.tsx` :

```tsx
export default async function LayoutChantier({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
	await exigerPage();
	const { id } = await params;
	const chantier = await lireEnTeteChantier(id);
	// … inchangé …
```

`src/app/(app)/chantiers/[id]/page.tsx` :

```tsx
import { redirect } from 'next/navigation';
import { exigerPage } from '@/auth/session';

export default async function PageChantier({ params }: { params: Promise<{ id: string }> }) {
	await exigerPage();
	redirect(`/chantiers/${(await params).id}/marches`);
}
```

`marches/page.tsx`, `documents/page.tsx`, `planning/page.tsx` : même motif, `await exigerPage();` avant `const { id } = await params;`. Pour `documents/page.tsx`, c'est ce qui empêche `preparerReceptions` (écritures) de s'exécuter sans session.

(`utilisateurConnecte` est mis en cache par requête : le layout `(app)` et la page ne font qu'une seule lecture de session.)

- [x] **Step 4: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/app/gardes.test.ts && npm run test:e2e -- e2e/gardes.spec.ts e2e/connexion.spec.ts e2e/marches.spec.ts`
Expected: aucune erreur ; PASS.

- [x] **Step 5: Commit**

```bash
git add src/app/gardes.test.ts e2e/gardes.spec.ts "src/app/(app)/page.tsx" "src/app/(app)/chantiers/page.tsx" "src/app/(app)/chantiers/[id]/layout.tsx" "src/app/(app)/chantiers/[id]/page.tsx" "src/app/(app)/chantiers/[id]/marches/page.tsx" "src/app/(app)/chantiers/[id]/documents/page.tsx" "src/app/(app)/chantiers/[id]/planning/page.tsx"
git commit -m "fix(securite): chaque page vérifie la session avant de lire, plus de données dans le corps des redirections"
```

---

### Task 2: Verrous de ligne en `FOR NO KEY UPDATE`, verrou du chantier partagé

**Files:**
- Create: `src/donnees/verrous.test.ts`, `src/donnees/verrous.int.test.ts`
- Modify: `src/donnees/verrouLot.ts`, `src/donnees/planning.ts`, `src/donnees/lots.ts`, `src/donnees/comptesRendus.ts`

**Interfaces:**
- Consumes: `sousVerrouLot`, `sousVerrouLots`, `type Tx` (`verrouLot.ts`) ; `insererPerrier`, `viderBase` (tests).
- Produces, dans `src/donnees/verrouLot.ts` :
  - `verrouillerChantier(tx: Tx, chantierId: string): Promise<boolean>` — `SELECT … FROM "Chantier" … FOR NO KEY UPDATE` ; faux si le chantier n'existe pas (chaque appelant garde son message)
  - `sousVerrouChantier<T>(chantierId: string, operation: (tx: Tx) => Promise<T>): Promise<T>` — « Chantier introuvable. » si absent
  - `sousVerrouLot` et `sousVerrouLots` : même signature, `FOR NO KEY UPDATE`

- [x] **Step 1: Les tests**

Créer `src/donnees/verrous.test.ts` :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' ? [] : sources(chemin);
		return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [chemin] : [];
	});
}

/*
 * `FOR UPDATE` bloque aussi les insertions qui référencent la ligne (contrôle de clé étrangère, `FOR KEY SHARE`) :
 * lot verrouillé + document du chantier d'un côté, chantier verrouillé + période du lot de l'autre, et PostgreSQL
 * tue l'une des deux (40P01). `FOR NO KEY UPDATE` sérialise toujours les écritures entre elles, sans ce blocage.
 */
describe('verrous de ligne', () => {
	it.each(sources('src'))('%s : pas de FOR UPDATE, seulement FOR NO KEY UPDATE', (fichier) => {
		expect(readFileSync(fichier, 'utf8')).not.toMatch(/(?<!NO KEY )FOR UPDATE/);
	});
});
```

Créer `src/donnees/verrous.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { prisma } from './prisma';
import { sousVerrouChantier, sousVerrouLot } from './verrouLot';

function signal() {
	let ouvrir!: () => void;
	const attendu = new Promise<void>((r) => { ouvrir = r; });
	return { attendu, ouvrir };
}

describe('verrou du lot et verrou du chantier', () => {
	let p: Awaited<ReturnType<typeof insererPerrier>>;

	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('une génération sous verrou du lot et un geste du planning sous verrou du chantier ne s\'interbloquent pas', async () => {
		const lotId = p.lots['GROS ŒUVRE'];
		const lotPris = signal();
		const chantierPris = signal();
		// A : comme un certificat — lot verrouillé, puis un document du chantier.
		const a = sousVerrouLot(lotId, async (tx) => {
			lotPris.ouvrir();
			await chantierPris.attendu;
			await tx.document.create({ data: {
				chantierId: p.chantierId, lotId, serie: 'ESSAI', type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
				pdf: new Uint8Array([1]), nomFichier: 'x.pdf', creeParId: p.utilisateurId,
			} });
		});
		// B : comme un geste du planning — chantier verrouillé, puis une période du lot, pendant que A attend.
		const b = sousVerrouChantier(p.chantierId, async (tx) => {
			chantierPris.ouvrir();
			await lotPris.attendu;
			await new Promise((r) => setTimeout(r, 300));
			await tx.periode.create({ data: { lotId, debut: new Date('2026-10-05T00:00:00Z'), duree: 1 } });
		});
		await Promise.all([a, b]);
		expect([await prisma.document.count({ where: { serie: 'ESSAI' } }), await prisma.periode.count({ where: { lotId } })]).toEqual([1, 1]);
	});

	it('deux écritures sous verrou du chantier passent l\'une après l\'autre', async () => {
		const ordre: string[] = [];
		const premier = signal();
		await Promise.all([
			sousVerrouChantier(p.chantierId, async () => {
				premier.ouvrir();
				await new Promise((r) => setTimeout(r, 300));
				ordre.push('premier');
			}),
			premier.attendu.then(() => sousVerrouChantier(p.chantierId, async () => { ordre.push('second'); })),
		]);
		expect(ordre).toEqual(['premier', 'second']);
	});

	it('chantier inconnu : refusé', async () => {
		await expect(sousVerrouChantier('inconnu', async () => null)).rejects.toThrow('Chantier introuvable.');
	});
});
```

- [x] **Step 2: Vérifier l'échec**

Run: `npm test -- src/donnees/verrous.test.ts && npm run test:int -- src/donnees/verrous.int.test.ts`
Expected: FAIL — `FOR UPDATE` dans `verrouLot.ts`, `planning.ts`, `lots.ts`, `comptesRendus.ts` (code et commentaires) ; `sousVerrouChantier` n'est pas exporté par `./verrouLot`.

- [x] **Step 3: Le verrou partagé**

Dans `src/donnees/verrouLot.ts` :

1. dans `sousVerrouLot` : `FOR UPDATE` → `FOR NO KEY UPDATE`, et le commentaire `SELECT … FOR UPDATE sur la ligne du lot` → `SELECT … FOR NO KEY UPDATE sur la ligne du lot` ;
2. dans `sousVerrouLots` : `ORDER BY "chantierId", ordre FOR UPDATE` → `ORDER BY "chantierId", ordre FOR NO KEY UPDATE`, et son commentaire (`ORDER BY` avant `FOR NO KEY UPDATE`) ;
3. ajouter, après `sousVerrouLots` :

```ts
/**
 * Verrou de la ligne du chantier (planning, ajout d'un lot, enregistrement et correction d'un compte rendu).
 * `FOR NO KEY UPDATE`, comme pour les lots : les écritures sous ce verrou passent l'une après l'autre, mais une
 * insertion qui référence le chantier (un document, un compte rendu) n'attend pas — sinon, lot verrouillé d'un
 * côté et chantier de l'autre, PostgreSQL tuerait l'une des deux transactions (40P01).
 * Faux si le chantier n'existe pas : chaque appelant garde son message.
 */
export async function verrouillerChantier(tx: Tx, chantierId: string): Promise<boolean> {
	const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Chantier" WHERE id = ${chantierId} FOR NO KEY UPDATE`;
	return verrou.length > 0;
}

export async function sousVerrouChantier<T>(chantierId: string, operation: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		if (!(await verrouillerChantier(tx, chantierId))) throw new ErreurMetier('Chantier introuvable.');
		return operation(tx);
	});
}
```

- [x] **Step 4: Les appelants**

`src/donnees/planning.ts`, dans `sousVerrou` : importer `verrouillerChantier` depuis `./verrouLot` et remplacer

```ts
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Chantier" WHERE id = ${chantierId} FOR UPDATE`;
		if (!verrou.length) throw new ErreurMetier(INTROUVABLE);
```

par

```ts
		if (!(await verrouillerChantier(tx, chantierId))) throw new ErreurMetier(INTROUVABLE);
```

(`planning.ts` garde son propre `type Tx` : c'est le même `Prisma.TransactionClient`.)

`src/donnees/lots.ts`, dans `ajouterLot` : importer `verrouillerChantier` (à côté de `montantsAvenants, sousVerrouLot`) et remplacer `await tx.$executeRaw\`SELECT 1 FROM "Chantier" WHERE id = ${chantierId} FOR UPDATE\`;` par `await verrouillerChantier(tx, chantierId);` (le comportement pour un chantier inconnu ne change pas : l'insertion du lot échoue ensuite sur la clé étrangère, comme aujourd'hui).

`src/donnees/comptesRendus.ts` :
1. supprimer la fonction locale `sousVerrouChantier` et importer celle de `./verrouLot` (même nom, même signature, même message « Chantier introuvable. ») ;
2. dans `verrouillerBrouillon` : `… AND statut = 'BROUILLON' FOR UPDATE` → `… FOR NO KEY UPDATE`, et son commentaire ;
3. dans `corrigerCompteRendu` : `SELECT id FROM "CompteRendu" WHERE id = ${id} FOR UPDATE` → `FOR NO KEY UPDATE` ;
4. mettre à jour les commentaires qui citent `FOR UPDATE` (« Enregistrement et correction : `FOR NO KEY UPDATE` sur le chantier d'abord, puis sur le compte rendu »).

Puis vérifier qu'il n'en reste aucun :

Run: `grep -rn "FOR UPDATE" src | grep -v "NO KEY UPDATE"`
Expected: aucune ligne.

- [x] **Step 5: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/donnees/verrous.test.ts && npm run test:int -- src/donnees/verrous.int.test.ts`
Expected: aucune erreur ; PASS.

- [x] **Step 6: Les tests de concurrence existants restent verts**

Run: `npm run test:int`
Expected: PASS, en particulier `acomptes.int.test.ts`, `avenants.int.test.ts`, `lots.int.test.ts`, `planning.int.test.ts`, `comptesRendus.int.test.ts`, `receptions.int.test.ts` (écritures simultanées sérialisées).

- [x] **Step 7: Commit**

```bash
git add src/donnees/verrous.test.ts src/donnees/verrous.int.test.ts src/donnees/verrouLot.ts src/donnees/planning.ts src/donnees/lots.ts src/donnees/comptesRendus.ts
git commit -m "fix(donnees): verrous FOR NO KEY UPDATE, plus d'interblocage entre verrou du lot et verrou du chantier"
```

---

### Task 3: Supprimer un lot pendant une génération

**Files:**
- Modify: `src/donnees/erreursPrisma.ts`, `src/donnees/lots.ts`, `src/donnees/lots.int.test.ts`

**Interfaces:**
- Produces: `estCleEtrangere(e: unknown): boolean` (`erreursPrisma.ts`) ; `LOT_AVEC_DOCUMENTS = 'Ce lot a déjà des documents générés : il ne peut plus être supprimé.'` (`lots.ts`).

Aujourd'hui `supprimerLot` compte les documents puis supprime, sans verrou : un document inséré entre les deux fait échouer la suppression sur la clé étrangère (`Document.lotId`, `Restrict`) avec « Erreur inattendue ». Et le message parle d'un « marché » alors qu'une lettre d'avenant ou un certificat suffisent à bloquer.

- [x] **Step 1: Le test**

Dans `src/donnees/lots.int.test.ts`, importer `LOT_AVEC_DOCUMENTS` depuis `./lots`, remplacer dans le test « supprime un lot sans document, refuse sinon » le message attendu `'Ce lot a déjà un marché généré : il ne peut plus être supprimé.'` par `LOT_AVEC_DOCUMENTS`, puis ajouter :

```ts
	it('document inséré pendant la suppression : même refus, pas d\'erreur inattendue', async () => {
		let insere!: () => void;
		let terminer!: () => void;
		const documentInsere = new Promise<void>((r) => { insere = r; });
		const fin = new Promise<void>((r) => { terminer = r; });
		// Une génération en cours : son document existe déjà dans sa transaction, pas encore validée.
		const generation = prisma.$transaction(async (tx) => {
			await tx.document.create({ data: {
				chantierId, lotId, serie: lotId, type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
				pdf: new Uint8Array([1]), nomFichier: 'x.pdf', creeParId: utilisateurId,
			} });
			insere();
			await fin;
		});
		await documentInsere;
		const suppression = supprimerLot(lotId);
		await new Promise((r) => setTimeout(r, 300));
		terminer();
		await generation;
		await expect(suppression).rejects.toThrow(LOT_AVEC_DOCUMENTS);
		expect(await prisma.lot.count({ where: { id: lotId } })).toBe(1);
	});
```

- [x] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/donnees/lots.int.test.ts`
Expected: FAIL — `LOT_AVEC_DOCUMENTS` n'est pas exporté ; puis le nouveau test échoue sur une erreur Prisma `P2003` au lieu du message.

- [x] **Step 3: Le correctif**

Dans `src/donnees/erreursPrisma.ts`, ajouter :

```ts
/** Violation d'une clé étrangère (ligne encore référencée, ou référence vers une ligne absente). */
export function estCleEtrangere(e: unknown): boolean {
	return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003';
}
```

Dans `src/donnees/lots.ts`, importer `estCleEtrangere` depuis `./erreursPrisma` et remplacer `supprimerLot` par :

```ts
export const LOT_AVEC_DOCUMENTS = 'Ce lot a déjà des documents générés : il ne peut plus être supprimé.';

/** Un document (marché, lettre, certificat, PV) interdit la suppression, même inséré pendant qu'elle s'exécute. */
export async function supprimerLot(lotId: string): Promise<{ chantierId: string }> {
	const lot = await prisma.lot.findUniqueOrThrow({ where: { id: lotId }, include: { _count: { select: { documents: true } } } });
	if (lot._count.documents > 0) throw new ErreurMetier(LOT_AVEC_DOCUMENTS);
	try {
		await prisma.lot.delete({ where: { id: lotId } });
	} catch (e) {
		if (estCleEtrangere(e)) throw new ErreurMetier(LOT_AVEC_DOCUMENTS);
		throw e;
	}
	return { chantierId: lot.chantierId };
}
```

Si Prisma remonte la violation sous un autre code que `P2003` avec l'adaptateur `pg` (le test le dira), afficher `e.code` dans le test, ajouter ce code à `estCleEtrangere` et le documenter dans son commentaire.

Chercher les autres usages de l'ancien message :

Run: `grep -rn "a déjà un marché généré" src e2e tests`
Expected: aucune ligne (sinon, remplacer par le nouveau message).

- [x] **Step 4: Vérifier le succès**

Run: `npx tsc --noEmit && npm run test:int -- src/donnees/lots.int.test.ts`
Expected: aucune erreur ; PASS.

- [x] **Step 5: Commit**

```bash
git add src/donnees/erreursPrisma.ts src/donnees/lots.ts src/donnees/lots.int.test.ts
git commit -m "fix(lots): suppression refusée proprement si un document paraît pendant qu'elle s'exécute"
```

---

### Task 4: Refuser un nombre ambigu (« 96.250 »)

**Files:**
- Modify: `src/domaine/montants.ts`, `src/domaine/montants.test.ts`

**Interfaces:**
- Produces: `lireNombreFr` refuse en plus, avec `ErreurMetier`, toute saisie de la forme `^-?[1-9]\d{0,2}\.\d{3}$` (après retrait des espaces, `€`, `%`) : « « 96.250 » est ambigu : écrivez 96 250 ou 96,25. ».

Aujourd'hui « 96.250 » (milliers à l'ancienne) est lu 96,25 : un facteur 1 000 d'écart sur un marché, sans avertissement. La règle « le point ne sépare les milliers que si une virgule suit » reste ; seul ce cas indécidable est refusé plutôt que deviné. `lireNombreFr` sert aux montants, taux et cumuls : les autres formes (« 12.5 », « 0.125 », « 1234.5 », « 1.234,50 ») ne changent pas.

- [x] **Step 1: Les tests**

Dans `src/domaine/montants.test.ts`, dans `describe('lireNombreFr', …)`, ajouter :

```ts
	it.each([
		['96.250', '« 96.250 » est ambigu : écrivez 96 250 ou 96,25.'],
		['1.500', '« 1.500 » est ambigu : écrivez 1 500 ou 1,5.'],
		['2.000 €', '« 2.000 € » est ambigu : écrivez 2 000 ou 2.'],
		['-300.000', '« -300.000 » est ambigu : écrivez -300 000 ou -300.'],
	])('%s : ambigu, refusé plutôt que deviné', (saisie, message) => {
		expect(() => lireNombreFr(saisie)).toThrow(message);
	});

	it.each([['12.5', '12.5'], ['0.125', '0.125'], ['1234.500', '1234.5'], ['1.234,50', '1234.5'], ['96 250', '96250']])(
		'%s : non ambigu, lu %s',
		(saisie, attendu) => {
			expect(lireNombreFr(saisie).toString()).toBe(attendu);
		},
	);
```

- [x] **Step 2: Vérifier l'échec**

Run: `npm test -- src/domaine/montants.test.ts`
Expected: FAIL — « 96.250 » est lu 96.25 au lieu d'être refusé.

- [x] **Step 3: Le correctif**

Dans `src/domaine/montants.ts`, au-dessus de `lireNombreFr` :

```ts
/** « 96.250 » : milliers à l'ancienne, ou décimales ? Indécidable, et un facteur 1 000 d'écart : refusé. */
const AMBIGU = /^(-?)([1-9]\d{0,2})\.(\d{3})$/;
```

et, dans `lireNombreFr`, juste après `let s = saisie.replace(/[\s  €%]/g, '');` :

```ts
	const ambigu = AMBIGU.exec(s);
	if (ambigu) {
		const [, signe, entier, trois] = ambigu;
		const decimales = trois.replace(/0+$/, '');
		throw new ErreurMetier(
			`« ${saisie.trim()} » est ambigu : écrivez ${signe}${entier} ${trois} ou ${signe}${entier}${decimales ? `,${decimales}` : ''}.`,
		);
	}
```

Remarque : `lireMontantAvenant` (`src/domaine/avenants.ts`) attrape toute erreur de `lireNombreFr` et renvoie « Montant : saisissez un nombre. » ; c'est acceptable pour un avenant (la saisie est refusée, pas devinée). Ne pas le modifier dans cette tâche.

- [x] **Step 4: Vérifier le succès**

Run: `npm test && npm run test:int`
Expected: PASS (aucun test existant ne saisit de nombre ambigu).

- [x] **Step 5: Commit**

```bash
git add src/domaine/montants.ts src/domaine/montants.test.ts
git commit -m "fix(montants): « 96.250 » refusé comme ambigu au lieu d'être lu 96,25"
```

---

### Task 5: Avertissements du linter

**Files:**
- Create: `src/composants/telecharger.ts`
- Modify: `eslint.config.mjs`, `src/composants/ApercuDocument.tsx`, `src/composants/planning/ApercuPlanning.tsx`, `src/composants/ApercuCertificat.tsx`, `src/composants/ApercuCompteRendu.tsx`, `src/composants/ApercuReception.tsx`

**Interfaces:**
- Produces: `telecharger(href: string): void` (`src/composants/telecharger.ts`), qui remplace les copies locales et les `window.location.assign`.

- [x] **Step 1: Constater les avertissements**

Run: `npx eslint .`
Expected: 0 erreur ; avertissements `@next/next/no-location-assign-relative-destination` (`ApercuDocument.tsx`, `ApercuPlanning.tsx`) et `@typescript-eslint/no-unused-vars` sur des variables préfixées `_` (`_acompte`, `_nom`, `_ref`…).

- [x] **Step 2: Le téléchargement partagé**

Créer `src/composants/telecharger.ts` :

```ts
/** Télécharge un fichier servi en pièce jointe sans quitter la page (l'aperçu se ferme juste après). */
export function telecharger(href: string): void {
	const lien = document.createElement('a');
	lien.href = href;
	lien.download = '';
	lien.click();
}
```

Puis :
- `ApercuDocument.tsx` et `planning/ApercuPlanning.tsx` : importer `telecharger` depuis `@/composants/telecharger` et remplacer `window.location.assign(\`/api/documents/${r.donnees.documentId}/pdf\`);` par `telecharger(\`/api/documents/${r.donnees.documentId}/pdf\`);` ;
- `ApercuCertificat.tsx` et `ApercuCompteRendu.tsx` : supprimer la fonction locale `telecharger(documentId)`, importer la partagée, et remplacer chaque `telecharger(x)` par `telecharger(\`/api/documents/${x}/pdf\`)` ;
- `ApercuReception.tsx` : supprimer la fonction locale `telecharger(href)` et importer la partagée (mêmes appels).

- [x] **Step 3: Les variables volontairement ignorées**

Dans `eslint.config.mjs`, ajouter après `...nextTs,` :

```js
  // `const { a: _a, ...reste } = objet` : la variable préfixée « _ » est écartée exprès.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
```

- [x] **Step 4: Vérifier le succès**

Run: `npx eslint . && npx tsc --noEmit && npm run test:e2e`
Expected: 0 erreur et 0 avertissement ; PASS (les téléchargements des parcours E2E — marché, lettre, planning, visa, certificat, compte rendu, PV — passent par la fonction partagée).

- [x] **Step 5: Commit**

```bash
git add eslint.config.mjs src/composants/telecharger.ts src/composants/ApercuDocument.tsx src/composants/planning/ApercuPlanning.tsx src/composants/ApercuCertificat.tsx src/composants/ApercuCompteRendu.tsx src/composants/ApercuReception.tsx
git commit -m "chore(lint): téléchargement partagé sans window.location.assign, variables « _ » ignorées"
```

---

## Hors de ce plan

- **Alerte en cas d'échec de sauvegarde** : aujourd'hui seul le healthcheck Docker passe en erreur, personne n'est prévenu. Il faut d'abord choisir un canal (e-mail, supervision du VPS) : décision à prendre avant d'en faire un plan.
- **En-têtes de sécurité HTTP** (CSP, `X-Frame-Options`, `Referrer-Policy`) dans le `Caddyfile` : utiles, mais une CSP demande de recenser les scripts et styles en ligne (aperçus, `dangerouslySetInnerHTML` des styles de documents) ; à traiter à part.
