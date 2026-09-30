# Sentinelle Marchés — Suivi de chantier : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le compte rendu de chantier (brouillon partagé, feuille SOCOREVE figée, correction du dernier), le procès-verbal de réception (un lot ou tous, une page par lot, levée des réserves), la page Documents complète (carte Comptes rendus, colonne Réception) et « Tout télécharger » (ZIP).

**Architecture:** Deux tables métier, `CompteRendu` (brouillon compris) et `Reception` (une ligne par lot), plus les champs communs du PV sur `Chantier` ; les PDF passent par la chaîne `Document` + `serie` (`CR:<id>`, `RECEPTION:<lotId>`). Les règles (coordination, convocations, rendez-vous, décisions, état de la case Réception, arborescence du ZIP) vivent une fois dans `src/domaine/` ; les feuilles se construisent dans des modules purs (`src/documents/compteRendu.ts`, `reception.ts`, `coordonnees.ts`) que l'aperçu rappelle dans le navigateur et le serveur à la génération. Les écritures se font sous verrou (`FOR UPDATE`) : ligne du compte rendu, ligne du chantier pour l'enregistrement et la correction, lot ou lots pour la réception.

**Tech Stack:** celle des sous-projets précédents — Next.js 16.3.7, React 19, TypeScript strict, Tailwind 4 + shadcn/ui (Base UI), Prisma 7.10.0, PostgreSQL 17, Zod 4, Playwright 1.63.0, Vitest 5, ExcelJS. **Nouveau :** `fflate` (ZIP) ; `pdf-lib` passe en dépendance de production (assemblage des PV).

**Spec:** `docs/superpowers/specs/2026-09-30-suivi-chantier-design.md` — à lire avant toute tâche, avec celles du Socle (`2026-09-29-socle-design.md`), du Planning (`2026-09-29-planning-design.md`) et du Suivi financier (`2026-09-30-suivi-financier-design.md`). Maquette de référence : `docs/maquette/sentinelle-marches.html` (compte rendu : styles l. 1281-1320 et 1689-1699, `renderCr` l. 6720-6810 ; PV : styles l. 1918-1947, `pagePv` l. 7327-7400 ; page Documents l. 4590-4830).

**Prérequis :** le plan du Suivi financier (`docs/superpowers/plans/2026-09-30-suivi-financier.md`) est **entièrement exécuté** (Tasks 1 à 9) et `npm test`, `npm run test:int`, `npm run test:e2e` passent. Ce plan s'appuie sur ce qu'il livre : `sousVerrouLot`, `Tx` (`src/donnees/verrouLot.ts`) ; `DONNEES_CHANGEES`, `rendrePdfDocument`, `type Dependances`, `imprimerPortrait` (`src/documents/generer.ts`) ; `htmlVersPdf({ paysage: false, uneSeuleFeuille: true, tropLong })` et `TROP_DE_LIGNES` (`src/documents/uneFeuille.ts`) ; `LOGO_SOCOREVE` (`src/documents/gabarits/logo.ts`) ; `dateCourteSlash`, `verifierDate` (`src/domaine/certificats.ts`) ; `prefixeLot` (`src/domaine/fichiers.ts`) ; `serieAvenant`, `serieCertificat`, `avenantDeLaSerie` (`src/documents/series.ts`) ; `etats.ts` et `TableauDocuments.tsx` de sa Task 9 (`LigneDocuments.historique`, `VersionResume.libelle`, colonnes Avenants et Certificats) ; `PanneauLot.tsx` de sa Task 8 ; `e2e/preparer-financier.ts` dans `e2e:serveur`. Les extraits cités ici viennent de ce plan : si le code livré diffère sur un détail (nom d'une variable locale, ordre des champs), appliquer la même modification au code réel.

## Global Constraints

- Tout en français : interface, fichiers, variables, fonctions, commentaires, messages (exceptions imposées par les outils).
- Messages exactement ceux de la spec (§ 9) : « Saisissez l'avancement ou la coordination avant d'enregistrer. », « Le compte rendu n° 5 existe déjà. », « Heure : saisissez HH:MM. », « Saisissez d'abord la date du prochain rendez-vous. », « Seul le dernier compte rendu se corrige. », « Ce brouillon n'existe plus. », « L'avancement est limité à 5 000 caractères. », « CONSTRUCTIONS REBOURS : précisez la nature des réserves. », « … : précisez les motifs du report. », « Ce lot n'a pas d'entreprise. », « Attribuez d'abord une entreprise à un lot. », « Le dernier PV de ce lot n'a pas de réserves. », « La levée ne peut précéder la réception. », `DONNEES_CHANGEES`, `TROP_DE_LIGNES` ; toasts « Compte rendu n° 04 enregistré. », « PV de réception généré — CONSTRUCTIONS REBOURS. », « 10 PV générés, 2 inchangés. » (les autres toasts sont repris de l'application : voir « Écarts assumés »).
- Numéro d'un compte rendu : fixé à la création du brouillon (plus grand numéro enregistré + 1, sinon 1), jamais saisi. « Dernier » = le compte rendu `ENREGISTRE` de plus grand numéro ; seul lui se corrige.
- Un compte rendu et un PV **n'ont pas d'état « modifié »** : `etatsDocumentsChantier` ne reconstruit jamais leur contenu.
- Seul `{ type, contenu }` entre dans l'empreinte ; l'en-tête SOCOREVE (`societe`) en est exclu. Gabarits sans `'use client'`, sans hook, sans formatage : tous les textes viennent de l'objet document.
- Compte rendu : A4 portrait, une ou plusieurs pages (`imprimerPortrait`). PV : A4 portrait, **une page par lot** (`imprimerReception`, mise à l'échelle « une feuille »).
- Verrous : champ ou convocation du brouillon sous `FOR UPDATE` sur la ligne `CompteRendu` ; enregistrement et correction sous `FOR UPDATE` sur la ligne `Chantier` puis sur celle du compte rendu ; champ d'un lot, génération et levée sous `sousVerrouLot` / `sousVerrouLots` ; génération : lecture → PDF hors transaction → revérification de l'empreinte sous verrou → insertion.
- Un nouveau PV d'un lot (nouvelle version insérée) efface sa date de levée ; un PV inchangé la garde. Une réception différée n'a pas de levée.
- Une Server Action renvoie `Resultat<T>` par `executer` ; aucun journal ne contient de HTML, de texte de compte rendu ni de nom de client.
- Jamais `prisma migrate reset` ni `prisma migrate dev` : migration écrite à la main, appliquée par `prisma migrate deploy`, vérifiée par `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- Liens stylés en bouton : `className={buttonVariants({ … })}` sur `<Link>` ou `<a>` (le `Button` du projet n'a pas `asChild`).
- Chaque commit n'ajoute que les fichiers de sa tâche (`git add <chemins>` ; d'autres agents peuvent committer sur `main` en même temps).

## Review Focus

1. **Brouillon enregistré ou abandonné par un collègue pendant qu'on écrit** : la sortie du champ suivant renvoie « Ce brouillon n'existe plus. » et n'écrit rien dans le compte rendu enregistré. Test : Task 4 (« un brouillon enregistré ne s'écrit plus »).
2. **Date du compte rendu vidée, date du rendez-vous vidée alors qu'une heure est saisie** : la date vide est refusée (« Date : choisissez une date. ») sans écriture ; vider la date du rendez-vous efface aussi l'heure (la base refuserait une heure sans date). Test : Task 4 (« dates et heure du brouillon »).
3. **Coordination collée depuis Word** (fins de ligne `\r\n`, tabulation en tête, espace insécable dans l'intitulé) : les intitulés sont reconnus, aucune ligne fantôme. Test : Task 1 (« texte collé depuis un traitement de texte »).
4. **Entreprise retirée d'un lot entre l'ouverture et la génération des PV** : « Ce lot n'a pas d'entreprise. », pour ce lot seul comme en « tous les lots » (spec § 6 : un seul refus bloque tout) ; rien n'est écrit et l'aperçu passe sur ce lot ; rouvert, « tous les lots » ne le compte plus. Inversement, un lot attribué après l'ouverture n'est pas généré : on génère les pages qu'on a vues. Tests : Task 6 (« entreprise retirée entre l'ouverture et la génération », « un lot attribué après l'ouverture n'est pas généré »).
5. **Lien périmé ou d'un autre chantier** (`?cr=` d'un compte rendu d'un autre chantier, `?corriger-cr=` d'un compte rendu qui n'est plus le dernier, `?pv=` d'un lot d'un autre chantier) : rien ne s'ouvre, ou la feuille s'ouvre en lecture seule avec « Seul le dernier compte rendu se corrige. » ; aucune ligne `Reception` n'est créée ailleurs. Test : Task 4 (« liens périmés »), Task 6 (« lot d'un autre chantier »).

## Écarts assumés avec la spec

- § 4 prévoit deux index uniques partiels (un brouillon par chantier ; numéros uniques parmi les enregistrés) : ils deviennent **un seul `@@unique([chantierId, numero])`** sur tous les comptes rendus, brouillon compris. Le schéma Prisma ne déclare pas d'index partiel, et un index écrit seulement dans le SQL ferait échouer le contrôle `prisma migrate diff --exit-code`. Le brouillon prend toujours le numéro suivant : deux créations simultanées visent le même numéro, la seconde est refusée par l'unicité et rouvre le brouillon de la première ; et un numéro enregistré ne peut plus être repris. Conséquence : à l'enregistrement, le numéro du brouillon ne peut pas être pris (il le détient déjà) ; aucun contrôle n'y est fait. Le message « Le compte rendu n° 5 existe déjà. » ne sort qu'à la création, dans le seul cas où la création simultanée perd et où le brouillon gagnant a déjà été enregistré. Le scénario « numéro pris refusé » de la spec § 10 est remplacé par le test de course (deux créations, un seul brouillon) et par le refus d'un doublon par la base (Task 4).
- § 3 place `batirCompteRendu` et `batirReception` dans `batir.ts` : ils vivent dans des modules purs (`src/documents/compteRendu.ts`, `reception.ts`, `coordonnees.ts`), parce que `batir.ts` charge `node:crypto` et que la correction d'un compte rendu recalcule la feuille dans le navigateur (même choix que le certificat).
- L'en-tête SOCOREVE du compte rendu et du PV est un objet `societe: { lignes }` hors empreinte, comme la `societe` du certificat.
- § 4 écrit `siteWeb String @default(…)` : la colonne est `String?`, parce qu'elle est facultative comme l'e-mail (un champ vidé devient `null`).
- « Repartir des lots » est calculé dans le navigateur (`coordinationBase`) puis enregistré comme une saisie de la coordination : pas d'action dédiée.
- « Tous les lots » génère sous un seul verrou de tous les lots (`sousVerrouLots`, ajouté à `verrouLot.ts`), dans une seule transaction : un refus n'écrit rien. Le lot en cause revient à l'écran par le champ de l'erreur : pour un refus de `genererReceptions` propre à un lot, `ErreurMetier(message, lotId)` ; partout ailleurs (saisies, date de réception), le second argument reste le nom du champ.
- Spec muette : l'aperçu envoie la liste des lots qu'il affiche, et seuls ceux-là sont générés. Un lot attribué après l'ouverture de « Tous les lots » n'est pas ajouté ; un lot de la liste qui a perdu son entreprise refuse tout (« Ce lot n'a pas d'entreprise. »).
- Toasts repris de l'application (ceux du certificat), absents de la spec : « Version N générée. » (correction d'un compte rendu) et « Rien n'a changé depuis la version N : elle est téléchargée. » (correction sans changement, PV d'un lot déjà à jour). La spec § 5 écrit « Rien n'a changé depuis la version N » ; la suite dit ce qui se passe, puisque le PDF est téléchargé.
- Les champs communs du PV sont remplis à chaque ouverture **s'ils sont vides** : une date de réception ou un maître d'œuvre effacés sont reproposés à l'ouverture suivante.
- Messages ajoutés, sur lesquels la spec est muette : « Date : choisissez une date. » (date du compte rendu vidée, message existant du certificat), « Date de réception : choisissez une date. » (génération d'un PV sans date de réception), « Les réserves sont limitées à 60 lignes. » (avec 2 000 caractères en lignes très courtes, le PV ne tiendrait plus sur une page lisible), « Compte rendu introuvable. », et les confirmations « Abandonner ce brouillon ? Son contenu sera perdu. » et « Fermer sans enregistrer la correction ? ».

## Structure des fichiers

```
prisma/schema.prisma                                    CompteRendu, Reception, Chantier, Parametres, enums (Task 2)
prisma/migrations/20261003000000_suivi_chantier/        migration écrite à la main, CHECK compris (Task 2)
src/domaine/
  compteRendu.ts     convocations, coordination, avancement, rendez-vous, numéro, messages (Task 1)
  reception.ts       décisions, contrôle du PV, état de la case, levée, bilan, messages (Task 1)
  archive.ts         dossiers, dernières versions, chemins et doublons du ZIP (Task 10)
  fichiers.ts        + nomFichierCompteRendu (Task 4), nomFichierReception, nomFichierReceptions (Task 6), nomFichierArchive (Task 10)
src/donnees/
  comptesRendus.ts   brouillon, champs, convocations, enregistrement, correction (Task 4)
  receptions.ts      préparation, champs, génération, levée, assemblage (Task 6)
  verrouLot.ts       + sousVerrouLots (Task 6)
  archive.ts         construction du ZIP (Task 10)
  comptes.ts, parametres.ts                             portable, site web (Task 2)
src/actions/comptesRendus.ts, receptions.ts             Server Actions (Tasks 4 et 6)
src/actions/comptes.ts, parametres.ts                   portable, site web (Task 2)
src/documents/
  libelles.ts, series.ts                                COMPTE_RENDU, PV_RECEPTION, séries (Task 2)
  schemas.ts         compte rendu, PV, lignes de la société (Tasks 3 et 5)
  coordonnees.ts     en-têtes SOCOREVE du compte rendu et du PV, module pur (Task 3)
  compteRendu.ts     feuille du compte rendu, module pur (Task 3)
  reception.ts       feuille du PV, module pur (Task 5)
  generer.ts         imprimerReception (Task 5)
  etats.ts           comptes rendus, case Réception, historique, résumé (Task 7)
  styles.ts          compte rendu, PV (Tasks 3 et 5)
  gabarits/CompteRendu.tsx, ProcesVerbalReception.tsx, Gabarit.tsx (Tasks 3 et 5)
src/composants/
  CarteComptesRendus.tsx, ApercuCompteRendu.tsx (Task 8) ; ApercuReception.tsx, ActionsLevee.tsx (Task 9)
  TableauDocuments.tsx (Tasks 8 et 9), PanneauLot.tsx (Task 9), GestionComptes.tsx (Task 2)
src/app/(app)/chantiers/[id]/documents/page.tsx         ?cr=, ?corriger-cr= (Task 8), ?pv= (Task 9), en-tête (Tasks 8 et 10)
src/app/(app)/parametres/page.tsx                       site web (Task 2)
src/app/api/chantiers/[id]/receptions-pdf/route.ts      PV assemblés (Task 6)
src/app/api/chantiers/[id]/archive/route.ts             ZIP (Task 10)
src/app/globals.css                                     jeton « alerte » (orangé) (Task 9)
tests/integration/aide.ts                               viderBase (Task 2)
e2e/preparer-suivi.ts, e2e/suivi.spec.ts, package.json  chantier SUIVI, parcours (Tasks 8 à 10) ; e2e/financier.spec.ts : colonne décalée (Task 9)
```

---

### Task 1: Règles du compte rendu et de la réception (domaine)

**Files:**
- Create: `src/domaine/compteRendu.ts`, `src/domaine/reception.ts`
- Test: `src/domaine/compteRendu.test.ts`, `src/domaine/reception.test.ts`

**Interfaces:**
- Consumes: `dateCourteSlash(iso: string): string` (`src/domaine/certificats.ts`, Suivi financier Task 1) ; `ErreurMetier` (Socle).
- Produces, dans `src/domaine/compteRendu.ts` :
  - `CONVOCATIONS = ['D', 'C', 'P', 'A', 'E'] as const`, `type Convocation`, `convocationSuivante(c: Convocation | undefined): Convocation`
  - `type ChampCompteRendu = 'date' | 'rdvDate' | 'rdvHeure' | 'avancement' | 'coordination' | 'redacteur' | 'portable'`
  - `coordinationBase(designations: string[]): string`, `numeroSuivant(numeros: number[]): number`, `numeroTexte(n: number): string`
  - `type Segment = { texte: string; surligne: boolean }`, `type Rubrique = { titre: string; suite: Segment[]; lignes: Segment[][] }`, `segments(ligne): Segment[]`, `intitule(ligne): { titre; suite } | null`, `rubriquesCoordination(texte): Rubrique[]`, `lignesAvancement(texte): Segment[][]`, `compteRenduVide(avancement, coordination): boolean`
  - `HEURE_VALIDE`, `texteRendezVous(date: string, heure: string, court?: boolean): string`
  - messages : `CR_VIDE`, `DERNIER_CR_SEUL`, `BROUILLON_DISPARU`, `CR_INTROUVABLE`, `HEURE_INVALIDE`, `HEURE_SANS_DATE`, `numeroPris(n)`, `LIMITES_CR`, `MESSAGES_LONGUEUR_CR`
- Produces, dans `src/domaine/reception.ts` :
  - `DECISIONS`, `type Decision = 'SANS_RESERVES' | 'AVEC_RESERVES' | 'DIFFEREE'`, `LIBELLES_DECISIONS`
  - `type ChampReception = 'decision' | 'dateEffet' | 'reserves' | 'delai' | 'motifs' | 'representant'`, `type ChampReceptionCommun = 'date' | 'signataire' | 'contrat' | 'maitreOeuvre'`
  - `controlerReception(p: { entreprise; decision; reserves; motifs }): string | null`
  - `type EtatReception`, `type CaseReceptionEtat = { etat: EtatReception; texte: string; alerte: boolean }`, `etatReception(dernier: { decision: Decision; date: string } | null, leveeLe: string | null): CaseReceptionEtat`
  - `controlerLevee(dernier, date: string): void`, `bilanReceptions(generes: number, inchanges: number): string`
  - `lignesReserves(texte): string[]`, `verifierReserves(texte): string`, `verifierTexteCourt(texte, champ): string`
  - messages : `AUCUN_LOT_RECEPTIONNABLE`, `SANS_ENTREPRISE`, `PAS_DE_RESERVES`, `LEVEE_AVANT`, `DATE_RECEPTION`, `MOTIFS_TROP_LONGS`, `LIMITES_PV` ; `TOUS_LES_LOTS = 'tous'`

Ces modules sont purs (ni base, ni Node) : l'aperçu du compte rendu et le gabarit du PV les appellent dans le navigateur.

- [ ] **Step 1: Écrire les tests du compte rendu**

Créer `src/domaine/compteRendu.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
	compteRenduVide, CONVOCATIONS, convocationSuivante, coordinationBase, intitule, lignesAvancement, numeroSuivant, numeroTexte,
	rubriquesCoordination, segments, texteRendezVous,
} from './compteRendu';

const simple = (texte: string) => [{ texte, surligne: false }];

describe('compte rendu : règles', () => {
	it('convocations : D → C → P → A → E → D, D par défaut', () => {
		expect(CONVOCATIONS).toEqual(['D', 'C', 'P', 'A', 'E']);
		expect(convocationSuivante(undefined)).toBe('C');
		expect(CONVOCATIONS.map((c) => convocationSuivante(c))).toEqual(['C', 'P', 'A', 'E', 'D']);
	});

	it("coordination de base : un intitulé par lot, puis le maître d'ouvrage", () => {
		expect(coordinationBase(['GROS ŒUVRE', '  ', 'Nouveau lot'])).toBe("GROS ŒUVRE :\n\nLOT :\n\nNouveau lot :\n\nMAÎTRE D'OUVRAGE :");
	});

	it('numéro suivant, affiché sur deux chiffres', () => {
		expect(numeroSuivant([])).toBe(1);
		expect(numeroSuivant([1, 4, 2])).toBe(5);
		expect([numeroTexte(4), numeroTexte(12)]).toEqual(['04', '12']);
	});

	it('**texte** est surligné', () => {
		expect(segments('GROS **reprise** du **mur**')).toEqual([
			{ texte: 'GROS ', surligne: false }, { texte: 'reprise', surligne: true },
			{ texte: ' du ', surligne: false }, { texte: 'mur', surligne: true },
		]);
		expect(segments('** seul')).toEqual(simple('** seul'));
		expect(segments('')).toEqual([]);
	});

	it('intitulés : majuscules, trois lettres au moins, terminés par « : »', () => {
		expect(intitule('GROS ŒUVRE :')).toEqual({ titre: 'GROS ŒUVRE', suite: '' });
		expect(intitule("MAÎTRE D'OUVRAGE : RAS")).toEqual({ titre: "MAÎTRE D'OUVRAGE", suite: 'RAS' });
		expect(intitule('PLOMBERIE — CHAUFFAGE — V.M.C. : **reprise** du mur'))
			.toEqual({ titre: 'PLOMBERIE — CHAUFFAGE — V.M.C.', suite: '**reprise** du mur' });
		expect(intitule('DU 12 : prévoir')).toBeNull();
		expect(intitule('Gros œuvre : rien')).toBeNull();
		expect(intitule('prévoir la dalle')).toBeNull();
	});

	it('coordination imprimée : rubriques, lignes vides ignorées, rubrique vide omise', () => {
		const texte = "GROS ŒUVRE :\n  prévoir la dalle  \n\nCHARPENTE :\n\nPEINTURE : **reprise** du mur\nMAÎTRE D'OUVRAGE :";
		expect(rubriquesCoordination(texte)).toEqual([
			{ titre: 'GROS ŒUVRE', suite: [], lignes: [simple('prévoir la dalle')] },
			{ titre: 'PEINTURE', suite: [{ texte: 'reprise', surligne: true }, { texte: ' du mur', surligne: false }], lignes: [] },
		]);
	});

	it('des lignes avant le premier intitulé forment une rubrique sans titre', () => {
		expect(rubriquesCoordination('Réunion sur place.\nGROS ŒUVRE :')).toEqual([{ titre: '', suite: [], lignes: [simple('Réunion sur place.')] }]);
	});

	it('texte collé depuis un traitement de texte : \\r\\n, tabulation, espace insécable', () => {
		expect(rubriquesCoordination('\tGROS ŒUVRE :\r\n\tprévoir la dalle\r\n\r\n')).toEqual([
			{ titre: 'GROS ŒUVRE', suite: [], lignes: [simple('prévoir la dalle')] },
		]);
	});

	it('avancement : une entrée par ligne, lignes vides gardées, surlignage compris', () => {
		expect(lignesAvancement('  Fondations **coulées**\n\nDallage  \n')).toEqual([
			[{ texte: 'Fondations ', surligne: false }, { texte: 'coulées', surligne: true }], [], simple('Dallage'),
		]);
		expect(lignesAvancement('   ')).toEqual([]);
	});

	it('compte rendu vide : ni avancement, ni rubrique imprimable', () => {
		expect(compteRenduVide('  ', "GROS ŒUVRE :\n\nMAÎTRE D'OUVRAGE :")).toBe(true);
		expect(compteRenduVide('Fondations', '')).toBe(false);
		expect(compteRenduVide('', 'GROS ŒUVRE : RAS')).toBe(false);
	});

	it('prochain rendez-vous', () => {
		expect(texteRendezVous('2026-10-13', '14:00')).toBe('mardi 13/10/2026 à 14h00');
		expect(texteRendezVous('2026-10-13', '')).toBe('mardi 13/10/2026');
		expect(texteRendezVous('2026-10-13', '14:00', true)).toBe('mardi 13/10 à 14h00');
		expect(texteRendezVous('', '14:00')).toBe('');
	});
});
```

- [ ] **Step 2: Écrire les tests de la réception**

Créer `src/domaine/reception.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
	bilanReceptions, controlerLevee, controlerReception, etatReception, LEVEE_AVANT, lignesReserves, PAS_DE_RESERVES, verifierReserves,
	type Decision,
} from './reception';

describe('réception : règles', () => {
	it('un PV avec réserves doit les dire ; un PV différé, ses motifs', () => {
		const base = { entreprise: 'CONSTRUCTIONS REBOURS', reserves: '', motifs: '' };
		expect(controlerReception({ ...base, decision: 'SANS_RESERVES' })).toBeNull();
		expect(controlerReception({ ...base, decision: 'AVEC_RESERVES', reserves: '  \n ' })).toBe('CONSTRUCTIONS REBOURS : précisez la nature des réserves.');
		expect(controlerReception({ ...base, decision: 'AVEC_RESERVES', reserves: 'Joints' })).toBeNull();
		expect(controlerReception({ ...base, decision: 'DIFFEREE' })).toBe('CONSTRUCTIONS REBOURS : précisez les motifs du report.');
		expect(controlerReception({ ...base, decision: 'DIFFEREE', motifs: 'Menuiseries non posées' })).toBeNull();
	});

	it('état de la case Réception : les cinq cas', () => {
		const pv = (decision: Decision) => ({ decision, date: '2026-10-12' });
		expect(etatReception(null, null)).toEqual({ etat: 'a-produire', texte: '+ Réception', alerte: false });
		expect(etatReception(pv('SANS_RESERVES'), null)).toEqual({ etat: 'sans-reserves', texte: 'Sans réserves · 12/10', alerte: false });
		expect(etatReception(pv('AVEC_RESERVES'), null)).toEqual({ etat: 'avec-reserves', texte: 'Avec réserves · 12/10', alerte: true });
		expect(etatReception(pv('AVEC_RESERVES'), '2026-11-20')).toEqual({ etat: 'levee', texte: 'Réserves levées le 20/11', alerte: false });
		expect(etatReception(pv('DIFFEREE'), null)).toEqual({ etat: 'differee', texte: 'Différée · 12/10', alerte: true });
		// Une réception différée n'a pas de levée : une date restée en base n'y change rien.
		expect(etatReception(pv('DIFFEREE'), '2026-11-20').etat).toBe('differee');
	});

	it('levée : seulement après un PV avec réserves, jamais avant sa date', () => {
		const avec = { decision: 'AVEC_RESERVES' as const, date: '2026-10-12' };
		expect(() => controlerLevee(null, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee({ ...avec, decision: 'SANS_RESERVES' }, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee({ ...avec, decision: 'DIFFEREE' }, '2026-10-20')).toThrow(PAS_DE_RESERVES);
		expect(() => controlerLevee(avec, '2026-10-11')).toThrow(LEVEE_AVANT);
		expect(() => controlerLevee(avec, '2026-10-12')).not.toThrow();
	});

	it("bilan d'une génération de plusieurs PV", () => {
		expect(bilanReceptions(10, 2)).toBe('10 PV générés, 2 inchangés.');
		expect(bilanReceptions(1, 1)).toBe('1 PV généré, 1 inchangé.');
		expect(bilanReceptions(12, 0)).toBe('12 PV générés.');
	});

	it('réserves : une par ligne, 2 000 caractères et 60 lignes au plus', () => {
		expect(lignesReserves('a\r\n\r\n  b  \nc')).toEqual(['a', 'b', 'c']);
		expect(verifierReserves('x\n'.repeat(60))).toBe('x\n'.repeat(60));
		expect(() => verifierReserves('x\n'.repeat(61))).toThrow('Les réserves sont limitées à 60 lignes.');
		expect(() => verifierReserves('x'.repeat(2001))).toThrow('Les réserves sont limitées à 2 000 caractères.');
	});
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- src/domaine/compteRendu.test.ts src/domaine/reception.test.ts`
Expected: FAIL — `./compteRendu` et `./reception` introuvables.

- [ ] **Step 4: Les règles du compte rendu**

Créer `src/domaine/compteRendu.ts` :

```ts
import { dateCourteSlash } from './certificats';

/*
 * Règles du compte rendu de chantier (spec § 5), pures : l'aperçu les appelle dans le navigateur,
 * le serveur à l'enregistrement.
 */

/** Lettres de convocation, dans l'ordre où un clic les fait tourner (maquette `CONVOCS`). */
export const CONVOCATIONS = ['D', 'C', 'P', 'A', 'E'] as const;
export type Convocation = (typeof CONVOCATIONS)[number];

export type ChampCompteRendu = 'date' | 'rdvDate' | 'rdvHeure' | 'avancement' | 'coordination' | 'redacteur' | 'portable';

export const CR_VIDE = "Saisissez l'avancement ou la coordination avant d'enregistrer.";
export const DERNIER_CR_SEUL = 'Seul le dernier compte rendu se corrige.';
export const BROUILLON_DISPARU = "Ce brouillon n'existe plus.";
export const CR_INTROUVABLE = 'Compte rendu introuvable.';
export const HEURE_INVALIDE = 'Heure : saisissez HH:MM.';
export const HEURE_SANS_DATE = "Saisissez d'abord la date du prochain rendez-vous.";
export const numeroPris = (n: number) => `Le compte rendu n° ${n} existe déjà.`;
export const LIMITES_CR = { avancement: 5000, coordination: 20000, court: 120 } as const;
export const MESSAGES_LONGUEUR_CR = {
	avancement: "L'avancement est limité à 5 000 caractères.",
	coordination: 'La coordination est limitée à 20 000 caractères.',
	court: '120 caractères au plus.',
} as const;
/** Même expression que la contrainte `CompteRendu_heure_valide` de la base. */
export const HEURE_VALIDE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function convocationSuivante(c: Convocation | undefined): Convocation {
	return CONVOCATIONS[(CONVOCATIONS.indexOf(c ?? 'D') + 1) % CONVOCATIONS.length];
}

/** Coordination d'un premier compte rendu : « DÉSIGNATION : » par lot, puis le maître d'ouvrage. */
export function coordinationBase(designations: string[]): string {
	return [...designations.map((d) => `${d.trim() || 'LOT'} :`), "MAÎTRE D'OUVRAGE :"].join('\n\n');
}

export function numeroSuivant(numeros: number[]): number {
	return numeros.length ? Math.max(...numeros) + 1 : 1;
}

export const numeroTexte = (n: number): string => String(n).padStart(2, '0');

export type Segment = { texte: string; surligne: boolean };
/** `titre` vide : lignes écrites avant le premier intitulé. */
export type Rubrique = { titre: string; suite: Segment[]; lignes: Segment[][] };

/** `**texte**` → surligné, comme les passages jaunes du document d'origine. */
export function segments(ligne: string): Segment[] {
	const r: Segment[] = [];
	let debut = 0;
	for (const m of ligne.matchAll(/\*\*(.+?)\*\*/g)) {
		const i = m.index ?? 0;
		if (i > debut) r.push({ texte: ligne.slice(debut, i), surligne: false });
		r.push({ texte: m[1], surligne: true });
		debut = i + m[0].length;
	}
	if (debut < ligne.length) r.push({ texte: ligne.slice(debut), surligne: false });
	return r;
}

const INTITULE = /^\s*([A-ZÀ-ÖØ-ÝŒÆ0-9][A-ZÀ-ÖØ-ÝŒÆ0-9 .,/'’\-–—()]*?)\s*:\s*(.*)$/;
const TROIS_MAJUSCULES = /[A-ZÀ-ÖØ-ÝŒÆ]{3}/;

/** Une ligne en MAJUSCULES (trois lettres au moins) terminée par « : » ouvre une rubrique (maquette `titreCo`). */
export function intitule(ligne: string): { titre: string; suite: string } | null {
	const m = INTITULE.exec(ligne);
	return m && TROIS_MAJUSCULES.test(m[1]) ? { titre: m[1], suite: m[2].trim() } : null;
}

/** Texte collé d'un traitement de texte : `\r\n`, tabulations et espaces insécables deviennent ordinaires. */
const lignesDe = (texte: string) => texte.replace(/[\t  ]/g, ' ').split(/\r?\n/);

/** La coordination imprimée : lignes vides ignorées, rubrique sans texte omise (maquette `crCoordination`). */
export function rubriquesCoordination(texte: string): Rubrique[] {
	const rubriques: Rubrique[] = [];
	let courante: Rubrique | null = null;
	for (const brute of lignesDe(texte)) {
		const ligne = brute.trimEnd();
		const t = intitule(ligne);
		if (t) {
			courante = { titre: t.titre, suite: segments(t.suite), lignes: [] };
			rubriques.push(courante);
		} else if (ligne.trim()) {
			if (!courante) {
				courante = { titre: '', suite: [], lignes: [] };
				rubriques.push(courante);
			}
			courante.lignes.push(segments(ligne.trim()));
		}
	}
	return rubriques.filter((r) => r.suite.length > 0 || r.lignes.length > 0);
}

/** L'avancement imprimé : une entrée par ligne, lignes vides comprises (la maquette l'imprime en pre-wrap). */
export function lignesAvancement(texte: string): Segment[][] {
	const t = texte.trim();
	return t ? lignesDe(t).map((l) => segments(l.trimEnd())) : [];
}

export function compteRenduVide(avancement: string, coordination: string): boolean {
	return !avancement.trim() && rubriquesCoordination(coordination).length === 0;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** « mardi 13/10/2026 à 14h00 » ; `court` : « mardi 13/10 à 14h00 » (carte de la page Documents) ; '' sans date. */
export function texteRendezVous(date: string, heure: string, court = false): string {
	const jour = dateCourteSlash(date);
	if (!jour) return '';
	const nom = JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()];
	return `${nom} ${court ? jour.slice(0, 5) : jour}${HEURE_VALIDE.test(heure) ? ` à ${heure.replace(':', 'h')}` : ''}`;
}
```

- [ ] **Step 5: Les règles de la réception**

Créer `src/domaine/reception.ts` :

```ts
import { dateCourteSlash } from './certificats';
import { ErreurMetier } from './erreurs';

/* Règles du procès-verbal de réception (spec § 6), pures. */

export const DECISIONS = ['SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE'] as const;
export type Decision = (typeof DECISIONS)[number];
export const LIBELLES_DECISIONS: Record<Decision, string> = {
	SANS_RESERVES: 'Sans réserves',
	AVEC_RESERVES: 'Avec réserves',
	DIFFEREE: 'Différée',
};

export type ChampReception = 'decision' | 'dateEffet' | 'reserves' | 'delai' | 'motifs' | 'representant';
export type ChampReceptionCommun = 'date' | 'signataire' | 'contrat' | 'maitreOeuvre';

export const AUCUN_LOT_RECEPTIONNABLE = "Attribuez d'abord une entreprise à un lot.";
export const SANS_ENTREPRISE = "Ce lot n'a pas d'entreprise.";
export const PAS_DE_RESERVES = "Le dernier PV de ce lot n'a pas de réserves.";
export const LEVEE_AVANT = 'La levée ne peut précéder la réception.';
export const DATE_RECEPTION = 'Date de réception : choisissez une date.';
export const MOTIFS_TROP_LONGS = 'Les motifs sont limités à 2 000 caractères.';
export const LIMITES_PV = { long: 2000, lignes: 60, court: 120 } as const;
/** Adresse `?pv=tous` : tous les lots qui ont une entreprise. Ici, et non dans `@/donnees`, parce que l'aperçu (client) s'en sert. */
export const TOUS_LES_LOTS = 'tous';

/** Un PV « avec réserves » qui n'en dit aucune, ou « différé » sans motif, ne dirait rien (maquette `enregistrerPv`). */
export function controlerReception(p: { entreprise: string; decision: Decision; reserves: string; motifs: string }): string | null {
	if (p.decision === 'AVEC_RESERVES' && !p.reserves.trim()) return `${p.entreprise} : précisez la nature des réserves.`;
	if (p.decision === 'DIFFEREE' && !p.motifs.trim()) return `${p.entreprise} : précisez les motifs du report.`;
	return null;
}

export type EtatReception = 'a-produire' | 'sans-reserves' | 'avec-reserves' | 'levee' | 'differee';
export type CaseReceptionEtat = { etat: EtatReception; texte: string; alerte: boolean };

/** La case Réception de la page Documents (spec § 7) : l'orangé (`alerte`) demande un suivi. */
export function etatReception(dernier: { decision: Decision; date: string } | null, leveeLe: string | null): CaseReceptionEtat {
	if (!dernier) return { etat: 'a-produire', texte: '+ Réception', alerte: false };
	const jour = dateCourteSlash(dernier.date).slice(0, 5);
	switch (dernier.decision) {
		case 'SANS_RESERVES':
			return { etat: 'sans-reserves', texte: `Sans réserves · ${jour}`, alerte: false };
		case 'DIFFEREE':
			return { etat: 'differee', texte: `Différée · ${jour}`, alerte: true };
		case 'AVEC_RESERVES':
			return leveeLe
				? { etat: 'levee', texte: `Réserves levées le ${dateCourteSlash(leveeLe).slice(0, 5)}`, alerte: false }
				: { etat: 'avec-reserves', texte: `Avec réserves · ${jour}`, alerte: true };
	}
}

/** Dates au format AAAA-MM-JJ : la comparaison de textes suit l'ordre des jours. */
export function controlerLevee(dernier: { decision: Decision; date: string } | null, date: string): void {
	if (!dernier || dernier.decision !== 'AVEC_RESERVES') throw new ErreurMetier(PAS_DE_RESERVES);
	if (date < dernier.date) throw new ErreurMetier(LEVEE_AVANT, 'date');
}

export function bilanReceptions(generes: number, inchanges: number): string {
	const g = `${generes} PV généré${generes > 1 ? 's' : ''}`;
	return inchanges ? `${g}, ${inchanges} inchangé${inchanges > 1 ? 's' : ''}.` : `${g}.`;
}

/** Les réserves imprimées : une par ligne, lignes vides omises. */
export function lignesReserves(texte: string): string[] {
	return texte.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** 2 000 caractères et 60 lignes : au-delà, le PV ne tiendrait plus sur une page lisible. */
export function verifierReserves(texte: string): string {
	if (texte.length > LIMITES_PV.long) throw new ErreurMetier('Les réserves sont limitées à 2 000 caractères.', 'reserves');
	if (lignesReserves(texte).length > LIMITES_PV.lignes) throw new ErreurMetier('Les réserves sont limitées à 60 lignes.', 'reserves');
	return texte;
}

export function verifierTexteCourt(texte: string, champ: string): string {
	const t = texte.trim();
	if (t.length > LIMITES_PV.court) throw new ErreurMetier('120 caractères au plus.', champ);
	return t;
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npm test -- src/domaine/compteRendu.test.ts src/domaine/reception.test.ts && npx tsc --noEmit`
Expected: PASS ; aucune erreur.

- [ ] **Step 7: Commit**

```bash
git add src/domaine/compteRendu.ts src/domaine/reception.ts src/domaine/compteRendu.test.ts src/domaine/reception.test.ts
git commit -m "feat(domaine): règles du compte rendu de chantier et du procès-verbal de réception"
```

---

### Task 2: Tables CompteRendu et Reception, migration, séries, site web, portable

**Files:**
- Modify: `prisma/schema.prisma`, `src/documents/libelles.ts`, `src/documents/series.ts`, `src/donnees/parametres.ts`, `src/actions/parametres.ts`, `src/app/(app)/parametres/page.tsx`, `src/donnees/comptes.ts`, `src/actions/comptes.ts`, `src/composants/GestionComptes.tsx`, `tests/integration/aide.ts`
- Create: `prisma/migrations/20261003000000_suivi_chantier/migration.sql`
- Test: `src/donnees/migrationSuiviChantier.int.test.ts`, `src/donnees/parametresSuivi.int.test.ts`, `src/donnees/portable.int.test.ts`

**Interfaces:**
- Consumes: le schéma et les migrations des sous-projets 1 à 3 ; `SERIES`, `serieAvenant`, `serieCertificat` (`series.ts`) ; `ChampEnLigne` (Socle).
- Produces:
  - modèles Prisma `CompteRendu { id, chantierId, statut: StatutCompteRendu, numero, date @db.Date, rdvDate?, rdvHeure?, avancement, coordination, redacteur, portable, convocations Json, creeLe }` avec `@@unique([chantierId, numero])`, et `Reception { id, lotId @unique, decision: DecisionReception, dateEffet?, reserves, delai, motifs, representant, reservesLeveesLe? }`
  - `Chantier.receptionDate?`, `.receptionSignataire`, `.contratMoeDate?`, `.receptionMaitreOeuvre`, relation `Chantier.comptesRendus` ; `Lot.reception?` ; `Parametres.siteWeb: string | null`
  - `TypeDocument` + `'COMPTE_RENDU' | 'PV_RECEPTION'` ; `LIBELLES_TYPES`, `TITRES_TYPES` complétés
  - `serieCompteRendu(compteRenduId: string): string` (`CR:<id>`), `serieReception(lotId: string): string` (`RECEPTION:<lotId>`)
  - `ChampParametres` + `'siteWeb'` ; `CompteListe.telephone: string` ; `modifierTelephone(utilisateurId: string, valeur: string): Promise<void>` ; `modifierTelephoneAction(utilisateurId: string, valeur: string): Promise<Resultat>`

- [ ] **Step 1: Écrire les tests**

Créer `src/donnees/migrationSuiviChantier.int.test.ts` (même méthode que `migrationFinanciere.int.test.ts` : un schéma à part, les migrations précédentes, des données, puis la nouvelle migration) :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const SUIVI = '20261003000000_suivi_chantier';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du suivi de chantier', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	const compteRendu = (id: string, colonnes: string, valeurs: string) =>
		client.query(`INSERT INTO "CompteRendu" (id, "chantierId", ${colonnes}) VALUES ('${id}', 'c', ${valeurs})`);

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_suivi CASCADE; CREATE SCHEMA essai_suivi; SET search_path TO essai_suivi;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < SUIVI).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "utilisateur" (id, name, email, "updatedAt") VALUES ('u', 'U', 'u@test.local', now())`);
		await client.query(`INSERT INTO "Chantier" (id, reference, "maitreOuvrage", "chargeAffaireId", "creeParId") VALUES ('c', 'R', 'M', 'u', 'u')`);
		await client.query(`INSERT INTO "Lot" (id, "chantierId", ordre, designation) VALUES ('l', 'c', 1, 'PEINTURE'), ('l2', 'c', 2, 'CARRELAGE')`);
		await client.query(`INSERT INTO "Parametres" (id, "raisonSociale", "libelleActivite", adresse, cp, ville, telephone, email, "villeSignature")
			VALUES (1, 'S.A.S SOCOREVE', 'Activité', '71 rue du Général Patton', '44110', 'Châteaubriant', '02 40 81 40 26', 'contact@socoreve-chateaubriant.com', 'Châteaubriant')`);
		await client.query(sql(SUIVI));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_suivi CASCADE');
		await client.end();
	});

	it('les paramètres existants reçoivent le site web ; les chantiers, des champs de réception vides', async () => {
		expect((await client.query('SELECT "siteWeb" FROM "Parametres"')).rows).toEqual([{ siteWeb: 'socoreve-chateaubriant.com' }]);
		const { rows } = await client.query('SELECT "receptionDate", "receptionSignataire", "contratMoeDate", "receptionMaitreOeuvre" FROM "Chantier"');
		expect(rows).toEqual([{ receptionDate: null, receptionSignataire: '', contratMoeDate: null, receptionMaitreOeuvre: '' }]);
	});

	it('compte rendu : brouillon par défaut, numéro de 1 à 999, unique dans le chantier', async () => {
		await compteRendu('r1', 'numero, date', `1, '2026-10-06'`);
		const { rows } = await client.query(`SELECT statut, convocations FROM "CompteRendu" WHERE id = 'r1'`);
		expect(rows).toEqual([{ statut: 'BROUILLON', convocations: {} }]);
		await expect(compteRendu('r2', 'numero, date, statut', `1, '2026-10-06', 'ENREGISTRE'`)).rejects.toThrow(/CompteRendu_chantierId_numero_key/);
		await expect(compteRendu('r3', 'numero, date', `0, '2026-10-06'`)).rejects.toThrow(/CompteRendu_numero_borne/);
		await expect(compteRendu('r4', 'numero, date', `1000, '2026-10-06'`)).rejects.toThrow(/CompteRendu_numero_borne/);
	});

	it('compte rendu : heure au format HH:MM, jamais sans date', async () => {
		await compteRendu('h1', 'numero, date, "rdvDate", "rdvHeure"', `2, '2026-10-06', '2026-10-13', '14:00'`);
		await expect(compteRendu('h2', 'numero, date, "rdvDate", "rdvHeure"', `3, '2026-10-06', '2026-10-13', '25:00'`)).rejects.toThrow(/CompteRendu_heure_valide/);
		await expect(compteRendu('h3', 'numero, date, "rdvHeure"', `4, '2026-10-06', '14:00'`)).rejects.toThrow(/CompteRendu_heure_avec_date/);
	});

	it('réception : une par lot, sans réserves par défaut, emportée avec le lot', async () => {
		await client.query(`INSERT INTO "Reception" (id, "lotId") VALUES ('p1', 'l2')`);
		expect((await client.query(`SELECT decision FROM "Reception"`)).rows).toEqual([{ decision: 'SANS_RESERVES' }]);
		await expect(client.query(`INSERT INTO "Reception" (id, "lotId") VALUES ('p2', 'l2')`)).rejects.toThrow(/Reception_lotId_key/);
		await client.query(`DELETE FROM "Lot" WHERE id = 'l2'`);
		expect((await client.query('SELECT count(*)::int AS n FROM "Reception"')).rows).toEqual([{ n: 0 }]);
	});

	it('les deux nouveaux types de document', async () => {
		const inserer = 'INSERT INTO "Document" (id, "chantierId", "lotId", serie, type, version, donnees, empreinte, pdf, "nomFichier", "creeParId") VALUES ($1, \'c\', $2, $3, $4, 1, \'{}\', \'e\', $5, \'f.pdf\', \'u\')';
		await client.query(inserer, ['d1', null, 'CR:r1', 'COMPTE_RENDU', Buffer.from([1])]);
		await client.query(inserer, ['d2', 'l', 'RECEPTION:l', 'PV_RECEPTION', Buffer.from([1])]);
		expect((await client.query('SELECT count(*)::int AS n FROM "Document"')).rows).toEqual([{ n: 2 }]);
	});
});
```

Créer `src/donnees/parametresSuivi.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { creerParametresTest, viderBase } from '../../tests/integration/aide';
import { lireParametres, modifierParametre } from './parametres';

describe('site web des paramètres', () => {
	beforeEach(async () => {
		await viderBase();
		await creerParametresTest();
	});

	it('rempli par défaut, facultatif : vidé, il devient nul', async () => {
		expect((await lireParametres()).siteWeb).toBe('socoreve-chateaubriant.com');
		await modifierParametre('siteWeb', '  ');
		expect((await lireParametres()).siteWeb).toBeNull();
		await modifierParametre('siteWeb', 'www.socoreve.fr');
		expect((await lireParametres()).siteWeb).toBe('www.socoreve.fr');
	});
});
```

Créer `src/donnees/portable.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { listerComptes, modifierTelephone } from './comptes';
import { prisma } from './prisma';

describe('portable des comptes', () => {
	beforeEach(async () => {
		await viderBase();
	});

	it("l'admin saisit le portable ; vidé, il redevient nul ; 120 caractères au plus", async () => {
		const u = await creerUtilisateurTest();
		await modifierTelephone(u.id, ' 06 12 34 56 78 ');
		expect((await listerComptes()).find((c) => c.id === u.id)?.telephone).toBe('06 12 34 56 78');
		await modifierTelephone(u.id, '  ');
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id: u.id } })).telephone).toBeNull();
		await expect(modifierTelephone(u.id, 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/donnees/migrationSuiviChantier.int.test.ts src/donnees/parametresSuivi.int.test.ts src/donnees/portable.int.test.ts`
Expected: FAIL — `20261003000000_suivi_chantier/migration.sql` introuvable ; `siteWeb` et `modifierTelephone` inconnus.

- [ ] **Step 3: Le schéma**

Dans `prisma/schema.prisma` :

1. Compléter `enum TypeDocument` (après `CERTIFICAT_PAIEMENT`) :

```prisma
  COMPTE_RENDU
  PV_RECEPTION
```

2. Après `enum TypeDocument`, ajouter :

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
```

3. Dans `model Parametres`, après `tvaIntracommunautaire` :

```prisma
  /// Imprimé sur les comptes rendus ; facultatif comme l'e-mail.
  siteWeb               String? @default("socoreve-chateaubriant.com")
```

4. Dans `model Chantier`, après `fermetures` :

```prisma
  /// Champs communs à tous les PV de réception du chantier (spec § 6).
  receptionDate         DateTime?     @db.Date
  receptionSignataire   String        @default("")
  contratMoeDate        DateTime?     @db.Date
  receptionMaitreOeuvre String        @default("")
  comptesRendus         CompteRendu[]
```

5. Dans `model Lot`, après `acomptes` :

```prisma
  reception            Reception?
```

6. À la fin du fichier :

```prisma
/// Brouillon compris : au plus un brouillon par chantier, qui prend toujours le numéro suivant ;
/// l'unicité du numéro garantit donc aussi un seul brouillon (spec § 4, écart du plan).
model CompteRendu {
  id           String            @id @default(cuid())
  chantierId   String
  chantier     Chantier          @relation(fields: [chantierId], references: [id], onDelete: Cascade)
  statut       StatutCompteRendu @default(BROUILLON)
  numero       Int
  date         DateTime          @db.Date
  rdvDate      DateTime?         @db.Date
  /// 'HH:MM'
  rdvHeure     String?
  avancement   String            @default("")
  coordination String            @default("")
  redacteur    String            @default("")
  portable     String            @default("")
  /// { [lotId]: 'D' | 'C' | 'P' | 'A' | 'E' }
  convocations Json              @default("{}")
  creeLe       DateTime          @default(now())

  @@unique([chantierId, numero])
}

/// Brouillon du PV d'un lot ; les PV émis sont figés dans Document (série RECEPTION:<lotId>).
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

- [ ] **Step 4: La migration, écrite à la main**

Créer `prisma/migrations/20261003000000_suivi_chantier/migration.sql` :

```sql
-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'COMPTE_RENDU';
ALTER TYPE "TypeDocument" ADD VALUE 'PV_RECEPTION';

-- CreateEnum
CREATE TYPE "StatutCompteRendu" AS ENUM ('BROUILLON', 'ENREGISTRE');

-- CreateEnum
CREATE TYPE "DecisionReception" AS ENUM ('SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE');

-- AlterTable : la ligne existante reçoit la valeur par défaut, l'adresse du site imprimée par la maquette.
ALTER TABLE "Parametres" ADD COLUMN "siteWeb" TEXT DEFAULT 'socoreve-chateaubriant.com';

-- AlterTable
ALTER TABLE "Chantier" ADD COLUMN "receptionDate" DATE,
ADD COLUMN "receptionSignataire" TEXT NOT NULL DEFAULT '',
ADD COLUMN "contratMoeDate" DATE,
ADD COLUMN "receptionMaitreOeuvre" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "CompteRendu" (
    "id" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "statut" "StatutCompteRendu" NOT NULL DEFAULT 'BROUILLON',
    "numero" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "rdvDate" DATE,
    "rdvHeure" TEXT,
    "avancement" TEXT NOT NULL DEFAULT '',
    "coordination" TEXT NOT NULL DEFAULT '',
    "redacteur" TEXT NOT NULL DEFAULT '',
    "portable" TEXT NOT NULL DEFAULT '',
    "convocations" JSONB NOT NULL DEFAULT '{}',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompteRendu_pkey" PRIMARY KEY ("id"),
    -- Écrites à la main : Prisma ne connaît pas les CHECK.
    CONSTRAINT "CompteRendu_numero_borne" CHECK ("numero" BETWEEN 1 AND 999),
    -- Même expression que HEURE_VALIDE (src/domaine/compteRendu.ts).
    CONSTRAINT "CompteRendu_heure_valide" CHECK ("rdvHeure" IS NULL OR "rdvHeure" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    CONSTRAINT "CompteRendu_heure_avec_date" CHECK ("rdvHeure" IS NULL OR "rdvDate" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "Reception" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "decision" "DecisionReception" NOT NULL DEFAULT 'SANS_RESERVES',
    "dateEffet" DATE,
    "reserves" TEXT NOT NULL DEFAULT '',
    "delai" TEXT NOT NULL DEFAULT '',
    "motifs" TEXT NOT NULL DEFAULT '',
    "representant" TEXT NOT NULL DEFAULT '',
    "reservesLeveesLe" DATE,

    CONSTRAINT "Reception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompteRendu_chantierId_numero_key" ON "CompteRendu"("chantierId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Reception_lotId_key" ON "Reception"("lotId");

-- AddForeignKey
ALTER TABLE "CompteRendu" ADD CONSTRAINT "CompteRendu_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reception" ADD CONSTRAINT "Reception_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Pour comparer au squelette de Prisma (noms d'index et de contraintes), avant d'appliquer la migration :

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: le même SQL, sans les `CHECK` ni les commentaires. Si Prisma nomme un index ou une contrainte autrement, reprendre son nom.

- [ ] **Step 5: Vérifier la migration sur la base de test, puis l'appliquer en développement**

Run: `DATABASE_URL="$(grep '^DATABASE_URL_TEST=' .env | cut -d= -f2- | tr -d '"')" sh -c 'node scripts/reinitialiser-base-test.mjs && npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code; echo "code $?"'`
Expected: les quatre migrations appliquées, puis `code 0`. Un `code 2` signale un écart : corriger le SQL et relancer.

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `20261003000000_suivi_chantier` appliquée en développement ; client régénéré.

- [ ] **Step 6: Types, séries, site web, portable**

Dans `src/documents/libelles.ts`, compléter le type et les deux tables :

```ts
export type TypeDocument =
	| 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' | 'RECAPITULATIF' | 'PLANNING' | 'VISA_PLANNING'
	| 'AVENANT' | 'CERTIFICAT_PAIEMENT' | 'COMPTE_RENDU' | 'PV_RECEPTION';
```

```ts
	COMPTE_RENDU: 'Compte rendu',
	PV_RECEPTION: 'PV de réception',
```

(dans `LIBELLES_TYPES`), et dans `TITRES_TYPES` :

```ts
	COMPTE_RENDU: 'Compte rendu de chantier',
	PV_RECEPTION: 'Procès-verbal de réception',
```

Dans `src/documents/series.ts`, ajouter :

```ts
/** Un compte rendu : la correction du dernier ajoute une version à sa série. */
export const serieCompteRendu = (compteRenduId: string): string => `CR:${compteRenduId}`;
/** Les PV d'un lot : chaque PV émis en est une version ; la dernière fait foi. */
export const serieReception = (lotId: string): string => `RECEPTION:${lotId}`;
```

Dans `src/donnees/parametres.ts` :
1. dans `PARAMETRES_PAR_DEFAUT`, après `tvaIntracommunautaire` : `siteWeb: 'socoreve-chateaubriant.com',` ;
2. `ChampParametres` : ajouter `| 'siteWeb'` à la dernière ligne ;
3. `const FACULTATIFS: ChampParametres[] = ['fax', 'email', 'siteWeb'];`.

Dans `src/actions/parametres.ts`, ajouter `'siteWeb'` à la fin de `CHAMPS`.

Dans `src/app/(app)/parametres/page.tsx`, remplacer l'entrée `email` de `CHAMPS` et ajouter `siteWeb` après `tvaIntracommunautaire` :

```tsx
	{ champ: 'email', libelle: 'E-mail', aide: 'Imprimé sur les certificats, les comptes rendus et les PV de réception, pas sur les marchés.' },
```

```tsx
	{ champ: 'siteWeb', libelle: 'Site web', aide: 'Imprimé sur les comptes rendus.' },
```

et la phrase d'introduction par :

```tsx
				<p className="text-sm text-muted-foreground">En-tête imprimé sur les marchés, le récapitulatif, les certificats de paiement, les comptes rendus et les PV de réception. Chaque champ s&apos;enregistre quand on le quitte.</p>
```

Dans `src/donnees/comptes.ts` :
1. dans `CompteListe`, après `email: string;` : `/** Portable, imprimé sur les comptes rendus du chargé d'affaire ; '' s'il n'est pas saisi. */ telephone: string;` ;
2. dans `listerComptes`, après `email: u.email,` : `telephone: u.telephone ?? '',` ;
3. à la fin du fichier :

```ts
export async function modifierTelephone(utilisateurId: string, valeur: string): Promise<void> {
	const t = valeur.trim();
	if (t.length > 120) throw new ErreurMetier('120 caractères au plus.', 'telephone');
	await prisma.utilisateur.update({ where: { id: utilisateurId }, data: { telephone: t || null } });
}
```

Dans `src/actions/comptes.ts`, ajouter `modifierTelephone` à l'import de `@/donnees/comptes` et :

```ts
export async function modifierTelephoneAction(utilisateurId: string, valeur: string): Promise<Resultat> {
	return executer({ admin: true }, async () => {
		await modifierTelephone(z.string().parse(utilisateurId), z.string().max(200).parse(valeur));
		revalidatePath('/admin/comptes');
		return null;
	});
}
```

Dans `src/composants/GestionComptes.tsx` :
1. importer `modifierTelephoneAction` (avec les autres actions de `@/actions/comptes`) et `import { ChampEnLigne } from './ChampEnLigne';` ;
2. dans l'en-tête du tableau, après `<th className="p-3">E-mail</th>` : `<th className="p-3">Portable</th>` ;
3. dans chaque ligne, après `<td className="p-3">{c.email}</td>` :

```tsx
							<td className="p-3">
								<ChampEnLigne libelle={`Portable de ${c.nom}`} type="tel" placeholder="06 …" valeur={c.telephone}
									enregistrer={modifierTelephoneAction.bind(null, c.id)} />
							</td>
```

Dans `tests/integration/aide.ts`, ajouter les deux tables au `TRUNCATE` :

```ts
		'TRUNCATE "CompteRendu", "Reception", "Avenant", "Acompte", "Periode", "Fermeture", "Document", "Lot", "Chantier", "Artisan", "Parametres", "session", "compte", "verification", "utilisateur" RESTART IDENTITY CASCADE',
```

- [ ] **Step 7: Vérifier le succès**

Run: `npx tsc --noEmit && npm run test:int -- src/donnees/migrationSuiviChantier.int.test.ts src/donnees/parametresSuivi.int.test.ts src/donnees/portable.int.test.ts src/donnees/migrationFinanciere.int.test.ts src/donnees/parametres.int.test.ts src/donnees/seed.int.test.ts src/donnees/comptes.int.test.ts`
Expected: aucune erreur de type (les `Record<TypeDocument, string>` sont complets) ; PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261003000000_suivi_chantier src/documents/libelles.ts src/documents/series.ts src/donnees/parametres.ts src/actions/parametres.ts src/app/\(app\)/parametres/page.tsx src/donnees/comptes.ts src/actions/comptes.ts src/composants/GestionComptes.tsx tests/integration/aide.ts src/donnees/migrationSuiviChantier.int.test.ts src/donnees/parametresSuivi.int.test.ts src/donnees/portable.int.test.ts
git commit -m "feat(suivi): tables CompteRendu et Reception, séries, site web des paramètres, portable des comptes"
```

---

### Task 3: Feuille du compte rendu (objet pur, gabarit, plusieurs pages)

**Files:**
- Create: `src/documents/coordonnees.ts`, `src/documents/compteRendu.ts`, `src/documents/gabarits/CompteRendu.tsx`, `tests/fixtures/compteRendu.ts`
- Modify: `src/documents/schemas.ts`, `src/documents/gabarits/Gabarit.tsx`, `src/documents/styles.ts`
- Test: `src/documents/compteRendu.test.ts`, `src/documents/pdfCompteRendu.int.test.ts`

**Interfaces:**
- Consumes: `CONVOCATIONS`, `type Convocation`, `type ChampCompteRendu`, `type Segment`, `lignesAvancement`, `rubriquesCoordination`, `texteRendezVous`, `numeroTexte` (Task 1) ; `dateCourteSlash` (Suivi financier) ; `LOGO_SOCOREVE`, `imprimerPortrait` (Suivi financier) ; `type ModeGabarit` (Socle) ; `empreinteDocument`, `rendreHtml`, `fermerNavigateur` (Socle).
- Produces:
  - `lignesSocieteSchema`, `type LignesSociete = { lignes: string[] }`, `contenuCompteRenduSchema`, `type ContenuCompteRendu`, `type DonneesCompteRendu` (`{ type: 'COMPTE_RENDU'; contenu; societe: LignesSociete }`)
  - `src/documents/coordonnees.ts` (pur) : `type SourceCoordonnees = { adresse; cp; ville; telephone; email: string | null; siteWeb: string | null }`, `societeCompteRendu(p): LignesSociete`, `societeReception(p): LignesSociete`
  - `src/documents/compteRendu.ts` (pur) : `type SourceCompteRendu = { numero: number; chantier: { maitreOuvrage; natureTravaux; adresse; cp; commune }; lots: { id; designation; entreprise: string | null; interlocuteur; telephone }[]; societe: SourceCoordonnees }`, `type SaisiesCompteRendu = { date; rdvDate; rdvHeure; avancement; coordination; redacteur; portable; convocations: Record<string, Convocation> }`, `batirCompteRendu(s, saisies): DonneesCompteRendu`
  - `CompteRendu({ donnees, mode, edition? })`, `type EditionCompteRendu = { saisies: SaisiesCompteRendu; generation: number; surChamp(champ: ChampCompteRendu, valeur: string): void; surConvocation(lotId: string): void }`
  - `tests/fixtures/compteRendu.ts` : `COORDONNEES_SOCOREVE`, `CR_SOURCE`, `CR_SAISIES`

- [ ] **Step 1: La fixture et les tests**

Créer `tests/fixtures/compteRendu.ts` :

```ts
import type { SaisiesCompteRendu, SourceCompteRendu } from '@/documents/compteRendu';
import type { SourceCoordonnees } from '@/documents/coordonnees';

export const COORDONNEES_SOCOREVE: SourceCoordonnees = {
	adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26',
	email: 'contact@socoreve-chateaubriant.com', siteWeb: 'socoreve-chateaubriant.com',
};

/** Deux lots de PERRIER : l'un attribué, l'autre pas. */
export const CR_SOURCE: SourceCompteRendu = {
	numero: 4,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lots: [
		{ id: 'l2', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38' },
		{ id: 'l12', designation: 'ENDUIT EXTÉRIEUR', entreprise: null, interlocuteur: '', telephone: '' },
	],
	societe: COORDONNEES_SOCOREVE,
};

export const CR_SAISIES: SaisiesCompteRendu = {
	date: '2026-10-06', rdvDate: '2026-10-13', rdvHeure: '14:00',
	avancement: 'Fondations **coulées**',
	coordination: 'GROS ŒUVRE : **reprise** du mur\n\nENDUIT EXTÉRIEUR :',
	redacteur: 'Augustin Jouan', portable: '06 12 34 56 78', convocations: { l2: 'C' },
};
```

Créer `src/documents/compteRendu.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COORDONNEES_SOCOREVE, CR_SAISIES, CR_SOURCE } from '../../tests/fixtures/compteRendu';
import { empreinteDocument } from './batir';
import { batirCompteRendu } from './compteRendu';
import { societeCompteRendu } from './coordonnees';
import { CompteRendu } from './gabarits/CompteRendu';
import { Gabarit } from './gabarits/Gabarit';
import { donneesDocumentSchema } from './schemas';

describe('feuille du compte rendu', () => {
	const d = batirCompteRendu(CR_SOURCE, CR_SAISIES);

	it('tout vient du chantier, des lots et des saisies', () => {
		expect(d).toEqual({
			type: 'COMPTE_RENDU',
			contenu: {
				numero: '04',
				redacteur: 'Augustin Jouan',
				portable: '06 12 34 56 78',
				referenceChantier: "CONSTRUCTION D'UNE MAISON INDIVIDUELLE — 142 m² + GARAGE",
				adresseChantier: 'Le Haut Bois – 44110 – LOUISFERT',
				maitreOuvrage: 'M. et Mme PERRIER',
				date: '06/10/2026',
				prochainRdv: 'mardi 13/10/2026 à 14h00',
				lots: [
					{ lotId: 'l2', lot: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38', convocation: 'C' },
					{ lotId: 'l12', lot: 'ENDUIT EXTÉRIEUR', entreprise: '—', interlocuteur: '—', telephone: '—', convocation: 'D' },
				],
				avancement: [[{ texte: 'Fondations ', surligne: false }, { texte: 'coulées', surligne: true }]],
				coordination: [{ titre: 'GROS ŒUVRE', suite: [{ texte: 'reprise', surligne: true }, { texte: ' du mur', surligne: false }], lignes: [] }],
			},
			societe: {
				lignes: ['71 rue du Général Patton', '44110 Châteaubriant', 'Tél. 02 40 81 40 26', '', 'Email : contact@socoreve-chateaubriant.com', 'Site : socoreve-chateaubriant.com'],
			},
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it("sans rendez-vous ni portable : rien d'imprimé à leur place", () => {
		const c = batirCompteRendu(CR_SOURCE, { ...CR_SAISIES, rdvDate: '', rdvHeure: '', portable: '  ' }).contenu;
		expect([c.prochainRdv, c.portable]).toEqual(['', '']);
	});

	it("l'en-tête SOCOREVE n'entre pas dans l'empreinte ; sans e-mail ni site, pas de ligne vide", () => {
		const autre = batirCompteRendu({ ...CR_SOURCE, societe: { ...COORDONNEES_SOCOREVE, email: 'compta@exemple.fr' } }, CR_SAISIES);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
		expect(societeCompteRendu({ ...COORDONNEES_SOCOREVE, email: null, siteWeb: '  ' }).lignes)
			.toEqual(['71 rue du Général Patton', '44110 Châteaubriant', 'Tél. 02 40 81 40 26']);
	});

	it('modules purs : ni base, ni Node, ni batir.ts (ils tournent dans le navigateur)', () => {
		for (const f of ['src/documents/compteRendu.ts', 'src/documents/coordonnees.ts']) {
			expect(readFileSync(f, 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
		}
	});
});

describe('gabarit du compte rendu', () => {
	it('impression : logo, en-tête, légende, convocation C en rouge, surlignage, aucune saisie', () => {
		const html = renderToStaticMarkup(createElement(Gabarit, { donnees: batirCompteRendu(CR_SOURCE, CR_SAISIES), mode: 'impression' }));
		expect(html).toContain('src="data:image/jpeg;base64,');
		expect(html).toContain('COMPTE<br/>RENDU DE<br/>CHANTIER');
		expect(html).toContain('Suivi des travaux effectué par Augustin Jouan — Portable : 06 12 34 56 78');
		expect(html).toContain('<b>PROCHAIN RDV :</b> mardi 13/10/2026 à 14h00');
		expect(html).toContain('Légende : P = Présent / A = Absent / E = Excusé / <span class="cr-rouge">C = Convoqué au prochain RDV</span> / D = Diffusion');
		expect(html).toContain('<td class="cr-c">C</td>');
		expect(html).toContain('<mark>reprise</mark>');
		expect(html).toContain('SALUTATIONS');
		expect(html).not.toContain('ENDUIT EXTÉRIEUR :');
		expect(html).not.toMatch(/<(input|textarea|button)/);
	});

	it('édition : les champs se saisissent sur la feuille, la lettre de convocation est un bouton', () => {
		const rien = () => undefined;
		const html = renderToStaticMarkup(createElement(CompteRendu, {
			donnees: batirCompteRendu(CR_SOURCE, CR_SAISIES),
			mode: 'edition',
			edition: { saisies: CR_SAISIES, generation: 0, surChamp: rien, surConvocation: rien },
		}));
		for (const libelle of ['Rédacteur', 'Portable', 'Date du compte rendu', 'Date du prochain rendez-vous', 'Heure du prochain rendez-vous', 'Avancement', 'Coordination', 'Convocation GROS ŒUVRE : C']) {
			expect(html).toContain(`aria-label="${libelle}"`);
		}
		// À l'écran, on relit ce qu'on a tapé : les ** restent visibles.
		expect(html).toContain('**reprise**');
	});
});
```

Créer `src/documents/pdfCompteRendu.int.test.ts` :

```ts
import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { CR_SAISIES, CR_SOURCE } from '../../tests/fixtures/compteRendu';
import { batirCompteRendu } from './compteRendu';
import { imprimerPortrait } from './generer';
import { fermerNavigateur } from './pdf';
import { rendreHtml } from './rendu';

async function pages(coordination: string) {
	const pdf = await PDFDocument.load(await imprimerPortrait(await rendreHtml(batirCompteRendu(CR_SOURCE, { ...CR_SAISIES, coordination }))));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), portrait: height > width, largeur: Math.round(width) };
}

describe('impression du compte rendu', () => {
	afterAll(fermerNavigateur);

	it('court : une page A4 portrait', async () => {
		expect(await pages(CR_SAISIES.coordination)).toEqual({ nombre: 1, portrait: true, largeur: 595 });
	});

	it('300 lignes de coordination : plusieurs pages A4 portrait, rien de rogné', async () => {
		const longue = ['GROS ŒUVRE :', ...Array.from({ length: 300 }, (_, i) => `Point ${i + 1} : vérifier les réservations du niveau.`)].join('\n');
		const p = await pages(longue);
		expect(p.nombre).toBeGreaterThan(1);
		expect([p.portrait, p.largeur]).toEqual([true, 595]);
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/documents/compteRendu.test.ts`
Expected: FAIL — `./compteRendu`, `./coordonnees` et `./gabarits/CompteRendu` introuvables.

- [ ] **Step 3: Le schéma**

Dans `src/documents/schemas.ts`, ajouter l'import `import { CONVOCATIONS } from '@/domaine/compteRendu';` puis, après `societeSchema` (certificat) :

```ts
const segmentsSchema = z.array(z.object({ texte, surligne: z.boolean() }));

/** En-tête SOCOREVE du compte rendu et du PV : ses lignes, figées avec le document, exclues de l'empreinte. */
export const lignesSocieteSchema = z.object({ lignes: z.array(texte) });

export const contenuCompteRenduSchema = z.object({
	/** « 04 ». */
	numero: texte,
	redacteur: texte,
	/** '' : la mention « Portable » ne s'imprime pas. */
	portable: texte,
	/** Nature des travaux en majuscules, « m² » gardé. */
	referenceChantier: texte,
	adresseChantier: texte,
	maitreOuvrage: texte,
	/** « 06/10/2026 ». */
	date: texte,
	/** « mardi 13/10/2026 à 14h00 » ; '' sans rendez-vous. */
	prochainRdv: texte,
	/** Tous les lots, dans l'ordre de saisie, entreprises et téléphones figés. */
	lots: z.array(z.object({
		lotId: texte, lot: texte, entreprise: texte, interlocuteur: texte, telephone: texte, convocation: z.enum(CONVOCATIONS),
	})),
	/** Une entrée par ligne. */
	avancement: z.array(segmentsSchema),
	/** Rubriques imprimées (les rubriques vides sont déjà omises). */
	coordination: z.array(z.object({ titre: texte, suite: segmentsSchema, lignes: z.array(segmentsSchema) })),
});
```

Ajouter la variante à `donneesDocumentSchema` :

```ts
	z.object({ type: z.literal('COMPTE_RENDU'), contenu: contenuCompteRenduSchema, societe: lignesSocieteSchema }),
```

et les types :

```ts
export type LignesSociete = z.infer<typeof lignesSocieteSchema>;
export type ContenuCompteRendu = z.infer<typeof contenuCompteRenduSchema>;
export type DonneesCompteRendu = Extract<DonneesDocument, { type: 'COMPTE_RENDU' }>;
```

- [ ] **Step 4: Les coordonnées et la feuille, modules purs**

Créer `src/documents/coordonnees.ts` :

```ts
import type { LignesSociete } from './schemas';

/* Module pur : les feuilles du compte rendu et du PV se construisent aussi dans le navigateur. */

export type SourceCoordonnees = {
	adresse: string; cp: string; ville: string; telephone: string; email: string | null; siteWeb: string | null;
};

/** Maquette `renderCr` : adresse, « CP ville », téléphone, puis e-mail et site après une ligne vide. */
export function societeCompteRendu(p: SourceCoordonnees): LignesSociete {
	const email = p.email?.trim();
	const site = p.siteWeb?.trim();
	const fin = [email ? `Email : ${email}` : '', site ? `Site : ${site}` : ''].filter(Boolean);
	return { lignes: [p.adresse, `${p.cp} ${p.ville}`, `Tél. ${p.telephone}`, ...(fin.length ? ['', ...fin] : [])] };
}

/** Maquette `pagePv` : « adresse - CP VILLE », puis « Tél. … – e-mail ». */
export function societeReception(p: SourceCoordonnees): LignesSociete {
	const email = p.email?.trim();
	return {
		lignes: [`${p.adresse} - ${p.cp} ${p.ville.toLocaleUpperCase('fr-FR')}`, `Tél. ${p.telephone}${email ? ` – ${email}` : ''}`],
	};
}
```

Créer `src/documents/compteRendu.ts` :

```ts
import { dateCourteSlash } from '@/domaine/certificats';
import { lignesAvancement, numeroTexte, rubriquesCoordination, texteRendezVous, type Convocation } from '@/domaine/compteRendu';
import { societeCompteRendu, type SourceCoordonnees } from './coordonnees';
import type { DonneesCompteRendu } from './schemas';

/*
 * Module pur (ni base, ni Node) : l'aperçu le rappelle dans le navigateur (correction), le serveur à
 * l'enregistrement avec les valeurs relues en base. Il ne doit importer ni `batir.ts`, ni `@/donnees`.
 */

export type SourceCompteRendu = {
	numero: number;
	chantier: { maitreOuvrage: string; natureTravaux: string; adresse: string; cp: string; commune: string };
	/** Tous les lots, dans l'ordre de saisie. */
	lots: { id: string; designation: string; entreprise: string | null; interlocuteur: string; telephone: string }[];
	societe: SourceCoordonnees;
};

/** Ce qui se tape sur la feuille ; dates au format AAAA-MM-JJ, heure HH:MM, '' si vide. */
export type SaisiesCompteRendu = {
	date: string; rdvDate: string; rdvHeure: string; avancement: string; coordination: string;
	redacteur: string; portable: string; convocations: Record<string, Convocation>;
};

const TIRET = '—';
const ouTiret = (v: string | null) => (v?.trim() ? v.trim() : TIRET);

export function batirCompteRendu(s: SourceCompteRendu, saisies: SaisiesCompteRendu): DonneesCompteRendu {
	const c = s.chantier;
	return {
		type: 'COMPTE_RENDU',
		contenu: {
			numero: numeroTexte(s.numero),
			redacteur: saisies.redacteur.trim(),
			portable: saisies.portable.trim(),
			referenceChantier: ouTiret(c.natureTravaux).toLocaleUpperCase('fr-FR').replace(/M²/g, 'm²'),
			adresseChantier: [c.adresse, c.cp, c.commune].map((x) => x.trim()).filter(Boolean).join(' – '),
			maitreOuvrage: ouTiret(c.maitreOuvrage),
			date: dateCourteSlash(saisies.date),
			prochainRdv: texteRendezVous(saisies.rdvDate, saisies.rdvHeure),
			lots: s.lots.map((l) => ({
				lotId: l.id,
				lot: ouTiret(l.designation),
				entreprise: ouTiret(l.entreprise),
				interlocuteur: ouTiret(l.interlocuteur),
				telephone: ouTiret(l.telephone),
				convocation: saisies.convocations[l.id] ?? 'D',
			})),
			avancement: lignesAvancement(saisies.avancement),
			coordination: rubriquesCoordination(saisies.coordination),
		},
		societe: societeCompteRendu(s.societe),
	};
}
```

- [ ] **Step 5: Le gabarit**

Créer `src/documents/gabarits/CompteRendu.tsx` :

```tsx
import { Fragment, type KeyboardEvent } from 'react';
import type { ChampCompteRendu, Segment } from '@/domaine/compteRendu';
import type { SaisiesCompteRendu } from '../compteRendu';
import type { DonneesCompteRendu } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 8). Sans hook : dates et heure sont contrôlées par l'aperçu, les textes sont lus
 * quand on les quitte ; `generation` change quand un texte est remplacé de l'extérieur (« Repartir des lots »),
 * ce qui remonte les champs.
 */
export type EditionCompteRendu = {
	saisies: SaisiesCompteRendu;
	generation: number;
	surChamp: (champ: ChampCompteRendu, valeur: string) => void;
	surConvocation: (lotId: string) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

function Texte({ segments }: { segments: Segment[] }) {
	return <>{segments.map((s, i) => (s.surligne ? <mark key={i}>{s.texte}</mark> : <Fragment key={i}>{s.texte}</Fragment>))}</>;
}

/** Fac-similé de « COMPTE RENDU DE CHANTIER.doc » (maquette `renderCr`), A4 portrait, une ou plusieurs pages. */
export function CompteRendu({ donnees, mode, edition }: { donnees: DonneesCompteRendu; mode: ModeGabarit; edition?: EditionCompteRendu }) {
	const { contenu: c, societe } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	const texteCourt = (e: EditionCompteRendu, champ: 'redacteur' | 'portable', libelle: string, placeholder: string) => (
		<input key={`${champ}:${e.generation}`} className="cr-saisie" aria-label={libelle} placeholder={placeholder}
			defaultValue={e.saisies[champ]} onKeyDown={quitterSurEntree}
			onBlur={(ev) => { if (ev.currentTarget.value !== e.saisies[champ]) e.surChamp(champ, ev.currentTarget.value); }} />
	);
	const texteLong = (e: EditionCompteRendu, champ: 'avancement' | 'coordination', libelle: string, placeholder: string) => (
		<textarea key={`${champ}:${e.generation}`} className="cr-saisie" aria-label={libelle} placeholder={placeholder}
			defaultValue={e.saisies[champ]}
			onBlur={(ev) => { if (ev.currentTarget.value !== e.saisies[champ]) e.surChamp(champ, ev.currentTarget.value); }} />
	);
	const date = (e: EditionCompteRendu, champ: 'date' | 'rdvDate', libelle: string) => (
		<input type="date" className="cr-saisie" aria-label={libelle} value={e.saisies[champ]} onChange={(ev) => e.surChamp(champ, ev.target.value)} />
	);

	return (
		<article className="sheet sheet-doc sheet-cr">
			<table className="cr-tete">
				<tbody>
					<tr>
						<td className="cr-logo">
							{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
							<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
						</td>
						<td className="cr-adr">{societe.lignes.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</td>
						<td className="cr-titre">COMPTE<br />RENDU DE<br />CHANTIER</td>
					</tr>
				</tbody>
			</table>
			<p className="cr-suivi">
				{ed ? (
					<>Suivi des travaux effectué par {texteCourt(ed, 'redacteur', 'Rédacteur', 'votre nom')} — Portable : {texteCourt(ed, 'portable', 'Portable', 'votre portable')}</>
				) : `Suivi des travaux effectué par ${c.redacteur}${c.portable ? ` — Portable : ${c.portable}` : ''}`}
			</p>
			<div className="cr-bloc">
				<p><b>RÉFÉRENCE CHANTIER :</b> {c.referenceChantier}{c.adresseChantier && <span className="cr-retrait">{c.adresseChantier}</span>}</p>
				<p><b>MAÎTRE D&apos;OUVRAGE :</b> {c.maitreOuvrage}</p>
				<div className="cr-ligne">
					<span><b>N° du Compte – Rendu :</b> {c.numero}</span>
					<span><b>Le :</b> {ed ? date(ed, 'date', 'Date du compte rendu') : c.date}</span>
					<span className="cr-rdv">
						<b>PROCHAIN RDV :</b> {ed ? (
							<>
								{date(ed, 'rdvDate', 'Date du prochain rendez-vous')}{' '}
								<input type="time" className="cr-saisie" aria-label="Heure du prochain rendez-vous" value={ed.saisies.rdvHeure}
									onChange={(ev) => ed.surChamp('rdvHeure', ev.target.value)} />
							</>
						) : c.prochainRdv}
					</span>
				</div>
				<p className="cr-legende">Légende : P = Présent / A = Absent / E = Excusé / <span className="cr-rouge">C = Convoqué au prochain RDV</span> / D = Diffusion</p>
				<table className="cr-lots">
					<thead><tr><th>Lot</th><th>Entreprise</th><th>Interlocuteur</th><th>Tél</th><th>Convocation</th></tr></thead>
					<tbody>
						{c.lots.length ? c.lots.map((l) => (
							<tr key={l.lotId}>
								<td>{l.lot}</td><td>{l.entreprise}</td><td>{l.interlocuteur}</td><td>{l.telephone}</td>
								<td className={l.convocation === 'C' ? 'cr-c' : undefined}>
									{ed ? (
										<button type="button" className={`cr-conv-bt${l.convocation === 'C' ? ' est-c' : ''}`} title="Cliquer pour changer : D, C, P, A, E"
											aria-label={`Convocation ${l.lot} : ${l.convocation}`} onClick={() => ed.surConvocation(l.lotId)}>{l.convocation}</button>
									) : l.convocation}
								</td>
							</tr>
						)) : <tr><td colSpan={5}>Aucun lot.</td></tr>}
					</tbody>
				</table>
			</div>
			<div className="cr-bloc cr-avancement">
				<span className="cr-souligne">AVANCEMENT :</span>
				<div>
					{ed ? texteLong(ed, 'avancement', 'Avancement', 'Démarrage des fondations prévu semaine 44')
						: c.avancement.map((l, i) => <Fragment key={i}>{i > 0 && '\n'}<Texte segments={l} /></Fragment>)}
				</div>
			</div>
			<div className="cr-bloc cr-co">
				<span className="cr-souligne">COORDINATION :</span>
				{ed ? (
					<>
						<p className="cr-aide">Un intitulé en MAJUSCULES suivi de « : » devient un titre souligné ; un titre sans rien dessous ne s&apos;imprime pas ; **texte** pour surligner.</p>
						{texteLong(ed, 'coordination', 'Coordination', 'GROS ŒUVRE :')}
					</>
				) : c.coordination.map((r, i) => (
					<Fragment key={i}>
						{r.titre && (
							<div className="cr-co-titre">
								{`${r.titre} :`}
								{r.suite.length > 0 && <> <span className="cr-co-suite"><Texte segments={r.suite} /></span></>}
							</div>
						)}
						{r.lignes.map((l, j) => <div key={j} className="cr-co-ligne"><Texte segments={l} /></div>)}
					</Fragment>
				))}
			</div>
			<div className="cr-pied"><span>SALUTATIONS</span><span>{c.redacteur}</span></div>
			<p className="cr-nb">NB : Sans réactions écrites de votre part à la réception de ce document, l&apos;ensemble des informations notées est considéré comme validé et accepté.</p>
		</article>
	);
}
```

Dans `src/documents/gabarits/Gabarit.tsx`, importer `CompteRendu` et ajouter au `switch` :

```tsx
		case 'COMPTE_RENDU':
			// Les saisies passent par ApercuCompteRendu, qui rend CompteRendu directement.
			return <CompteRendu donnees={donnees} mode={mode === 'edition' ? 'lecture' : mode} />;
```

Dans `src/documents/styles.ts`, insérer avant la ligne `/* PDF : la page A4 (marges 10 mm) porte la feuille, sans cadre ni ombre. */` :

```css
/* Compte rendu de chantier : A4 portrait, une ou plusieurs pages (maquette renderCr). Double classe : « .sheet-doc » fixerait 68rem ;
   « .sheet » devant les paragraphes : « .sheet p » l'emporterait. */
.sheet-doc.sheet-cr { width: 46rem; font-size: .6875rem; line-height: 1.4; }
.cr-tete { width: 100%; border-collapse: collapse; border: 1px solid #16191b; margin-bottom: .875rem; }
.cr-tete td { vertical-align: middle; padding: .375rem .625rem; }
.cr-logo { width: 6.5rem; border-right: 1px solid #16191b; text-align: center; }
.cr-logo img { width: 5.25rem; height: auto; display: block; margin: 0 auto; }
.cr-adr { font-weight: 700; font-size: .75rem; line-height: 1.35; }
.cr-titre { width: 9.5rem; border-left: 1px solid #16191b; text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: .03em; line-height: 1.2; }
.sheet .cr-suivi { margin: 0 0 .25rem 2.5rem; font-weight: 700; }
.cr-bloc { border: 1px solid #16191b; padding: .3125rem .375rem .375rem; margin-bottom: .875rem; }
.sheet .cr-bloc p { margin: 0 0 .1875rem; }
.cr-retrait { display: block; padding-left: 11.5rem; }
.cr-ligne { display: grid; grid-template-columns: 1fr .8fr 1.5fr; gap: .5rem; margin: .125rem 0 .1875rem; }
.cr-rdv { text-align: right; color: #b3261e; white-space: nowrap; }
.sheet .cr-legende { text-align: center; font-size: .5625rem; border-top: 1px solid #16191b; padding-top: .125rem; margin: 0; }
.cr-rouge { color: #b3261e; }
table.cr-lots { width: 100%; border-collapse: collapse; border-top: 1px solid #16191b; table-layout: fixed; font-size: .625rem; }
table.cr-lots th { font-style: italic; text-decoration: underline; text-align: center; padding: .125rem .25rem; font-weight: 700; }
table.cr-lots th:first-child, table.cr-lots td:first-child { text-align: left; }
table.cr-lots td { text-align: center; padding: .0625rem .25rem; overflow-wrap: anywhere; }
table.cr-lots th:nth-child(1) { width: 30%; } table.cr-lots th:nth-child(2) { width: 26%; }
table.cr-lots th:nth-child(3) { width: 19%; } table.cr-lots th:nth-child(4) { width: 14%; }
table.cr-lots td:nth-child(4) { white-space: nowrap; }
table.cr-lots td.cr-c { color: #b3261e; font-weight: 700; }
.cr-souligne { text-decoration: underline; font-weight: 700; }
.cr-avancement { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: .5rem; min-height: 2.5rem; }
.cr-avancement > div { font-weight: 700; white-space: pre-wrap; }
.cr-co-titre { text-decoration: underline; margin-top: .625rem; }
.cr-co-titre:first-of-type { margin-top: .25rem; }
.cr-co-suite { text-decoration: none; display: inline-block; }
.cr-co-ligne { padding-left: 1.5rem; white-space: pre-wrap; }
.sheet-cr mark { background: #fff200; color: inherit; font-weight: 700; padding: 0 1px; }
.cr-pied { display: grid; grid-template-columns: 1fr auto; gap: 1rem; padding: 0 1.75rem 0 45%; margin-top: -.625rem; }
.sheet .cr-nb { margin: .125rem 0 0; font-size: .625rem; }
/* Saisies de l'aperçu : jamais imprimées (le PDF est rendu en mode impression, sans champ). */
.sheet .cr-aide { margin: .25rem 0 .375rem; font-size: .625rem; font-style: italic; font-weight: 400; color: #5a6062; }
.cr-saisie { font: inherit; font-weight: 700; color: inherit; background: #e8f0f8; border: 0; box-shadow: inset 0 -1px 0 #1c4e80; padding: 0 .25rem; }
textarea.cr-saisie { display: block; width: 100%; min-height: 3rem; resize: vertical; field-sizing: content; white-space: pre-wrap; font-weight: 400; }
.cr-avancement textarea.cr-saisie { font-weight: 700; }
.cr-conv-bt { font: inherit; font-weight: 700; color: inherit; background: #e8f0f8; border: 0; border-radius: 3px; min-width: 1.5rem; cursor: pointer; }
.cr-conv-bt:hover { background: #dce8f4; }
.cr-conv-bt.est-c { color: #b3261e; }
```

- [ ] **Step 6: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/documents && npm run test:int -- src/documents/pdfCompteRendu.int.test.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 7: Commit**

```bash
git add tests/fixtures/compteRendu.ts src/documents/coordonnees.ts src/documents/compteRendu.ts src/documents/gabarits/CompteRendu.tsx src/documents/schemas.ts src/documents/gabarits/Gabarit.tsx src/documents/styles.ts src/documents/compteRendu.test.ts src/documents/pdfCompteRendu.int.test.ts
git commit -m "feat(suivi): feuille du compte rendu de chantier, construite dans un module pur, A4 portrait"
```

---

### Task 4: Compte rendu en base (brouillon partagé, enregistrement, correction)

**Files:**
- Create: `src/donnees/comptesRendus.ts`, `src/actions/comptesRendus.ts`
- Modify: `src/domaine/fichiers.ts`, `src/domaine/fichiers.test.ts`
- Test: `src/donnees/comptesRendus.int.test.ts`

**Interfaces:**
- Consumes: tout `src/domaine/compteRendu.ts` (Task 1) ; modèle `CompteRendu`, `serieCompteRendu`, `Parametres.siteWeb` (Task 2) ; `batirCompteRendu`, `type SourceCompteRendu`, `type SaisiesCompteRendu`, `type DonneesCompteRendu` (Task 3) ; `verifierDate` (Suivi financier) ; `DONNEES_CHANGEES`, `imprimerPortrait`, `rendrePdfDocument`, `type Dependances`, `type ResultatGeneration` (`generer.ts`) ; `type Tx` (`verrouLot.ts`) ; `versDateCalendaire`, `versSaisieDate` (`chantiers.ts`) ; `dateParis`, `depuisIso` (`semaines.ts`) ; `estDoublon` ; `executer`.
- Produces:
  - `nomFichierCompteRendu(reference: string, numero: number, version: number): string` (`PERRIER-LOUISFERT-CompteRendu04-v1.pdf`)
  - `convocationsSchema`, `saisiesCompteRenduSchema` (`z.infer` = `SaisiesCompteRendu`)
  - `type ModeCompteRendu = 'brouillon' | 'lecture' | 'correction'`
  - `type CompteRenduOuvert = { id; chantierId; numero: number; mode: ModeCompteRendu; source: SourceCompteRendu; saisies: SaisiesCompteRendu; fige: DonneesCompteRendu | null; derniere: { documentId: string; version: number } | null; dernier: boolean; blocage: string | null }`
  - `creerBrouillon(chantierId, maintenant?): Promise<{ id: string; numero: number }>`
  - `lireBrouillon(chantierId): Promise<CompteRenduOuvert | null>`
  - `ouvrirCompteRendu(id, chantierId, mode: 'lecture' | 'correction'): Promise<CompteRenduOuvert | null>`
  - `modifierChampCompteRendu(id, champ: ChampCompteRendu, valeur: string): Promise<void>`
  - `changerConvocation(id, lotId): Promise<Record<string, Convocation>>`
  - `abandonnerBrouillon(id): Promise<{ chantierId: string }>`
  - `enregistrerCompteRendu(id, utilisateurId, deps?): Promise<ResultatGeneration & { chantierId: string; numero: number }>`
  - `corrigerCompteRendu(id, saisies: SaisiesCompteRendu, utilisateurId, deps?): Promise<ResultatGeneration & { chantierId: string }>`
  - Server Actions (`src/actions/comptesRendus.ts`) : `creerBrouillonAction(chantierId)`, `modifierChampCompteRenduAction(id, champ, valeur)`, `changerConvocationAction(id, lotId)`, `abandonnerBrouillonAction(id)`, `enregistrerCompteRenduAction(id)`, `corrigerCompteRenduAction(id, saisies)`

- [ ] **Step 1: Les tests**

Dans `src/domaine/fichiers.test.ts`, ajouter l'import de `nomFichierCompteRendu` et le cas :

```ts
it('compte rendu : numéro sur deux chiffres', () => {
	expect(nomFichierCompteRendu('PERRIER — Louisfert', 4, 1)).toBe('PERRIER-LOUISFERT-CompteRendu04-v1.pdf');
	expect(nomFichierCompteRendu('SUIVI', 12, 3)).toBe('SUIVI-CompteRendu12-v3.pdf');
});
```

Créer `src/donnees/comptesRendus.int.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DonneesCompteRendu } from '@/documents/schemas';
import { DONNEES_CHANGEES } from '@/documents/generer';
import {
	BROUILLON_DISPARU, coordinationBase, CR_INTROUVABLE, CR_VIDE, DERNIER_CR_SEUL, HEURE_INVALIDE, HEURE_SANS_DATE,
} from '@/domaine/compteRendu';
import { PERRIER_LOTS } from '../../tests/fixtures/perrier';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import {
	abandonnerBrouillon, changerConvocation, corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, lireBrouillon,
	modifierChampCompteRendu, ouvrirCompteRendu,
} from './comptesRendus';
import { prisma } from './prisma';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { rendrePdf: faux };
/** 23 h 30 à Londres le 5 : déjà le 6 à Châteaubriant. */
const LE_6_OCTOBRE = new Date('2026-10-05T23:30:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;
let grosOeuvre: string;
let peinture: string;

const ligne = (id: string) => prisma.compteRendu.findUniqueOrThrow({ where: { id } });
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as DonneesCompteRendu).contenu;
/** Un brouillon qui a de quoi s'imprimer. */
async function brouillonRempli(avancement = 'Fondations coulées') {
	const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
	await modifierChampCompteRendu(b.id, 'avancement', avancement);
	return b;
}
const enregistrer = (id: string, d = deps) => enregistrerCompteRendu(id, p.utilisateurId, d);

describe('comptes rendus de chantier', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		grosOeuvre = p.lots['GROS ŒUVRE'];
		peinture = p.lots.PEINTURE;
		await prisma.utilisateur.update({ where: { id: p.utilisateurId }, data: { telephone: '06 12 34 56 78' } });
	});

	it('premier brouillon : n° 1, coordination de base, jour de Châteaubriant, chargé d\'affaire ; un seul par chantier', async () => {
		const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		expect(b.numero).toBe(1);
		const ouvert = await lireBrouillon(p.chantierId);
		expect(ouvert).toMatchObject({ id: b.id, numero: 1, mode: 'brouillon', fige: null, derniere: null, blocage: null });
		expect(ouvert?.saisies).toEqual({
			date: '2026-10-06', rdvDate: '', rdvHeure: '', avancement: '',
			coordination: coordinationBase(PERRIER_LOTS.map((l) => l.designation)),
			redacteur: 'Augustin Jouan', portable: '06 12 34 56 78', convocations: {},
		});
		expect(ouvert?.source.lots).toHaveLength(13);
		expect(ouvert?.source.lots[1]).toEqual({
			id: grosOeuvre, designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38',
		});
		expect(await creerBrouillon(p.chantierId)).toEqual(b);
	});

	it('deux « Nouveau compte rendu » simultanés : un seul brouillon, ouvert par les deux', async () => {
		const [a, b] = await Promise.all([creerBrouillon(p.chantierId), creerBrouillon(p.chantierId)]);
		expect(a).toEqual(b);
		expect(await prisma.compteRendu.count({ where: { chantierId: p.chantierId } })).toBe(1);
	});

	it('dates et heure du brouillon : date vide refusée, heure contrôlée, rendez-vous vidé avec son heure', async () => {
		const { id } = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await expect(modifierChampCompteRendu(id, 'date', '')).rejects.toThrow('Date : choisissez une date.');
		expect((await ligne(id)).date.toISOString().slice(0, 10)).toBe('2026-10-06');
		await expect(modifierChampCompteRendu(id, 'rdvHeure', '14:00')).rejects.toThrow(HEURE_SANS_DATE);
		await modifierChampCompteRendu(id, 'rdvDate', '2026-10-13');
		await expect(modifierChampCompteRendu(id, 'rdvHeure', '25:00')).rejects.toThrow(HEURE_INVALIDE);
		await modifierChampCompteRendu(id, 'rdvHeure', '14:00');
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({ rdvDate: '2026-10-13', rdvHeure: '14:00' });
		await modifierChampCompteRendu(id, 'rdvDate', '');
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({ rdvDate: '', rdvHeure: '' });
		await modifierChampCompteRendu(id, 'rdvHeure', '');
	});

	it('textes du brouillon : longueurs contrôlées, rédacteur et portable raccourcis de leurs espaces', async () => {
		const { id } = await creerBrouillon(p.chantierId);
		await expect(modifierChampCompteRendu(id, 'avancement', 'x'.repeat(5001))).rejects.toThrow("L'avancement est limité à 5 000 caractères.");
		await expect(modifierChampCompteRendu(id, 'coordination', 'x'.repeat(20001))).rejects.toThrow('La coordination est limitée à 20 000 caractères.');
		await expect(modifierChampCompteRendu(id, 'portable', '0'.repeat(121))).rejects.toThrow('120 caractères au plus.');
		await modifierChampCompteRendu(id, 'redacteur', '  Paul Martin ');
		expect((await ligne(id)).redacteur).toBe('Paul Martin');
	});

	it('convocations : D → C → P → A → E → D ; deux lots changés en même temps sont tous deux gardés', async () => {
		const { id } = await creerBrouillon(p.chantierId);
		const lettres: string[] = [];
		for (let i = 0; i < 5; i++) lettres.push((await changerConvocation(id, grosOeuvre))[grosOeuvre]);
		expect(lettres).toEqual(['C', 'P', 'A', 'E', 'D']);
		await Promise.all([changerConvocation(id, grosOeuvre), changerConvocation(id, peinture)]);
		expect((await lireBrouillon(p.chantierId))?.saisies.convocations).toEqual({ [grosOeuvre]: 'C', [peinture]: 'C' });
	});

	it('enregistrer : refusé sans avancement ni coordination imprimable, puis v1 figée', async () => {
		const { id } = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await modifierChampCompteRendu(id, 'coordination', 'GROS ŒUVRE :\n\nPEINTURE :');
		await expect(enregistrer(id)).rejects.toThrow(CR_VIDE);
		expect(faux).not.toHaveBeenCalled();

		await modifierChampCompteRendu(id, 'coordination', 'GROS ŒUVRE : **reprise** du mur');
		await changerConvocation(id, grosOeuvre);
		const r = await enregistrer(id);
		expect(r).toMatchObject({ version: 1, nouvelle: true, numero: 1, chantierId: p.chantierId, nomFichier: 'PERRIER-LOUISFERT-CompteRendu01-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['COMPTE_RENDU', `CR:${id}`, null]);
		expect((await ligne(id)).statut).toBe('ENREGISTRE');
		const c = await contenu(r.documentId);
		expect([c.numero, c.date, c.lots[1].entreprise, c.lots[1].convocation, c.coordination[0].titre]).toEqual(['01', '06/10/2026', 'CONSTRUCTIONS REBOURS', 'C', 'GROS ŒUVRE']);
		expect(await lireBrouillon(p.chantierId)).toBeNull();
	});

	it('un brouillon enregistré ou abandonné par un collègue ne s\'écrit plus', async () => {
		const { id } = await brouillonRempli();
		await enregistrer(id);
		const avant = await ligne(id);
		await expect(modifierChampCompteRendu(id, 'avancement', 'autre')).rejects.toThrow(BROUILLON_DISPARU);
		await expect(changerConvocation(id, grosOeuvre)).rejects.toThrow(BROUILLON_DISPARU);
		await expect(abandonnerBrouillon(id)).rejects.toThrow(BROUILLON_DISPARU);
		await expect(enregistrer(id)).rejects.toThrow(BROUILLON_DISPARU);
		expect(await ligne(id)).toEqual(avant);

		const suivant = await creerBrouillon(p.chantierId);
		await abandonnerBrouillon(suivant.id);
		await expect(modifierChampCompteRendu(suivant.id, 'avancement', 'x')).rejects.toThrow(BROUILLON_DISPARU);
		expect(await prisma.compteRendu.count()).toBe(1);
	});

	it('le suivant reprend coordination et convocations ; celles d\'un lot supprimé sont oubliées', async () => {
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		const premier = await brouillonRempli();
		await modifierChampCompteRendu(premier.id, 'coordination', 'GROS ŒUVRE : reprise du mur');
		await changerConvocation(premier.id, grosOeuvre);
		await changerConvocation(premier.id, enduit);
		await enregistrer(premier.id);
		await prisma.lot.delete({ where: { id: enduit } });

		const second = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		expect(second.numero).toBe(2);
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({
			avancement: '', rdvDate: '', coordination: 'GROS ŒUVRE : reprise du mur', convocations: { [grosOeuvre]: 'C' },
		});
	});

	it('données changées pendant le rendu : rien d\'enregistré', async () => {
		const { id } = await brouillonRempli();
		const renomme = vi.fn(async () => {
			await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
			return new Uint8Array([37]);
		});
		await expect(enregistrer(id, { rendrePdf: renomme })).rejects.toThrow(DONNEES_CHANGEES);
		expect((await ligne(id)).statut).toBe('BROUILLON');
		expect(await prisma.document.count()).toBe(0);
	});

	it('une entreprise renommée après l\'enregistrement ne change pas le compte rendu figé', async () => {
		const { id } = await brouillonRempli();
		const r = await enregistrer(id);
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
		expect((await contenu(r.documentId)).lots[1].entreprise).toBe('CONSTRUCTIONS REBOURS');
		const lu = await ouvrirCompteRendu(id, p.chantierId, 'lecture');
		expect(lu?.fige?.contenu.lots[1].entreprise).toBe('CONSTRUCTIONS REBOURS');
		expect(lu?.source.lots[1].entreprise).toBe('REBOURS SAS');
	});

	it('correction du dernier : v2 et ligne à jour ; sans changement, pas de v2 ; un plus ancien est refusé', async () => {
		const premier = await brouillonRempli();
		await enregistrer(premier.id);
		const ouvert = await ouvrirCompteRendu(premier.id, p.chantierId, 'correction');
		expect(ouvert).toMatchObject({ mode: 'correction', dernier: true, blocage: null, derniere: { version: 1 } });
		const saisies = ouvert!.saisies;

		expect(await corrigerCompteRendu(premier.id, saisies, p.utilisateurId, deps)).toMatchObject({ version: 1, nouvelle: false });
		const v2 = await corrigerCompteRendu(premier.id, { ...saisies, avancement: 'Fondations coulées, dalle faite' }, p.utilisateurId, deps);
		expect(v2).toMatchObject({ version: 2, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-CompteRendu01-v2.pdf', chantierId: p.chantierId });
		expect((await ligne(premier.id)).avancement).toBe('Fondations coulées, dalle faite');
		await expect(corrigerCompteRendu(premier.id, { ...saisies, avancement: '', coordination: '' }, p.utilisateurId, deps)).rejects.toThrow(CR_VIDE);
		await expect(corrigerCompteRendu(premier.id, { ...saisies, rdvHeure: '9h' }, p.utilisateurId, deps)).rejects.toThrow(HEURE_INVALIDE);

		// Le brouillon suivant ne compte pas : le n° 1 reste le dernier enregistré, et la correction ne touche pas au brouillon.
		const second = await brouillonRempli('Élévation des murs');
		await corrigerCompteRendu(premier.id, { ...saisies, avancement: 'v3' }, p.utilisateurId, deps);
		expect((await ligne(second.id)).avancement).toBe('Élévation des murs');

		await enregistrer(second.id);
		await expect(corrigerCompteRendu(premier.id, { ...saisies, avancement: 'trop tard' }, p.utilisateurId, deps)).rejects.toThrow(DERNIER_CR_SEUL);
		await expect(corrigerCompteRendu(second.id + 'x', saisies, p.utilisateurId, deps)).rejects.toThrow(CR_INTROUVABLE);
	});

	it('liens périmés : autre chantier, brouillon, ancien compte rendu en correction', async () => {
		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		const premier = await brouillonRempli();
		await enregistrer(premier.id);
		expect(await ouvrirCompteRendu(premier.id, autre.id, 'lecture')).toBeNull();
		const second = await brouillonRempli();
		expect(await ouvrirCompteRendu(second.id, p.chantierId, 'lecture')).toBeNull();
		await enregistrer(second.id);
		expect(await ouvrirCompteRendu(premier.id, p.chantierId, 'correction')).toMatchObject({ mode: 'lecture', dernier: false, blocage: DERNIER_CR_SEUL });
		await expect(changerConvocation((await creerBrouillon(p.chantierId)).id, 'lot-inconnu')).rejects.toThrow('Lot introuvable.');
	});

	it('la base refuse deux comptes rendus de même numéro sur un chantier', async () => {
		const { numero } = await creerBrouillon(p.chantierId);
		await expect(prisma.compteRendu.create({ data: { chantierId: p.chantierId, numero, date: new Date('2026-10-06') } })).rejects.toMatchObject({ code: 'P2002' });
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/comptesRendus.int.test.ts`
Expected: FAIL — `nomFichierCompteRendu` et `./comptesRendus` introuvables.

- [ ] **Step 3: Le nom du fichier**

Dans `src/domaine/fichiers.ts`, après `nomFichierCertificat` :

```ts
export function nomFichierCompteRendu(reference: string, numero: number, version: number): string {
	return `${slugifier(reference)}-CompteRendu${String(numero).padStart(2, '0')}-v${version}.pdf`;
}
```

- [ ] **Step 4: Les données du compte rendu**

Créer `src/donnees/comptesRendus.ts` :

```ts
import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { batirCompteRendu, type SaisiesCompteRendu, type SourceCompteRendu } from '@/documents/compteRendu';
import { DONNEES_CHANGEES, imprimerPortrait, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import type { DonneesCompteRendu } from '@/documents/schemas';
import { serieCompteRendu } from '@/documents/series';
import { verifierDate } from '@/domaine/certificats';
import {
	BROUILLON_DISPARU, compteRenduVide, CONVOCATIONS, convocationSuivante, coordinationBase, CR_INTROUVABLE, CR_VIDE, DERNIER_CR_SEUL,
	HEURE_INVALIDE, HEURE_SANS_DATE, HEURE_VALIDE, LIMITES_CR, MESSAGES_LONGUEUR_CR, numeroPris, numeroSuivant,
	type ChampCompteRendu, type Convocation,
} from '@/domaine/compteRendu';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierCompteRendu } from '@/domaine/fichiers';
import { dateParis, depuisIso } from '@/domaine/semaines';
import type { CompteRendu, Prisma } from '@/generated/prisma/client';
import { versDateCalendaire, versSaisieDate } from './chantiers';
import { estDoublon } from './erreursPrisma';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import type { Tx } from './verrouLot';

export const convocationsSchema = z.record(z.string(), z.enum(CONVOCATIONS));

/** Les saisies de la feuille telles que l'aperçu les envoie en correction ; le serveur les revérifie (`verifierSaisies`). */
export const saisiesCompteRenduSchema = z.object({
	date: z.string().max(10),
	rdvDate: z.string().max(10),
	rdvHeure: z.string().max(5),
	avancement: z.string().max(LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement),
	coordination: z.string().max(LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination),
	redacteur: z.string().max(LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court),
	portable: z.string().max(LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court),
	convocations: convocationsSchema,
});

export type ModeCompteRendu = 'brouillon' | 'lecture' | 'correction';

/** Ce que l'aperçu du compte rendu reçoit (Task 8). */
export type CompteRenduOuvert = {
	id: string;
	chantierId: string;
	numero: number;
	mode: ModeCompteRendu;
	/** Lots, entreprises et en-tête du moment (brouillon et correction). */
	source: SourceCompteRendu;
	saisies: SaisiesCompteRendu;
	/** Lecture : la feuille figée de la dernière version. */
	fige: DonneesCompteRendu | null;
	derniere: { documentId: string; version: number } | null;
	/** Le compte rendu enregistré de plus grand numéro : lui seul se corrige. */
	dernier: boolean;
	blocage: string | null;
};

const INTROUVABLE = 'Chantier introuvable.';
const jsonDe = (d: DonneesCompteRendu) => d as unknown as Prisma.InputJsonValue;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou. Lots dans l'ordre de saisie. */
async function lireSource(client: Tx, chantierId: string, numero: number): Promise<SourceCompteRendu> {
	const c = await client.chantier.findUnique({
		where: { id: chantierId },
		include: { lots: { orderBy: { ordre: 'asc' }, include: { artisan: { select: { nom: true, interlocuteur: true, telephone: true } } } } },
	});
	if (!c) throw new ErreurMetier(INTROUVABLE);
	const p = (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT;
	return {
		numero,
		chantier: { maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune },
		lots: c.lots.map((l) => ({
			id: l.id, designation: l.designation, entreprise: l.artisan?.nom ?? null,
			interlocuteur: l.artisan?.interlocuteur ?? '', telephone: l.artisan?.telephone ?? '',
		})),
		societe: { adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email, siteWeb: p.siteWeb },
	};
}

function saisiesDe(cr: CompteRendu): SaisiesCompteRendu {
	const convocations = convocationsSchema.safeParse(cr.convocations);
	return {
		date: versSaisieDate(cr.date), rdvDate: versSaisieDate(cr.rdvDate), rdvHeure: cr.rdvHeure ?? '',
		avancement: cr.avancement, coordination: cr.coordination, redacteur: cr.redacteur, portable: cr.portable,
		convocations: convocations.success ? convocations.data : {},
	};
}

function verifierLongueur(valeur: string, max: number, message: string, champ: string): string {
	if (valeur.length > max) throw new ErreurMetier(message, champ);
	return valeur;
}

const verifierCourt = (valeur: string, champ: string) => verifierLongueur(valeur.trim(), LIMITES_CR.court, MESSAGES_LONGUEUR_CR.court, champ);

/** '' : pas d'heure. La base refuse de même une heure mal formée ou sans date (CHECK). */
function verifierHeure(heure: string, avecDate: boolean): string {
	const h = heure.trim();
	if (!h) return '';
	if (!HEURE_VALIDE.test(h)) throw new ErreurMetier(HEURE_INVALIDE, 'rdvHeure');
	if (!avecDate) throw new ErreurMetier(HEURE_SANS_DATE, 'rdvHeure');
	return h;
}

function verifierSaisies(s: SaisiesCompteRendu): SaisiesCompteRendu {
	verifierDate(s.date);
	const rdvDate = s.rdvDate.trim();
	versDateCalendaire(rdvDate);
	return {
		date: s.date,
		rdvDate,
		rdvHeure: verifierHeure(s.rdvHeure, rdvDate !== ''),
		avancement: verifierLongueur(s.avancement, LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement, 'avancement'),
		coordination: verifierLongueur(s.coordination, LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination, 'coordination'),
		redacteur: verifierCourt(s.redacteur, 'redacteur'),
		portable: verifierCourt(s.portable, 'portable'),
		convocations: convocationsSchema.parse(s.convocations),
	};
}

/** Ce qu'un champ saisi écrit dans la ligne. Vider la date du rendez-vous efface aussi son heure. */
function donneesChamp(cr: CompteRendu, champ: ChampCompteRendu, valeur: string): Prisma.CompteRenduUpdateInput {
	switch (champ) {
		case 'date':
			return { date: depuisIso(verifierDate(valeur.trim())) };
		case 'rdvDate': {
			const d = versDateCalendaire(valeur);
			return d ? { rdvDate: d } : { rdvDate: null, rdvHeure: null };
		}
		case 'rdvHeure':
			return { rdvHeure: verifierHeure(valeur, cr.rdvDate !== null) || null };
		case 'avancement':
			return { avancement: verifierLongueur(valeur, LIMITES_CR.avancement, MESSAGES_LONGUEUR_CR.avancement, champ) };
		case 'coordination':
			return { coordination: verifierLongueur(valeur, LIMITES_CR.coordination, MESSAGES_LONGUEUR_CR.coordination, champ) };
		case 'redacteur':
			return { redacteur: verifierCourt(valeur, champ) };
		case 'portable':
			return { portable: verifierCourt(valeur, champ) };
	}
}

/** `SELECT … FOR UPDATE` sur la ligne du brouillon ; enregistré ou abandonné entre-temps : « Ce brouillon n'existe plus. » */
async function verrouillerBrouillon(tx: Tx, id: string): Promise<CompteRendu> {
	const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "CompteRendu" WHERE id = ${id} AND statut = 'BROUILLON' FOR UPDATE`;
	if (!verrou.length) throw new ErreurMetier(BROUILLON_DISPARU);
	return tx.compteRendu.findUniqueOrThrow({ where: { id } });
}

function sousVerrouBrouillon<T>(id: string, operation: (tx: Tx, cr: CompteRendu) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => operation(tx, await verrouillerBrouillon(tx, id)));
}

/** Enregistrement et correction : `FOR UPDATE` sur le chantier d'abord, puis sur le compte rendu (spec § 2, « Verrous »). */
function sousVerrouChantier<T>(chantierId: string, operation: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Chantier" WHERE id = ${chantierId} FOR UPDATE`;
		if (!verrou.length) throw new ErreurMetier(INTROUVABLE);
		return operation(tx);
	});
}

async function estDernier(client: Tx, chantierId: string, numero: number): Promise<boolean> {
	return !(await client.compteRendu.findFirst({ where: { chantierId, statut: 'ENREGISTRE', numero: { gt: numero } }, select: { id: true } }));
}

const BROUILLON = { chantierId: true, id: true, numero: true } as const;

/**
 * Le brouillon du chantier, créé s'il n'existe pas, depuis le dernier enregistré (spec § 5).
 * Deux créations simultanées visent le même numéro : l'unicité (chantier, numéro) refuse la seconde, qui ouvre la première.
 */
export async function creerBrouillon(chantierId: string, maintenant = new Date()): Promise<{ id: string; numero: number }> {
	const trouver = () => prisma.compteRendu.findFirst({ where: { chantierId, statut: 'BROUILLON' }, select: { id: true, numero: true } });
	const existant = await trouver();
	if (existant) return existant;
	const chantier = await prisma.chantier.findUnique({
		where: { id: chantierId },
		include: { chargeAffaire: { select: { name: true, telephone: true } }, lots: { orderBy: { ordre: 'asc' }, select: { id: true, designation: true } } },
	});
	if (!chantier) throw new ErreurMetier(INTROUVABLE);
	const precedent = await prisma.compteRendu.findFirst({ where: { chantierId, statut: 'ENREGISTRE' }, orderBy: { numero: 'desc' } });
	const lots = new Set(chantier.lots.map((l) => l.id));
	const convocations = precedent ? Object.fromEntries(Object.entries(saisiesDe(precedent).convocations).filter(([lotId]) => lots.has(lotId))) : {};
	const numero = numeroSuivant(precedent ? [precedent.numero] : []);
	try {
		const cree = await prisma.compteRendu.create({
			data: {
				chantierId, numero, date: dateParis(maintenant),
				coordination: precedent?.coordination ?? coordinationBase(chantier.lots.map((l) => l.designation)),
				convocations, redacteur: chantier.chargeAffaire.name, portable: chantier.chargeAffaire.telephone ?? '',
			},
			select: BROUILLON,
		});
		return { id: cree.id, numero: cree.numero };
	} catch (e) {
		if (!estDoublon(e)) throw e;
		const gagnant = await trouver();
		// Le brouillon gagnant a déjà été enregistré : seul endroit où ce message peut sortir.
		if (!gagnant) throw new ErreurMetier(numeroPris(numero));
		return gagnant;
	}
}

export async function lireBrouillon(chantierId: string): Promise<CompteRenduOuvert | null> {
	const cr = await prisma.compteRendu.findFirst({ where: { chantierId, statut: 'BROUILLON' } });
	if (!cr) return null;
	return {
		id: cr.id, chantierId, numero: cr.numero, mode: 'brouillon', source: await lireSource(prisma, chantierId, cr.numero),
		saisies: saisiesDe(cr), fige: null, derniere: null, dernier: false, blocage: null,
	};
}

/** Un compte rendu enregistré de CE chantier, sinon nul (lien périmé ou d'un autre chantier). Correction d'un plus ancien : lecture seule. */
export async function ouvrirCompteRendu(id: string, chantierId: string, mode: 'lecture' | 'correction'): Promise<CompteRenduOuvert | null> {
	const cr = await prisma.compteRendu.findFirst({ where: { id, chantierId, statut: 'ENREGISTRE' } });
	if (!cr) return null;
	const doc = await prisma.document.findFirst({
		where: { chantierId, serie: serieCompteRendu(id) }, orderBy: { version: 'desc' }, select: { id: true, version: true, donnees: true },
	});
	const dernier = await estDernier(prisma, chantierId, cr.numero);
	const corrigeable = mode === 'correction' && dernier;
	return {
		id, chantierId, numero: cr.numero, mode: corrigeable ? 'correction' : 'lecture',
		source: await lireSource(prisma, chantierId, cr.numero), saisies: saisiesDe(cr),
		fige: doc ? (doc.donnees as unknown as DonneesCompteRendu) : null,
		derniere: doc ? { documentId: doc.id, version: doc.version } : null,
		dernier,
		blocage: mode === 'correction' && !dernier ? DERNIER_CR_SEUL : null,
	};
}

export async function modifierChampCompteRendu(id: string, champ: ChampCompteRendu, valeur: string): Promise<void> {
	await sousVerrouBrouillon(id, async (tx, cr) => {
		await tx.compteRendu.update({ where: { id }, data: donneesChamp(cr, champ, valeur) });
	});
}

/** Relit les convocations sous verrou et ne change que ce lot : deux clics simultanés sur deux lots sont gardés. */
export async function changerConvocation(id: string, lotId: string): Promise<Record<string, Convocation>> {
	return sousVerrouBrouillon(id, async (tx, cr) => {
		if (!(await tx.lot.findFirst({ where: { id: lotId, chantierId: cr.chantierId }, select: { id: true } }))) throw new ErreurMetier('Lot introuvable.');
		const convocations = saisiesDe(cr).convocations;
		const suivantes = { ...convocations, [lotId]: convocationSuivante(convocations[lotId]) };
		await tx.compteRendu.update({ where: { id }, data: { convocations: suivantes } });
		return suivantes;
	});
}

export async function abandonnerBrouillon(id: string): Promise<{ chantierId: string }> {
	return sousVerrouBrouillon(id, async (tx, cr) => {
		await tx.compteRendu.delete({ where: { id } });
		return { chantierId: cr.chantierId };
	});
}

/** Contrôles puis feuille : exactement ce que le PDF imprimera. */
async function construire(client: Tx, cr: { chantierId: string; numero: number }, saisies: SaisiesCompteRendu): Promise<DonneesCompteRendu> {
	const s = verifierSaisies(saisies);
	if (compteRenduVide(s.avancement, s.coordination)) throw new ErreurMetier(CR_VIDE);
	return batirCompteRendu(await lireSource(client, cr.chantierId, cr.numero), s);
}

async function creerVersion(tx: Tx, p: {
	cr: { id: string; chantierId: string; numero: number }; version: number; donnees: DonneesCompteRendu; empreinte: string; pdf: Uint8Array; utilisateurId: string;
}): Promise<ResultatGeneration> {
	const { reference } = await tx.chantier.findUniqueOrThrow({ where: { id: p.cr.chantierId }, select: { reference: true } });
	const nomFichier = nomFichierCompteRendu(reference, p.cr.numero, p.version);
	const doc = await tx.document.create({
		data: {
			chantierId: p.cr.chantierId, lotId: null, serie: serieCompteRendu(p.cr.id), type: 'COMPTE_RENDU', version: p.version,
			donnees: jsonDe(p.donnees), empreinte: p.empreinte, pdf: new Uint8Array(p.pdf), nomFichier, creeParId: p.utilisateurId,
		},
	});
	return { documentId: doc.id, version: p.version, nomFichier, nouvelle: true };
}

/** Lecture → PDF hors transaction → sous verrou du chantier : brouillon relu, empreinte refaite, statut, version 1. */
export async function enregistrerCompteRendu(id: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration & { chantierId: string; numero: number }> {
	const brouillon = await prisma.compteRendu.findFirst({ where: { id, statut: 'BROUILLON' } });
	if (!brouillon) throw new ErreurMetier(BROUILLON_DISPARU);
	const donnees = await construire(prisma, brouillon, saisiesDe(brouillon));
	const empreinte = empreinteDocument(donnees);
	const pdf = await rendrePdfDocument(donnees, deps.rendrePdf ?? imprimerPortrait);
	return sousVerrouChantier(brouillon.chantierId, async (tx) => {
		const cr = await verrouillerBrouillon(tx, id);
		if (empreinteDocument(await construire(tx, cr, saisiesDe(cr))) !== empreinte) throw new ErreurMetier(DONNEES_CHANGEES);
		// Numéro : le brouillon le détient, l'unicité (chantier, numéro) interdit à toute autre ligne de le prendre.
		await tx.compteRendu.update({ where: { id }, data: { statut: 'ENREGISTRE' } });
		const r = await creerVersion(tx, { cr, version: 1, donnees, empreinte, pdf, utilisateurId });
		return { ...r, chantierId: cr.chantierId, numero: cr.numero };
	});
}

/** Correction du dernier enregistré : même numéro, version suivante ; empreinte inchangée, aucune (règle du Socle). */
export async function corrigerCompteRendu(id: string, saisies: SaisiesCompteRendu, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration & { chantierId: string }> {
	const cr = await prisma.compteRendu.findFirst({ where: { id, statut: 'ENREGISTRE' }, select: BROUILLON });
	if (!cr) throw new ErreurMetier(CR_INTROUVABLE);
	const s = verifierSaisies(saisies);
	const preparer = async (client: Tx) => {
		if (!(await estDernier(client, cr.chantierId, cr.numero))) throw new ErreurMetier(DERNIER_CR_SEUL);
		return construire(client, cr, s);
	};
	const donnees = await preparer(prisma);
	const empreinte = empreinteDocument(donnees);
	const serie = { chantierId: cr.chantierId, serie: serieCompteRendu(id) };
	const identique = (d: { id: string; version: number; nomFichier: string; empreinte: string } | null) =>
		d?.empreinte === empreinte ? { documentId: d.id, version: d.version, nomFichier: d.nomFichier, nouvelle: false, chantierId: cr.chantierId } : null;
	const dejaLa = identique(await prisma.document.findFirst({ where: serie, orderBy: { version: 'desc' } }));
	if (dejaLa) return dejaLa;
	const pdf = await rendrePdfDocument(donnees, deps.rendrePdf ?? imprimerPortrait);
	return sousVerrouChantier(cr.chantierId, async (tx) => {
		await tx.$queryRaw`SELECT id FROM "CompteRendu" WHERE id = ${id} FOR UPDATE`;
		if (empreinteDocument(await preparer(tx)) !== empreinte) throw new ErreurMetier(DONNEES_CHANGEES);
		const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
		const memeVersion = identique(courante);
		if (memeVersion) return memeVersion;
		await tx.compteRendu.update({
			where: { id },
			data: {
				date: depuisIso(s.date), rdvDate: versDateCalendaire(s.rdvDate), rdvHeure: s.rdvHeure || null,
				avancement: s.avancement, coordination: s.coordination, redacteur: s.redacteur, portable: s.portable, convocations: s.convocations,
			},
		});
		const r = await creerVersion(tx, { cr, version: (courante?.version ?? 0) + 1, donnees, empreinte, pdf, utilisateurId });
		return { ...r, chantierId: cr.chantierId };
	});
}
```

- [ ] **Step 5: Les Server Actions**

Créer `src/actions/comptesRendus.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ResultatGeneration } from '@/documents/generer';
import type { SaisiesCompteRendu } from '@/documents/compteRendu';
import type { ChampCompteRendu, Convocation } from '@/domaine/compteRendu';
import {
	abandonnerBrouillon, changerConvocation, corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu,
	saisiesCompteRenduSchema,
} from '@/donnees/comptesRendus';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const id = z.string().min(1);
const champSchema = z.enum(['date', 'rdvDate', 'rdvHeure', 'avancement', 'coordination', 'redacteur', 'portable']);

export async function creerBrouillonAction(chantierId: string): Promise<Resultat<{ id: string; numero: number }>> {
	return executer({}, async () => {
		const r = await creerBrouillon(id.parse(chantierId));
		rafraichir(chantierId);
		return r;
	});
}

/** Pas de rafraîchissement : la page Documents ne montre rien des champs du brouillon. */
export async function modifierChampCompteRenduAction(compteRenduId: string, champ: ChampCompteRendu, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampCompteRendu(id.parse(compteRenduId), champSchema.parse(champ), z.string().max(25000).parse(valeur));
		return null;
	});
}

export async function changerConvocationAction(compteRenduId: string, lotId: string): Promise<Resultat<Record<string, Convocation>>> {
	return executer({}, () => changerConvocation(id.parse(compteRenduId), id.parse(lotId)));
}

export async function abandonnerBrouillonAction(compteRenduId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await abandonnerBrouillon(id.parse(compteRenduId))).chantierId);
		return null;
	});
}

export async function enregistrerCompteRenduAction(compteRenduId: string): Promise<Resultat<ResultatGeneration & { numero: number }>> {
	return executer({}, async (u) => {
		const { chantierId, ...r } = await enregistrerCompteRendu(id.parse(compteRenduId), u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function corrigerCompteRenduAction(compteRenduId: string, saisies: SaisiesCompteRendu): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const { chantierId, ...r } = await corrigerCompteRendu(id.parse(compteRenduId), saisiesCompteRenduSchema.parse(saisies), u.id);
		rafraichir(chantierId);
		return r;
	});
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/comptesRendus.int.test.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domaine/fichiers.ts src/domaine/fichiers.test.ts src/donnees/comptesRendus.ts src/donnees/comptesRendus.int.test.ts src/actions/comptesRendus.ts
git commit -m "feat(suivi): compte rendu en brouillon partagé, enregistré et corrigé sous verrou du chantier"
```

---

### Task 5: Feuille du procès-verbal de réception (objet pur, gabarit, une page)

**Files:**
- Create: `src/documents/reception.ts`, `src/documents/gabarits/ProcesVerbalReception.tsx`, `tests/fixtures/reception.ts`
- Modify: `src/documents/schemas.ts`, `src/documents/gabarits/Gabarit.tsx`, `src/documents/styles.ts`, `src/documents/generer.ts`
- Test: `src/documents/reception.test.ts`, `src/documents/pdfReception.int.test.ts`

**Interfaces:**
- Consumes: `DECISIONS`, `type Decision`, `LIBELLES_DECISIONS`, `type ChampReception`, `type ChampReceptionCommun`, `lignesReserves` (Task 1) ; `lignesSocieteSchema`, `societeReception`, `type SourceCoordonnees`, `COORDONNEES_SOCOREVE` (Task 3) ; `dateCourteSlash` ; `LOGO_SOCOREVE` ; `htmlVersPdf`, `TROP_DE_LIGNES`.
- Produces:
  - `contenuReceptionSchema`, `type ContenuReception`, `type DonneesReception` (`{ type: 'PV_RECEPTION'; contenu; societe: LignesSociete }`)
  - `src/documents/reception.ts` (pur) : `type SaisiesReception = { decision: Decision; dateEffet: string; reserves: string; delai: string; motifs: string; representant: string }`, `type SaisiesReceptionCommunes = { date: string; signataire: string; contrat: string; maitreOeuvre: string }`, `type SourceReception = { chantier: { maitreOuvrage; adresse; cp; commune; mission: 'COMPLETE' | 'PARTIELLE' }; lot: { id; numero: string | null; designation; entreprise: string | null; retenueGarantie: string }; societe: SourceCoordonnees }`, `tauxCourt(taux: string): string`, `batirReception(s, saisies, commun): DonneesReception`
  - `ProcesVerbalReception({ donnees, mode, edition? })`, `type EditionReception = { saisies; commun; surChamp(champ: Exclude<ChampReception, 'decision'>, valeur): void; surCommun(champ: ChampReceptionCommun, valeur): void; surDecision(d: Decision): void }`
  - `imprimerReception: RendrePdf` (`generer.ts`)
  - `tests/fixtures/reception.ts` : `PV_SOURCE`, `PV_SAISIES`, `PV_COMMUN`

- [ ] **Step 1: La fixture et les tests**

Créer `tests/fixtures/reception.ts` :

```ts
import type { SaisiesReception, SaisiesReceptionCommunes, SourceReception } from '@/documents/reception';
import { COORDONNEES_SOCOREVE } from './compteRendu';

export const PV_SOURCE: SourceReception = {
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT', mission: 'COMPLETE' },
	lot: { id: 'l2', numero: '02', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', retenueGarantie: '5' },
	societe: COORDONNEES_SOCOREVE,
};

export const PV_SAISIES: SaisiesReception = {
	decision: 'AVEC_RESERVES', dateEffet: '', reserves: 'Reprise des joints de la cuisine\n\n  Nettoyage du chantier  ',
	delai: '30 jours', motifs: '', representant: 'Mikaël REBOURS',
};

export const PV_COMMUN: SaisiesReceptionCommunes = { date: '2026-10-12', signataire: '', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' };
```

Créer `src/documents/reception.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PV_COMMUN, PV_SAISIES, PV_SOURCE } from '../../tests/fixtures/reception';
import { COORDONNEES_SOCOREVE } from '../../tests/fixtures/compteRendu';
import { empreinteDocument } from './batir';
import { Gabarit } from './gabarits/Gabarit';
import { ProcesVerbalReception } from './gabarits/ProcesVerbalReception';
import { batirReception, tauxCourt } from './reception';
import { donneesDocumentSchema } from './schemas';

describe('feuille du PV de réception', () => {
	const d = batirReception(PV_SOURCE, PV_SAISIES, PV_COMMUN);

	it('avec réserves : effet à la date de réception, une réserve par ligne, délai imprimé', () => {
		expect(d).toEqual({
			type: 'PV_RECEPTION',
			contenu: {
				enDateDu: '12/10/2026', maitreOuvrage: 'M. et Mme PERRIER', adresseTravaux: 'Le Haut Bois', cpCommune: '44110 – LOUISFERT',
				soussigne: 'M. et Mme PERRIER', representantDe: '', maitreOeuvre: 'Augustin Jouan',
				entreprise: 'CONSTRUCTIONS REBOURS', representant: 'Mikaël REBOURS', lot: '02 — GROS ŒUVRE',
				mission: 'complète', contrat: '03/04/2026', decision: 'AVEC_RESERVES', effet: '12/10/2026', motifs: '',
				reserves: ['Reprise des joints de la cuisine', 'Nettoyage du chantier'], delai: '30 jours', retenue: '5',
				dateReception: '2026-10-12',
			},
			societe: { lignes: ['71 rue du Général Patton - 44110 CHÂTEAUBRIANT', 'Tél. 02 40 81 40 26 – contact@socoreve-chateaubriant.com'] },
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('sans réserves : ni réserves ni délai, même s\'ils restent dans le brouillon ; date d\'effet saisie', () => {
		const c = batirReception(PV_SOURCE, { ...PV_SAISIES, decision: 'SANS_RESERVES', dateEffet: '2026-10-15' }, PV_COMMUN).contenu;
		expect([c.effet, c.reserves, c.delai, c.motifs]).toEqual(['15/10/2026', [], '', '']);
	});

	it('différée : motifs imprimés, aucune date d\'effet', () => {
		const c = batirReception(PV_SOURCE, { ...PV_SAISIES, decision: 'DIFFEREE', motifs: 'Enduits non secs' }, PV_COMMUN).contenu;
		expect([c.effet, c.motifs, c.reserves, c.delai]).toEqual(['', 'Enduits non secs', [], '']);
	});

	it('signataire saisi : « représentant de » ; sous-traitance : la désignation seule ; mission partielle', () => {
		const c = batirReception(
			{ ...PV_SOURCE, chantier: { ...PV_SOURCE.chantier, mission: 'PARTIELLE' }, lot: { ...PV_SOURCE.lot, numero: null, designation: 'ESCALIER' } },
			PV_SAISIES,
			{ ...PV_COMMUN, signataire: ' Jean PERRIER ', contrat: '' },
		).contenu;
		expect([c.soussigne, c.representantDe, c.lot, c.mission, c.contrat]).toEqual(['Jean PERRIER', 'M. et Mme PERRIER', 'ESCALIER', 'partielle', '']);
	});

	it('taux de la retenue : virgule décimale, sans zéro inutile', () => {
		expect(['5', '5.00', '2.50', '2.5', '0'].map(tauxCourt)).toEqual(['5', '5', '2,5', '2,5', '0']);
	});

	it("l'en-tête SOCOREVE n'entre pas dans l'empreinte", () => {
		const autre = batirReception({ ...PV_SOURCE, societe: { ...COORDONNEES_SOCOREVE, telephone: '02 00 00 00 00' } }, PV_SAISIES, PV_COMMUN);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
	});

	it('module pur : ni base, ni Node, ni batir.ts', () => {
		expect(readFileSync('src/documents/reception.ts', 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
	});
});

describe('gabarit du PV de réception', () => {
	const html = (saisies = PV_SAISIES) => renderToStaticMarkup(createElement(Gabarit, { donnees: batirReception(PV_SOURCE, saisies, PV_COMMUN), mode: 'impression' }));

	it('impression : toutes les phrases, quelle que soit la décision ; la case cochée porte le ✕', () => {
		for (const decision of ['SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE'] as const) {
			const h = html({ ...PV_SAISIES, decision, motifs: 'Enduits non secs' });
			for (const phrase of [
				'PROCÈS-VERBAL DE RÉCEPTION<br/>DES TRAVAUX ENTREPRISE',
				'la réception est prononcée sans réserves, avec effet à la date du :',
				'la réception est prononcée avec réserves (réserves mentionnées ci-après), avec effet à la date du :',
				'la réception est différée pour les motifs suivants :',
				'NATURE DES RÉSERVES',
				'seront exécutés dans un délai de',
				'la retenue de garantie qui est de 5 % sera restituée',
				'Signature du maître d&#x27;œuvre',
				'CONSTAT DE LEVÉE DE RÉSERVES',
				'constatent qu&#x27;il a été valablement remédié aux malfaçons, omissions, imperfections concernées.',
			]) expect(h).toContain(phrase);
			expect(h.match(/✕/g)).toHaveLength(1);
			expect(h).not.toMatch(/<(input|textarea|button)/);
		}
		expect(html()).toContain('<div class="pv-reserves">Reprise des joints de la cuisine\nNettoyage du chantier</div>');
		expect(html()).toContain('au titre du contrat de maîtrise d&#x27;œuvre complète du <span class="pv-v">03/04/2026</span>');
	});

	it('édition : champs du lot et champs communs sur la feuille, décision par case', () => {
		const rien = () => undefined;
		const h = renderToStaticMarkup(createElement(ProcesVerbalReception, {
			donnees: batirReception(PV_SOURCE, PV_SAISIES, PV_COMMUN),
			mode: 'edition',
			edition: { saisies: PV_SAISIES, commun: PV_COMMUN, surChamp: rien, surCommun: rien, surDecision: rien },
		}));
		for (const libelle of [
			'Date de la réception', 'Signataire pour le maître d&#x27;ouvrage', 'Maître d&#x27;œuvre', 'Entreprise représentée par',
			'Date du contrat de maîtrise d&#x27;œuvre', 'Date d&#x27;effet', 'Nature des réserves', 'Délai pour lever les réserves',
			'Sans réserves', 'Avec réserves', 'Différée',
		]) expect(h).toContain(`aria-label="${libelle}"`);
		expect(h).toContain('aria-pressed="true" aria-label="Avec réserves"');
	});
});
```

Créer `src/documents/pdfReception.int.test.ts` :

```ts
import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { PV_COMMUN, PV_SAISIES, PV_SOURCE } from '../../tests/fixtures/reception';
import { imprimerReception } from './generer';
import { fermerNavigateur } from './pdf';
import { batirReception } from './reception';
import { rendreHtml } from './rendu';

describe('impression du PV de réception', () => {
	afterAll(fermerNavigateur);

	it('2 000 caractères de réserves en 60 lignes : une seule page A4 portrait', async () => {
		const reserves = Array.from({ length: 60 }, (_, i) => `Réserve ${String(i + 1).padStart(2, '0')} : reprendre le joint.`).join('\n').slice(0, 2000);
		expect(reserves.length).toBeGreaterThan(1900);
		const pdf = await PDFDocument.load(await imprimerReception(await rendreHtml(batirReception(PV_SOURCE, { ...PV_SAISIES, reserves }, PV_COMMUN))));
		const { width, height } = pdf.getPage(0).getSize();
		expect([pdf.getPageCount(), height > width, Math.round(width)]).toEqual([1, true, 595]);
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/documents/reception.test.ts`
Expected: FAIL — `./reception` et `./gabarits/ProcesVerbalReception` introuvables.

- [ ] **Step 3: Le schéma**

Dans `src/documents/schemas.ts`, ajouter `import { DECISIONS } from '@/domaine/reception';` puis, après `contenuCompteRenduSchema` :

```ts
export const contenuReceptionSchema = z.object({
	/** « 12/10/2026 ». */
	enDateDu: texte,
	maitreOuvrage: texte,
	adresseTravaux: texte,
	/** « 44110 – LOUISFERT ». */
	cpCommune: texte,
	/** Le signataire saisi, sinon le maître d'ouvrage. */
	soussigne: texte,
	/** Le maître d'ouvrage quand un signataire est saisi, sinon ''. */
	representantDe: texte,
	maitreOeuvre: texte,
	entreprise: texte,
	representant: texte,
	/** « 02 — GROS ŒUVRE » ; sans numéro (sous-traitance), la désignation seule. */
	lot: texte,
	mission: z.enum(['complète', 'partielle']),
	/** Date du contrat de maîtrise d'œuvre, « 03/04/2026 » ou ''. */
	contrat: texte,
	decision: z.enum(DECISIONS),
	/** Imprimée sur la ligne cochée « sans » ou « avec » ; '' si différée. */
	effet: texte,
	/** Imprimés si différée, '' sinon. */
	motifs: texte,
	/** Une réserve par ligne si avec réserves, [] sinon. */
	reserves: z.array(texte),
	/** Imprimé si avec réserves, '' sinon. */
	delai: texte,
	/** Taux de la retenue de garantie du lot : « 5 », « 2,5 ». */
	retenue: texte,
	/** Date de réception AAAA-MM-JJ : la levée des réserves ne peut la précéder. */
	dateReception: texte,
});
```

Ajouter la variante à `donneesDocumentSchema` :

```ts
	z.object({ type: z.literal('PV_RECEPTION'), contenu: contenuReceptionSchema, societe: lignesSocieteSchema }),
```

et les types :

```ts
export type ContenuReception = z.infer<typeof contenuReceptionSchema>;
export type DonneesReception = Extract<DonneesDocument, { type: 'PV_RECEPTION' }>;
```

- [ ] **Step 4: La feuille, module pur**

Créer `src/documents/reception.ts` :

```ts
import { dateCourteSlash } from '@/domaine/certificats';
import { lignesReserves, type Decision } from '@/domaine/reception';
import { societeReception, type SourceCoordonnees } from './coordonnees';
import type { DonneesReception } from './schemas';

/* Module pur (ni base, ni Node) : l'aperçu le rappelle à chaque frappe, le serveur à la génération. */

/** Saisies propres au lot (ligne `Reception`) ; dates AAAA-MM-JJ, '' si vide. */
export type SaisiesReception = { decision: Decision; dateEffet: string; reserves: string; delai: string; motifs: string; representant: string };
/** Champs communs à tous les PV du chantier (colonnes de `Chantier`). */
export type SaisiesReceptionCommunes = { date: string; signataire: string; contrat: string; maitreOeuvre: string };

export type SourceReception = {
	chantier: { maitreOuvrage: string; adresse: string; cp: string; commune: string; mission: 'COMPLETE' | 'PARTIELLE' };
	lot: { id: string; numero: string | null; designation: string; entreprise: string | null; retenueGarantie: string };
	societe: SourceCoordonnees;
};

/** « 5 », « 2,5 » : virgule décimale, sans zéro inutile (spec § 6). */
export function tauxCourt(taux: string): string {
	return (taux.includes('.') ? taux.replace(/\.?0+$/, '') : taux).replace('.', ',');
}

export function batirReception(s: SourceReception, saisies: SaisiesReception, commun: SaisiesReceptionCommunes): DonneesReception {
	const c = s.chantier;
	const signataire = commun.signataire.trim();
	const avec = saisies.decision === 'AVEC_RESERVES';
	return {
		type: 'PV_RECEPTION',
		contenu: {
			enDateDu: dateCourteSlash(commun.date),
			maitreOuvrage: c.maitreOuvrage.trim() || '—',
			adresseTravaux: c.adresse.trim(),
			cpCommune: [c.cp, c.commune].map((x) => x.trim()).filter(Boolean).join(' – '),
			soussigne: signataire || c.maitreOuvrage.trim(),
			representantDe: signataire ? c.maitreOuvrage.trim() : '',
			maitreOeuvre: commun.maitreOeuvre.trim(),
			entreprise: s.lot.entreprise ?? '',
			representant: saisies.representant.trim(),
			lot: s.lot.numero ? `${s.lot.numero} — ${s.lot.designation}` : s.lot.designation,
			mission: c.mission === 'COMPLETE' ? 'complète' : 'partielle',
			contrat: dateCourteSlash(commun.contrat),
			decision: saisies.decision,
			effet: saisies.decision === 'DIFFEREE' ? '' : dateCourteSlash(saisies.dateEffet || commun.date),
			motifs: saisies.decision === 'DIFFEREE' ? saisies.motifs.trim() : '',
			reserves: avec ? lignesReserves(saisies.reserves) : [],
			delai: avec ? saisies.delai.trim() : '',
			retenue: tauxCourt(s.lot.retenueGarantie),
			dateReception: commun.date,
		},
		societe: societeReception(s.societe),
	};
}
```

- [ ] **Step 5: Le gabarit**

Créer `src/documents/gabarits/ProcesVerbalReception.tsx` :

```tsx
import { Fragment, type KeyboardEvent, type ReactNode } from 'react';
import { LIBELLES_DECISIONS, type ChampReception, type ChampReceptionCommun, type Decision } from '@/domaine/reception';
import type { SaisiesReception, SaisiesReceptionCommunes } from '../reception';
import type { DonneesReception } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 9), sans hook : les dates sont contrôlées, les textes sont lus quand on les quitte.
 * Chaque texte a pour clé sa valeur : un champ commun changé sur une autre page remonte ici.
 */
export type EditionReception = {
	saisies: SaisiesReception;
	commun: SaisiesReceptionCommunes;
	surChamp: (champ: Exclude<ChampReception, 'decision'>, valeur: string) => void;
	surCommun: (champ: ChampReceptionCommun, valeur: string) => void;
	surDecision: (decision: Decision) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };
const Blanc = ({ children }: { children?: ReactNode }) => <span className="pv-blanc">{children || ' '}</span>;
const V = ({ children }: { children: ReactNode }) => <span className="pv-v">{children}</span>;

/** Fac-similé de « 3- PV de réception.ods » (maquette `pagePv`), A4 portrait, une page. */
export function ProcesVerbalReception({ donnees, mode, edition }: { donnees: DonneesReception; mode: ModeGabarit; edition?: EditionReception }) {
	const { contenu: c, societe } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	const texte = (valeur: string, libelle: string, placeholder: string, ecrire: (v: string) => void, max = 120) => (
		<input key={`${libelle}:${valeur}`} className="pv-saisie" aria-label={libelle} placeholder={placeholder} maxLength={max}
			defaultValue={valeur} onKeyDown={quitterSurEntree}
			onBlur={(e) => { if (e.currentTarget.value !== valeur) ecrire(e.currentTarget.value); }} />
	);
	const date = (valeur: string, libelle: string, ecrire: (v: string) => void) => (
		<input type="date" className="pv-saisie" aria-label={libelle} value={valeur} onChange={(e) => ecrire(e.target.value)} />
	);
	const coche = (d: Decision) => (ed ? (
		<button type="button" className="pv-case pv-case-bt" title="Choisir" aria-pressed={c.decision === d} aria-label={LIBELLES_DECISIONS[d]}
			onClick={() => ed.surDecision(d)}>{c.decision === d ? '✕' : ''}</button>
	) : <span className="pv-case">{c.decision === d ? '✕' : ''}</span>);
	const effet = (d: Decision) => (c.decision !== d ? <Blanc /> : ed ? (
		<span className="pv-blanc">{date(ed.saisies.dateEffet || ed.commun.date, "Date d'effet", (v) => ed.surChamp('dateEffet', v))}</span>
	) : <Blanc>{c.effet}</Blanc>);

	return (
		<article className="sheet sheet-doc sheet-pv">
			<div className="pv-tete">
				{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
				<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
				<div>
					<div className="pv-adr">{societe.lignes.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</div>
					<div className="pv-titre">PROCÈS-VERBAL DE RÉCEPTION<br />DES TRAVAUX ENTREPRISE</div>
				</div>
			</div>
			<p className="pv-date">En date du : {ed ? date(ed.commun.date, 'Date de la réception', (v) => ed.surCommun('date', v)) : <V>{c.enDateDu}</V>}</p>
			<dl className="pv-cadre">
				<dt className="fort">Maître d&apos;ouvrage :</dt><dd className="fort">{c.maitreOuvrage}</dd>
				<dt>Adresse des travaux :</dt><dd>{c.adresseTravaux}<br />{c.cpCommune}</dd>
			</dl>
			<div className="pv-corps">
				<p>
					Je, soussigné {ed ? texte(ed.commun.signataire, "Signataire pour le maître d'ouvrage", c.maitreOuvrage, (v) => ed.surCommun('signataire', v)) : <V>{c.soussigne}</V>}
					{c.representantDe && <> représentant de <V>{c.representantDe}</V></>} maître de l&apos;ouvrage,
				</p>
				<p>assisté du maître d&apos;œuvre SOCOREVE représenté par {ed ? texte(ed.commun.maitreOeuvre, "Maître d'œuvre", 'votre nom', (v) => ed.surCommun('maitreOeuvre', v)) : <V>{c.maitreOeuvre}</V>}</p>
				<p>et en présence de l&apos;entreprise <V>{c.entreprise}</V></p>
				<p>représentée par {ed ? texte(ed.saisies.representant, 'Entreprise représentée par', 'interlocuteur', (v) => ed.surChamp('representant', v)) : <V>{c.representant}</V>}</p>
				<p>titulaire du lot <V>{c.lot}</V></p>
				<p>
					des travaux exécutés pour mon compte à l&apos;adresse ci-dessus, au titre du contrat de maîtrise d&apos;œuvre {c.mission} du{' '}
					{ed ? date(ed.commun.contrat, "Date du contrat de maîtrise d'œuvre", (v) => ed.surCommun('contrat', v)) : <V>{c.contrat || '    '}</V>}, déclare que :
				</p>
			</div>
			<div className="pv-choix">
				<div>{coche('SANS_RESERVES')}<span>la réception est prononcée sans réserves, avec effet à la date du : {effet('SANS_RESERVES')}.</span></div>
				<div>{coche('AVEC_RESERVES')}<span>la réception est prononcée avec réserves (réserves mentionnées ci-après), avec effet à la date du : {effet('AVEC_RESERVES')}.</span></div>
				<div>
					{coche('DIFFEREE')}
					<span>la réception est différée pour les motifs suivants : {c.decision !== 'DIFFEREE' ? <Blanc /> : ed
						? texte(ed.saisies.motifs, 'Motifs du report', 'motifs du report', (v) => ed.surChamp('motifs', v), 2000)
						: <Blanc>{c.motifs}</Blanc>}.</span>
				</div>
			</div>
			<hr className="pv-sep" /><div className="pv-rubrique">NATURE DES RÉSERVES</div><hr className="pv-sep" />
			{ed ? (
				<div className="pv-reserves">
					{c.decision === 'AVEC_RESERVES' ? (
						<textarea key={`reserves:${ed.saisies.reserves}`} className="pv-saisie" aria-label="Nature des réserves" placeholder="Une réserve par ligne"
							maxLength={2000} defaultValue={ed.saisies.reserves}
							onBlur={(e) => { if (e.currentTarget.value !== ed.saisies.reserves) ed.surChamp('reserves', e.currentTarget.value); }} />
					) : <p className="pv-aide">Cochez « avec réserves » plus haut pour en saisir.</p>}
				</div>
			) : <div className="pv-reserves">{c.reserves.join('\n')}</div>}
			<hr className="pv-sep" />
			<p className="pv-phrase">
				Le maître d&apos;œuvre et le maître de l&apos;ouvrage conviennent que les travaux nécessaires pour lever les réserves mentionnées ci-dessus,
				seront exécutés dans un délai de {c.decision !== 'AVEC_RESERVES' ? <Blanc /> : ed
					? texte(ed.saisies.delai, 'Délai pour lever les réserves', '30 jours', (v) => ed.surChamp('delai', v))
					: <Blanc>{c.delai}</Blanc>}, à compter de ce jour.
			</p>
			<p className="pv-phrase">
				Pour garantir la levée de ces réserves, la retenue de garantie qui est de {c.retenue} % sera restituée à l&apos;entreprise soit après que le
				procès-verbal de levée de réserves soit signé par les deux parties soit dans un délai maximum de 6 mois après la levée de réserves comme
				indiqué sur le contrat de marché.
			</p>
			<div className="pv-signs"><span>Signature du maître de l&apos;ouvrage</span><span>Signature de l&apos;entreprise</span><span>Signature du maître d&apos;œuvre</span></div>
			<hr className="pv-sep" /><div className="pv-rubrique">CONSTAT DE LEVÉE DE RÉSERVES</div><hr className="pv-sep" />
			<p className="pv-phrase">
				Le maître de l&apos;ouvrage et l&apos;entreprise, ci-dessus désignés, constatent qu&apos;il a été valablement remédié aux malfaçons, omissions, imperfections concernées.
			</p>
			<div className="pv-fait"><span>Fait à <Blanc /></span><span>le <Blanc /></span><span>Signature du maître de l&apos;ouvrage</span></div>
		</article>
	);
}
```

Attention aux espaces : JSX supprime les retours à la ligne entre deux textes. Si le test « au titre du contrat de maîtrise d'œuvre complète du <span… » échoue sur un espace, écrire la phrase sur une seule ligne JSX ; ne pas modifier le test.

Dans `src/documents/gabarits/Gabarit.tsx`, importer `ProcesVerbalReception` et ajouter au `switch` :

```tsx
		case 'PV_RECEPTION':
			// Les saisies passent par ApercuReception, qui rend ProcesVerbalReception directement.
			return <ProcesVerbalReception donnees={donnees} mode={mode === 'edition' ? 'lecture' : mode} />;
```

Dans `src/documents/styles.ts`, après le bloc du compte rendu (Task 3), toujours avant `/* PDF : la page A4 … */` :

```css
/* PV de réception : A4 portrait, une page (maquette pagePv). */
.sheet-doc.sheet-pv { width: 46rem; font-size: .75rem; line-height: 1.55; }
.pv-pages { display: flex; flex-direction: column; align-items: center; gap: 1.75rem; }
.pv-tete { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 1rem; align-items: start; }
.pv-tete img { width: 6.25rem; height: auto; }
.pv-adr { text-align: right; font-weight: 700; font-size: .75rem; }
.pv-titre { text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: .9375rem; letter-spacing: .02em; margin: 1.25rem 0 0 5rem; line-height: 1.35; }
.sheet .pv-date { margin: .25rem 0 0 1rem; }
.pv-cadre { border: 1px solid #16191b; display: grid; grid-template-columns: 12rem minmax(0, 1fr); gap: .125rem .5rem; padding: .25rem .375rem 1rem; margin: 0 0 1.25rem; }
.pv-cadre dt { font-style: italic; }
.pv-cadre dt.fort { font-weight: 700; font-style: normal; }
.pv-cadre dd { margin: 0; }
.pv-cadre dd.fort { font-weight: 700; }
.sheet .pv-corps p { margin: 0 0 .125rem; }
.pv-v { font-weight: 600; padding: 0 .375rem; }
.pv-blanc { display: inline-block; min-width: 6rem; border-bottom: 1px solid #16191b; text-align: center; font-weight: 600; }
.pv-choix { margin: .875rem 0 .75rem .25rem; }
.pv-choix div { display: flex; gap: .375rem; align-items: baseline; }
.pv-case { flex: none; display: inline-grid; place-items: center; width: 1.625rem; height: .8125rem; border: 1px solid #16191b;
	font-size: .625rem; font-weight: 700; line-height: 1; transform: translateY(2px); background: #fff; padding: 0; }
.pv-case-bt { cursor: pointer; }
.pv-case-bt:hover { background: #e8f0f8; }
/* « .sheet hr » l'emporterait sans le double sélecteur. */
.sheet hr.pv-sep { border: 0; border-top: 2px dashed #16191b; margin: .25rem 0; }
.pv-rubrique { text-align: center; font-weight: 700; margin: .375rem 0; }
.pv-reserves { min-height: 6.5rem; padding: .375rem .5rem; white-space: pre-wrap; }
.sheet .pv-phrase { margin: .625rem 0; }
.pv-signs { display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; margin: 1rem 0 0; min-height: 4.5rem; }
.pv-fait { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 1rem; margin-top: .75rem; }
/* Saisies de l'aperçu : jamais imprimées. */
.pv-saisie { font: inherit; font-weight: 600; color: inherit; background: #e8f0f8; border: 0; box-shadow: inset 0 -1px 0 #1c4e80; padding: 0 .25rem; }
textarea.pv-saisie { display: block; width: 100%; min-height: 6rem; resize: vertical; field-sizing: content; font-weight: 400; }
.sheet .pv-aide { margin: 0; font-size: .6875rem; font-style: italic; color: #5a6062; }
```

- [ ] **Step 6: L'impression**

Dans `src/documents/generer.ts`, après `imprimerCertificat` :

```ts
/** PV de réception : portrait, toujours une page ; des réserves longues sont réduites à l'échelle (spec § 6). */
export const imprimerReception: RendrePdf = (html) => htmlVersPdf(html, { paysage: false, uneSeuleFeuille: true, tropLong: TROP_DE_LIGNES });
```

- [ ] **Step 7: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/documents && npm run test:int -- src/documents/pdfReception.int.test.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 8: Commit**

```bash
git add tests/fixtures/reception.ts src/documents/reception.ts src/documents/gabarits/ProcesVerbalReception.tsx src/documents/schemas.ts src/documents/gabarits/Gabarit.tsx src/documents/styles.ts src/documents/generer.ts src/documents/reception.test.ts src/documents/pdfReception.int.test.ts
git commit -m "feat(suivi): feuille du procès-verbal de réception, construite dans un module pur, une page portrait"
```

---

### Task 6: PV de réception en base (brouillons, génération d'un lot ou de tous, levée, PDF assemblé)

**Files:**
- Create: `src/donnees/receptions.ts`, `src/actions/receptions.ts`, `src/app/api/chantiers/[id]/receptions-pdf/route.ts`
- Modify: `src/donnees/verrouLot.ts`, `src/domaine/fichiers.ts`, `src/domaine/fichiers.test.ts`, `package.json`, `package-lock.json`
- Test: `src/donnees/receptions.int.test.ts`

**Interfaces:**
- Consumes: tout `src/domaine/reception.ts` (Task 1), dont `TOUS_LES_LOTS` ; modèle `Reception`, champs `Chantier.reception*` et `contratMoeDate`, `serieReception` (Task 2) ; `batirReception`, `type SourceReception`, `type SaisiesReception`, `type SaisiesReceptionCommunes`, `type DonneesReception`, `imprimerReception` (Task 5) ; `sousVerrouLot`, `type Tx` ; `DONNEES_CHANGEES`, `rendrePdfDocument`, `type Dependances`, `type ResultatGeneration` ; `verifierDate` ; `versDateCalendaire`, `versSaisieDate` ; `dateParis`, `versIso`, `depuisIso` ; `prefixeLot`, `slugifier`, `enTeteTelechargement` ; `utilisateurConnecte`.
- Produces:
  - `sousVerrouLots<T>(lotIds: string[], operation: (tx: Tx) => Promise<T>): Promise<T>` (`verrouLot.ts`)
  - `nomFichierReception(p: { reference; numero: string | null; designation; nature: Nature; version: number }): string`, `nomFichierReceptions(reference: string): string`
  - `type PageReception = { lotId: string; entreprise: string; source: SourceReception; saisies: SaisiesReception }`
  - `type ReceptionsOuvertes = { chantierId: string; cible: string; options: { lotId: string; libelle: string; entreprise: string }[]; commun: SaisiesReceptionCommunes; pages: PageReception[]; blocage: string | null }`
  - `preparerReceptions(chantierId, cible: string, maintenant?): Promise<ReceptionsOuvertes | null>`
  - `modifierChampReception(lotId, champ: ChampReception, valeur: string): Promise<void>`
  - `modifierChampReceptionCommun(chantierId, champ: ChampReceptionCommun, valeur: string): Promise<void>`
  - `type ResultatReception = ResultatGeneration & { lotId: string; entreprise: string }`
  - `genererReceptions(chantierId, lotIds: string[], utilisateurId, deps?): Promise<ResultatReception[]>` : les lots que l'aperçu affiche (un seul, ou toutes les pages de « Tous les lots »)
  - contrat de `ErreurMetier.champ` : pour un refus de `genererReceptions` propre à un lot (sans entreprise, réserves ou motifs manquants), l'id de ce lot ; partout ailleurs (saisies, `DATE_RECEPTION`), le nom du champ
  - `leverReserves(lotId, date: string): Promise<{ chantierId: string }>`, `annulerLevee(lotId): Promise<{ chantierId: string }>`
  - `assemblerReceptions(chantierId, documentIds: string[]): Promise<{ pdf: Uint8Array; nomFichier: string } | null>`
  - Server Actions : `modifierChampReceptionAction(lotId, champ, valeur)`, `modifierChampReceptionCommunAction(chantierId, champ, valeur)`, `genererReceptionsAction(chantierId, lotIds: string[]): Promise<Resultat<ResultatReception[]>>`, `leverReservesAction(lotId, date)`, `annulerLeveeAction(lotId)`
  - Route `GET /api/chantiers/[id]/receptions-pdf?documents=<id>,<id>`

- [ ] **Step 1: pdf-lib en production**

`pdf-lib` (`^1.17.1`) est aujourd'hui en `devDependencies` (tests) ; la route d'assemblage en a besoin à l'exécution.

Run: `npm install pdf-lib@^1.17.1`
Expected: `package.json` le liste sous `dependencies` (`"pdf-lib": "^1.17.1"`) et plus sous `devDependencies` ; `package-lock.json` mis à jour. Si npm le laisse aussi dans `devDependencies`, retirer cette ligne à la main puis relancer `npm install`.

- [ ] **Step 2: Les tests**

Dans `src/domaine/fichiers.test.ts`, ajouter l'import de `nomFichierReception` et `nomFichierReceptions`, et le cas :

```ts
it('PV de réception : un par lot, puis le PDF assemblé', () => {
	expect(nomFichierReception({ reference: 'PERRIER — Louisfert', numero: '02', designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', version: 1 }))
		.toBe('PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Reception-v1.pdf');
	expect(nomFichierReception({ reference: 'SUIVI', numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', version: 2 }))
		.toBe('SUIVI-ST-ESCALIER-Reception-v2.pdf');
	expect(nomFichierReceptions('PERRIER — Louisfert')).toBe('PERRIER-LOUISFERT-Receptions.pdf');
});
```

Créer `src/donnees/receptions.int.test.ts` :

```ts
import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DONNEES_CHANGEES } from '@/documents/generer';
import type { DonneesReception } from '@/documents/schemas';
import { ErreurMetier } from '@/domaine/erreurs';
import {
	AUCUN_LOT_RECEPTIONNABLE, bilanReceptions, DATE_RECEPTION, LEVEE_AVANT, MOTIFS_TROP_LONGS, PAS_DE_RESERVES, SANS_ENTREPRISE, TOUS_LES_LOTS,
} from '@/domaine/reception';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { prisma } from './prisma';
import {
	annulerLevee, assemblerReceptions, genererReceptions, leverReserves, modifierChampReception, modifierChampReceptionCommun,
	preparerReceptions,
} from './receptions';

/** Un vrai PDF d'une page : l'assemblage le relit. */
const faux = vi.fn(async () => {
	const d = await PDFDocument.create();
	d.addPage();
	return d.save();
});
const deps = { rendrePdf: faux };
const LE_12_OCTOBRE = new Date('2026-10-12T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;
let grosOeuvre: string;
let peinture: string;

const reception = (lotId: string) => prisma.reception.findUnique({ where: { lotId } });
const generer = (lotIds: string[], d = deps) => genererReceptions(p.chantierId, lotIds, p.utilisateurId, d);
/** Les pages de « Tous les lots » à l'ouverture, comme l'aperçu les envoie. */
const affiches = async () => (await preparerReceptions(p.chantierId, TOUS_LES_LOTS))!.pages.map((x) => x.lotId);
const genererTous = async (d = deps) => generer(await affiches(), d);
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as unknown as DonneesReception).contenu;
async function refus(promesse: Promise<unknown>): Promise<ErreurMetier> {
	const e = await promesse.then(() => null, (x: unknown) => x);
	expect(e).toBeInstanceOf(ErreurMetier);
	return e as ErreurMetier;
}

describe('procès-verbaux de réception', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		grosOeuvre = p.lots['GROS ŒUVRE'];
		peinture = p.lots.PEINTURE;
	});

	it('première ouverture : champs communs remplis une fois, brouillon du lot avec l\'interlocuteur', async () => {
		const o = await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		expect(o).toMatchObject({
			chantierId: p.chantierId, cible: grosOeuvre, blocage: null,
			commun: { date: '2026-10-12', signataire: '', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' },
		});
		expect(o?.options).toHaveLength(12);
		expect(o?.options[1]).toEqual({ lotId: grosOeuvre, libelle: '02 — GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS' });
		expect(o?.options.at(-1)).toEqual({ lotId: p.lots.ESCALIER, libelle: 'ESCALIER', entreprise: 'PASSION BOIS' });
		expect(o?.pages).toHaveLength(1);
		expect(o?.pages[0]).toMatchObject({
			lotId: grosOeuvre, entreprise: 'CONSTRUCTIONS REBOURS',
			saisies: { decision: 'SANS_RESERVES', dateEffet: '', reserves: '', delai: '', motifs: '', representant: 'Mikaël REBOURS' },
		});
		expect(await prisma.reception.count()).toBe(1);

		// Une valeur saisie est gardée ; une valeur effacée est reproposée à l'ouverture suivante.
		await modifierChampReceptionCommun(p.chantierId, 'signataire', 'Jean PERRIER');
		await modifierChampReceptionCommun(p.chantierId, 'date', '2026-10-15');
		await modifierChampReceptionCommun(p.chantierId, 'maitreOeuvre', '');
		const again = await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		expect(again?.commun).toEqual({ date: '2026-10-15', signataire: 'Jean PERRIER', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' });
	});

	it('tous les lots : une page par lot attribué, dans l\'ordre de saisie', async () => {
		const o = await preparerReceptions(p.chantierId, TOUS_LES_LOTS);
		expect(o?.pages.map((x) => x.entreprise)).toHaveLength(12);
		expect(o?.pages[0].entreprise).toBe('GILLOT TP');
		expect(await reception(p.lots['ENDUIT EXTÉRIEUR'])).toBeNull();
		expect(await prisma.reception.count()).toBe(12);
	});

	it('lot sans entreprise, chantier sans lot attribué, lot d\'un autre chantier', async () => {
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		expect(await preparerReceptions(p.chantierId, enduit)).toMatchObject({ blocage: SANS_ENTREPRISE, pages: [] });
		expect(await reception(enduit)).toBeNull();

		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		await prisma.lot.create({ data: { chantierId: autre.id, ordre: 1, designation: 'PEINTURE' } });
		expect(await preparerReceptions(autre.id, TOUS_LES_LOTS)).toMatchObject({ blocage: AUCUN_LOT_RECEPTIONNABLE, pages: [], options: [] });
		expect(await preparerReceptions(autre.id, grosOeuvre)).toBeNull();
		expect(await preparerReceptions('inconnu', TOUS_LES_LOTS)).toBeNull();
		expect(await prisma.reception.count()).toBe(0);
	});

	it('champs du lot et champs communs : contrôles de longueur, lot sans entreprise refusé', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		await modifierChampReception(grosOeuvre, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(grosOeuvre, 'reserves', 'Joint\nPeinture');
		await modifierChampReception(grosOeuvre, 'dateEffet', '2026-10-20');
		await expect(modifierChampReception(grosOeuvre, 'decision', 'PEUT_ETRE')).rejects.toThrow();
		await expect(modifierChampReception(grosOeuvre, 'reserves', 'x'.repeat(2001))).rejects.toThrow('Les réserves sont limitées à 2 000 caractères.');
		await expect(modifierChampReception(grosOeuvre, 'reserves', Array(61).fill('x').join('\n'))).rejects.toThrow('Les réserves sont limitées à 60 lignes.');
		await expect(modifierChampReception(grosOeuvre, 'motifs', 'x'.repeat(2001))).rejects.toThrow(MOTIFS_TROP_LONGS);
		await expect(modifierChampReception(grosOeuvre, 'representant', 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
		await expect(modifierChampReception(p.lots['ENDUIT EXTÉRIEUR'], 'reserves', 'x')).rejects.toThrow(SANS_ENTREPRISE);
		expect(await reception(grosOeuvre)).toMatchObject({ decision: 'AVEC_RESERVES', reserves: 'Joint\nPeinture' });
		expect((await reception(grosOeuvre))?.dateEffet?.toISOString().slice(0, 10)).toBe('2026-10-20');

		await modifierChampReceptionCommun(p.chantierId, 'contrat', '');
		expect((await prisma.chantier.findUniqueOrThrow({ where: { id: p.chantierId } })).contratMoeDate).toBeNull();
		await expect(modifierChampReceptionCommun(p.chantierId, 'signataire', 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
	});

	it('un lot : v1, puis rien de neuf sans changement', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		const [r] = await generer([grosOeuvre]);
		expect(r).toMatchObject({ lotId: grosOeuvre, entreprise: 'CONSTRUCTIONS REBOURS', version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Reception-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['PV_RECEPTION', `RECEPTION:${grosOeuvre}`, grosOeuvre]);
		expect(await contenu(r.documentId)).toMatchObject({ decision: 'SANS_RESERVES', effet: '12/10/2026', dateReception: '2026-10-12', entreprise: 'CONSTRUCTIONS REBOURS' });
		const [bis] = await generer([grosOeuvre]);
		expect(bis).toMatchObject({ documentId: r.documentId, version: 1, nouvelle: false });
		expect(faux).toHaveBeenCalledTimes(1);
	});

	it('tous les lots : un lot invalide bloque tout, rien d\'écrit ; puis 12 PV ; puis inchangés', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		const e = await refus(genererTous());
		expect([e.message, e.champ]).toEqual(["LA DÉCO'TECH : précisez la nature des réserves.", peinture]);
		expect([faux.mock.calls.length, await prisma.document.count()]).toEqual([0, 0]);

		await modifierChampReception(peinture, 'reserves', 'Reprise des joints de la cuisine');
		const premiers = await genererTous();
		expect(premiers.filter((r) => r.nouvelle)).toHaveLength(12);
		expect(premiers.map((r) => r.entreprise)[0]).toBe('GILLOT TP');

		// Le délai d'un lot sans réserves ne s'imprime pas : rien ne change. Le représentant, si.
		await modifierChampReception(grosOeuvre, 'delai', '15 jours');
		await modifierChampReception(grosOeuvre, 'representant', 'Paul REBOURS');
		const seconds = await genererTous();
		expect(seconds.filter((r) => r.nouvelle).map((r) => [r.lotId, r.version])).toEqual([[grosOeuvre, 2]]);
		expect(bilanReceptions(1, 11)).toBe('1 PV généré, 11 inchangés.');
	});

	it('différée sans motif refusée ; date de réception vide refusée', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		await modifierChampReception(grosOeuvre, 'decision', 'DIFFEREE');
		await expect(generer([grosOeuvre])).rejects.toThrow('CONSTRUCTIONS REBOURS : précisez les motifs du report.');
		await modifierChampReception(grosOeuvre, 'motifs', 'Enduits non secs');
		await modifierChampReceptionCommun(p.chantierId, 'date', '');
		await expect(generer([grosOeuvre])).rejects.toThrow(DATE_RECEPTION);
		expect(await prisma.document.count()).toBe(0);
	});

	it('entreprise retirée entre l\'ouverture et la génération : refus, en « tous les lots » aussi, rien d\'écrit', async () => {
		const vus = await affiches();
		expect(vus).toHaveLength(12);
		await prisma.lot.update({ where: { id: grosOeuvre }, data: { artisanId: null } });
		await expect(generer([grosOeuvre])).rejects.toThrow(SANS_ENTREPRISE);
		const e = await refus(generer(vus));
		expect([e.message, e.champ]).toEqual([SANS_ENTREPRISE, grosOeuvre]);
		expect([faux.mock.calls.length, await prisma.document.count()]).toEqual([0, 0]);
		// Rouvert, « tous les lots » ne le compte plus.
		const tous = await genererTous();
		expect(tous).toHaveLength(11);
		expect(tous.some((r) => r.lotId === grosOeuvre)).toBe(false);
	});

	it('un lot attribué après l\'ouverture n\'est pas généré : on génère les pages qu\'on a vues', async () => {
		const vus = await affiches();
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		await prisma.lot.update({ where: { id: enduit }, data: { artisanId: p.artisans.MATELEC } });
		const r = await generer(vus);
		expect(r).toHaveLength(12);
		expect(r.some((x) => x.lotId === enduit)).toBe(false);
	});

	it('lot inconnu ou d\'un autre chantier, liste vide : refusés', async () => {
		await expect(generer(['inconnu'])).rejects.toThrow('Lot introuvable.');
		await expect(generer([])).rejects.toThrow(AUCUN_LOT_RECEPTIONNABLE);
	});

	it('données changées pendant le rendu : rien d\'écrit', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		const renomme = vi.fn(async () => {
			await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
			return faux();
		});
		await expect(generer([grosOeuvre], { rendrePdf: renomme })).rejects.toThrow(DONNEES_CHANGEES);
		expect(await prisma.document.count()).toBe(0);
	});

	it('levée : après la réception seulement, gardée par un PV inchangé, effacée par un nouveau PV', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE);
		await expect(leverReserves(peinture, '2026-10-20')).rejects.toThrow(PAS_DE_RESERVES);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints');
		await generer([peinture]);
		await generer([grosOeuvre]);
		await expect(leverReserves(grosOeuvre, '2026-10-20')).rejects.toThrow(PAS_DE_RESERVES);
		await expect(leverReserves(peinture, '2026-10-11')).rejects.toThrow(LEVEE_AVANT);
		await expect(leverReserves(peinture, '')).rejects.toThrow('Date : choisissez une date.');
		expect(await leverReserves(peinture, '2026-10-20')).toEqual({ chantierId: p.chantierId });
		const levee = async () => (await reception(peinture))?.reservesLeveesLe?.toISOString().slice(0, 10) ?? null;
		expect(await levee()).toBe('2026-10-20');

		await generer([peinture]);
		expect(await levee()).toBe('2026-10-20');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints\nNettoyage');
		await generer([peinture]);
		expect(await levee()).toBeNull();

		await leverReserves(peinture, '2026-10-21');
		await annulerLevee(peinture);
		expect(await levee()).toBeNull();

		await modifierChampReception(peinture, 'decision', 'DIFFEREE');
		await modifierChampReception(peinture, 'motifs', 'Peinture fraîche');
		await generer([peinture]);
		await expect(leverReserves(peinture, '2026-10-22')).rejects.toThrow(PAS_DE_RESERVES);
	});

	it('PDF assemblé : une page par lot dans l\'ordre de saisie ; rien d\'un autre chantier ni d\'un autre type', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS);
		const [a, b] = [await generer([peinture]), await generer([grosOeuvre])].map(([r]) => r);
		const assemble = await assemblerReceptions(p.chantierId, [a.documentId, b.documentId]);
		expect(assemble?.nomFichier).toBe('PERRIER-LOUISFERT-Receptions.pdf');
		expect((await PDFDocument.load(assemble!.pdf)).getPageCount()).toBe(2);

		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		const lot = await prisma.lot.create({ data: { chantierId: autre.id, ordre: 1, designation: 'PEINTURE', artisanId: p.artisans.MATELEC } });
		await preparerReceptions(autre.id, lot.id);
		const [etranger] = await genererReceptions(autre.id, [lot.id], p.utilisateurId, deps);
		await expect(genererReceptions(p.chantierId, [lot.id], p.utilisateurId, deps)).rejects.toThrow('Lot introuvable.');
		expect(await assemblerReceptions(p.chantierId, [a.documentId, etranger.documentId])).toBeNull();
		expect(await assemblerReceptions(p.chantierId, [])).toBeNull();
		expect(await assemblerReceptions(p.chantierId, ['inconnu'])).toBeNull();
	});
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/receptions.int.test.ts`
Expected: FAIL — `nomFichierReception` et `./receptions` introuvables.

- [ ] **Step 4: Noms de fichiers et verrou de plusieurs lots**

Dans `src/domaine/fichiers.ts`, après `nomFichierCompteRendu` :

```ts
export function nomFichierReception(p: { reference: string; numero: string | null; designation: string; nature: Nature; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Reception-v${p.version}.pdf`;
}

/** Les PV de « Tous les lots », assemblés pour l'impression ; jamais stocké. */
export function nomFichierReceptions(reference: string): string {
	return `${slugifier(reference)}-Receptions.pdf`;
}
```

Dans `src/donnees/verrouLot.ts`, après `sousVerrouLot` :

```ts
/**
 * « Tous les lots » (PV de réception) : une seule transaction, les lots verrouillés dans l'ordre de saisie
 * (`ORDER BY` avant `FOR UPDATE`) pour que deux générations simultanées ne s'interbloquent pas.
 */
export async function sousVerrouLots<T>(lotIds: string[], operation: (tx: Tx) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Lot" WHERE id = ANY(${lotIds}) ORDER BY "chantierId", ordre FOR UPDATE`;
		if (verrou.length !== new Set(lotIds).size) throw new ErreurMetier('Lot introuvable.');
		return operation(tx);
	}, { timeout: 20000 });
}
```

- [ ] **Step 5: Les données de la réception**

Créer `src/donnees/receptions.ts` :

```ts
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { DONNEES_CHANGEES, imprimerReception, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import { batirReception, type SaisiesReception, type SaisiesReceptionCommunes, type SourceReception } from '@/documents/reception';
import type { DonneesReception } from '@/documents/schemas';
import { serieReception } from '@/documents/series';
import { verifierDate } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierReception, nomFichierReceptions } from '@/domaine/fichiers';
import {
	AUCUN_LOT_RECEPTIONNABLE, controlerLevee, controlerReception, DATE_RECEPTION, DECISIONS, LIMITES_PV, MOTIFS_TROP_LONGS, SANS_ENTREPRISE,
	TOUS_LES_LOTS, verifierReserves, verifierTexteCourt, type ChampReception, type ChampReceptionCommun, type Decision,
} from '@/domaine/reception';
import { dateParis, depuisIso, versIso } from '@/domaine/semaines';
import type { Parametres, Prisma, Reception } from '@/generated/prisma/client';
import { versDateCalendaire, versSaisieDate } from './chantiers';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import { sousVerrouLot, sousVerrouLots, type Tx } from './verrouLot';

export type PageReception = { lotId: string; entreprise: string; source: SourceReception; saisies: SaisiesReception };

/** Ce que l'aperçu du PV reçoit (Task 9) : il rebâtit chaque feuille à la frappe (`batirReception`). */
export type ReceptionsOuvertes = {
	chantierId: string;
	/** Id du lot, ou TOUS_LES_LOTS. */
	cible: string;
	/** Menu « Procès-verbal pour » : les lots réceptionnables, dans l'ordre de saisie. */
	options: { lotId: string; libelle: string; entreprise: string }[];
	commun: SaisiesReceptionCommunes;
	pages: PageReception[];
	blocage: string | null;
};

export type ResultatReception = ResultatGeneration & { lotId: string; entreprise: string };

const INTROUVABLE = 'Chantier introuvable.';
const INCLURE = {
	lots: { orderBy: { ordre: 'asc' as const }, include: { artisan: { select: { nom: true, interlocuteur: true } }, reception: true } },
} satisfies Prisma.ChantierInclude;
type ChantierReception = Prisma.ChantierGetPayload<{ include: typeof INCLURE }>;
type LotReception = ChantierReception['lots'][number];

const libelleLot = (l: { numero: string | null; designation: string }) => `${l.numero ? `${l.numero} — ` : ''}${l.designation}`;
const jsonDe = (d: DonneesReception) => d as unknown as Prisma.InputJsonValue;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou des lots. */
async function lire(client: Tx, chantierId: string): Promise<{ chantier: ChantierReception; parametres: Parametres } | null> {
	const chantier = await client.chantier.findUnique({ where: { id: chantierId }, include: INCLURE });
	if (!chantier) return null;
	return { chantier, parametres: (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT };
}

function sourceReception(c: ChantierReception, l: LotReception, p: Parametres): SourceReception {
	return {
		chantier: { maitreOuvrage: c.maitreOuvrage, adresse: c.adresse, cp: c.cp, commune: c.commune, mission: c.mission },
		lot: { id: l.id, numero: l.numero, designation: l.designation, entreprise: l.artisan?.nom ?? null, retenueGarantie: l.retenueGarantie.toString() },
		societe: { adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email, siteWeb: p.siteWeb },
	};
}

function saisiesDe(l: LotReception): SaisiesReception {
	const r: Reception | null = l.reception;
	if (!r) return { decision: 'SANS_RESERVES', dateEffet: '', reserves: '', delai: '', motifs: '', representant: l.artisan?.interlocuteur ?? '' };
	return { decision: r.decision, dateEffet: versSaisieDate(r.dateEffet), reserves: r.reserves, delai: r.delai, motifs: r.motifs, representant: r.representant };
}

const communDe = (c: ChantierReception): SaisiesReceptionCommunes => ({
	date: versSaisieDate(c.receptionDate), signataire: c.receptionSignataire, contrat: versSaisieDate(c.contratMoeDate), maitreOeuvre: c.receptionMaitreOeuvre,
});

/**
 * Appelée par la page Documents à chaque ouverture (`?pv=`) : champs communs vides remplis (aujourd'hui, date de
 * signature prévue, chargé d'affaire), brouillons des lots visés créés. Nul si le lot n'est pas de ce chantier.
 */
export async function preparerReceptions(chantierId: string, cible: string, maintenant = new Date()): Promise<ReceptionsOuvertes | null> {
	const avant = await lire(prisma, chantierId);
	if (!avant) return null;
	if (cible !== TOUS_LES_LOTS && !avant.chantier.lots.some((l) => l.id === cible)) return null;
	const receptionnables = avant.chantier.lots.filter((l) => l.artisan);
	const vises = receptionnables.filter((l) => cible === TOUS_LES_LOTS || l.id === cible);
	const blocage = !receptionnables.length ? AUCUN_LOT_RECEPTIONNABLE : !vises.length ? SANS_ENTREPRISE : null;
	if (!blocage) {
		const { name } = await prisma.utilisateur.findUniqueOrThrow({ where: { id: avant.chantier.chargeAffaireId }, select: { name: true } });
		// La date du jour passe en texte : `::date` la prend telle quelle, sans décalage de fuseau.
		await prisma.$executeRaw`
			UPDATE "Chantier" SET
				"receptionDate" = COALESCE("receptionDate", ${versIso(dateParis(maintenant))}::date),
				"contratMoeDate" = COALESCE("contratMoeDate", "dateSignaturePrevue"),
				"receptionMaitreOeuvre" = CASE WHEN "receptionMaitreOeuvre" = '' THEN ${name} ELSE "receptionMaitreOeuvre" END
			WHERE id = ${chantierId}`;
		await prisma.reception.createMany({
			data: vises.filter((l) => !l.reception).map((l) => ({ lotId: l.id, representant: l.artisan?.interlocuteur ?? '' })),
			skipDuplicates: true,
		});
	}
	const apres = await lire(prisma, chantierId);
	if (!apres) return null;
	const { chantier, parametres } = apres;
	const lots = chantier.lots.filter((l) => l.artisan && (cible === TOUS_LES_LOTS || l.id === cible));
	return {
		chantierId, cible,
		options: chantier.lots.filter((l) => l.artisan).map((l) => ({ lotId: l.id, libelle: libelleLot(l), entreprise: l.artisan?.nom ?? '' })),
		commun: communDe(chantier),
		pages: blocage ? [] : lots.map((l) => ({ lotId: l.id, entreprise: l.artisan?.nom ?? '', source: sourceReception(chantier, l, parametres), saisies: saisiesDe(l) })),
		blocage,
	};
}

type ChampsReception = Partial<Pick<Reception, 'decision' | 'dateEffet' | 'reserves' | 'delai' | 'motifs' | 'representant'>>;

function donneesChamp(champ: ChampReception, valeur: string): ChampsReception {
	switch (champ) {
		case 'decision':
			return { decision: z.enum(DECISIONS).parse(valeur) };
		case 'dateEffet':
			return { dateEffet: versDateCalendaire(valeur) };
		case 'reserves':
			return { reserves: verifierReserves(valeur) };
		case 'motifs':
			if (valeur.length > LIMITES_PV.long) throw new ErreurMetier(MOTIFS_TROP_LONGS, 'motifs');
			return { motifs: valeur };
		case 'delai':
			return { delai: verifierTexteCourt(valeur, champ) };
		case 'representant':
			return { representant: verifierTexteCourt(valeur, champ) };
	}
}

export async function modifierChampReception(lotId: string, champ: ChampReception, valeur: string): Promise<void> {
	const data = donneesChamp(champ, valeur);
	await sousVerrouLot(lotId, async (tx, lot) => {
		if (!lot.artisanId) throw new ErreurMetier(SANS_ENTREPRISE);
		await tx.reception.upsert({ where: { lotId }, create: { lotId, ...data }, update: data });
	});
}

/** Une colonne de `Chantier` : le changement vaut pour toutes les pages ouvertes. */
export async function modifierChampReceptionCommun(chantierId: string, champ: ChampReceptionCommun, valeur: string): Promise<void> {
	const data: Prisma.ChantierUpdateManyMutationInput =
		champ === 'date' ? { receptionDate: versDateCalendaire(valeur) }
		: champ === 'contrat' ? { contratMoeDate: versDateCalendaire(valeur) }
		: champ === 'signataire' ? { receptionSignataire: verifierTexteCourt(valeur, champ) }
		: { receptionMaitreOeuvre: verifierTexteCourt(valeur, champ) };
	const { count } = await prisma.chantier.updateMany({ where: { id: chantierId }, data });
	if (!count) throw new ErreurMetier(INTROUVABLE);
}

type Feuille = { lot: LotReception; entreprise: string; donnees: DonneesReception };

/**
 * Les feuilles des lots demandés (ceux que l'aperçu affichait), dans l'ordre de saisie, contrôlées.
 * Le refus d'un lot porte son id dans `champ` : l'aperçu passe sur lui. `DATE_RECEPTION` porte le nom du champ.
 */
async function construire(client: Tx, chantierId: string, lotIds: string[]): Promise<{ chantier: ChantierReception; feuilles: Feuille[] }> {
	const lu = await lire(client, chantierId);
	if (!lu) throw new ErreurMetier(INTROUVABLE);
	const { chantier, parametres } = lu;
	const demandes = new Set(lotIds);
	if (!demandes.size) throw new ErreurMetier(AUCUN_LOT_RECEPTIONNABLE);
	const vises = chantier.lots.filter((l) => demandes.has(l.id));
	if (vises.length !== demandes.size) throw new ErreurMetier('Lot introuvable.');
	const commun = communDe(chantier);
	if (!commun.date) throw new ErreurMetier(DATE_RECEPTION, 'date');
	const feuilles = vises.map((l) => {
		if (!l.artisan) throw new ErreurMetier(SANS_ENTREPRISE, l.id);
		const saisies = saisiesDe(l);
		const refus = controlerReception({ entreprise: l.artisan.nom, decision: saisies.decision, reserves: saisies.reserves, motifs: saisies.motifs });
		if (refus) throw new ErreurMetier(refus, l.id);
		return { lot: l, entreprise: l.artisan.nom, donnees: batirReception(sourceReception(chantier, l, parametres), saisies, commun) };
	});
	return { chantier, feuilles };
}

/**
 * Un lot ou tous (spec § 6). `lotIds` : les pages de l'aperçu ; un lot attribué depuis n'est pas ajouté, un lot
 * qui a perdu son entreprise refuse tout. Feuilles contrôlées, PDF rendus hors transaction pour les seules
 * feuilles changées, puis sous le verrou de tous les lots : feuilles refaites (`DONNEES_CHANGEES` si l'une
 * diffère), versions insérées, levée effacée pour chaque nouvelle version. Un refus n'écrit rien.
 */
export async function genererReceptions(chantierId: string, lotIds: string[], utilisateurId: string, deps: Dependances = {}): Promise<ResultatReception[]> {
	const { feuilles } = await construire(prisma, chantierId, lotIds);
	const prets = new Map<string, { empreinte: string; pdf: Uint8Array | null }>();
	for (const f of feuilles) {
		const empreinte = empreinteDocument(f.donnees);
		const derniere = await prisma.document.findFirst({
			where: { chantierId, serie: serieReception(f.lot.id) }, orderBy: { version: 'desc' }, select: { empreinte: true },
		});
		prets.set(f.lot.id, { empreinte, pdf: derniere?.empreinte === empreinte ? null : await rendrePdfDocument(f.donnees, deps.rendrePdf ?? imprimerReception) });
	}
	return sousVerrouLots([...prets.keys()], async (tx) => {
		const { chantier, feuilles: fraiches } = await construire(tx, chantierId, lotIds);
		if (fraiches.length !== prets.size || fraiches.some((f) => prets.get(f.lot.id)?.empreinte !== empreinteDocument(f.donnees))) {
			throw new ErreurMetier(DONNEES_CHANGEES);
		}
		const resultats: ResultatReception[] = [];
		for (const f of fraiches) {
			const { empreinte, pdf } = prets.get(f.lot.id)!;
			const serie = { chantierId, serie: serieReception(f.lot.id) };
			const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
			if (courante?.empreinte === empreinte) {
				resultats.push({ documentId: courante.id, version: courante.version, nomFichier: courante.nomFichier, nouvelle: false, lotId: f.lot.id, entreprise: f.entreprise });
				continue;
			}
			// Une autre version est parue pendant le rendu : ce contenu n'a pas de PDF prêt.
			if (!pdf) throw new ErreurMetier(DONNEES_CHANGEES);
			const version = (courante?.version ?? 0) + 1;
			const nomFichier = nomFichierReception({
				reference: chantier.reference, numero: f.lot.numero, designation: f.lot.designation, nature: f.lot.nature, version,
			});
			const doc = await tx.document.create({
				data: {
					...serie, lotId: f.lot.id, type: 'PV_RECEPTION', version, donnees: jsonDe(f.donnees), empreinte,
					pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
				},
			});
			// Nouveau PV : l'ancienne levée ne vaut plus pour lui (spec § 6).
			await tx.reception.update({ where: { lotId: f.lot.id }, data: { reservesLeveesLe: null } });
			resultats.push({ documentId: doc.id, version, nomFichier, nouvelle: true, lotId: f.lot.id, entreprise: f.entreprise });
		}
		return resultats;
	});
}

/** Décision et date de réception du dernier PV émis du lot, ou nul. */
async function dernierPv(client: Tx, lotId: string): Promise<{ decision: Decision; date: string } | null> {
	const d = await client.document.findFirst({ where: { serie: serieReception(lotId), lotId }, orderBy: { version: 'desc' }, select: { donnees: true } });
	if (!d) return null;
	const c = (d.donnees as unknown as DonneesReception).contenu;
	return { decision: c.decision, date: c.dateReception };
}

export async function leverReserves(lotId: string, date: string): Promise<{ chantierId: string }> {
	const jour = verifierDate(date.trim());
	return sousVerrouLot(lotId, async (tx, lot) => {
		controlerLevee(await dernierPv(tx, lotId), jour);
		await tx.reception.update({ where: { lotId }, data: { reservesLeveesLe: depuisIso(jour) } });
		return { chantierId: lot.chantierId };
	});
}

export async function annulerLevee(lotId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		await tx.reception.updateMany({ where: { lotId }, data: { reservesLeveesLe: null } });
		return { chantierId: lot.chantierId };
	});
}

/** PV de CE chantier seulement, une page par lot dans l'ordre de saisie ; sinon nul. Le PDF assemblé n'est pas stocké. */
export async function assemblerReceptions(chantierId: string, documentIds: string[]): Promise<{ pdf: Uint8Array; nomFichier: string } | null> {
	const ids = [...new Set(documentIds)];
	if (!ids.length) return null;
	const docs = await prisma.document.findMany({
		where: { id: { in: ids } },
		select: { chantierId: true, type: true, pdf: true, lot: { select: { ordre: true } }, chantier: { select: { reference: true } } },
	});
	if (docs.length !== ids.length || docs.some((d) => d.chantierId !== chantierId || d.type !== 'PV_RECEPTION')) return null;
	const sortie = await PDFDocument.create();
	for (const d of docs.sort((a, b) => (a.lot?.ordre ?? 0) - (b.lot?.ordre ?? 0))) {
		const source = await PDFDocument.load(d.pdf);
		for (const page of await sortie.copyPages(source, source.getPageIndices())) sortie.addPage(page);
	}
	return { pdf: await sortie.save(), nomFichier: nomFichierReceptions(docs[0].chantier.reference) };
}
```

Remarque sur `leverReserves` : la levée n'existe que si le dernier PV est « avec réserves » ; ce PV a été généré depuis un brouillon, donc la ligne `Reception` existe et `update` suffit.

- [ ] **Step 6: Les Server Actions et la route**

Créer `src/actions/receptions.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ChampReception, ChampReceptionCommun } from '@/domaine/reception';
import {
	annulerLevee, genererReceptions, leverReserves, modifierChampReception, modifierChampReceptionCommun, type ResultatReception,
} from '@/donnees/receptions';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const id = z.string().min(1);
const champLot = z.enum(['decision', 'dateEffet', 'reserves', 'delai', 'motifs', 'representant']);
const champCommun = z.enum(['date', 'signataire', 'contrat', 'maitreOeuvre']);
const valeur = z.string().max(4000);

/** Pas de rafraîchissement : la page Documents ne montre que les PV émis. */
export async function modifierChampReceptionAction(lotId: string, champ: ChampReception, v: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampReception(id.parse(lotId), champLot.parse(champ), valeur.parse(v));
		return null;
	});
}

export async function modifierChampReceptionCommunAction(chantierId: string, champ: ChampReceptionCommun, v: string): Promise<Resultat> {
	return executer({}, async () => {
		await modifierChampReceptionCommun(id.parse(chantierId), champCommun.parse(champ), valeur.parse(v));
		return null;
	});
}

/** `lotIds` : les pages que l'aperçu affiche, et elles seules. */
export async function genererReceptionsAction(chantierId: string, lotIds: string[]): Promise<Resultat<ResultatReception[]>> {
	return executer({}, async (u) => {
		const r = await genererReceptions(id.parse(chantierId), z.array(id).max(200).parse(lotIds), u.id);
		rafraichir(chantierId);
		return r;
	});
}

export async function leverReservesAction(lotId: string, date: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await leverReserves(id.parse(lotId), z.string().max(10).parse(date))).chantierId);
		return null;
	});
}

export async function annulerLeveeAction(lotId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await annulerLevee(id.parse(lotId))).chantierId);
		return null;
	});
}
```

Créer `src/app/api/chantiers/[id]/receptions-pdf/route.ts` :

```ts
import { utilisateurConnecte } from '@/auth/session';
import { enTeteTelechargement } from '@/domaine/fichiers';
import { assemblerReceptions } from '@/donnees/receptions';

/** Les PV de « Tous les lots », une page par lot, pour l'impression ; refuse tout document qui n'est pas un PV du chantier. */
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const ids = (new URL(requete.url).searchParams.get('documents') ?? '').split(',').filter(Boolean).slice(0, 200);
	const assemble = await assemblerReceptions((await params).id, ids);
	if (!assemble) return new Response('Documents introuvables', { status: 404 });
	return new Response(Buffer.from(assemble.pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': enTeteTelechargement(assemble.nomFichier),
			'Cache-Control': 'private, no-store',
		},
	});
}
```

- [ ] **Step 7: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/receptions.int.test.ts src/donnees/avenants.int.test.ts src/donnees/acomptes.int.test.ts`
Expected: aucune erreur ; PASS (les tests du verrou du lot restent verts).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/domaine/fichiers.ts src/domaine/fichiers.test.ts src/donnees/verrouLot.ts src/donnees/receptions.ts src/donnees/receptions.int.test.ts src/actions/receptions.ts "src/app/api/chantiers/[id]/receptions-pdf/route.ts"
git commit -m "feat(suivi): PV de réception par lot ou pour tous, générés sous verrou des lots, levée des réserves, PDF assemblé"
```

---

### Task 7: États de la page Documents (comptes rendus, case Réception, historique, résumé)

**Files:**
- Modify: `src/documents/etats.ts`
- Test: `src/documents/etatsSuivi.int.test.ts`

**Interfaces:**
- Consumes: `texteRendezVous` (Task 1) ; `etatReception`, `type CaseReceptionEtat` (Task 1) ; `serieCompteRendu`, `serieReception` (Task 2) ; `type DonneesReception` (Task 5) ; `creerBrouillon`, `modifierChampCompteRendu`, `enregistrerCompteRendu`, `corrigerCompteRendu`, `ouvrirCompteRendu` (Task 4) ; `preparerReceptions`, `modifierChampReception`, `genererReceptions`, `leverReserves` (Task 6) ; `dateCourteSlash` ; `versIso`.
- Produces, dans `src/documents/etats.ts` :
  - `type CompteRenduResume = { id: string; numero: number; date: string; versions: VersionResume[]; dernier: boolean }` (`date` : « 06/10/2026 »)
  - `type CarteComptesRendus = { brouillon: { numero: number } | null; liste: CompteRenduResume[]; prochainRdv: string | null }` (liste du plus grand numéro au plus petit ; `prochainRdv` : celui du dernier enregistré, « mardi 13/10 à 14h00 », '' s'il n'en fixe pas, nul sans compte rendu)
  - `type CaseReception = CaseReceptionEtat & { derniere: VersionResume | null; leveeLe: string | null }`
  - `LigneDocuments.reception: CaseReception | null` (nul pour un lot sans entreprise)
  - `VueDocuments.comptesRendus: CarteComptesRendus`, `VueDocuments.resume: { nombre: number; dernierLe: string | null }` (`dernierLe` : ISO)
  - l'historique d'un lot comprend les versions de ses PV, `libelle: 'PV'`

- [ ] **Step 1: Le test**

Créer `src/documents/etatsSuivi.int.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu, ouvrirCompteRendu } from '@/donnees/comptesRendus';
import { prisma } from '@/donnees/prisma';
import { genererReceptions, leverReserves, modifierChampReception, preparerReceptions } from '@/donnees/receptions';
import { TOUS_LES_LOTS } from '@/domaine/reception';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier } from './etats';

const deps = { rendrePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])) };
const LE_12_OCTOBRE = new Date('2026-10-12T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;

const vue = () => etatsDocumentsChantier(p.chantierId);
const ligne = async (designation: string) =>
	(await vue()).entreprises.flatMap((g) => g.lots).find((l) => l.lotTexte.endsWith(designation))!;

describe('page Documents : comptes rendus et réceptions', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('chantier neuf : aucun compte rendu, « + Réception » pour un lot attribué, rien pour un lot sans entreprise', async () => {
		const v = await vue();
		expect(v.comptesRendus).toEqual({ brouillon: null, liste: [], prochainRdv: null });
		expect(v.resume).toEqual({ nombre: 0, dernierLe: null });
		expect((await ligne('GROS ŒUVRE')).reception).toEqual({ etat: 'a-produire', texte: '+ Réception', alerte: false, derniere: null, leveeLe: null });
		expect((await ligne('ENDUIT EXTÉRIEUR')).reception).toBeNull();
	});

	it('carte Comptes rendus : dernier enregistré, prochain rendez-vous, brouillon en cours, versions', async () => {
		const premier = await creerBrouillon(p.chantierId, new Date('2026-10-06T08:00:00Z'));
		await modifierChampCompteRendu(premier.id, 'avancement', 'Fondations coulées');
		await modifierChampCompteRendu(premier.id, 'rdvDate', '2026-10-13');
		await modifierChampCompteRendu(premier.id, 'rdvHeure', '14:00');
		await enregistrerCompteRendu(premier.id, p.utilisateurId, deps);
		let c = (await vue()).comptesRendus;
		expect(c).toMatchObject({ brouillon: null, prochainRdv: 'mardi 13/10 à 14h00' });
		expect(c.liste).toEqual([{ id: premier.id, numero: 1, date: '06/10/2026', versions: [expect.objectContaining({ version: 1, type: 'COMPTE_RENDU' })], dernier: true }]);

		const ouvert = await ouvrirCompteRendu(premier.id, p.chantierId, 'correction');
		await corrigerCompteRendu(premier.id, { ...ouvert!.saisies, rdvDate: '', rdvHeure: '' }, p.utilisateurId, deps);
		await creerBrouillon(p.chantierId);
		c = (await vue()).comptesRendus;
		expect(c.brouillon).toEqual({ numero: 2 });
		expect(c.prochainRdv).toBe('');
		expect(c.liste[0].versions.map((x) => x.version)).toEqual([2, 1]);

		const v = await vue();
		expect(v.resume.nombre).toBe(2);
		expect(v.resume.dernierLe).toBe(c.liste[0].versions[0].creeLe);
	});

	it('case Réception : avec réserves (orangé), levée (bleu), différée (orangé) ; les PV dans l\'historique', async () => {
		const peinture = p.lots.PEINTURE;
		const tous = (await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE))!.pages.map((x) => x.lotId);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints');
		await genererReceptions(p.chantierId, tous, p.utilisateurId, deps);

		expect((await ligne('GROS ŒUVRE')).reception).toMatchObject({ etat: 'sans-reserves', texte: 'Sans réserves · 12/10', alerte: false });
		let l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'avec-reserves', texte: 'Avec réserves · 12/10', alerte: true, leveeLe: null, derniere: { version: 1 } });
		expect(l.historique).toEqual([expect.objectContaining({ type: 'PV_RECEPTION', libelle: 'PV', version: 1 })]);

		await leverReserves(peinture, '2026-10-20');
		l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'levee', texte: 'Réserves levées le 20/10', alerte: false, leveeLe: '2026-10-20' });

		await modifierChampReception(peinture, 'decision', 'DIFFEREE');
		await modifierChampReception(peinture, 'motifs', 'Peinture fraîche');
		await genererReceptions(p.chantierId, [peinture], p.utilisateurId, deps);
		l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'differee', texte: 'Différée · 12/10', alerte: true, leveeLe: null, derniere: { version: 2 } });
		expect(l.historique.map((h) => [h.libelle, h.version])).toEqual([['PV', 2], ['PV', 1]]);
	});

	it('une entreprise renommée ne rend ni le compte rendu ni le PV « modifiés » : ils n\'ont pas d\'état', async () => {
		const b = await creerBrouillon(p.chantierId);
		await modifierChampCompteRendu(b.id, 'avancement', 'x');
		await enregistrerCompteRendu(b.id, p.utilisateurId, deps);
		await preparerReceptions(p.chantierId, p.lots['GROS ŒUVRE']);
		await genererReceptions(p.chantierId, [p.lots['GROS ŒUVRE']], p.utilisateurId, deps);
		const avant = await vue();
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
		const apres = await vue();
		expect(apres.comptesRendus).toEqual(avant.comptesRendus);
		expect(apres.entreprises.flatMap((g) => g.lots).find((x) => x.lotId === p.lots['GROS ŒUVRE'])?.reception)
			.toEqual(avant.entreprises.flatMap((g) => g.lots).find((x) => x.lotId === p.lots['GROS ŒUVRE'])?.reception);
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/documents/etatsSuivi.int.test.ts`
Expected: FAIL — `comptesRendus`, `resume` et `reception` absents de la vue.

- [ ] **Step 3: Les états**

Dans `src/documents/etats.ts` :

1. Imports à ajouter :

```ts
import { dateCourteSlash } from '@/domaine/certificats';
import { texteRendezVous } from '@/domaine/compteRendu';
import { etatReception, type CaseReceptionEtat } from '@/domaine/reception';
import { versIso } from '@/domaine/semaines';
```

et, dans les imports existants, `type DonneesReception` depuis `./schemas` et `serieCompteRendu, serieReception` depuis `./series`.

2. Types, après `CaseCertificat` :

```ts
/** La case Réception d'un lot attribué : l'état du dernier PV émis (jamais « modifié » : un PV est un acte daté). */
export type CaseReception = CaseReceptionEtat & { derniere: VersionResume | null; leveeLe: string | null };
/** Un compte rendu enregistré ; `date` : « 06/10/2026 ». Pas d'état : il n'est jamais reconstruit (spec § 5). */
export type CompteRenduResume = { id: string; numero: number; date: string; versions: VersionResume[]; dernier: boolean };
export type CarteComptesRendus = {
	brouillon: { numero: number } | null;
	/** Du plus grand numéro au plus petit. */
	liste: CompteRenduResume[];
	/** Celui du dernier enregistré, « mardi 13/10 à 14h00 » ; '' s'il n'en fixe pas ; nul sans compte rendu. */
	prochainRdv: string | null;
};
```

Dans `LigneDocuments`, après `certificatPossible: boolean;` :

```ts
	/** Nul pour un lot sans entreprise. */
	reception: CaseReception | null;
```

et changer le commentaire de `historique` en « Versions du marché, des lettres d'avenants (supprimés compris) et des PV de réception, de la plus récente à la plus ancienne. ».

Dans `VueDocuments`, après `visa: SerieVisa;` :

```ts
	comptesRendus: CarteComptesRendus;
	/** En-tête de la page : « 23 documents · dernier le 06/10/2026 ». `dernierLe` : ISO. */
	resume: { nombre: number; dernierLe: string | null };
```

3. Dans `etatsDocumentsChantier`, remplacer le `Promise.all` et la ligne `numeroLettre` qui le suit (les cinq premières lectures sont celles du code livré, inchangées ; les trois dernières sont nouvelles) :

```ts
	const [{ chantier, lots, parametres }, docs, empreinteDuPlanning, acomptes, lettres, comptesRendus, proces, receptions] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({ where: { chantierId }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
		prisma.acompte.findMany({ where: { lot: { chantierId } }, orderBy: { numero: 'asc' }, select: { id: true, lotId: true, numero: true, manuel: true } }),
		// Le numéro imprimé d'une lettre survit à son avenant : il sert à l'historique des avenants supprimés.
		prisma.document.findMany({ where: { chantierId, type: 'AVENANT' }, select: { id: true, donnees: true } }),
		prisma.compteRendu.findMany({
			where: { chantierId }, orderBy: { numero: 'desc' },
			select: { id: true, numero: true, statut: true, date: true, rdvDate: true, rdvHeure: true },
		}),
		// Décision et date de chaque PV : l'état de la case vient du dernier émis, jamais d'une reconstruction.
		prisma.document.findMany({ where: { chantierId, type: 'PV_RECEPTION' }, select: { id: true, donnees: true } }),
		prisma.reception.findMany({ where: { lot: { chantierId } }, select: { lotId: true, reservesLeveesLe: true } }),
	]);
	const numeroLettre = new Map(lettres.map((d) => [d.id, (d.donnees as { contenu?: { numero?: string } }).contenu?.numero ?? '?']));
	const contenuPv = new Map(proces.map((d) => [d.id, (d.donnees as unknown as DonneesReception).contenu]));
	const levees = new Map(receptions.map((r) => [r.lotId, r.reservesLeveesLe ? versIso(r.reservesLeveesLe) : null]));
```

4. Dans la boucle des lots, avant `const ligne: LigneDocuments = {` :

```ts
		const pvs = docsDe(serieReception(lot.id));
		const dernierPv = pvs[0] ? contenuPv.get(pvs[0].id) : undefined;
		const leveeLe = levees.get(lot.id) ?? null;
```

puis dans l'objet, après `certificatPossible: …,` :

```ts
			reception: lot.artisan ? {
				...etatReception(dernierPv ? { decision: dernierPv.decision, date: dernierPv.dateReception } : null, leveeLe),
				derniere: pvs[0] ? resume(pvs[0]) : null,
				leveeLe,
			} : null,
```

et remplacer le calcul de `historique` par :

```ts
			historique: docs
				.filter((d) => d.lotId === lot.id && (d.serie === lot.id || d.serie === serieReception(lot.id) || avenantDeLaSerie(d.serie) !== null))
				.map((d) => {
					if (d.serie === serieReception(lot.id)) return { ...resume(d), libelle: 'PV' };
					const avenantId = avenantDeLaSerie(d.serie);
					if (avenantId === null) return resume(d);
					return { ...resume(d), libelle: `Avenant n° ${numeroLettre.get(d.id)}${actuels.has(avenantId) ? '' : ' · avenant supprimé'}` };
				})
				.sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
```

5. Dans l'objet renvoyé, après `visa: …,` :

```ts
		comptesRendus: carteComptesRendus(comptesRendus, docsDe),
		resume: {
			nombre: docs.length,
			dernierLe: docs.reduce<string | null>((plus, d) => {
				const t = d.creeLe.toISOString();
				return plus === null || t > plus ? t : plus;
			}, null),
		},
```

6. Ajouter, avant `etatsDocumentsChantier` :

```ts
type CompteRenduLu = { id: string; numero: number; statut: 'BROUILLON' | 'ENREGISTRE'; date: Date; rdvDate: Date | null; rdvHeure: string | null };

/** `comptesRendus` : du plus grand numéro au plus petit. */
function carteComptesRendus(comptesRendus: CompteRenduLu[], docsDe: (serie: string) => DocLu[]): CarteComptesRendus {
	const enregistres = comptesRendus.filter((c) => c.statut === 'ENREGISTRE');
	const brouillon = comptesRendus.find((c) => c.statut === 'BROUILLON');
	const dernier = enregistres[0];
	return {
		brouillon: brouillon ? { numero: brouillon.numero } : null,
		liste: enregistres.map((c, i) => ({
			id: c.id, numero: c.numero, date: dateCourteSlash(versIso(c.date)), versions: docsDe(serieCompteRendu(c.id)).map(resume), dernier: i === 0,
		})),
		prochainRdv: dernier ? texteRendezVous(dernier.rdvDate ? versIso(dernier.rdvDate) : '', dernier.rdvHeure ?? '', true) : null,
	};
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx tsc --noEmit && npm run test:int -- src/documents/etatsSuivi.int.test.ts src/documents/etats.int.test.ts`
Expected: aucune erreur (le composant `TableauDocuments` compile : il n'utilise pas encore les nouveaux champs) ; PASS.

- [ ] **Step 5: Commit**

```bash
git add src/documents/etats.ts src/documents/etatsSuivi.int.test.ts
git commit -m "feat(suivi): états de la page Documents, comptes rendus, case Réception et PV dans l'historique"
```

---

### Task 8: Page Documents — carte Comptes rendus, aperçu du compte rendu, résumé ; parcours E2E 1 à 4

**Files:**
- Create: `src/composants/CarteComptesRendus.tsx`, `src/composants/ApercuCompteRendu.tsx`, `e2e/preparer-suivi.ts`, `e2e/suivi.spec.ts`
- Modify: `src/composants/TableauDocuments.tsx`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `package.json`

**Interfaces:**
- Consumes: `creerBrouillonAction`, `modifierChampCompteRenduAction`, `changerConvocationAction`, `abandonnerBrouillonAction`, `enregistrerCompteRenduAction`, `corrigerCompteRenduAction`, `lireBrouillon`, `ouvrirCompteRendu`, `type CompteRenduOuvert` (Task 4) ; `batirCompteRendu`, `CompteRendu`, `type EditionCompteRendu` (Task 3) ; `coordinationBase`, `convocationSuivante`, `numeroTexte`, `type ChampCompteRendu` (Task 1) ; `type CarteComptesRendus`, `VueDocuments.resume` (Task 7) ; `TITRES_TYPES`, `CSS_DOCUMENTS` ; `seConnecter`, `ADMIN`, `telecharger` (E2E).
- Produces:
  - `CarteComptesRendus({ chantierId, carte })` (client), `data-serie="comptes-rendus"`, suivi dans `data-testid="suite-comptes-rendus"`
  - `ApercuCompteRendu({ ouvert, reference })` (client), dialogue « Compte rendu de chantier »
  - page Documents : `?cr=brouillon`, `?cr=<id>`, `?corriger-cr=<id>` ; ligne de résumé `data-testid="resume-documents"`
  - chantier E2E `SUIVI` (`e2e/preparer-suivi.ts`, enchaîné dans `e2e:serveur`) ; `e2e/suivi.spec.ts` (étapes 1 à 4, complétée par les Tasks 9 et 10)

- [ ] **Step 1: Le chantier E2E et le parcours (étapes 1 à 4)**

Créer `e2e/preparer-suivi.ts` :

```ts
import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';
import { PERRIER_ARTISANS, PERRIER_CHANTIER, PERRIER_LOTS } from '../tests/fixtures/perrier';

/** Chantier `SUIVI` : une copie de PERRIER pour le parcours du suivi de chantier (spec § 10). */
const REFERENCE = 'SUIVI';

async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
	const artisans: Record<string, string> = {};
	for (const a of Object.values(PERRIER_ARTISANS)) {
		artisans[a.nom] = (await prisma.artisan.upsert({ where: { nom: a.nom }, create: a, update: {} })).id;
	}
	const { chargeAffaire: _nom, reference: _ref, ...chantier } = PERRIER_CHANTIER;
	const c = await prisma.chantier.create({ data: { ...chantier, reference: REFERENCE, chargeAffaireId: admin.id, creeParId: admin.id } });
	for (const [i, l] of PERRIER_LOTS.entries()) {
		await prisma.lot.create({ data: {
			chantierId: c.id, ordre: i + 1, numero: l.numero, designation: l.designation, nature: l.nature,
			artisanId: l.artisan ? artisans[l.artisan.nom] : null, montantHtInitial: l.montantHtInitial,
			tauxTva: l.tauxTva, retenueGarantie: l.retenueGarantie, exemplaires: l.exemplaires,
			corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere, dateSignature: l.dateSignature,
		} });
	}
	console.log(`Suivi de chantier E2E : chantier ${REFERENCE} prêt.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
```

Dans `package.json`, script `e2e:serveur` : ajouter `&& tsx e2e/preparer-suivi.ts` juste après `tsx e2e/preparer-financier.ts`.

Créer `e2e/suivi.spec.ts` :

```ts
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';
import { telecharger } from './aidePlanning';

test.describe.configure({ mode: 'serial' });

async function ouvrirDocuments(page: Page) {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.getByRole('link', { name: 'SUIVI', exact: true }).click();
	await page.getByRole('link', { name: 'Documents', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Documents du chantier' })).toBeVisible();
}

const carteCr = (page: Page) => page.locator('[data-serie="comptes-rendus"]');
const dialogueCr = (page: Page) => page.getByRole('dialog', { name: 'Compte rendu de chantier' });

// Spec § 10, étapes 1 à 4.
test('comptes rendus : brouillon repris, enregistré, suivant, abandon, correction', async ({ page }) => {
	test.setTimeout(180_000);
	await ouvrirDocuments(page);
	await expect(page.getByTestId('resume-documents')).toHaveText('Aucun document produit pour ce chantier.');
	await expect(carteCr(page).getByTestId('suite-comptes-rendus')).toHaveText('Le premier reprend les lots et les entreprises');

	// 1. Nouveau compte rendu : avancement, coordination, convocation ; tout est là après rechargement.
	await carteCr(page).getByRole('button', { name: 'Nouveau compte rendu' }).click();
	let cr = dialogueCr(page);
	await expect(cr).toContainText('Brouillon n° 01');
	await cr.getByRole('textbox', { name: 'Avancement' }).fill('Fondations coulées');
	await cr.getByRole('textbox', { name: 'Coordination' }).fill('GROS ŒUVRE : **reprise** du mur');
	await cr.getByRole('button', { name: 'Convocation GROS ŒUVRE : D' }).click();
	await expect(cr.getByRole('button', { name: 'Convocation GROS ŒUVRE : C' })).toBeVisible();
	await page.goto(page.url().split('?')[0]);
	await expect(carteCr(page).getByTestId('suite-comptes-rendus')).toHaveText('Brouillon n° 01 en cours');
	await carteCr(page).getByRole('link', { name: 'Reprendre le brouillon' }).click();
	cr = dialogueCr(page);
	await expect(cr.getByRole('textbox', { name: 'Avancement' })).toHaveValue('Fondations coulées');
	await expect(cr.getByRole('textbox', { name: 'Coordination' })).toHaveValue('GROS ŒUVRE : **reprise** du mur');
	await expect(cr.getByRole('button', { name: 'Convocation GROS ŒUVRE : C' })).toBeVisible();

	// 2. Enregistrer : le toast propose le PDF v1 ; la carte montre le n° 01.
	await cr.getByRole('button', { name: 'Enregistrer le n° 01' }).click();
	await expect(cr).toBeHidden();
	await expect(page.getByText('Compte rendu n° 01 enregistré.')).toBeVisible();
	expect(await telecharger(page, () => page.getByRole('button', { name: 'Télécharger le PDF' }).click())).toBe('SUIVI-CompteRendu01-v1.pdf');
	await expect(carteCr(page).getByRole('link', { name: /^n° 01 · \d{2}\/\d{2}\/\d{4}$/ })).toBeVisible();
	await expect(page.getByTestId('resume-documents')).toHaveText(/^1 document · dernier le \d{2}\/\d{2}\/\d{4}$/);

	// 3. Le suivant : n° 02, coordination et lettre C reprises, avancement vide.
	await carteCr(page).getByRole('button', { name: 'Nouveau compte rendu' }).click();
	cr = dialogueCr(page);
	await expect(cr).toContainText('Brouillon n° 02');
	await expect(cr.getByRole('textbox', { name: 'Coordination' })).toHaveValue('GROS ŒUVRE : **reprise** du mur');
	await expect(cr.getByRole('textbox', { name: 'Avancement' })).toHaveValue('');
	await expect(cr.getByRole('button', { name: 'Convocation GROS ŒUVRE : C' })).toBeVisible();

	// 4. Abandonner le brouillon, puis corriger le n° 01 : v2.
	page.once('dialog', (d) => void d.accept());
	await cr.getByRole('button', { name: 'Abandonner le brouillon' }).click();
	await expect(cr).toBeHidden();
	await expect(carteCr(page).getByRole('button', { name: 'Nouveau compte rendu' })).toBeVisible();
	await carteCr(page).getByRole('link', { name: 'Corriger le n° 01' }).click();
	cr = dialogueCr(page);
	await expect(cr).toContainText('Correction du n° 01');
	await cr.getByRole('textbox', { name: 'Avancement' }).fill('Fondations coulées, dalle faite');
	expect(await telecharger(page, () => cr.getByRole('button', { name: 'Générer la v2' }).click())).toBe('SUIVI-CompteRendu01-v2.pdf');
	await expect(cr).toBeHidden();
	await expect(page.getByText('Version 2 générée.')).toBeVisible();

	// Correction sans changement : pas de v3, la v2 est téléchargée.
	await carteCr(page).getByRole('link', { name: 'Corriger le n° 01' }).click();
	cr = dialogueCr(page);
	await expect(cr.getByRole('textbox', { name: 'Avancement' })).toHaveValue('Fondations coulées, dalle faite');
	expect(await telecharger(page, () => cr.getByRole('button', { name: 'Générer la v3' }).click())).toBe('SUIVI-CompteRendu01-v2.pdf');
	await expect(page.getByText("Rien n'a changé depuis la version 2 : elle est téléchargée.")).toBeVisible();
	await expect(cr).toBeHidden();
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:e2e -- e2e/suivi.spec.ts`
Expected: FAIL — pas de carte `[data-serie="comptes-rendus"]` ni de `resume-documents`.

- [ ] **Step 3: La carte Comptes rendus**

Créer `src/composants/CarteComptesRendus.tsx` :

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { creerBrouillonAction } from '@/actions/comptesRendus';
import { Button, buttonVariants } from '@/components/ui/button';
import type { CarteComptesRendus as Carte } from '@/documents/etats';
import { numeroTexte } from '@/domaine/compteRendu';

/** Première carte « chantier entier » (spec § 7) : le dernier compte rendu, la suite, et de quoi en écrire un. */
export function CarteComptesRendus({ chantierId, carte }: { chantierId: string; carte: Carte }) {
	const router = useRouter();
	const [enCours, demarrer] = useTransition();
	const dernier = carte.liste[0];
	const suite = carte.brouillon ? `Brouillon n° ${numeroTexte(carte.brouillon.numero)} en cours`
		: carte.prochainRdv === null ? 'Le premier reprend les lots et les entreprises'
		: carte.prochainRdv ? `Prochain : ${carte.prochainRdv}`
		: 'Prochain rendez-vous non fixé';

	function nouveau() {
		demarrer(async () => {
			const r = await creerBrouillonAction(chantierId);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			router.push('?cr=brouillon', { scroll: false });
		});
	}

	return (
		<div data-serie="comptes-rendus" className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">Chantier entier</p>
				<h3 className="font-semibold">Comptes rendus de chantier</h3>
				<p className="text-xs text-muted-foreground">
					{dernier ? (
						<Link href={`?cr=${dernier.id}`} scroll={false} className="underline">{`n° ${numeroTexte(dernier.numero)} · ${dernier.date}`}</Link>
					) : 'Aucun compte rendu enregistré'}
				</p>
				<p data-testid="suite-comptes-rendus" className="text-xs text-muted-foreground">{suite}</p>
				{carte.liste.length > 0 && (
					<details className="text-xs">
						<summary className="cursor-pointer text-muted-foreground">
							{carte.liste.length} compte{carte.liste.length > 1 ? 's' : ''} rendu{carte.liste.length > 1 ? 's' : ''}
						</summary>
						<ul className="mt-1 space-y-0.5">
							{carte.liste.map((c) => (
								<li key={c.id}>
									<Link href={`?cr=${c.id}`} scroll={false} className="underline">{`n° ${numeroTexte(c.numero)}`}</Link>
									{` — ${c.date} — ${c.versions.length} version${c.versions.length > 1 ? 's' : ''}`}
									{c.versions[0] && <>{' · '}<a className="underline" href={`/api/documents/${c.versions[0].id}/pdf`}>PDF</a></>}
								</li>
							))}
						</ul>
					</details>
				)}
			</div>
			<div className="ml-auto flex gap-2">
				{dernier && (
					<Link href={`?corriger-cr=${dernier.id}`} scroll={false} className={buttonVariants({ variant: 'outline' })}>
						{`Corriger le n° ${numeroTexte(dernier.numero)}`}
					</Link>
				)}
				{carte.brouillon ? (
					<Link href="?cr=brouillon" scroll={false} className={buttonVariants()}>Reprendre le brouillon</Link>
				) : (
					<Button onClick={nouveau} disabled={enCours}>Nouveau compte rendu</Button>
				)}
			</div>
		</div>
	);
}
```

Dans `src/composants/TableauDocuments.tsx` : importer `CarteComptesRendus` depuis `./CarteComptesRendus` et, dans `TableauDocuments`, rendre `<CarteComptesRendus chantierId={vue.chantierId} carte={vue.comptesRendus} />` en premier enfant du `<div className="space-y-6">` (avant la carte du récapitulatif) : spec § 7, ordre Comptes rendus, Récapitulatif, Planning, Visa.

- [ ] **Step 4: L'aperçu du compte rendu**

Créer `src/composants/ApercuCompteRendu.tsx` :

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	abandonnerBrouillonAction, changerConvocationAction, corrigerCompteRenduAction, enregistrerCompteRenduAction, modifierChampCompteRenduAction,
} from '@/actions/comptesRendus';
import { Button, buttonVariants } from '@/components/ui/button';
import { batirCompteRendu, type SaisiesCompteRendu } from '@/documents/compteRendu';
import { CompteRendu, type EditionCompteRendu } from '@/documents/gabarits/CompteRendu';
import { TITRES_TYPES } from '@/documents/libelles';
import { CSS_DOCUMENTS } from '@/documents/styles';
import type { CompteRenduOuvert } from '@/donnees/comptesRendus';
import { convocationSuivante, coordinationBase, numeroTexte, type ChampCompteRendu } from '@/domaine/compteRendu';

/** Téléchargement sans quitter la page. */
function telecharger(documentId: string) {
	const lien = document.createElement('a');
	lien.href = `/api/documents/${documentId}/pdf`;
	lien.download = '';
	lien.click();
}

/** Champs contrôlés : un refus du serveur les remet à leur valeur d'avant. */
const CONTROLES: ChampCompteRendu[] = ['date', 'rdvDate', 'rdvHeure'];

/**
 * Aperçu plein écran du compte rendu (spec § 5).
 * - brouillon : chaque champ s'enregistre en base quand on le quitte (partagé avec les collègues) ;
 * - correction : les saisies vivent ici jusqu'à « Générer la vN » ; fermer après une modification demande confirmation ;
 * - lecture : la feuille figée de la dernière version.
 * `courant` double l'état : le clic sur un bouton suit la sortie du champ dans le même geste, avant le rendu suivant.
 */
export function ApercuCompteRendu({ ouvert, reference }: { ouvert: CompteRenduOuvert; reference: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const [saisies, setSaisies] = useState(ouvert.saisies);
	const courant = useRef(ouvert.saisies);
	const [generation, setGeneration] = useState(0);
	const [modifie, setModifie] = useState(false);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const { mode } = ouvert;
	const n = numeroTexte(ouvert.numero);

	function fermer(confirmer = true) {
		if (confirmer && mode === 'correction' && modifie && !window.confirm('Fermer sans enregistrer la correction ?')) return;
		router.replace(chemin, { scroll: false });
	}

	// Un document ouvert bloque le défilement de la page de derrière ; Échap le ferme.
	const fermerRef = useRef(fermer);
	useEffect(() => { fermerRef.current = fermer; });
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermerRef.current(); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, []);

	function changer(suivantes: SaisiesCompteRendu) {
		courant.current = suivantes;
		setSaisies(suivantes);
	}

	function suivre<T>(envoi: Promise<T>) {
		enregistrements.current.add(envoi);
		void envoi.finally(() => enregistrements.current.delete(envoi));
	}

	function surChamp(champ: ChampCompteRendu, valeur: string) {
		const avant = courant.current;
		// Vider la date du rendez-vous efface son heure (la base refuserait une heure sans date).
		changer({ ...avant, [champ]: valeur, ...(champ === 'rdvDate' && !valeur ? { rdvHeure: '' } : {}) });
		if (mode === 'correction') {
			setModifie(true);
			return;
		}
		suivre(modifierChampCompteRenduAction(ouvert.id, champ, valeur).then((r) => {
			if (r.ok) return;
			toast.error(r.erreur);
			if (CONTROLES.includes(champ)) changer({ ...courant.current, [champ]: avant[champ], rdvHeure: avant.rdvHeure });
		}));
	}

	function surConvocation(lotId: string) {
		if (mode === 'correction') {
			const c = courant.current.convocations;
			changer({ ...courant.current, convocations: { ...c, [lotId]: convocationSuivante(c[lotId]) } });
			setModifie(true);
			return;
		}
		suivre(changerConvocationAction(ouvert.id, lotId).then((r) => {
			if (r.ok) changer({ ...courant.current, convocations: r.donnees });
			else toast.error(r.erreur);
		}));
	}

	function repartir() {
		if (!window.confirm('Remplacer la coordination par les seuls intitulés des lots ? Le texte saisi sera perdu.')) return;
		surChamp('coordination', coordinationBase(ouvert.source.lots.map((l) => l.designation)));
		setGeneration((g) => g + 1);
	}

	/** La saisie encore ouverte part d'abord : rien n'est perdu. */
	async function attendreSaisies() {
		(document.activeElement as HTMLElement | null)?.blur();
		await Promise.all(enregistrements.current);
	}

	function abandonner() {
		if (!window.confirm('Abandonner ce brouillon ? Son contenu sera perdu.')) return;
		demarrer(async () => {
			await attendreSaisies();
			const r = await abandonnerBrouillonAction(ouvert.id);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			fermer(false);
			router.refresh();
		});
	}

	function enregistrer() {
		demarrer(async () => {
			await attendreSaisies();
			const r = await enregistrerCompteRenduAction(ouvert.id);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			const { documentId, numero } = r.donnees;
			toast.success(`Compte rendu n° ${numeroTexte(numero)} enregistré.`, {
				duration: 15_000,
				action: { label: 'Télécharger le PDF', onClick: () => telecharger(documentId) },
			});
			fermer(false);
			router.refresh();
		});
	}

	function corriger() {
		demarrer(async () => {
			await attendreSaisies();
			const r = await corrigerCompteRenduAction(ouvert.id, courant.current);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			// Libellés du certificat (écart assumé) : la spec § 5 ne fixe que « Rien n'a changé depuis la version N ».
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			telecharger(r.donnees.documentId);
			fermer(false);
			router.refresh();
		});
	}

	const lecture = mode === 'lecture';
	const donnees = lecture && ouvert.fige ? ouvert.fige : batirCompteRendu(ouvert.source, saisies);
	const edition: EditionCompteRendu = { saisies, generation, surChamp, surConvocation };
	const entete = mode === 'brouillon' ? `Brouillon n° ${n}` : mode === 'correction' ? `Correction du n° ${n}`
		: `N° ${n}${ouvert.derniere ? ` — version ${ouvert.derniere.version}` : ''}`;

	return (
		<div role="dialog" aria-label={TITRES_TYPES.COMPTE_RENDU} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{entete}</p>
					<p className="font-semibold">{reference}</p>
				</div>
				<div className="ml-auto flex flex-wrap items-center gap-3">
					{mode === 'brouillon' && (
						<>
							<span className="text-xs text-muted-foreground">Chaque champ bleu s&apos;enregistre quand on le quitte — le bleu ne s&apos;imprime pas.</span>
							<Button variant="outline" onClick={repartir} disabled={enCours}>Repartir des lots</Button>
							<Button variant="outline" onClick={abandonner} disabled={enCours}>Abandonner le brouillon</Button>
							<Button onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</Button>
						</>
					)}
					{mode === 'correction' && (
						<Button onClick={corriger} disabled={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</Button>
					)}
					{lecture && ouvert.derniere && (
						<a href={`/api/documents/${ouvert.derniere.documentId}/pdf`} className={buttonVariants({ variant: 'outline' })}>Télécharger le PDF</a>
					)}
					{lecture && ouvert.dernier && (
						<Button variant="outline" onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</Button>
					)}
					<Button variant="outline" onClick={() => fermer()}>Fermer</Button>
				</div>
			</header>
			{ouvert.blocage && <p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{ouvert.blocage}</p>}
			<div className="flex flex-1 flex-col items-center gap-3 overflow-auto overscroll-contain p-7">
				<CompteRendu donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
			</div>
		</div>
	);
}
```

- [ ] **Step 5: La page Documents**

Remplacer `src/app/(app)/chantiers/[id]/documents/page.tsx` par :

```tsx
import { ApercuCompteRendu } from '@/composants/ApercuCompteRendu';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { TableauDocuments } from '@/composants/TableauDocuments';
import { construireDonneesRecap } from '@/documents/donnees';
import { etatsDocumentsChantier, lireDocument, type VueDocuments } from '@/documents/etats';
import { TITRES_TYPES } from '@/documents/libelles';
import { lireBrouillon, ouvrirCompteRendu } from '@/donnees/comptesRendus';
import { dateDuJourTexte } from '@/domaine/regles';

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ apercu?: string; version?: string; cr?: string; 'corriger-cr'?: string }>;
};

/** « 23 documents · dernier le 06/10/2026 » (spec § 7). */
function texteResume({ nombre, dernierLe }: VueDocuments['resume']): string {
	if (!nombre || !dernierLe) return 'Aucun document produit pour ce chantier.';
	return `${nombre} document${nombre > 1 ? 's' : ''} · dernier le ${dateDuJourTexte(new Date(dernierLe)).replace(/\./g, '/')}`;
}

export default async function PageDocuments({ params, searchParams }: Props) {
	const { id } = await params;
	const { apercu, version, cr, 'corriger-cr': corrigerCr } = await searchParams;
	const vue = await etatsDocumentsChantier(id);
	let apercuDocument: React.ReactNode = null;
	if (apercu === 'recap') {
		const { donnees } = await construireDonneesRecap(id);
		apercuDocument = <ApercuDocument titre={TITRES_TYPES.RECAPITULATIF} sousTitre={vue.reference} donnees={donnees} source={{ type: 'recap', chantierId: id }} />;
	} else if (cr || corrigerCr) {
		// Lien périmé ou d'un autre chantier : rien ne s'ouvre.
		const ouvert = cr === 'brouillon' ? await lireBrouillon(id) : await ouvrirCompteRendu(corrigerCr ?? cr ?? '', id, corrigerCr ? 'correction' : 'lecture');
		if (ouvert) apercuDocument = <ApercuCompteRendu key={`${ouvert.id}:${ouvert.mode}`} ouvert={ouvert} reference={vue.reference} />;
	} else if (version) {
		const doc = await lireDocument(version);
		if (doc && doc.chantierId === id) {
			apercuDocument = (
				<ApercuDocument titre={`${TITRES_TYPES[doc.donnees.type]} — version ${doc.version}`} sousTitre={doc.nomFichier}
					donnees={doc.donnees} source={{ type: 'version', documentId: doc.id }} />
			);
		}
	}
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-end gap-4">
				<div>
					<h2 className="text-lg font-semibold">Documents du chantier</h2>
					<p data-testid="resume-documents" className="text-sm text-muted-foreground">{texteResume(vue.resume)}</p>
				</div>
			</div>
			<TableauDocuments vue={vue} />
			{apercuDocument}
		</section>
	);
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npx tsc --noEmit && npm run lint && npm run test:e2e -- e2e/suivi.spec.ts e2e/financier.spec.ts e2e/planning-documents.spec.ts`
Expected: aucune erreur ; PASS (les parcours existants de la page Documents restent verts).

- [ ] **Step 7: Commit**

```bash
git add e2e/preparer-suivi.ts e2e/suivi.spec.ts package.json src/composants/CarteComptesRendus.tsx src/composants/ApercuCompteRendu.tsx src/composants/TableauDocuments.tsx "src/app/(app)/chantiers/[id]/documents/page.tsx"
git commit -m "feat(suivi): comptes rendus sur la page Documents, brouillon repris, enregistrement et correction"
```

---

### Task 9: Page Documents — colonne Réception, aperçu du PV, levée, panneau du lot ; parcours E2E 5 et 6

**Files:**
- Create: `src/composants/ApercuReception.tsx`, `src/composants/ActionsLevee.tsx`
- Modify: `src/composants/TableauDocuments.tsx`, `src/composants/PanneauLot.tsx`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `src/app/globals.css`, `e2e/suivi.spec.ts`, `e2e/financier.spec.ts`

**Interfaces:**
- Consumes: `preparerReceptions`, `type ReceptionsOuvertes`, `modifierChampReceptionAction`, `modifierChampReceptionCommunAction`, `genererReceptionsAction`, `leverReservesAction`, `annulerLeveeAction`, route `receptions-pdf` (Task 6) ; `batirReception`, `ProcesVerbalReception`, `type EditionReception`, `type SaisiesReception` (Task 5) ; `bilanReceptions`, `TOUS_LES_LOTS`, `type EtatReception`, `type ChampReception`, `type ChampReceptionCommun`, `type Decision` (Task 1) ; `LigneDocuments.reception` (Task 7) ; page Documents de la Task 8.
- Produces:
  - `ApercuReception({ ouvert, reference })` (client), dialogue « Procès-verbal de réception », menu `<select aria-label="Procès-verbal pour">`, une page par lot dans `[data-entreprise="<nom>"]`
  - `ActionsLevee({ lotId, etat })` (client) : « Réserves levées… » (date « Date de levée des réserves », « Enregistrer la levée ») ou « Annuler la levée »
  - case `[data-case="reception"][data-etat="<EtatReception>"]` dans la colonne Réception (5ᵉ colonne ; Historique devient la 6ᵉ)
  - jetons CSS `--alerte`, `--alerte-foreground` (classes `bg-alerte`, `text-alerte-foreground`)
  - page Documents : `?pv=<lotId>`, `?pv=tous`

- [ ] **Step 1: Le parcours (étapes 5 et 6)**

Dans `e2e/financier.spec.ts`, la colonne Réception s'insère avant l'historique : remplacer `await expect(colonne(4)).toContainText('2 versions');` par `await expect(colonne(5)).toContainText('2 versions');`.

Dans `e2e/suivi.spec.ts`, ajouter les imports :

```ts
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
```

puis, à la fin du fichier :

```ts
const casePeinture = (page: Page) => page.locator('tr[data-lot="11 — PEINTURE"] [data-case="reception"]');

// Spec § 10, étapes 5 et 6.
test('PV de réception : tous les lots, refus puis 12 PV assemblés ; levée des réserves', async ({ page }) => {
	test.setTimeout(240_000);
	await ouvrirDocuments(page);
	await expect(casePeinture(page)).toHaveAttribute('data-etat', 'a-produire');
	await expect(casePeinture(page)).toHaveText('+ Réception');

	// 5. Tous les lots : PEINTURE « avec réserves » sans réserves → refus, l'aperçu passe sur PEINTURE.
	await page.getByRole('link', { name: 'Tous les lots' }).first().click();
	let pv = page.getByRole('dialog', { name: 'Procès-verbal de réception' });
	await expect(pv.locator('[data-entreprise]')).toHaveCount(12);
	const peinture = pv.locator('[data-entreprise="LA DÉCO\'TECH"]');
	await peinture.getByRole('button', { name: 'Avec réserves' }).click();
	await expect(peinture.getByRole('button', { name: 'Avec réserves' })).toHaveAttribute('aria-pressed', 'true');
	await pv.getByRole('button', { name: 'Générer les 12 PV' }).click();
	await expect(page.getByText("LA DÉCO'TECH : précisez la nature des réserves.")).toBeVisible();
	pv = page.getByRole('dialog', { name: 'Procès-verbal de réception' });
	await expect(pv.locator('[data-entreprise]')).toHaveCount(1);
	await expect(pv.getByLabel('Procès-verbal pour')).toHaveValue(/.+/);
	await expect(pv.locator('[data-entreprise="LA DÉCO\'TECH"]')).toBeVisible();
	await pv.getByRole('textbox', { name: 'Nature des réserves' }).fill('Reprise des joints de la cuisine');
	await pv.getByLabel('Procès-verbal pour').selectOption('tous');
	pv = page.getByRole('dialog', { name: 'Procès-verbal de réception' });
	await expect(pv.locator('[data-entreprise]')).toHaveCount(12);
	await expect(pv.locator('[data-entreprise="LA DÉCO\'TECH"]').getByRole('textbox', { name: 'Nature des réserves' }))
		.toHaveValue('Reprise des joints de la cuisine');
	const attente = page.waitForEvent('download');
	await pv.getByRole('button', { name: 'Générer les 12 PV' }).click();
	const assemble = await attente;
	expect(assemble.suggestedFilename()).toBe('SUIVI-Receptions.pdf');
	expect((await PDFDocument.load(readFileSync(await assemble.path()))).getPageCount()).toBe(12);
	await expect(page.getByText('12 PV générés.')).toBeVisible();
	await expect(pv).toBeHidden();

	// 6. Case PEINTURE orangée « Avec réserves », puis levée : bleue « Réserves levées le … ».
	await expect(casePeinture(page)).toHaveAttribute('data-etat', 'avec-reserves');
	await expect(casePeinture(page)).toContainText(/Avec réserves · \d{2}\/\d{2}/);
	await casePeinture(page).getByRole('button', { name: 'Réserves levées…' }).click();
	await casePeinture(page).getByRole('button', { name: 'Enregistrer la levée' }).click();
	await expect(casePeinture(page)).toHaveAttribute('data-etat', 'levee');
	await expect(casePeinture(page)).toContainText(/Réserves levées le \d{2}\/\d{2}/);
	await expect(casePeinture(page).getByRole('button', { name: 'Annuler la levée' })).toBeVisible();
	await expect(page.locator('tr[data-lot="02 — GROS ŒUVRE"] [data-case="reception"]')).toHaveAttribute('data-etat', 'sans-reserves');
	await expect(page.locator('tr[data-lot="12 — ENDUIT EXTÉRIEUR"] [data-case="reception"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:e2e -- e2e/suivi.spec.ts`
Expected: FAIL au second test — pas de case `[data-case="reception"]`.

- [ ] **Step 3: Le jeton « alerte » (orangé)**

Dans `src/app/globals.css` :
- dans `:root`, après `--destructive-soft: #f7e2e0;` : `--alerte: #fbeedd;` et `--alerte-foreground: #7a3d00;` ;
- dans le bloc sombre (`@media (prefers-color-scheme: dark)`), après `--destructive-soft: #3d2226;` : `--alerte: #3d2e1c;` et `--alerte-foreground: #f2c38a;` ;
- dans `@theme inline`, après `--color-destructive-soft: var(--destructive-soft);` : `--color-alerte: var(--alerte);` et `--color-alerte-foreground: var(--alerte-foreground);`.

(Couleurs de la maquette : réserves à lever, réception différée.)

- [ ] **Step 4: La levée des réserves**

Créer `src/composants/ActionsLevee.tsx` :

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import { annulerLeveeAction, leverReservesAction } from '@/actions/receptions';
import { Button } from '@/components/ui/button';
import type { EtatReception } from '@/domaine/reception';

/** Aujourd'hui à Châteaubriant, AAAA-MM-JJ (le format suédois est l'ISO). */
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** Sous la case Réception : lever les réserves du dernier PV (une date, pas de document), ou annuler la levée. */
export function ActionsLevee({ lotId, etat }: { lotId: string; etat: EtatReception }) {
	const router = useRouter();
	const [ouvert, setOuvert] = useState(false);
	const [enCours, demarrer] = useTransition();

	function envoyer(envoi: () => Promise<Resultat>) {
		demarrer(async () => {
			const r = await envoi();
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			setOuvert(false);
			router.refresh();
		});
	}

	if (etat === 'levee') {
		return <Button size="xs" variant="ghost" disabled={enCours} onClick={() => envoyer(() => annulerLeveeAction(lotId))}>Annuler la levée</Button>;
	}
	if (etat !== 'avec-reserves') return null;
	if (!ouvert) return <Button size="xs" variant="ghost" onClick={() => setOuvert(true)}>Réserves levées…</Button>;
	return (
		<form className="inline-flex items-center gap-1" onSubmit={(e) => {
			e.preventDefault();
			const date = String(new FormData(e.currentTarget).get('date') ?? '');
			envoyer(() => leverReservesAction(lotId, date));
		}}>
			<input type="date" name="date" aria-label="Date de levée des réserves" defaultValue={aujourdhui()} className="rounded border px-1 text-xs" />
			<Button size="xs" type="submit" disabled={enCours}>Enregistrer la levée</Button>
		</form>
	);
}
```

- [ ] **Step 5: La colonne Réception**

Dans `src/composants/TableauDocuments.tsx` :

1. Importer `ActionsLevee` depuis `./ActionsLevee`.

2. Ajouter, après `CasesCertificats` :

```tsx
/** Case Réception (spec § 7) : pointillé tant qu'aucun PV ; le dernier PV émis sinon, orangé s'il demande un suivi. */
function CaseReception({ ligne }: { ligne: LigneDocuments }) {
	const r = ligne.reception;
	if (!r) return <span className="text-xs text-muted-foreground">—</span>;
	const brouillon = `?pv=${ligne.lotId}`;
	if (!r.derniere) {
		return (
			<Link data-case="reception" data-etat={r.etat} href={brouillon} scroll={false}
				className="inline-block rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent">{r.texte}</Link>
		);
	}
	return (
		<span data-case="reception" data-etat={r.etat} className="inline-flex flex-col items-start gap-0.5">
			<Link href={`?version=${r.derniere.id}`} scroll={false}
				className={`rounded-md px-2 py-1 text-xs ${r.alerte ? 'bg-alerte text-alerte-foreground' : 'bg-primary text-primary-foreground'}`}>{r.texte}</Link>
			<span className="inline-flex items-center gap-2">
				<Link href={brouillon} scroll={false} className="text-xs underline">Nouveau PV</Link>
				<ActionsLevee lotId={ligne.lotId} etat={r.etat} />
			</span>
		</span>
	);
}
```

3. Dans `TableauDocuments`, avant le `return` : `const tousLesLots = vue.entreprises.flatMap((g) => g.lots).filter((l) => l.reception).length >= 2;`

4. Dans l'en-tête du tableau, remplacer `<th className="px-4 py-2">Certificats</th><th className="px-4 py-2">Historique</th>` par :

```tsx
								<th className="px-4 py-2">Certificats</th>
								<th className="px-4 py-2">
									Réception
									{tousLesLots && <Link href="?pv=tous" scroll={false} className="ml-2 text-xs font-normal underline">Tous les lots</Link>}
								</th>
								<th className="px-4 py-2">Historique</th>
```

5. Dans chaque ligne, entre la cellule des certificats et celle de l'historique : `<td className="px-4 py-2"><CaseReception ligne={ligne} /></td>`.

6. Dans la légende, après la phrase « Gris : … », ajouter : ` Orangé : réserves à lever ou réception différée.`

- [ ] **Step 6: L'aperçu du PV**

Créer `src/composants/ApercuReception.tsx` :

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import { genererReceptionsAction, modifierChampReceptionAction, modifierChampReceptionCommunAction } from '@/actions/receptions';
import { Button } from '@/components/ui/button';
import { ProcesVerbalReception, type EditionReception } from '@/documents/gabarits/ProcesVerbalReception';
import { TITRES_TYPES } from '@/documents/libelles';
import { batirReception, type SaisiesReception } from '@/documents/reception';
import { CSS_DOCUMENTS } from '@/documents/styles';
import type { ReceptionsOuvertes } from '@/donnees/receptions';
import { bilanReceptions, TOUS_LES_LOTS, type ChampReception } from '@/domaine/reception';

function telecharger(href: string) {
	const lien = document.createElement('a');
	lien.href = href;
	lien.download = '';
	lien.click();
}

/**
 * Aperçu plein écran du PV (spec § 6) : un lot, ou tous les lots attribués, une page chacun. Chaque champ
 * s'enregistre en base à la saisie (brouillon du lot sous verrou du lot ; champs communs sur le chantier) ;
 * une valeur commune changée sur une page se voit sur toutes.
 */
export function ApercuReception({ ouvert, reference }: { ouvert: ReceptionsOuvertes; reference: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const [commun, setCommun] = useState(ouvert.commun);
	const [saisies, setSaisies] = useState<Record<string, SaisiesReception>>(() => Object.fromEntries(ouvert.pages.map((p) => [p.lotId, p.saisies])));
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const tous = ouvert.cible === TOUS_LES_LOTS;

	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') router.replace(chemin, { scroll: false }); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, [router, chemin]);

	function suivre(envoi: Promise<Resultat>) {
		const suivi = envoi.then((r) => { if (!r.ok) toast.error(r.erreur); });
		enregistrements.current.add(suivi);
		void suivi.finally(() => enregistrements.current.delete(suivi));
	}

	function surChamp(lotId: string, champ: ChampReception, valeur: string) {
		setSaisies((s) => ({ ...s, [lotId]: { ...s[lotId], [champ]: valeur } }));
		suivre(modifierChampReceptionAction(lotId, champ, valeur));
	}

	const edition = (lotId: string): EditionReception => ({
		saisies: saisies[lotId],
		commun,
		surChamp: (champ, valeur) => surChamp(lotId, champ, valeur),
		surDecision: (decision) => surChamp(lotId, 'decision', decision),
		surCommun: (champ, valeur) => {
			setCommun((c) => ({ ...c, [champ]: valeur }));
			suivre(modifierChampReceptionCommunAction(ouvert.chantierId, champ, valeur));
		},
	});

	const fermer = () => router.replace(chemin, { scroll: false });

	/** Changer de lot : la saisie quittée en ouvrant le menu part d'abord, la page suivante la relit. */
	function aller(cible: string) {
		void Promise.all(enregistrements.current).then(() => router.replace(`${chemin}?pv=${cible}`, { scroll: false }));
	}

	function generer() {
		demarrer(async () => {
			// La saisie encore ouverte part d'abord : le PDF ne perd jamais une saisie.
			(document.activeElement as HTMLElement | null)?.blur();
			await Promise.all(enregistrements.current);
			// Les pages affichées, et elles seules : un lot attribué depuis l'ouverture n'est pas ajouté.
			const r = await genererReceptionsAction(ouvert.chantierId, ouvert.pages.map((p) => p.lotId));
			if (!r.ok) {
				toast.error(r.erreur);
				// Refus de génération propre à un lot : son id est la clé du champ en erreur ; l'aperçu passe sur lui.
				const enCause = Object.keys(r.champs ?? {}).find((cle) => ouvert.pages.some((p) => p.lotId === cle));
				if (tous && enCause) aller(enCause);
				return;
			}
			const resultats = r.donnees;
			if (tous) {
				const generes = resultats.filter((x) => x.nouvelle).length;
				toast.success(bilanReceptions(generes, resultats.length - generes));
				telecharger(`/api/chantiers/${ouvert.chantierId}/receptions-pdf?documents=${resultats.map((x) => x.documentId).join(',')}`);
			} else {
				const [x] = resultats;
				toast.success(x.nouvelle ? `PV de réception généré — ${x.entreprise}.` : `Rien n'a changé depuis la version ${x.version} : elle est téléchargée.`);
				telecharger(`/api/documents/${x.documentId}/pdf`);
			}
			fermer();
			router.refresh();
		});
	}

	return (
		<div role="dialog" aria-label={TITRES_TYPES.PV_RECEPTION} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{TITRES_TYPES.PV_RECEPTION}</p>
					<p className="font-semibold">{tous ? `${reference} — ${ouvert.pages.length} lots, une page chacun` : reference}</p>
				</div>
				{ouvert.options.length > 0 && (
					<label className="flex items-center gap-2 text-sm">
						<span className="text-muted-foreground">Procès-verbal pour</span>
						<select aria-label="Procès-verbal pour" value={ouvert.cible} className="rounded-md border bg-background px-2 py-1"
							onChange={(e) => aller(e.target.value)}>
							{ouvert.options.map((o) => <option key={o.lotId} value={o.lotId}>{`${o.libelle} — ${o.entreprise}`}</option>)}
							<option value={TOUS_LES_LOTS}>Tous les lots attribués — une page chacun</option>
						</select>
					</label>
				)}
				<div className="ml-auto flex items-center gap-3">
					{!ouvert.blocage && (
						<>
							<span className="text-xs text-muted-foreground">Chaque champ bleu s&apos;enregistre aussitôt — le bleu ne s&apos;imprime pas.</span>
							<Button onClick={generer} disabled={enCours}>
								{enCours ? 'Génération…' : tous ? `Générer les ${ouvert.pages.length} PV` : 'Générer le PDF'}
							</Button>
						</>
					)}
					<Button variant="outline" onClick={fermer}>Fermer</Button>
				</div>
			</header>
			{ouvert.blocage && <p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{ouvert.blocage}</p>}
			<div className="pv-pages flex-1 overflow-auto overscroll-contain p-7">
				{ouvert.pages.map((p) => (
					<div key={p.lotId} data-entreprise={p.entreprise}>
						<ProcesVerbalReception donnees={batirReception(p.source, saisies[p.lotId], commun)} mode="edition" edition={edition(p.lotId)} />
					</div>
				))}
			</div>
		</div>
	);
}
```

Remarque : `CSS_DOCUMENTS` porte `.pv-pages` (Task 5) : colonne centrée, espacée.

- [ ] **Step 7: La page Documents et le panneau du lot**

Dans `src/app/(app)/chantiers/[id]/documents/page.tsx` :
- importer `ApercuReception` depuis `@/composants/ApercuReception` et `preparerReceptions` depuis `@/donnees/receptions` ;
- `searchParams` : ajouter `pv?: string` au type et à la déstructuration (`const { apercu, version, cr, 'corriger-cr': corrigerCr, pv } = await searchParams;`) ;
- avant la branche `else if (version)`, ajouter :

```tsx
	} else if (pv) {
		// Lot inconnu ou d'un autre chantier : rien ne s'ouvre, aucune ligne créée.
		const ouvert = await preparerReceptions(id, pv);
		if (ouvert) apercuDocument = <ApercuReception key={ouvert.cible} ouvert={ouvert} reference={vue.reference} />;
```

Dans `src/composants/PanneauLot.tsx`, après la section « Certificats de paiement » (juste avant `</div>` qui ferme le contenu du `SheetContent`) :

```tsx
					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Réception</h3>
						{lot.artisanId ? (
							<Link href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer} className={buttonVariants({ variant: 'outline' })}>PV de réception</Link>
						) : <p className="text-xs text-muted-foreground">Attribuez une entreprise au lot pour préparer son PV de réception.</p>}
					</section>
```

- [ ] **Step 8: Vérifier le succès**

Run: `npx tsc --noEmit && npm run lint && npm run test:e2e -- e2e/suivi.spec.ts e2e/financier.spec.ts e2e/marches.spec.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 9: Commit**

```bash
git add src/composants/ApercuReception.tsx src/composants/ActionsLevee.tsx src/composants/TableauDocuments.tsx src/composants/PanneauLot.tsx "src/app/(app)/chantiers/[id]/documents/page.tsx" src/app/globals.css e2e/suivi.spec.ts e2e/financier.spec.ts
git commit -m "feat(suivi): PV de réception sur la page Documents, colonne Réception, levée des réserves"
```

---

### Task 10: « Tout télécharger » (archive ZIP) ; parcours E2E 7

**Files:**
- Create: `src/domaine/archive.ts`, `src/donnees/archive.ts`, `src/app/api/chantiers/[id]/archive/route.ts`
- Modify: `src/domaine/fichiers.ts`, `src/domaine/fichiers.test.ts`, `src/app/(app)/chantiers/[id]/documents/page.tsx`, `e2e/suivi.spec.ts`, `package.json`, `package-lock.json`
- Test: `src/domaine/archive.test.ts`, `src/donnees/archive.int.test.ts`

**Interfaces:**
- Consumes: `type TypeDocument` complété (Task 2) ; `avenantDeLaSerie` ; `construireDonneesRecap` (`src/documents/donnees.ts`), `recapVersXlsx`, `nomFichierTableur`, `slugifier`, `enTeteTelechargement` ; `dateParis`, `versIso` ; les générations des Tasks 4 et 6 et `genererMarche`, `genererAvenant` (tests) ; `VueDocuments.resume` et la page Documents (Tasks 7 et 8).
- Produces:
  - `src/domaine/archive.ts` (pur) : `DOSSIERS_ARCHIVE: Record<TypeDocument, string>`, `dernieresVersions<T extends { serie: string; version: number }>(docs: T[]): T[]`, `cheminsArchive<T extends { dossier: string; nom: string }>(fichiers: T[]): (T & { chemin: string })[]`
  - `nomFichierArchive(reference: string, jour: string): string` (`PERRIER-LOUISFERT-Documents-2026-10-06.zip`)
  - `construireArchive(chantierId, maintenant?): Promise<{ zip: Uint8Array; nomFichier: string } | null>`
  - route `GET /api/chantiers/[id]/archive` ; bouton « Tout télécharger » en tête de la page Documents

- [ ] **Step 1: fflate**

Run: `npm install --save-exact fflate@0.8.3`
Expected: `"fflate": "0.8.3"` sous `dependencies` dans `package.json`.

- [ ] **Step 2: Les tests**

Dans `src/domaine/fichiers.test.ts`, ajouter l'import de `nomFichierArchive` et le cas :

```ts
it('archive du chantier : référence et jour', () => {
	expect(nomFichierArchive('PERRIER — Louisfert', '2026-10-06')).toBe('PERRIER-LOUISFERT-Documents-2026-10-06.zip');
});
```

Créer `src/domaine/archive.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { cheminsArchive, dernieresVersions, DOSSIERS_ARCHIVE } from './archive';

describe('archive « Tout télécharger »', () => {
	it('un dossier par sorte de document ; le récapitulatif à la racine', () => {
		expect(DOSSIERS_ARCHIVE).toEqual({
			MARCHE_GRE_A_GRE: '01 Marchés', MARCHE_SOUS_TRAITANCE: '01 Marchés', AVENANT: '02 Avenants',
			CERTIFICAT_PAIEMENT: '03 Certificats de paiement', COMPTE_RENDU: '04 Comptes rendus', PV_RECEPTION: '05 Réceptions',
			PLANNING: '06 Planning', VISA_PLANNING: '06 Planning', RECAPITULATIF: '',
		});
	});

	it('la dernière version de chaque série, quel que soit l\'ordre', () => {
		const docs = [
			{ serie: 'A', version: 1, id: 'a1' }, { serie: 'B', version: 1, id: 'b1' }, { serie: 'A', version: 3, id: 'a3' }, { serie: 'A', version: 2, id: 'a2' },
		];
		expect(dernieresVersions(docs).map((d) => d.id).sort()).toEqual(['a3', 'b1']);
	});

	it('chemins triés ; un nom déjà pris dans un dossier prend « (2) » avant l\'extension', () => {
		const r = cheminsArchive([
			{ dossier: '05 Réceptions', nom: 'X-Reception-v1.pdf' },
			{ dossier: '', nom: 'X-RecapMarches.xlsx' },
			{ dossier: '01 Marchés', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '01 Marchés', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '02 Avenants', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '01 Marchés', nom: 'SANSEXTENSION' },
			{ dossier: '01 Marchés', nom: 'SANSEXTENSION' },
		]);
		expect(r.map((f) => f.chemin)).toEqual([
			'01 Marchés/SANSEXTENSION', '01 Marchés/SANSEXTENSION (2)', '01 Marchés/X-Lot-A-Marche-v1.pdf', '01 Marchés/X-Lot-A-Marche-v1 (2).pdf',
			'02 Avenants/X-Lot-A-Marche-v1.pdf', '05 Réceptions/X-Reception-v1.pdf', 'X-RecapMarches.xlsx',
		]);
	});
});
```

Créer `src/donnees/archive.int.test.ts` :

```ts
import { unzipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { genererAvenant, genererMarche } from '@/documents/generer';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { construireArchive } from './archive';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from './avenants';
import { corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu, ouvrirCompteRendu } from './comptesRendus';
import { prisma } from './prisma';
import { genererReceptions, preparerReceptions } from './receptions';

let compteur = 0;
/** Chaque PDF est distinct : on reconnaît la version rangée dans l'archive. */
const deps = { rendrePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70, ++compteur])) };
const LE_6_OCTOBRE = new Date('2026-10-06T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;

async function avenant(designation: string) {
	const { id } = await ajouterAvenant(p.lots[designation]);
	await modifierChampAvenant(id, 'montantHt', '500');
	await genererAvenant(id, p.utilisateurId, deps);
	return id;
}

describe('archive du chantier', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('rien à télécharger : chantier inconnu, ou sans document', async () => {
		expect(await construireArchive('inconnu')).toBeNull();
		expect(await construireArchive(p.chantierId)).toBeNull();
	});

	it('dossiers, dernières versions seulement, avenant supprimé exclu, brouillon absent, tableur présent', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await avenant('GROS ŒUVRE');
		const supprime = await avenant('PEINTURE');
		await supprimerAvenant(supprime);

		const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await modifierChampCompteRendu(b.id, 'avancement', 'Fondations coulées');
		await enregistrerCompteRendu(b.id, p.utilisateurId, deps);
		const ouvert = await ouvrirCompteRendu(b.id, p.chantierId, 'correction');
		const v2 = await corrigerCompteRendu(b.id, { ...ouvert!.saisies, avancement: 'Dalle faite' }, p.utilisateurId, deps);
		await creerBrouillon(p.chantierId);

		await preparerReceptions(p.chantierId, p.lots.PEINTURE);
		await genererReceptions(p.chantierId, [p.lots.PEINTURE], p.utilisateurId, deps);

		const archive = await construireArchive(p.chantierId, LE_6_OCTOBRE);
		expect(archive?.nomFichier).toBe('PERRIER-LOUISFERT-Documents-2026-10-06.zip');
		const fichiers = unzipSync(archive!.zip);
		expect(Object.keys(fichiers).sort()).toEqual([
			'01 Marchés/PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Marche-v1.pdf',
			'02 Avenants/PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Avenant01-v1.pdf',
			'04 Comptes rendus/PERRIER-LOUISFERT-CompteRendu01-v2.pdf',
			'05 Réceptions/PERRIER-LOUISFERT-Lot11-PEINTURE-Reception-v1.pdf',
			'PERRIER-LOUISFERT-RecapMarches.xlsx',
		]);
		const pdfV2 = (await prisma.document.findUniqueOrThrow({ where: { id: v2.documentId } })).pdf;
		expect(fichiers['04 Comptes rendus/PERRIER-LOUISFERT-CompteRendu01-v2.pdf']).toEqual(new Uint8Array(pdfV2));
		// Un tableur .xlsx est lui-même un ZIP : il commence par « PK ».
		expect([...fichiers['PERRIER-LOUISFERT-RecapMarches.xlsx'].slice(0, 2)]).toEqual([0x50, 0x4b]);
	});
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- src/domaine/archive.test.ts src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/archive.int.test.ts`
Expected: FAIL — `./archive` et `nomFichierArchive` introuvables.

- [ ] **Step 4: Les règles de l'archive**

Créer `src/domaine/archive.ts` :

```ts
import type { TypeDocument } from '@/documents/libelles';

/* Rangement de « Tout télécharger » (spec § 8), pur. */

/** '' : à la racine de l'archive. */
export const DOSSIERS_ARCHIVE: Record<TypeDocument, string> = {
	MARCHE_GRE_A_GRE: '01 Marchés',
	MARCHE_SOUS_TRAITANCE: '01 Marchés',
	AVENANT: '02 Avenants',
	CERTIFICAT_PAIEMENT: '03 Certificats de paiement',
	COMPTE_RENDU: '04 Comptes rendus',
	PV_RECEPTION: '05 Réceptions',
	PLANNING: '06 Planning',
	VISA_PLANNING: '06 Planning',
	RECAPITULATIF: '',
};

/** La dernière version de chaque série. */
export function dernieresVersions<T extends { serie: string; version: number }>(docs: T[]): T[] {
	const dernieres = new Map<string, T>();
	for (const d of docs) {
		const connue = dernieres.get(d.serie);
		if (!connue || d.version > connue.version) dernieres.set(d.serie, d);
	}
	return [...dernieres.values()];
}

const joindre = (dossier: string, nom: string) => (dossier ? `${dossier}/${nom}` : nom);

function decouper(nom: string): [string, string] {
	const point = nom.lastIndexOf('.');
	return point > 0 ? [nom.slice(0, point), nom.slice(point)] : [nom, ''];
}

/** Chemins triés ; un nom déjà pris dans le même dossier prend « (2) », « (3) »… avant l'extension. */
export function cheminsArchive<T extends { dossier: string; nom: string }>(fichiers: T[]): (T & { chemin: string })[] {
	const pris = new Set<string>();
	return [...fichiers]
		.sort((a, b) => joindre(a.dossier, a.nom).localeCompare(joindre(b.dossier, b.nom), 'fr'))
		.map((f) => {
			const [base, extension] = decouper(f.nom);
			let chemin = joindre(f.dossier, f.nom);
			for (let i = 2; pris.has(chemin); i++) chemin = joindre(f.dossier, `${base} (${i})${extension}`);
			pris.add(chemin);
			return { ...f, chemin };
		});
}
```

Dans `src/domaine/fichiers.ts`, après `nomFichierTableur` :

```ts
/** `jour` : AAAA-MM-JJ, le jour du téléchargement à Châteaubriant. */
export function nomFichierArchive(reference: string, jour: string): string {
	return `${slugifier(reference)}-Documents-${jour}.zip`;
}
```

- [ ] **Step 5: La construction du ZIP et la route**

Créer `src/donnees/archive.ts` :

```ts
import { zipSync, type Zippable } from 'fflate';
import { construireDonneesRecap } from '@/documents/donnees';
import { avenantDeLaSerie } from '@/documents/series';
import { recapVersXlsx } from '@/documents/tableur';
import { cheminsArchive, dernieresVersions, DOSSIERS_ARCHIVE } from '@/domaine/archive';
import { nomFichierArchive, nomFichierTableur } from '@/domaine/fichiers';
import { dateParis, versIso } from '@/domaine/semaines';
import { prisma } from './prisma';

/**
 * « Tout télécharger » (spec § 8) : la dernière version de chaque série, rangée par dossier, plus le tableur du
 * récapitulatif produit à la volée. Les lettres des avenants supprimés n'y sont pas. Nul : rien à télécharger.
 * PDF stockés sans recompression (niveau 0) ; noms en UTF-8 (fflate pose le drapeau UTF-8 du ZIP).
 */
export async function construireArchive(chantierId: string, maintenant = new Date()): Promise<{ zip: Uint8Array; nomFichier: string } | null> {
	const chantier = await prisma.chantier.findUnique({
		where: { id: chantierId },
		select: { reference: true, lots: { select: { avenants: { select: { id: true } } } } },
	});
	if (!chantier) return null;
	const docs = await prisma.document.findMany({ where: { chantierId }, select: { id: true, serie: true, version: true, type: true, nomFichier: true } });
	if (!docs.length) return null;
	const avenants = new Set(chantier.lots.flatMap((l) => l.avenants.map((a) => a.id)));
	const retenus = dernieresVersions(docs).filter((d) => {
		const avenantId = avenantDeLaSerie(d.serie);
		return avenantId === null || avenants.has(avenantId);
	});
	const fichiers = cheminsArchive(retenus.map((d) => ({ id: d.id, dossier: DOSSIERS_ARCHIVE[d.type], nom: d.nomFichier })));
	const pdfs = new Map(
		(await prisma.document.findMany({ where: { id: { in: fichiers.map((f) => f.id) } }, select: { id: true, pdf: true } })).map((d) => [d.id, d.pdf]),
	);
	const contenu: Zippable = {};
	for (const f of fichiers) contenu[f.chemin] = new Uint8Array(pdfs.get(f.id) ?? new Uint8Array());
	const { donnees } = await construireDonneesRecap(chantierId, maintenant);
	contenu[nomFichierTableur(chantier.reference)] = new Uint8Array(await recapVersXlsx(donnees));
	return { zip: zipSync(contenu, { level: 0 }), nomFichier: nomFichierArchive(chantier.reference, versIso(dateParis(maintenant))) };
}
```

Créer `src/app/api/chantiers/[id]/archive/route.ts` :

```ts
import { utilisateurConnecte } from '@/auth/session';
import { enTeteTelechargement } from '@/domaine/fichiers';
import { construireArchive } from '@/donnees/archive';

/** « Tout télécharger » : session requise, comme la route des PDF ; 404 si le chantier n'existe pas ou n'a aucun document. */
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const archive = await construireArchive((await params).id);
	if (!archive) return new Response('Aucun document à télécharger', { status: 404 });
	return new Response(Buffer.from(archive.zip), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': enTeteTelechargement(archive.nomFichier),
			'Cache-Control': 'private, no-store',
		},
	});
}
```

- [ ] **Step 6: Le bouton, et l'étape 7 du parcours**

Dans `src/app/(app)/chantiers/[id]/documents/page.tsx`, importer `Button, buttonVariants` depuis `@/components/ui/button`, puis dans l'en-tête, après le `<div>` du titre et du résumé :

```tsx
				{vue.resume.nombre ? (
					<a href={`/api/chantiers/${id}/archive`} download className={`ml-auto ${buttonVariants({ variant: 'outline' })}`}>Tout télécharger</a>
				) : (
					<span title="Aucun document à télécharger" className="ml-auto"><Button variant="outline" disabled>Tout télécharger</Button></span>
				)}
```

Dans `e2e/suivi.spec.ts`, ajouter l'import `import { unzipSync } from 'fflate';` puis, à la fin du fichier :

```ts
// Spec § 10, étape 7.
test('Tout télécharger : dernières versions rangées et tableur', async ({ page }) => {
	await ouvrirDocuments(page);
	const attente = page.waitForEvent('download');
	await page.getByRole('link', { name: 'Tout télécharger' }).click();
	const archive = await attente;
	expect(archive.suggestedFilename()).toMatch(/^SUIVI-Documents-\d{4}-\d{2}-\d{2}\.zip$/);
	const fichiers = Object.keys(unzipSync(readFileSync(await archive.path())));
	expect(fichiers).toContain('04 Comptes rendus/SUIVI-CompteRendu01-v2.pdf');
	expect(fichiers).not.toContain('04 Comptes rendus/SUIVI-CompteRendu01-v1.pdf');
	expect(fichiers.filter((f) => f.startsWith('05 Réceptions/'))).toHaveLength(12);
	expect(fichiers).toContain('SUIVI-RecapMarches.xlsx');
});
```

- [ ] **Step 7: Vérifier le succès**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run test:int && npm run test:e2e`
Expected: aucune erreur ; toutes les suites PASS (unitaires, intégration, E2E complet : les parcours des sous-projets précédents restent verts).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/domaine/archive.ts src/domaine/archive.test.ts src/domaine/fichiers.ts src/domaine/fichiers.test.ts src/donnees/archive.ts src/donnees/archive.int.test.ts "src/app/api/chantiers/[id]/archive/route.ts" "src/app/(app)/chantiers/[id]/documents/page.tsx" e2e/suivi.spec.ts
git commit -m "feat(suivi): Tout télécharger, archive ZIP des dernières versions rangées par dossier"
```

