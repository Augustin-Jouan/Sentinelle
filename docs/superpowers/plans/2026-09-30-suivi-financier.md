# Sentinelle Marchés — Suivi financier : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer les avenants (saisis dans le panneau du lot, comptés partout dans le montant engagé, lettre « AVENANT N° 02 » versionnée) et les certificats de paiement (acomptes antérieurs, calcul au centime, feuille SOCOREVE figée, correction du dernier), avec leurs colonnes dans la page Documents.

**Architecture:** Deux tables métier, `Avenant` et `Acompte`, et la chaîne de documents du Socle et du Planning (`Document.serie` : `AVENANT:<id>`, `CERTIFICAT:<id>`). Les règles (montants de la lettre, calcul du certificat) vivent une fois dans `src/domaine/` ; la feuille du certificat se construit dans un module pur que l'aperçu rappelle à la frappe et que le serveur rappelle à la génération avec les valeurs relues en base. Toute écriture d'avenant ou d'acompte passe par `sousVerrouLot` (`SELECT … FOR UPDATE` sur la ligne du lot, relecture sous verrou).

**Tech Stack:** celle du Socle et du Planning — Next.js 16.3.7, React 19, TypeScript strict, Tailwind 4 + shadcn/ui (Base UI), Prisma 7.10.0, PostgreSQL 17, Zod 4, decimal.js, Playwright 1.63.0, Vitest 5, pdf-lib et ExcelJS (tests). Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-09-30-suivi-financier-design.md` — à lire avant toute tâche, avec celles du Socle (`2026-09-29-socle-design.md`) et du Planning (`2026-09-29-planning-design.md`). Maquette de référence : `docs/maquette/sentinelle-marches.html` (lettre `buildDocAvenant` l. 6392, certificat `calculCp` l. 6938 et `renderCpSheet` l. 7074, styles l. 1270-1279 et 1884-1917, logo `LOGO_SOCOREVE` l. 6520).

**Prérequis :** le plan du Planning (`docs/superpowers/plans/2026-09-30-planning.md`) est **entièrement exécuté** (Tasks 1 à 11) et `npm test`, `npm run test:int`, `npm run test:e2e` passent. Ce plan s'appuie sur ce qu'il livre : `Document.serie` et `SERIES`, `enregistrerVersion` avec `serie`, `entetePlanning` et `EnTetePlanning`, `htmlVersPdf({ uneSeuleFeuille })` et `ajusterUneFeuille`, `etats.ts` de sa Task 8, `ApercuDocument` et `TableauDocuments` de sa Task 11 (`Historique({ versions })`, cartes Planning et Visa), `e2e/preparer-planning.ts` et `e2e/aidePlanning.ts` (`telecharger`). Les extraits cités ici viennent de ces plans : si le code livré diffère sur un détail (nom d'une variable locale, ordre des champs), appliquer la même modification au code réel.

## Global Constraints

- Tout en français : interface, fichiers, variables, fonctions, commentaires, messages (exceptions imposées par les outils).
- Messages d'erreur exactement ceux de la spec (§ 5, § 6, § 8) : « Montant : saisissez un nombre. », « Cette moins-value rendrait le montant du lot négatif. », « Ce TTC est inférieur aux seuls avenants. », « Des certificats existent : les acomptes antérieurs ne se modifient plus. », « Saisissez le montant des travaux réalisés. », « Le présent acompte doit être positif. », « Un autre certificat a été enregistré entre-temps : rouvrez le certificat. », « Seul le dernier certificat du lot peut être corrigé. », « Cet avenant n'existe plus. », « Cet acompte n'existe plus. ».
- Montants en `Decimal`, arrondis au centime **à chaque ligne**, demi-centime au-dessus (`ROUND_HALF_UP`, `arrondiCentime` du Socle) ; jamais de nombre flottant pour un montant.
- Montant engagé HT = HT initial + somme signée des avenants ; il remplace l'initial partout sauf sur le **marché imprimé**, qui garde le montant initial (son empreinte ne change pas avec un avenant).
- Numéro d'avenant : `Lot.dernierNumeroAvenant + 1`, jamais réutilisé. Acomptes : 1, 2, 3… sans trou ; numéro d'un nouveau certificat = nombre d'acomptes du lot + 1.
- Toute écriture d'avenant ou d'acompte d'un lot (création, modification, suppression, génération, correction, caution) se fait sous `sousVerrouLot`, avec relecture sous verrou ; la saisie d'un HT ou d'un TTC du lot aussi (elle dépend des avenants).
- Un certificat n'a **pas d'état « modifié »** : il n'est jamais reconstruit pour comparaison ; seule la correction du dernier (non manuel) crée une version, et aucune si l'empreinte n'a pas changé.
- `mois` d'un certificat conforme à `^(20[0-9]{2})-(0[1-9]|1[0-2])$`, en Zod (action) et en `CHECK` (base).
- Lettre d'avenant et certificat : A4 **portrait** (`htmlVersPdf(html, { paysage: false })`), marges 10 mm, une seule page.
- Paramètres : `rcs` `328999503`, `ape` `4120A`, `tvaIntracommunautaire` `FR47328999503` ; e-mail `contact@socoreve-chateaubriant.com`.
- Le serveur ne reçoit que les saisies (cumul, mois, date) et recalcule tout ; il ne fait jamais confiance à un montant venu de l'écran.
- Seul `{ type, contenu }` entre dans l'empreinte ; le `cadre` (et la `societe` du certificat) en est exclu. Gabarits sans `'use client'`, sans hook, sans formatage : tous les textes viennent de l'objet document.
- Une Server Action renvoie `Resultat<T>` par `executer` ; aucun journal ne contient de HTML, de montant ni de nom de client.
- Jamais `prisma migrate reset` ni `prisma migrate dev` : migration écrite à la main, appliquée par `prisma migrate deploy`, vérifiée par `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- Liens stylés en bouton : `className={buttonVariants({ … })}` sur `<Link>` (le `Button` du projet n'a pas `asChild`).

## Review Focus

1. **HT initial saisi sous les moins-values des avenants** (lot à 9 450 € avec un avenant de −300 €, HT ramené à 299,99 €) : la spec ne règle que le TTC ; le HT est refusé de la même façon (« Ce HT est inférieur aux seuls avenants. »), rien n'est écrit. Test : Task 3 (« TTC inférieur aux seuls avenants, HT sous les moins-values »).
2. **Supprimer une plus-value qui compense une moins-value** (initial 1 000, +500, −1 400) : la suppression rendrait le lot négatif ; elle est refusée (« Supprimer cet avenant rendrait le montant du lot négatif. »). Test : Task 4 (« supprimer une plus-value qui compense une moins-value : refusé »).
3. **Champ mois ou date vidé dans l'aperçu du certificat** : la feuille affiche une ligne vide au lieu de « undefined », et la génération est refusée avec « Mois : choisissez un mois. » ou « Date : choisissez une date. ». Test : Task 1 (`moisLong('')`, `dateCourteSlash('')`), Task 7 (« saisies invalides, lot incomplet »).
4. **Lien périmé** (`?avenant=` d'un avenant supprimé, `?corriger=` d'un certificat qui n'est plus le dernier, génération d'une lettre supprimée) : rien ne s'ouvre, ou l'aperçu s'ouvre en lecture avec « Seul le dernier certificat du lot peut être corrigé. » ; aucune écriture. Test : Task 5 (« … les PDF d'un avenant supprimé restent »), Task 7 (`ouvrirCorrection(...).blocage`).
5. **Longueurs extrêmes sur une page** (objet d'avenant de 600 caractères ; certificat de 10 avenants et 24 acomptes précédents ; e-mail des paramètres vidé) : toujours une page A4 portrait, sans tiret orphelin dans l'en-tête. Test : Task 5 (PDF réel, objet de 600 caractères), Task 6 (`pdfCertificat.int.test.ts`, `batirSociete` sans e-mail).

## Écarts assumés avec la spec

- § 3 place `batirCertificat` dans `batir.ts` : il vit dans `src/documents/certificat.ts`, module pur, parce que `batir.ts` charge `node:crypto` (par `empreinte`) et que l'aperçu recalcule la feuille dans le navigateur.
- § 3 nomme `logo-socoreve.jpg` : le logo devient `src/documents/gabarits/logo.ts` (la même data URI, extraite de la maquette), utilisable tel quel par le gabarit à l'écran et dans le PDF.
- Le certificat est imprimé avec la mesure « une seule feuille » du Planning, étendue au portrait : à l'échelle 1, 10 avenants et 24 acomptes précédents dépassent la hauteur d'une page (spec § 6 exige une page).
- L'en-tête SOCOREVE du certificat est un objet `societe` à part (hors empreinte, comme le `cadre`) plutôt qu'un `cadre` enrichi : le `cadre` des autres documents et ses tests restent intacts.

## Structure des fichiers

```
prisma/schema.prisma                                   Avenant, Acompte, Lot, Parametres, TypeDocument (Task 2)
prisma/migrations/20261002000000_suivi_financier/      migration écrite à la main, CHECK compris (Task 2)
src/domaine/
  avenants.ts        montants de la lettre, montant engagé, messages (Task 1)
  certificats.ts     calcul du certificat, saisies, contrôles, messages (Task 1)
  fichiers.ts        + nomFichierAvenant, nomFichierCertificat (Tasks 5 et 7)
  montants.ts        message « Ce TTC est inférieur aux seuls avenants. » (Task 3)
src/donnees/
  verrouLot.ts       sousVerrouLot, montantsAvenants (Task 3)
  lots.ts            HT et TTC saisis sous verrou (Task 3)
  marches.ts         montant engagé, avenants et certificats du lot (Tasks 3 et 8)
  chantiers.ts       total TTC engagé de la liste (Task 3)
  avenants.ts        ajout, modification, suppression (Task 4)
  acomptes.ts        acomptes antérieurs, caution, génération et correction des certificats (Task 7)
  parametres.ts      RCS, APE, TVA intracommunautaire, e-mail (Task 2)
src/actions/avenants.ts, certificats.ts                Server Actions (Tasks 4 et 7)
src/documents/
  series.ts          serieAvenant, serieCertificat, avenantDeLaSerie (Tasks 2 et 9)
  libelles.ts        AVENANT, CERTIFICAT_PAIEMENT (Task 2)
  schemas.ts         lettre d'avenant, certificat, societe (Tasks 5 et 6)
  batir.ts           SourceLot.avenants, récapitulatif engagé, batirAvenant (Tasks 3 et 5)
  certificat.ts      feuille du certificat, module pur (Task 6)
  donnees.ts         avenants des sources, construireDonneesAvenant (Tasks 3 et 5)
  generer.ts         genererAvenant, imprimerPortrait, imprimerCertificat, rendrePdfDocument ; marchés manquants par série (Tasks 3, 5, 6, 7)
  uneFeuille.ts, pdf.ts                                une seule feuille en portrait (Task 6)
  etats.ts           colonnes Avenants, Certificats, historique (Task 9)
  styles.ts          lettre d'avenant, certificat (Tasks 5 et 6)
  gabarits/LettreAvenant.tsx, CertificatPaiement.tsx, logo.ts, Gabarit.tsx, Zone.tsx (Tasks 5 et 6)
src/composants/
  PanneauLot.tsx     bloc Avenants, bloc Certificats (Task 8)
  ApercuDocument.tsx lettre d'avenant (Tasks 5 et 8)
  ApercuCertificat.tsx                                 aperçu du certificat (Task 8)
  TableauDocuments.tsx                                 colonnes Avenants et Certificats (Task 9)
src/app/(app)/chantiers/[id]/marches/page.tsx          ?avenant=, ?certificat=, ?corriger= (Task 8)
src/app/(app)/parametres/page.tsx                      trois champs de plus (Task 2)
tests/integration/aide.ts, tests/fixtures/perrier.ts   viderBase, SourceLot.avenants (Tasks 2 et 3)
e2e/preparer-financier.ts, e2e/financier.spec.ts, package.json   chantier FINANCIER, parcours (Tasks 8 et 9)
```

---

### Task 1: Règles des avenants et du certificat (domaine)

**Files:**
- Create: `src/domaine/avenants.ts`, `src/domaine/certificats.ts`
- Test: `src/domaine/avenants.test.ts`, `src/domaine/certificats.test.ts`

**Interfaces:**
- Consumes: `arrondiCentime`, `formatEuros`, `htEngage`, `ttcEngage`, `lireNombreFr`, `type Valeur` (`src/domaine/montants.ts`, Socle) ; `ErreurMetier` (`src/domaine/erreurs.ts`).
- Produces (`src/domaine/avenants.ts`) :
  - `type AvenantMontant = { numero: number; montantHt: Valeur }`
  - `MOINS_VALUE_NEGATIVE = 'Cette moins-value rendrait le montant du lot négatif.'`, `SUPPRESSION_NEGATIVE = 'Supprimer cet avenant rendrait le montant du lot négatif.'`, `HT_INFERIEUR_AVENANTS = 'Ce HT est inférieur aux seuls avenants.'`, `MONTANT_ILLISIBLE = 'Montant : saisissez un nombre.'`, `AVENANT_DISPARU = "Cet avenant n'existe plus."`
  - `numeroAvenantTexte(n: number): string` (« 02 »)
  - `sommeAvenants(avenants: { montantHt: Valeur }[]): Decimal`
  - `lireMontantAvenant(saisie: string): Decimal` (signé, au centime)
  - `verifierEngage(htInitial: Valeur, avenants: { montantHt: Valeur }[], message?: string): void` (message par défaut : `MOINS_VALUE_NEGATIVE`)
  - `dateLongue(d: Date): string` (« 12 mai 2026 », « 1er juin 2026 »)
  - `confirmationSuppression(numero: number, htInitial: Valeur, autres: { montantHt: Valeur }[]): string` (`autres` : les avenants qui restent)
  - `type MontantsLettre = { plusValue: boolean; marcheInitial: Decimal; devis: Decimal; nouveauMontant: Decimal }` ; `montantsLettre(p: { htInitial: Valeur; tauxTva: Valeur; avenants: AvenantMontant[]; numero: number }): MontantsLettre`
  - `type ManqueAvenant = 'entreprise' | 'montantAvenant'`, `LIBELLES_MANQUES_AVENANT`, `manquesAvenant(p: { artisanId: string | null; montantHt: Valeur }): ManqueAvenant[]`
- Produces (`src/domaine/certificats.ts`) :
  - `MOIS_VALIDE`, `CUMUL_MANQUANT`, `PRESENT_NON_POSITIF`, `CUMUL_AU_DELA`, `ACOMPTE_DISPARU`, `AUTRE_CERTIFICAT`, `DERNIER_SEUL`, `CERTIFICATS_EXISTENT`, `CERTIFICAT_IMPOSSIBLE` (messages de la spec, § 8)
  - `certificatPossible(p: { artisanId: string | null; htEngage: Valeur }): boolean` (entreprise attribuée et montant engagé positif)
  - `type EntreeCalcul = { htInitial: Valeur; avenants: Valeur[]; tauxTva: Valeur; tauxRetenue: Valeur; caution: boolean; precedents: Valeur[]; cumulRealise: Valeur }`
  - `type CalculCertificat = { marcheHt; avenants: Decimal[]; totalHt; totalTva; totalTtc; precedentsHt; precedentsTva; precedentsTtc; realiseHt; presentHt; presentTva; presentTtc; retenue; mandate }` (tous `Decimal`)
  - `calculerCertificat(e: EntreeCalcul): CalculCertificat`
  - `lireCumul(saisie: string): Decimal`, `lireMontantAcompte(saisie: string): Decimal`, `verifierMois(mois: string): string`, `verifierDate(date: string): string`
  - `controlerCertificat(k: CalculCertificat): void` (refuse un présent acompte ≤ 0), `alerteCertificat(k: CalculCertificat): string | null`
  - `moisLong(mois: string): string` (« Juillet 2026 »), `dateCourteSlash(iso: string): string` (« 30/09/2026 ») ; une saisie vide ou invalide donne `''` (l'aperçu peut montrer un champ vidé)

Ces fonctions sont pures (ni base, ni Node) : l'aperçu du certificat les appelle dans le navigateur, le serveur les rappelle à la génération (spec § 3).

- [ ] **Step 1: Écrire les tests des avenants**

Créer `src/domaine/avenants.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { formatEuros } from './montants';
import {
	confirmationSuppression, dateLongue, lireMontantAvenant, manquesAvenant, montantsLettre, MOINS_VALUE_NEGATIVE, MONTANT_ILLISIBLE, numeroAvenantTexte,
	sommeAvenants, SUPPRESSION_NEGATIVE, verifierEngage,
} from './avenants';

// Spec, annexe A : lot CARRELAGE — FAÏENCE, 12 600,00 € HT, TVA 20 %.
const LOT = { htInitial: '12600', tauxTva: '20' };
const deux = [{ numero: 1, montantHt: '850' }, { numero: 2, montantHt: '-300' }];
const txt = (m: ReturnType<typeof montantsLettre>) => ({
	plusValue: m.plusValue, marcheInitial: m.marcheInitial.toFixed(2), devis: m.devis.toFixed(2), nouveauMontant: m.nouveauMontant.toFixed(2),
});

describe('lettre d\'avenant', () => {
	it('annexe A : lettre n° 02, moins-value', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: deux, numero: 2 })))
			.toEqual({ plusValue: false, marcheInitial: '16140.00', devis: '360.00', nouveauMontant: '15780.00' });
	});

	it('la lettre n° 01 ignore les avenants suivants', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: deux, numero: 1 })))
			.toEqual({ plusValue: true, marcheInitial: '15120.00', devis: '1020.00', nouveauMontant: '16140.00' });
	});

	it('annexe A : après suppression du n° 01, la lettre n° 02 repart du marché initial', () => {
		expect(txt(montantsLettre({ ...LOT, avenants: [deux[1]], numero: 2 })))
			.toEqual({ plusValue: false, marcheInitial: '15120.00', devis: '360.00', nouveauMontant: '14760.00' });
	});

	it('un avenant absent de la liste est signalé', () => {
		expect(() => montantsLettre({ ...LOT, avenants: deux, numero: 3 })).toThrow("Cet avenant n'existe plus.");
	});
});

describe('montant d\'un avenant', () => {
	it('lit un montant signé, au centime, signe moins typographique compris', () => {
		expect(lireMontantAvenant('−300,00 €').toFixed(2)).toBe('-300.00');
		expect(lireMontantAvenant('1 234,567').toFixed(2)).toBe('1234.57');
		expect(lireMontantAvenant('0').toFixed(2)).toBe('0.00');
	});

	it('refuse une saisie illisible avec le message de la spec', () => {
		expect(() => lireMontantAvenant('abc')).toThrow(MONTANT_ILLISIBLE);
		expect(() => lireMontantAvenant('')).toThrow(MONTANT_ILLISIBLE);
	});

	it('le montant engagé ne descend pas sous zéro', () => {
		expect(() => verifierEngage('100', [{ montantHt: '-100' }])).not.toThrow();
		expect(() => verifierEngage('100', [{ montantHt: '50' }, { montantHt: '-150.01' }])).toThrow(MOINS_VALUE_NEGATIVE);
		// Supprimer une plus-value peut aussi faire passer le lot sous zéro : le message le dit.
		expect(() => verifierEngage('100', [{ montantHt: '-140' }], SUPPRESSION_NEGATIVE)).toThrow(SUPPRESSION_NEGATIVE);
	});

	it('somme, numéro imprimé, manques', () => {
		expect(sommeAvenants(deux).toFixed(2)).toBe('550.00');
		expect(sommeAvenants([]).toFixed(2)).toBe('0.00');
		expect(numeroAvenantTexte(2)).toBe('02');
		expect(numeroAvenantTexte(12)).toBe('12');
		expect(manquesAvenant({ artisanId: null, montantHt: '0' })).toEqual(['entreprise', 'montantAvenant']);
		expect(manquesAvenant({ artisanId: 'a', montantHt: '-1' })).toEqual([]);
	});

	it('annexe A : confirmation de la suppression du n° 02', () => {
		expect(confirmationSuppression(2, '12600', [{ montantHt: '850' }]))
			.toBe(`Supprimer l'avenant n° 02 ? Le montant du lot revient à ${formatEuros('13450')} HT.`);
	});

	it('date de la lettre en toutes lettres', () => {
		expect(dateLongue(new Date('2026-05-12T00:00:00Z'))).toBe('12 mai 2026');
		expect(dateLongue(new Date('2026-06-01T00:00:00Z'))).toBe('1er juin 2026');
	});
});
```

- [ ] **Step 2: Écrire les tests du certificat**

Créer `src/domaine/certificats.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
	alerteCertificat, calculerCertificat, certificatPossible, controlerCertificat, CUMUL_AU_DELA, CUMUL_MANQUANT, dateCourteSlash, lireCumul,
	lireMontantAcompte, moisLong, PRESENT_NON_POSITIF, verifierDate, verifierMois, type CalculCertificat, type EntreeCalcul,
} from './certificats';

const texte = (k: CalculCertificat) => Object.fromEntries(
	Object.entries(k).map(([c, v]) => [c, Array.isArray(v) ? v.map((x) => x.toFixed(2)) : v.toFixed(2)]),
);

// Spec, annexe A : CARRELAGE — FAÏENCE, avenant n° 01 de + 850, acomptes antérieurs 3 000 et 4 200, cumul 9 850.
const CARRELAGE: EntreeCalcul = {
	htInitial: '12600', avenants: ['850'], tauxTva: '20', tauxRetenue: '5', caution: false,
	precedents: ['3000', '4200'], cumulRealise: '9850',
};

describe('calcul du certificat', () => {
	it('annexe A, sans caution', () => {
		expect(texte(calculerCertificat(CARRELAGE))).toEqual({
			marcheHt: '12600.00', avenants: ['850.00'], totalHt: '13450.00', totalTva: '2690.00', totalTtc: '16140.00',
			precedentsHt: '7200.00', precedentsTva: '1440.00', precedentsTtc: '8640.00',
			realiseHt: '9850.00', presentHt: '2650.00', presentTva: '530.00', presentTtc: '3180.00',
			retenue: '159.00', mandate: '3021.00',
		});
	});

	it('annexe A, avec caution : pas de retenue', () => {
		const k = calculerCertificat({ ...CARRELAGE, caution: true });
		expect([k.retenue.toFixed(2), k.mandate.toFixed(2)]).toEqual(['0.00', '3180.00']);
	});

	it('annexe A : un demi-centime s\'arrondit au-dessus', () => {
		const k = calculerCertificat({
			htInitial: '5000', avenants: [], tauxTva: '10', tauxRetenue: '5', caution: false, precedents: [], cumulRealise: '1184.09',
		});
		expect([k.presentTva, k.presentTtc, k.retenue, k.mandate].map((x) => x.toFixed(2))).toEqual(['118.41', '1302.50', '65.13', '1237.37']);
	});

	it('E2E de la spec : PEINTURE, avenant − 300, acomptes 2 000 et 3 000, cumul 7 000, caution', () => {
		const k = calculerCertificat({
			htInitial: '9450', avenants: ['-300'], tauxTva: '20', tauxRetenue: '5', caution: true, precedents: ['2000', '3000'], cumulRealise: '7000',
		});
		expect([k.totalHt, k.precedentsHt, k.presentHt, k.presentTva, k.presentTtc, k.retenue, k.mandate].map((x) => x.toFixed(2)))
			.toEqual(['9150.00', '5000.00', '2000.00', '400.00', '2400.00', '0.00', '2400.00']);
	});

	it('présent acompte nul ou négatif : refusé', () => {
		expect(() => controlerCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '7200' }))).toThrow(PRESENT_NON_POSITIF);
		expect(() => controlerCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '5000' }))).toThrow(PRESENT_NON_POSITIF);
		expect(() => controlerCertificat(calculerCertificat(CARRELAGE))).not.toThrow();
	});

	it('un certificat demande une entreprise et un montant engagé positif', () => {
		expect(certificatPossible({ artisanId: 'a', htEngage: '0.01' })).toBe(true);
		expect(certificatPossible({ artisanId: null, htEngage: '100' })).toBe(false);
		expect(certificatPossible({ artisanId: 'a', htEngage: '0' })).toBe(false);
	});

	it('cumul au-delà du total avenants compris : alerte, pas refus', () => {
		expect(alerteCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '13450.01' }))).toBe(CUMUL_AU_DELA);
		expect(alerteCertificat(calculerCertificat({ ...CARRELAGE, cumulRealise: '13450' }))).toBeNull();
	});
});

describe('saisies du certificat', () => {
	it('cumul : obligatoire, lisible, au centime', () => {
		expect(() => lireCumul('  ')).toThrow(CUMUL_MANQUANT);
		expect(() => lireCumul('abc')).toThrow('Montant : saisissez un nombre.');
		expect(lireCumul('9 850,004').toFixed(2)).toBe('9850.00');
	});

	it('acompte antérieur : positif', () => {
		expect(lireMontantAcompte('3 000').toFixed(2)).toBe('3000.00');
		expect(() => lireMontantAcompte('0')).toThrow('Le montant doit être positif.');
		expect(() => lireMontantAcompte('-5')).toThrow('Le montant doit être positif.');
	});

	it('mois : AAAA-MM, mois 01 à 12', () => {
		expect(verifierMois('2026-07')).toBe('2026-07');
		for (const faux of ['2026-13', '2026-00', '1999-01', '2026-7', 'juillet']) {
			expect(() => verifierMois(faux)).toThrow('Mois : choisissez un mois.');
		}
	});

	it('date : un jour qui existe', () => {
		expect(verifierDate('2026-09-30')).toBe('2026-09-30');
		expect(() => verifierDate('2026-02-30')).toThrow('Date : choisissez une date.');
		expect(() => verifierDate('30/09/2026')).toThrow('Date : choisissez une date.');
	});

	it('textes imprimés', () => {
		expect(moisLong('2026-07')).toBe('Juillet 2026');
		expect(moisLong('2027-01')).toBe('Janvier 2027');
		expect(dateCourteSlash('2026-09-30')).toBe('30/09/2026');
		expect([moisLong(''), moisLong('2026-13'), dateCourteSlash('')]).toEqual(['', '', '']);
	});
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npm test -- src/domaine/avenants.test.ts src/domaine/certificats.test.ts`
Expected: FAIL — `./avenants` et `./certificats` introuvables.

- [ ] **Step 4: Implémenter les règles des avenants**

Créer `src/domaine/avenants.ts` :

```ts
import Decimal from 'decimal.js';
import { ErreurMetier } from './erreurs';
import { arrondiCentime, formatEuros, htEngage, lireNombreFr, ttcEngage, type Valeur } from './montants';

export type AvenantMontant = { numero: number; montantHt: Valeur };

export const MOINS_VALUE_NEGATIVE = 'Cette moins-value rendrait le montant du lot négatif.';
export const SUPPRESSION_NEGATIVE = 'Supprimer cet avenant rendrait le montant du lot négatif.';
export const HT_INFERIEUR_AVENANTS = 'Ce HT est inférieur aux seuls avenants.';
export const MONTANT_ILLISIBLE = 'Montant : saisissez un nombre.';
export const AVENANT_DISPARU = "Cet avenant n'existe plus.";

/** « 02 » : le numéro tel qu'il s'imprime. */
export const numeroAvenantTexte = (n: number): string => String(n).padStart(2, '0');

export function sommeAvenants(avenants: { montantHt: Valeur }[]): Decimal {
	return avenants.reduce<Decimal>((s, a) => s.plus(a.montantHt), new Decimal(0));
}

/** Le signe distingue la plus-value de la moins-value ; « − » typographique accepté ; arrondi au centime. */
export function lireMontantAvenant(saisie: string): Decimal {
	try {
		return lireNombreFr(saisie.replace(/−/g, '-')).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
	} catch {
		throw new ErreurMetier(MONTANT_ILLISIBLE, 'montantHt');
	}
}

/** Le montant engagé HT (initial + avenants) ne descend jamais sous zéro. */
export function verifierEngage(htInitial: Valeur, avenants: { montantHt: Valeur }[], message = MOINS_VALUE_NEGATIVE): void {
	if (htEngage(htInitial, sommeAvenants(avenants)).lessThan(0)) throw new ErreurMetier(message, 'montantHt');
}

/** « Supprimer l'avenant n° 02 ? Le montant du lot revient à 13 450,00 € HT. » (spec § 5, annexe A) */
export function confirmationSuppression(numero: number, htInitial: Valeur, autres: { montantHt: Valeur }[]): string {
	return `Supprimer l'avenant n° ${numeroAvenantTexte(numero)} ? Le montant du lot revient à ${formatEuros(htEngage(htInitial, sommeAvenants(autres)))} HT.`;
}

const DATE_LONGUE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Une colonne `@db.Date` (minuit UTC) en toutes lettres : « 12 mai 2026 », « 1er juin 2026 ». */
export function dateLongue(d: Date): string {
	return DATE_LONGUE.format(d).replace(/^1 /, '1er ');
}

export type MontantsLettre = { plusValue: boolean; marcheInitial: Decimal; devis: Decimal; nouveauMontant: Decimal };

/**
 * Montants TTC de la lettre n° `numero` (maquette `buildDocAvenant`) : le « marché initial » compte les
 * avenants de numéro inférieur encore présents. Chaque montant est arrondi au centime séparément.
 */
export function montantsLettre(p: { htInitial: Valeur; tauxTva: Valeur; avenants: AvenantMontant[]; numero: number }): MontantsLettre {
	const avenant = p.avenants.find((a) => a.numero === p.numero);
	if (!avenant) throw new ErreurMetier(AVENANT_DISPARU);
	const anterieurs = sommeAvenants(p.avenants.filter((a) => a.numero < p.numero));
	const montant = new Decimal(avenant.montantHt);
	return {
		plusValue: !montant.lessThan(0),
		marcheInitial: arrondiCentime(ttcEngage(p.htInitial, p.tauxTva, anterieurs)),
		devis: arrondiCentime(ttcEngage(montant.abs(), p.tauxTva)),
		nouveauMontant: arrondiCentime(ttcEngage(p.htInitial, p.tauxTva, anterieurs.plus(montant))),
	};
}

export type ManqueAvenant = 'entreprise' | 'montantAvenant';

export const LIBELLES_MANQUES_AVENANT: Record<ManqueAvenant, string> = {
	entreprise: "pas d'entreprise",
	montantAvenant: "montant de l'avenant",
};

/** Une lettre se génère pour un lot attribué et un avenant de montant non nul (spec § 5). */
export function manquesAvenant(p: { artisanId: string | null; montantHt: Valeur }): ManqueAvenant[] {
	const manques: ManqueAvenant[] = [];
	if (!p.artisanId) manques.push('entreprise');
	if (new Decimal(p.montantHt).isZero()) manques.push('montantAvenant');
	return manques;
}
```

- [ ] **Step 5: Implémenter le calcul du certificat**

Créer `src/domaine/certificats.ts` :

```ts
import Decimal from 'decimal.js';
import { ErreurMetier } from './erreurs';
import { arrondiCentime, lireNombreFr, type Valeur } from './montants';

/** `AAAA-MM`, mois 01 à 12, années 2000 à 2099 : la même expression que le CHECK de la base. */
export const MOIS_VALIDE = /^(20[0-9]{2})-(0[1-9]|1[0-2])$/;
export const CUMUL_MANQUANT = 'Saisissez le montant des travaux réalisés.';
export const PRESENT_NON_POSITIF = 'Le présent acompte doit être positif.';
export const CUMUL_AU_DELA = 'Le cumul réalisé dépasse le montant total du marché avec ses avenants.';
export const ACOMPTE_DISPARU = "Cet acompte n'existe plus.";
export const AUTRE_CERTIFICAT = 'Un autre certificat a été enregistré entre-temps : rouvrez le certificat.';
export const DERNIER_SEUL = 'Seul le dernier certificat du lot peut être corrigé.';
export const CERTIFICATS_EXISTENT = 'Des certificats existent : les acomptes antérieurs ne se modifient plus.';
export const CERTIFICAT_IMPOSSIBLE = "Attribuez une entreprise et un montant au lot avant d'en faire un certificat.";

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export type EntreeCalcul = {
	htInitial: Valeur;
	/** Montants HT des avenants, dans l'ordre des numéros. */
	avenants: Valeur[];
	tauxTva: Valeur;
	tauxRetenue: Valeur;
	caution: boolean;
	/** Montants HT des acomptes précédents, dans l'ordre des numéros. */
	precedents: Valeur[];
	cumulRealise: Valeur;
};

export type CalculCertificat = {
	marcheHt: Decimal; avenants: Decimal[]; totalHt: Decimal; totalTva: Decimal; totalTtc: Decimal;
	precedentsHt: Decimal; precedentsTva: Decimal; precedentsTtc: Decimal;
	realiseHt: Decimal; presentHt: Decimal; presentTva: Decimal; presentTtc: Decimal; retenue: Decimal; mandate: Decimal;
};

const r = arrondiCentime;
const somme = (xs: Valeur[]) => xs.reduce<Decimal>((s, x) => s.plus(x), new Decimal(0));
/** Un taux (en %) appliqué à un montant, arrondi au centime. */
const part = (x: Decimal, taux: Valeur) => r(x.times(taux).div(100));

/**
 * Maquette `calculCp`, vérifiée sur un vrai certificat : arrondi au centime à chaque ligne.
 * La maquette calculait en flottants ; ici `Decimal`, demi-centime arrondi au-dessus (spec § 6).
 */
export function calculerCertificat(e: EntreeCalcul): CalculCertificat {
	const totalHt = r(somme([e.htInitial, ...e.avenants]));
	const totalTva = part(totalHt, e.tauxTva);
	const precedentsHt = r(somme(e.precedents));
	const precedentsTva = part(precedentsHt, e.tauxTva);
	const realiseHt = r(e.cumulRealise);
	const presentHt = r(realiseHt.minus(precedentsHt));
	const presentTva = part(presentHt, e.tauxTva);
	const presentTtc = presentHt.plus(presentTva);
	const retenue = e.caution ? new Decimal(0) : part(presentTtc, e.tauxRetenue);
	return {
		marcheHt: r(e.htInitial), avenants: e.avenants.map((a) => r(a)),
		totalHt, totalTva, totalTtc: totalHt.plus(totalTva),
		precedentsHt, precedentsTva, precedentsTtc: precedentsHt.plus(precedentsTva),
		realiseHt, presentHt, presentTva, presentTtc, retenue, mandate: presentTtc.minus(retenue),
	};
}

function montant(saisie: string, champ: string): Decimal {
	try {
		return lireNombreFr(saisie).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
	} catch {
		throw new ErreurMetier('Montant : saisissez un nombre.', champ);
	}
}

export function lireCumul(saisie: string): Decimal {
	if (!saisie.trim()) throw new ErreurMetier(CUMUL_MANQUANT, 'cumul');
	return montant(saisie, 'cumul');
}

/** Acompte antérieur saisi à la main. */
export function lireMontantAcompte(saisie: string): Decimal {
	const m = montant(saisie, 'montantHt');
	if (!m.greaterThan(0)) throw new ErreurMetier('Le montant doit être positif.', 'montantHt');
	return m;
}

export function verifierMois(mois: string): string {
	if (!MOIS_VALIDE.test(mois)) throw new ErreurMetier('Mois : choisissez un mois.', 'mois');
	return mois;
}

export function verifierDate(date: string): string {
	const d = new Date(`${date}T00:00:00Z`);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
		throw new ErreurMetier('Date : choisissez une date.', 'date');
	}
	return date;
}

export function controlerCertificat(k: CalculCertificat): void {
	if (!k.presentHt.greaterThan(0)) throw new ErreurMetier(PRESENT_NON_POSITIF, 'cumul');
}

/** Lot sans entreprise ou montant engagé nul : bouton « Certificat de paiement » inactif (spec § 6). */
export function certificatPossible(p: { artisanId: string | null; htEngage: Valeur }): boolean {
	return !!p.artisanId && new Decimal(p.htEngage).greaterThan(0);
}

/** Avertissement d'écran, non imprimé, non bloquant (maquette `majCpCalculs`). */
export function alerteCertificat(k: CalculCertificat): string | null {
	return k.realiseHt.greaterThan(k.totalHt) ? CUMUL_AU_DELA : null;
}

/** '2026-07' → 'Juillet 2026' ; '' si le mois n'est pas valide (champ vidé dans l'aperçu). */
export function moisLong(mois: string): string {
	const r = MOIS_VALIDE.exec(mois);
	if (!r) return '';
	const nom = MOIS[Number(r[2]) - 1];
	return `${nom.charAt(0).toUpperCase()}${nom.slice(1)} ${r[1]}`;
}

/** '2026-09-30' → '30/09/2026' (« Fait à Châteaubriant le : ») ; '' si la date n'a pas la bonne forme. */
export function dateCourteSlash(iso: string): string {
	const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return r ? `${r[3]}/${r[2]}/${r[1]}` : '';
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npm test -- src/domaine/avenants.test.ts src/domaine/certificats.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domaine/avenants.ts src/domaine/avenants.test.ts src/domaine/certificats.ts src/domaine/certificats.test.ts
git commit -m "feat(domaine): règles des avenants et calcul du certificat de paiement"
```

---
### Task 2: Tables Avenant et Acompte, migration, séries, paramètres du certificat

**Files:**
- Modify: `prisma/schema.prisma`, `src/documents/libelles.ts`, `src/documents/series.ts`, `src/donnees/parametres.ts`, `src/actions/parametres.ts`, `src/app/(app)/parametres/page.tsx`, `tests/integration/aide.ts`
- Create: `prisma/migrations/20261002000000_suivi_financier/migration.sql`
- Test: `src/donnees/migrationFinanciere.int.test.ts`, `src/donnees/parametres.int.test.ts`

**Interfaces:**
- Consumes: le schéma et les migrations du Socle et du Planning ; `SERIES` (Planning, Task 3).
- Produces:
  - modèles Prisma `Avenant { id, lotId, numero, devis, montantHt Decimal(18,2), date @db.Date, objet, creeLe }` et `Acompte { id, lotId, numero, montantHt Decimal(18,2), manuel, cumulRealiseHt?, mois?, date?, creeLe }`, `@@unique([lotId, numero])` pour les deux
  - `Lot.dernierNumeroAvenant: number`, `Lot.cautionBancaire: boolean`, relations `Lot.avenants`, `Lot.acomptes`
  - `TypeDocument` + `'AVENANT' | 'CERTIFICAT_PAIEMENT'` ; `LIBELLES_TYPES` et `TITRES_TYPES` complétés
  - `serieAvenant(avenantId: string): string` (`AVENANT:<id>`), `serieCertificat(acompteId: string): string` (`CERTIFICAT:<id>`)
  - `Parametres.rcs`, `.ape`, `.tvaIntracommunautaire` ; `ChampParametres` + `'rcs' | 'ape' | 'tvaIntracommunautaire'` ; `PARAMETRES_PAR_DEFAUT.email = 'contact@socoreve-chateaubriant.com'`

- [ ] **Step 1: Écrire le test de la migration**

Créer `src/donnees/migrationFinanciere.int.test.ts` (même méthode que `migrationPlanning.int.test.ts` : un schéma à part, les migrations précédentes, des données, puis la nouvelle migration) :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const FINANCIER = '20261002000000_suivi_financier';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du suivi financier', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	const acompte = (id: string, colonnes: string, valeurs: string) =>
		client.query(`INSERT INTO "Acompte" (id, "lotId", ${colonnes}) VALUES ('${id}', 'l', ${valeurs})`);

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_financier CASCADE; CREATE SCHEMA essai_financier; SET search_path TO essai_financier;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < FINANCIER).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "utilisateur" (id, name, email, "updatedAt") VALUES ('u', 'U', 'u@test.local', now())`);
		await client.query(`INSERT INTO "Chantier" (id, reference, "maitreOuvrage", "chargeAffaireId", "creeParId") VALUES ('c', 'R', 'M', 'u', 'u')`);
		await client.query(`INSERT INTO "Lot" (id, "chantierId", ordre, designation) VALUES ('l', 'c', 1, 'PEINTURE')`);
		await client.query(`INSERT INTO "Parametres" (id, "raisonSociale", "libelleActivite", adresse, cp, ville, telephone, email, "villeSignature")
			VALUES (1, 'S.A.S SOCOREVE', 'Activité', '71 rue du Général Patton', '44110', 'Châteaubriant', '02 40 81 40 26', 'contact@socoreve-chateaubriant.fr', 'Châteaubriant')`);
		await client.query(sql(FINANCIER));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_financier CASCADE');
		await client.end();
	});

	it('les paramètres existants reçoivent RCS, APE, TVA intracommunautaire et la nouvelle adresse e-mail', async () => {
		const { rows } = await client.query('SELECT email, rcs, ape, "tvaIntracommunautaire" FROM "Parametres"');
		expect(rows).toEqual([{ email: 'contact@socoreve-chateaubriant.com', rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503' }]);
	});

	it('les lots existants partent sans avenant ni caution', async () => {
		const { rows } = await client.query('SELECT "dernierNumeroAvenant", "cautionBancaire" FROM "Lot"');
		expect(rows).toEqual([{ dernierNumeroAvenant: 0, cautionBancaire: false }]);
	});

	it('avenant : numéro positif, unique dans le lot', async () => {
		await client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a1', 'l', 1, '2026-05-12')`);
		await expect(client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a2', 'l', 1, '2026-05-12')`)).rejects.toThrow(/Avenant_lotId_numero_key/);
		await expect(client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a3', 'l', 0, '2026-05-12')`)).rejects.toThrow(/Avenant_numero_positif/);
	});

	it('acompte : montant positif, certificat complet, mois valide', async () => {
		await acompte('m1', 'numero, "montantHt", manuel', `1, 2000, true`);
		await expect(acompte('m2', 'numero, "montantHt", manuel', `2, 0, true`)).rejects.toThrow(/Acompte_montant_positif/);
		await expect(acompte('m3', 'numero, "montantHt", manuel', `0, 10, true`)).rejects.toThrow(/Acompte_numero_positif/);
		await expect(acompte('c1', 'numero, "montantHt"', `2, 500`)).rejects.toThrow(/Acompte_certificat_complet/);
		await expect(acompte('c2', 'numero, "montantHt", "cumulRealiseHt", mois, date', `2, 500, 2500, '2026-13', '2026-09-30'`))
			.rejects.toThrow(/Acompte_mois_valide/);
		await acompte('c3', 'numero, "montantHt", "cumulRealiseHt", mois, date', `2, 500, 2500, '2026-07', '2026-09-30'`);
		await expect(acompte('c4', 'numero, "montantHt", manuel', `2, 10, true`)).rejects.toThrow(/Acompte_lotId_numero_key/);
	});

	it('supprimer le lot emporte ses avenants et acomptes', async () => {
		await client.query(`DELETE FROM "Lot" WHERE id = 'l'`);
		const { rows } = await client.query('SELECT (SELECT count(*) FROM "Avenant")::int AS a, (SELECT count(*) FROM "Acompte")::int AS c');
		expect(rows).toEqual([{ a: 0, c: 0 }]);
	});
});
```

Dans `src/donnees/parametres.int.test.ts`, ajouter à la fin du `describe` existant (il crée les paramètres dans son `beforeEach` par `creerParametresTest`) :

```ts
	it('RCS, APE et TVA intracommunautaire : valeurs par défaut, modifiables, obligatoires', async () => {
		const p = await lireParametres();
		expect([p.email, p.rcs, p.ape, p.tvaIntracommunautaire])
			.toEqual(['contact@socoreve-chateaubriant.com', '328999503', '4120A', 'FR47328999503']);
		await modifierParametre('tvaIntracommunautaire', ' FR47328999503 ');
		expect((await lireParametres()).tvaIntracommunautaire).toBe('FR47328999503');
		await expect(modifierParametre('rcs', '  ')).rejects.toThrow('Ce champ est obligatoire.');
	});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/donnees/migrationFinanciere.int.test.ts src/donnees/parametres.int.test.ts`
Expected: FAIL — `20261002000000_suivi_financier/migration.sql` introuvable ; `rcs` inconnu.

- [ ] **Step 3: Le schéma**

Dans `prisma/schema.prisma` :

1. Compléter l'enum :

```prisma
enum TypeDocument {
  MARCHE_GRE_A_GRE
  MARCHE_SOUS_TRAITANCE
  RECAPITULATIF
  PLANNING
  VISA_PLANNING
  AVENANT
  CERTIFICAT_PAIEMENT
}
```

2. Dans `model Parametres`, après `villeSignature` :

```prisma
  /// En-tête du certificat de paiement. À relire sur le KBIS avant la mise en service.
  rcs                   String  @default("328999503")
  ape                   String  @default("4120A")
  tvaIntracommunautaire String  @default("FR47328999503")
```

3. Dans `model Lot`, après `dateSignature` et avant `documents` :

```prisma
  /// Compteur des avenants : un numéro n'est jamais réattribué, même après suppression.
  dernierNumeroAvenant Int        @default(0)
  cautionBancaire      Boolean    @default(false)
  avenants             Avenant[]
  acomptes             Acompte[]
```

4. Ajouter à la fin du fichier :

```prisma
model Avenant {
  id        String   @id @default(cuid())
  lotId     String
  lot       Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  /// Fixé à la création (`Lot.dernierNumeroAvenant + 1`), jamais réutilisé.
  numero    Int
  devis     String   @default("")
  /// Signé : négatif = moins-value.
  montantHt Decimal  @default(0) @db.Decimal(18, 2)
  date      DateTime @db.Date
  objet     String   @default("")
  creeLe    DateTime @default(now())

  @@unique([lotId, numero])
}

/// Un certificat de paiement émis, ou un acompte antérieur à l'application (`manuel`, sans document).
model Acompte {
  id             String    @id @default(cuid())
  lotId          String
  lot            Lot       @relation(fields: [lotId], references: [id], onDelete: Cascade)
  /// 1, 2, 3… sans trou dans le lot.
  numero         Int
  /// Présent acompte HT (montant saisi pour un acompte manuel).
  montantHt      Decimal   @db.Decimal(18, 2)
  manuel         Boolean   @default(false)
  /// Certificat seulement (contrainte CHECK écrite dans la migration).
  cumulRealiseHt Decimal?  @db.Decimal(18, 2)
  /// 'AAAA-MM', certificat seulement.
  mois           String?
  /// « Fait le », certificat seulement.
  date           DateTime? @db.Date
  creeLe         DateTime  @default(now())

  @@unique([lotId, numero])
}
```

- [ ] **Step 4: La migration**

Créer `prisma/migrations/20261002000000_suivi_financier/migration.sql` :

```sql
-- AlterEnum
ALTER TYPE "TypeDocument" ADD VALUE 'AVENANT';
ALTER TYPE "TypeDocument" ADD VALUE 'CERTIFICAT_PAIEMENT';

-- AlterTable
ALTER TABLE "Lot" ADD COLUMN "dernierNumeroAvenant" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cautionBancaire" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Parametres" ADD COLUMN "rcs" TEXT NOT NULL DEFAULT '328999503',
ADD COLUMN "ape" TEXT NOT NULL DEFAULT '4120A',
ADD COLUMN "tvaIntracommunautaire" TEXT NOT NULL DEFAULT 'FR47328999503';

-- L'adresse du certificat SOCOREVE : seule l'ancienne valeur par défaut est remplacée, une adresse saisie reste.
UPDATE "Parametres" SET "email" = 'contact@socoreve-chateaubriant.com' WHERE "email" = 'contact@socoreve-chateaubriant.fr';

-- CreateTable
CREATE TABLE "Avenant" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "devis" TEXT NOT NULL DEFAULT '',
    "montantHt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,
    "objet" TEXT NOT NULL DEFAULT '',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Avenant_pkey" PRIMARY KEY ("id"),
    -- Écrites à la main : Prisma ne connaît pas les CHECK.
    CONSTRAINT "Avenant_numero_positif" CHECK ("numero" >= 1)
);

-- CreateTable
CREATE TABLE "Acompte" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "montantHt" DECIMAL(18,2) NOT NULL,
    "manuel" BOOLEAN NOT NULL DEFAULT false,
    "cumulRealiseHt" DECIMAL(18,2),
    "mois" TEXT,
    "date" DATE,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acompte_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Acompte_numero_positif" CHECK ("numero" >= 1),
    CONSTRAINT "Acompte_montant_positif" CHECK ("montantHt" > 0),
    CONSTRAINT "Acompte_certificat_complet" CHECK ("manuel" OR ("cumulRealiseHt" IS NOT NULL AND "mois" IS NOT NULL AND "date" IS NOT NULL)),
    -- Même expression que MOIS_VALIDE (src/domaine/certificats.ts).
    CONSTRAINT "Acompte_mois_valide" CHECK ("mois" IS NULL OR "mois" ~ '^(20[0-9]{2})-(0[1-9]|1[0-2])$')
);

-- CreateIndex
CREATE UNIQUE INDEX "Avenant_lotId_numero_key" ON "Avenant"("lotId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Acompte_lotId_numero_key" ON "Acompte"("lotId", "numero");

-- AddForeignKey
ALTER TABLE "Avenant" ADD CONSTRAINT "Avenant_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acompte" ADD CONSTRAINT "Acompte_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Pour comparer au squelette de Prisma (noms d'index et de contraintes) :

Run: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`
Expected: le même SQL, sans les `CHECK` ni l'`UPDATE`. Si Prisma nomme un index ou une contrainte autrement, reprendre son nom.

- [ ] **Step 5: Vérifier la migration sur la base de test, puis l'appliquer en développement**

Run: `DATABASE_URL="$(grep '^DATABASE_URL_TEST=' .env | cut -d= -f2- | tr -d '"')" sh -c 'node scripts/reinitialiser-base-test.mjs && npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code; echo "code $?"'`
Expected: les trois migrations appliquées, puis `code 0`. Un `code 2` signale un écart : corriger le SQL et relancer.

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: `20261002000000_suivi_financier` appliquée en développement ; client régénéré.

- [ ] **Step 6: Types, séries, paramètres**

Dans `src/documents/libelles.ts` :

```ts
export type TypeDocument =
	| 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' | 'RECAPITULATIF' | 'PLANNING' | 'VISA_PLANNING'
	| 'AVENANT' | 'CERTIFICAT_PAIEMENT';
```

et ajouter aux deux tables :

```ts
	AVENANT: 'Avenant',
	CERTIFICAT_PAIEMENT: 'Certificat de paiement',
```

(les deux entrées sont identiques dans `LIBELLES_TYPES` et `TITRES_TYPES`, spec § 4).

Dans `src/documents/series.ts`, ajouter :

```ts
/** Une lettre d'avenant : ses versions survivent à l'avenant (pas de clé étrangère). */
export const serieAvenant = (avenantId: string): string => `AVENANT:${avenantId}`;
/** Un certificat de paiement : une série par acompte, dont seule la dernière version compte. */
export const serieCertificat = (acompteId: string): string => `CERTIFICAT:${acompteId}`;
```

Dans `src/donnees/parametres.ts` :

1. Dans `PARAMETRES_PAR_DEFAUT`, remplacer la ligne `email` et ajouter les trois champs :

```ts
	email: 'contact@socoreve-chateaubriant.com',
	villeSignature: 'Châteaubriant',
	rcs: '328999503',
	ape: '4120A',
	tvaIntracommunautaire: 'FR47328999503',
```

2. Remplacer le type :

```ts
export type ChampParametres =
	| 'raisonSociale' | 'libelleActivite' | 'adresse' | 'cp' | 'ville' | 'telephone' | 'fax' | 'email' | 'villeSignature'
	| 'rcs' | 'ape' | 'tvaIntracommunautaire';
```

Dans `src/actions/parametres.ts`, compléter la liste :

```ts
const CHAMPS = [
	'raisonSociale', 'libelleActivite', 'adresse', 'cp', 'ville', 'telephone', 'fax', 'email', 'villeSignature',
	'rcs', 'ape', 'tvaIntracommunautaire',
] as const;
```

Dans `src/app/(app)/parametres/page.tsx`, remplacer la ligne de l'e-mail et ajouter trois lignes à la fin de `CHAMPS` :

```tsx
	{ champ: 'email', libelle: 'E-mail', aide: 'Imprimé sur les certificats de paiement, pas sur les marchés.' },
	{ champ: 'villeSignature', libelle: 'Ville de signature', aide: '« Fait à … le … »' },
	{ champ: 'rcs', libelle: 'RCS', aide: 'Certificats de paiement.' },
	{ champ: 'ape', libelle: 'Code APE', aide: 'Certificats de paiement.' },
	{ champ: 'tvaIntracommunautaire', libelle: 'N° TVA intracommunautaire', aide: 'Certificats de paiement — « FR », la clé, puis le SIREN.' },
```

et le sous-titre :

```tsx
				<p className="text-sm text-muted-foreground">En-tête imprimé sur les marchés, le récapitulatif et les certificats de paiement. Chaque champ s&apos;enregistre quand on le quitte.</p>
```

Dans `tests/integration/aide.ts`, ajouter les deux tables au `TRUNCATE` :

```ts
		'TRUNCATE "Avenant", "Acompte", "Periode", "Fermeture", "Document", "Lot", "Chantier", "Artisan", "Parametres", "session", "compte", "verification", "utilisateur" RESTART IDENTITY CASCADE',
```

- [ ] **Step 7: Vérifier le succès**

Run: `npx tsc --noEmit && npm run test:int -- src/donnees/migrationFinanciere.int.test.ts src/donnees/parametres.int.test.ts src/donnees/migrationPlanning.int.test.ts`
Expected: aucune erreur de type ; PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261002000000_suivi_financier src/documents/libelles.ts src/documents/series.ts src/donnees/parametres.ts src/actions/parametres.ts src/app/\(app\)/parametres/page.tsx tests/integration/aide.ts src/donnees/migrationFinanciere.int.test.ts src/donnees/parametres.int.test.ts
git commit -m "feat(financier): tables Avenant et Acompte, séries, paramètres du certificat"
```

---
### Task 3: Montant engagé partout, verrou du lot, marchés manquants

**Files:**
- Create: `src/donnees/verrouLot.ts`
- Modify: `src/domaine/montants.ts`, `src/domaine/montants.test.ts`, `src/donnees/lots.ts`, `src/documents/batir.ts`, `src/documents/batir.test.ts`, `src/documents/donnees.ts`, `src/donnees/marches.ts`, `src/donnees/chantiers.ts`, `src/documents/generer.ts`, `tests/fixtures/perrier.ts`
- Test: `src/documents/montantEngage.int.test.ts`

**Interfaces:**
- Consumes: `sommeAvenants`, `verifierEngage`, `HT_INFERIEUR_AVENANTS` (Task 1) ; tables et relations de la Task 2.
- Produces:
  - `type Tx = Prisma.TransactionClient` ; `type LotVerrouille` (le lot avec `avenants` et `acomptes` triés par numéro) ; `sousVerrouLot<T>(lotId: string, operation: (tx: Tx, lot: LotVerrouille) => Promise<T>): Promise<T>` ; `montantsAvenants(lot: { avenants: { numero: number; montantHt: { toString(): string } }[] }): { numero: number; montantHt: string }[]` — tous dans `src/donnees/verrouLot.ts`
  - `type SourceAvenant = { id: string; numero: number; devis: string; montantHt: string; date: Date; objet: string }` ; `SourceLot.avenants: SourceAvenant[]` (triés par numéro) — `src/documents/batir.ts`
  - `LotVue.sommeAvenants: string` ; `LotVue.htEngage` et `LotVue.ttcEngage` comptent les avenants
  - `htDepuisTtc` refuse avec « Ce TTC est inférieur aux seuls avenants. »

- [ ] **Step 1: Écrire les tests d'intégration**

Créer `src/documents/montantEngage.int.test.ts` :

```ts
import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listerChantiers } from '@/donnees/chantiers';
import { modifierChampLot } from '@/donnees/lots';
import { lireVueMarches } from '@/donnees/marches';
import { prisma } from '@/donnees/prisma';
import { formatEuros } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { construireDonneesRecap } from './donnees';
import { etatsDocumentsChantier } from './etats';
import { genererMarche, genererMarchesManquants, genererRecap } from './generer';
import { recapVersXlsx } from './tableur';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;

const avenant = (designation: string, numero: number, montantHt: string) =>
	prisma.avenant.create({ data: { lotId: p.lots[designation], numero, montantHt, date: new Date('2026-05-12T00:00:00Z') } });
const htInitial = async (designation: string) =>
	(await prisma.lot.findUniqueOrThrow({ where: { id: p.lots[designation] } })).montantHtInitial.toString();
const ligneDocuments = async (designation: string) =>
	(await etatsDocumentsChantier(p.chantierId, deps.maintenant)).entreprises.flatMap((e) => e.lots).find((l) => l.lotId === p.lots[designation])!;

describe('montant engagé', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
	});

	it('compte les avenants : tableau, totaux, liste des chantiers, récapitulatif, tableur', async () => {
		// Annexe A : CARRELAGE 12 600 HT, + 850 puis − 300 → 13 150 HT, 15 780 TTC.
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		await avenant('CARRELAGE — FAÏENCE', 2, '-300');
		const vue = await lireVueMarches(p.chantierId);
		expect(vue.lots.find((l) => l.designation === 'CARRELAGE — FAÏENCE')).toMatchObject({
			htInitial: '12600', sommeAvenants: '550', htEngage: '13150', ttcEngage: '15780',
		});
		// PERRIER : 374 016 € TTC sans avenant ; + 550 × 1,2.
		expect(vue.totalTtcTexte).toBe(formatEuros('374676'));
		expect((await listerChantiers()).find((c) => c.id === p.chantierId)?.totalTtcTexte).toBe(formatEuros('374676'));
		const { donnees } = await construireDonneesRecap(p.chantierId, deps.maintenant);
		expect(donnees.contenu.lignes.find((l) => l.designation === 'CARRELAGE — FAÏENCE')?.montantTtc).toBe('15780.00');
		expect(donnees.contenu.totalTtc).toBe('374676.00');
		const classeur = new ExcelJS.Workbook();
		await classeur.xlsx.load((await recapVersXlsx(donnees)) as never);
		const lignes = classeur.getWorksheet('Récapitulatif')!.getSheetValues().filter(Boolean) as unknown[][];
		expect(lignes.find((l) => l[2] === 'CARRELAGE — FAÏENCE')?.[4]).toBe(15780);
		expect(lignes.find((l) => l[1] === 'TOTAL MARCHÉS')?.[4]).toBe(374676);
	});

	it('un avenant laisse le marché « à jour » mais rend le récapitulatif « modifié » ; saisir un TTC rend le marché « modifié »', async () => {
		await genererMarche(p.lots['CARRELAGE — FAÏENCE'], p.utilisateurId, deps);
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('a-jour');
		expect((await etatsDocumentsChantier(p.chantierId, deps.maintenant)).recap.etat).toBe('modifie');

		// Le même TTC engagé redonne le même HT initial : rien ne change.
		await modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '16 140,00');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12600');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('a-jour');

		// HT initial = 16 200 / 1,2 − 850 = 12 650 : le montant signé change.
		await modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '16 200');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12650');
		expect((await ligneDocuments('CARRELAGE — FAÏENCE')).marche.etat).toBe('modifie');
	});

	it('TTC inférieur aux seuls avenants, HT sous les moins-values : refusés, rien d\'écrit', async () => {
		await avenant('CARRELAGE — FAÏENCE', 1, '850');
		await expect(modifierChampLot(p.lots['CARRELAGE — FAÏENCE'], 'montantTtc', '1 000')).rejects.toThrow('Ce TTC est inférieur aux seuls avenants.');
		expect(await htInitial('CARRELAGE — FAÏENCE')).toBe('12600');

		await avenant('PEINTURE', 1, '-300');
		await expect(modifierChampLot(p.lots.PEINTURE, 'montantHt', '299,99')).rejects.toThrow('Ce HT est inférieur aux seuls avenants.');
		expect(await htInitial('PEINTURE')).toBe('9450');
		await modifierChampLot(p.lots.PEINTURE, 'montantHt', '300');
		expect(await htInitial('PEINTURE')).toBe('300');
	});

	it('générer les marchés manquants : un lot qui n\'a qu\'une lettre d\'avenant et un certificat a encore son marché à produire', async () => {
		const autre = (serie: string, type: 'AVENANT' | 'CERTIFICAT_PAIEMENT') => prisma.document.create({ data: {
			chantierId: p.chantierId, lotId: p.lots.PEINTURE, serie, type, version: 1, donnees: {}, empreinte: 'e',
			pdf: new Uint8Array([1]), nomFichier: `${serie}.pdf`, creeParId: p.utilisateurId,
		} });
		await autre('AVENANT:x', 'AVENANT');
		await autre('CERTIFICAT:y', 'CERTIFICAT_PAIEMENT');
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const r = await genererMarchesManquants(p.chantierId, p.utilisateurId, deps);
		expect(r.generes).toContain('Lot 11');
		expect(r.generes).not.toContain('Lot 02');
		expect(await prisma.document.count({ where: { serie: p.lots.PEINTURE } })).toBe(1);
	});
});
```

Dans `src/documents/batir.test.ts`, ajouter à la fin du `describe('récapitulatif PERRIER', …)` :

```ts
	it('au montant engagé : les avenants comptent', () => {
		const lots = PERRIER_LOTS.map((l) => (l.designation === 'CARRELAGE — FAÏENCE'
			? { ...l, avenants: [
				{ id: 'a1', numero: 1, devis: '', montantHt: '850', date: new Date('2026-05-12T00:00:00Z'), objet: '' },
				{ id: 'a2', numero: 2, devis: '', montantHt: '-300', date: new Date('2026-05-20T00:00:00Z'), objet: '' },
			] }
			: l));
		const r = batirRecap(PERRIER_CHANTIER, lots, PERRIER_PARAMETRES, MAINTENANT);
		expect(r.contenu.lignes.find((l) => l.designation === 'CARRELAGE — FAÏENCE')).toMatchObject({ montantTtc: '15780.00', montantTtcTexte: formatEuros('15780') });
		expect(r.contenu.totalTtc).toBe('374676.00');
	});
```

et l'import `import { formatEuros } from '@/domaine/montants';` en tête du fichier (les espaces de `formatEuros` sont insécables : on compare à sa sortie plutôt qu'à un texte recopié).

Dans `src/domaine/montants.test.ts`, remplacer le test `refuse un HT négatif` par :

```ts
	it('refuse un TTC inférieur aux seuls avenants', () => {
		expect(() => htDepuisTtc('100', '20', '500')).toThrow('Ce TTC est inférieur aux seuls avenants.');
	});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/documents/batir.test.ts src/domaine/montants.test.ts && npm run test:int -- src/documents/montantEngage.int.test.ts`
Expected: FAIL — `avenants` inconnu dans `SourceLot`, ancien message de `htDepuisTtc`, `sommeAvenants` absent de la vue, TTC du récapitulatif sans avenant, lot PEINTURE ignoré par `genererMarchesManquants`.

- [ ] **Step 3: Le verrou du lot**

Créer `src/donnees/verrouLot.ts` :

```ts
import { ErreurMetier } from '@/domaine/erreurs';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from './prisma';

export type Tx = Prisma.TransactionClient;

const INCLURE = {
	avenants: { orderBy: { numero: 'asc' as const } },
	acomptes: { orderBy: { numero: 'asc' as const } },
} satisfies Prisma.LotInclude;

export type LotVerrouille = Prisma.LotGetPayload<{ include: typeof INCLURE }>;

/**
 * Toute écriture qui dépend des avenants ou des acomptes d'un lot (spec § 2, « Verrou ») :
 * `SELECT … FOR UPDATE` sur la ligne du lot, puis relecture du lot, de ses avenants et de ses acomptes
 * sous ce verrou. Deux écritures simultanées sur le même lot passent l'une après l'autre.
 */
export async function sousVerrouLot<T>(lotId: string, operation: (tx: Tx, lot: LotVerrouille) => Promise<T>): Promise<T> {
	return prisma.$transaction(async (tx) => {
		const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Lot" WHERE id = ${lotId} FOR UPDATE`;
		if (!verrou.length) throw new ErreurMetier('Lot introuvable.');
		return operation(tx, await tx.lot.findUniqueOrThrow({ where: { id: lotId }, include: INCLURE }));
	});
}

/** Les montants en texte : le `Decimal` de Prisma n'est pas celui de decimal.js. */
export function montantsAvenants(lot: { avenants: { numero: number; montantHt: { toString(): string } }[] }): { numero: number; montantHt: string }[] {
	return lot.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt.toString() }));
}
```

- [ ] **Step 4: TTC et HT saisis sous verrou**

Dans `src/domaine/montants.ts`, remplacer dans `htDepuisTtc` :

```ts
	if (ht.isNegative() && !ht.isZero()) throw new ErreurMetier('Le montant HT deviendrait négatif.');
```

par :

```ts
	if (ht.isNegative() && !ht.isZero()) throw new ErreurMetier('Ce TTC est inférieur aux seuls avenants.');
```

et le commentaire de `htEngage` par `/** HT engagé = initial + avenants. */`.

Dans `src/donnees/lots.ts` :

1. Compléter les imports :

```ts
import { HT_INFERIEUR_AVENANTS, sommeAvenants, verifierEngage } from '@/domaine/avenants';
import { montantsAvenants, sousVerrouLot } from './verrouLot';
```

2. Au début de `modifierChampLot`, avant `const lot = await prisma.lot.findUniqueOrThrow(…)`, ajouter :

```ts
	// Les montants dépendent des avenants : lus et écrits sous le verrou du lot (spec § 5).
	if (champ === 'montantHt' || champ === 'montantTtc') {
		const saisi = montantPositif(valeur, champ);
		return sousVerrouLot(lotId, async (tx, lot) => {
			const avenants = montantsAvenants(lot);
			let ht: Decimal;
			if (champ === 'montantHt') {
				ht = saisi.toDecimalPlaces(8);
				verifierEngage(ht, avenants, HT_INFERIEUR_AVENANTS);
			} else {
				ht = htDepuisTtc(saisi, lot.tauxTva.toString(), sommeAvenants(avenants));
			}
			await tx.lot.update({ where: { id: lotId }, data: { montantHtInitial: ht.toFixed() } });
			return { chantierId: lot.chantierId };
		});
	}
```

3. Supprimer du `switch` les deux branches `case 'montantHt':` et `case 'montantTtc':` (désormais traitées plus haut).

- [ ] **Step 5: Les sources des documents portent les avenants**

Dans `src/documents/batir.ts` :

1. Ajouter l'import `import { sommeAvenants } from '@/domaine/avenants';`.
2. Avant `export type SourceLot`, ajouter :

```ts
export type SourceAvenant = { id: string; numero: number; devis: string; montantHt: string; date: Date; objet: string };
```

3. Dans `SourceLot`, après `artisan: SourceArtisan | null;`, ajouter :

```ts
	/** Triés par numéro. Le marché imprimé les ignore ; le récapitulatif et le certificat les comptent. */
	avenants: SourceAvenant[];
```

4. Dans `batirRecap`, remplacer :

```ts
		const ttc = arrondiCentime(ttcEngage(l.montantHtInitial, l.tauxTva));
```

par :

```ts
		const ttc = arrondiCentime(ttcEngage(l.montantHtInitial, l.tauxTva, sommeAvenants(l.avenants)));
```

Dans `src/documents/donnees.ts` :

1. Remplacer `includeChantier` par :

```ts
const includeChantier = {
	chargeAffaire: true,
	lots: { orderBy: { ordre: 'asc' as const }, include: { artisan: true, avenants: { orderBy: { numero: 'asc' as const } } } },
};
```

2. Dans `versSources`, après `artisan: l.artisan && { … },`, ajouter :

```ts
			avenants: l.avenants.map((a) => ({
				id: a.id, numero: a.numero, devis: a.devis, montantHt: a.montantHt.toString(), date: a.date, objet: a.objet,
			})),
```

Dans `tests/fixtures/perrier.ts`, dans l'objet renvoyé par l'aide `lot(…)`, ajouter `avenants: [],` avant `...o`.

Run: `npx tsc --noEmit`
Expected: aucune erreur. S'il reste un objet `SourceLot` écrit à la main ailleurs (un test du Planning, par exemple), lui ajouter `avenants: []`.

- [ ] **Step 6: La vue des marchés et la liste des chantiers**

Dans `src/donnees/marches.ts` :

1. Ajouter l'import `import { sommeAvenants } from '@/domaine/avenants';`.
2. Dans `LotVue`, remplacer `htEngage: string; ttcEngage: string; manques: Manque[];` par :

```ts
	/** Somme signée des avenants ; engagé = initial + avenants (spec § 5). */
	sommeAvenants: string; htEngage: string; ttcEngage: string; manques: Manque[];
```

3. Dans la requête, remplacer `include: { lots: { orderBy: { ordre: 'asc' }, include: { artisan: true } } },` par :

```ts
			include: { lots: { orderBy: { ordre: 'asc' }, include: { artisan: true, avenants: { orderBy: { numero: 'asc' } } } } },
```

4. Dans `c.lots.map`, après `const tva = l.tauxTva.toString();`, ajouter :

```ts
		const somme = sommeAvenants(l.avenants.map((a) => ({ montantHt: a.montantHt.toString() })));
```

et remplacer `htEngage: htEngage(ht).toFixed(), ttcEngage: ttcEngage(ht, tva).toFixed(),` par :

```ts
			sommeAvenants: somme.toFixed(), htEngage: htEngage(ht, somme).toFixed(), ttcEngage: ttcEngage(ht, tva, somme).toFixed(),
```

Dans `src/donnees/chantiers.ts` (`listerChantiers`) :

1. Ajouter l'import `import { sommeAvenants } from '@/domaine/avenants';`.
2. Remplacer `lots: { select: { montantHtInitial: true, tauxTva: true } }` par `lots: { select: { montantHtInitial: true, tauxTva: true, avenants: { select: { montantHt: true } } } }`.
3. Remplacer le calcul du total par :

```ts
		totalTtcTexte: formatEuros(totalArrondi(c.lots.map((l) => ttcEngage(
			l.montantHtInitial.toString(), l.tauxTva.toString(),
			sommeAvenants(l.avenants.map((a) => ({ montantHt: a.montantHt.toString() }))),
		)))),
```

- [ ] **Step 7: Un marché, c'est la série de l'id du lot**

Dans `src/documents/generer.ts` (`genererMarchesManquants`), remplacer le calcul de `dejaGeneres` par :

```ts
	// Un marché généré est un document dont la série est l'id du lot : avenants et certificats portent aussi `lotId`.
	const dejaGeneres = new Set(
		(await prisma.document.findMany({ where: { chantierId, serie: { in: lots.map((l) => l.id) } }, select: { serie: true }, distinct: ['serie'] }))
			.map((d) => d.serie),
	);
```

L'état du marché dans `etatsDocumentsChantier` lit déjà `docsDe(lot.id)` (série = id du lot, Planning Task 3) : rien à changer.

- [ ] **Step 8: Vérifier le succès**

Run: `npx tsc --noEmit && npm test && npm run test:int -- src/documents src/donnees`
Expected: aucune erreur ; PASS, y compris `marches.int.test.ts`, `lots.int.test.ts`, `generer.int.test.ts` et `etats.int.test.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/donnees/verrouLot.ts src/domaine/montants.ts src/domaine/montants.test.ts src/donnees/lots.ts src/documents/batir.ts src/documents/batir.test.ts src/documents/donnees.ts src/donnees/marches.ts src/donnees/chantiers.ts src/documents/generer.ts tests/fixtures/perrier.ts src/documents/montantEngage.int.test.ts
git commit -m "feat(financier): montant engagé avec avenants partout, saisie du TTC sous verrou du lot"
```

---
### Task 4: Avenants : écritures sous verrou et actions

**Files:**
- Create: `src/donnees/avenants.ts`, `src/actions/avenants.ts`
- Test: `src/donnees/avenants.int.test.ts`

**Interfaces:**
- Consumes: `AVENANT_DISPARU`, `lireMontantAvenant`, `numeroAvenantTexte`, `SUPPRESSION_NEGATIVE`, `verifierEngage` (Task 1) ; `verifierDate` (Task 1, `src/domaine/certificats.ts`) ; `sousVerrouLot`, `montantsAvenants` (Task 3) ; `dateParis` (`src/domaine/semaines.ts`) ; `executer`, `Resultat` (Socle).
- Produces:
  - `CHAMPS_AVENANT = ['devis', 'montantHt', 'date', 'objet'] as const`, `type ChampAvenant`
  - `ajouterAvenant(lotId: string, maintenant?: Date): Promise<{ chantierId: string; id: string; numero: number; message: string }>`
  - `modifierChampAvenant(avenantId: string, champ: ChampAvenant, valeur: string): Promise<{ chantierId: string }>`
  - `supprimerAvenant(avenantId: string): Promise<{ chantierId: string }>`
  - Server Actions `ajouterAvenantAction(lotId): Promise<Resultat<{ id: string; numero: number; message: string }>>`, `modifierAvenantAction(avenantId, champ, valeur): Promise<Resultat>`, `supprimerAvenantAction(avenantId): Promise<Resultat>`

- [ ] **Step 1: Écrire les tests d'intégration**

Créer `src/donnees/avenants.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { AVENANT_DISPARU, MOINS_VALUE_NEGATIVE, MONTANT_ILLISIBLE, SUPPRESSION_NEGATIVE } from '@/domaine/avenants';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from './avenants';
import { prisma } from './prisma';

let lotId: string;
const MAINTENANT = new Date('2026-09-29T22:30:00Z'); // déjà le 30 à Châteaubriant
const avenants = () => prisma.avenant.findMany({ where: { lotId }, orderBy: { numero: 'asc' } });
const lire = (id: string) => prisma.avenant.findUniqueOrThrow({ where: { id } });

describe('avenants', () => {
	beforeEach(async () => {
		await viderBase();
		const u = await creerUtilisateurTest();
		const c = await prisma.chantier.create({ data: { reference: 'T', maitreOuvrage: 'M. T', chargeAffaireId: u.id, creeParId: u.id } });
		lotId = (await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, numero: '11', designation: 'PEINTURE', montantHtInitial: '1000' } })).id;
	});

	it('ajout : numéro suivant, montant nul, date du jour à Châteaubriant, message', async () => {
		const r = await ajouterAvenant(lotId, MAINTENANT);
		expect(r).toMatchObject({ numero: 1, message: 'Avenant n° 01 ajouté — saisissez son montant.' });
		const a = await lire(r.id);
		expect([a.numero, a.montantHt.toString(), a.date.toISOString().slice(0, 10), a.devis, a.objet]).toEqual([1, '0', '2026-09-30', '', '']);
	});

	it('un numéro n\'est jamais réutilisé, même après suppression du dernier', async () => {
		await ajouterAvenant(lotId);
		await ajouterAvenant(lotId);
		const trois = await ajouterAvenant(lotId);
		await supprimerAvenant(trois.id);
		expect((await ajouterAvenant(lotId)).numero).toBe(4);
		expect((await avenants()).map((a) => a.numero)).toEqual([1, 2, 4]);
	});

	it('deux ajouts simultanés ont deux numéros', async () => {
		const r = await Promise.all([ajouterAvenant(lotId), ajouterAvenant(lotId)]);
		expect(r.map((x) => x.numero).sort()).toEqual([1, 2]);
	});

	it('montant : signé, au centime ; illisible ou rendant le lot négatif : refusé, rien d\'écrit', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'montantHt', '−300,004 €');
		expect((await lire(id)).montantHt.toString()).toBe('-300');
		await expect(modifierChampAvenant(id, 'montantHt', 'abc')).rejects.toThrow(MONTANT_ILLISIBLE);
		await expect(modifierChampAvenant(id, 'montantHt', '-1000,01')).rejects.toThrow(MOINS_VALUE_NEGATIVE);
		expect((await lire(id)).montantHt.toString()).toBe('-300');
		await modifierChampAvenant(id, 'montantHt', '-1000');
		expect((await lire(id)).montantHt.toString()).toBe('-1000');
	});

	it('deux moins-values simultanées ne rendent pas le lot négatif', async () => {
		const a = await ajouterAvenant(lotId);
		const b = await ajouterAvenant(lotId);
		const r = await Promise.allSettled([modifierChampAvenant(a.id, 'montantHt', '-600'), modifierChampAvenant(b.id, 'montantHt', '-600')]);
		expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected']);
		expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason.message).toBe(MOINS_VALUE_NEGATIVE);
		expect((await avenants()).map((x) => x.montantHt.toString()).sort()).toEqual(['-600', '0']);
	});

	it('devis, objet, date', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'devis', ' D-2026-114 ');
		await modifierChampAvenant(id, 'objet', 'Reprise des peintures du séjour.\n');
		await modifierChampAvenant(id, 'date', '2026-05-12');
		expect(await lire(id)).toMatchObject({ devis: 'D-2026-114', objet: 'Reprise des peintures du séjour.', date: new Date('2026-05-12T00:00:00Z') });
		await expect(modifierChampAvenant(id, 'date', '2026-02-30')).rejects.toThrow('Date : choisissez une date.');
		await expect(modifierChampAvenant(id, 'date', '')).rejects.toThrow('Date : choisissez une date.');
		await expect(modifierChampAvenant(id, 'devis', 'x'.repeat(41))).rejects.toThrow('Le numéro de devis est limité à 40 caractères.');
		await expect(modifierChampAvenant(id, 'objet', 'x'.repeat(601))).rejects.toThrow("L'objet est limité à 600 caractères.");
	});

	it('supprimer une plus-value qui compense une moins-value : refusé', async () => {
		const plus = await ajouterAvenant(lotId);
		const moins = await ajouterAvenant(lotId);
		await modifierChampAvenant(plus.id, 'montantHt', '500');
		await modifierChampAvenant(moins.id, 'montantHt', '-1400');
		await expect(supprimerAvenant(plus.id)).rejects.toThrow(SUPPRESSION_NEGATIVE);
		await supprimerAvenant(moins.id);
		expect((await avenants()).map((a) => a.numero)).toEqual([1]);
	});

	it('un avenant supprimé entre-temps : message clair', async () => {
		const { id } = await ajouterAvenant(lotId);
		await supprimerAvenant(id);
		await expect(modifierChampAvenant(id, 'montantHt', '10')).rejects.toThrow(AVENANT_DISPARU);
		await expect(supprimerAvenant(id)).rejects.toThrow(AVENANT_DISPARU);
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/donnees/avenants.int.test.ts`
Expected: FAIL — `./avenants` introuvable.

- [ ] **Step 3: Les écritures**

Créer `src/donnees/avenants.ts` :

```ts
import {
	AVENANT_DISPARU, lireMontantAvenant, numeroAvenantTexte, SUPPRESSION_NEGATIVE, verifierEngage,
} from '@/domaine/avenants';
import { verifierDate } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { dateParis } from '@/domaine/semaines';
import { prisma } from './prisma';
import { montantsAvenants, sousVerrouLot } from './verrouLot';

export const CHAMPS_AVENANT = ['devis', 'montantHt', 'date', 'objet'] as const;
export type ChampAvenant = (typeof CHAMPS_AVENANT)[number];

const LIMITES: Record<'devis' | 'objet', [number, string]> = {
	devis: [40, 'Le numéro de devis est limité à 40 caractères.'],
	objet: [600, "L'objet est limité à 600 caractères."],
};

async function lotDe(avenantId: string): Promise<string> {
	const a = await prisma.avenant.findUnique({ where: { id: avenantId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(AVENANT_DISPARU);
	return a.lotId;
}

/** Numéro = compteur du lot + 1, sous verrou du lot : jamais réattribué, même après suppression (spec § 5). */
export async function ajouterAvenant(lotId: string, maintenant = new Date()): Promise<{ chantierId: string; id: string; numero: number; message: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		const { dernierNumeroAvenant: numero } = await tx.lot.update({
			where: { id: lotId }, data: { dernierNumeroAvenant: { increment: 1 } }, select: { dernierNumeroAvenant: true },
		});
		const a = await tx.avenant.create({ data: { lotId, numero, date: dateParis(maintenant) } });
		return { chantierId: lot.chantierId, id: a.id, numero, message: `Avenant n° ${numeroAvenantTexte(numero)} ajouté — saisissez son montant.` };
	});
}

/** Le montant est contrôlé avec les avenants relus sous verrou : deux moins-values simultanées ne rendent pas le lot négatif. */
export async function modifierChampAvenant(avenantId: string, champ: ChampAvenant, valeur: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDe(avenantId), async (tx, lot) => {
		const avenant = lot.avenants.find((a) => a.id === avenantId);
		if (!avenant) throw new ErreurMetier(AVENANT_DISPARU);
		let donnees: { devis?: string; montantHt?: string; date?: Date; objet?: string };
		if (champ === 'montantHt') {
			const montant = lireMontantAvenant(valeur).toFixed(2);
			const apres = montantsAvenants(lot).map((a) => (a.numero === avenant.numero ? { ...a, montantHt: montant } : a));
			verifierEngage(lot.montantHtInitial.toString(), apres);
			donnees = { montantHt: montant };
		} else if (champ === 'date') {
			donnees = { date: new Date(`${verifierDate(valeur.trim())}T00:00:00Z`) };
		} else {
			const texte = valeur.trim();
			const [max, message] = LIMITES[champ];
			if (texte.length > max) throw new ErreurMetier(message, champ);
			donnees = champ === 'devis' ? { devis: texte } : { objet: texte };
		}
		await tx.avenant.update({ where: { id: avenantId }, data: donnees });
		return { chantierId: lot.chantierId };
	});
}

/** Suppression libre : le numéro reste pris, les lettres déjà générées restent (pas de clé étrangère). */
export async function supprimerAvenant(avenantId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDe(avenantId), async (tx, lot) => {
		if (!lot.avenants.some((a) => a.id === avenantId)) throw new ErreurMetier(AVENANT_DISPARU);
		verifierEngage(
			lot.montantHtInitial.toString(),
			montantsAvenants({ avenants: lot.avenants.filter((a) => a.id !== avenantId) }),
			SUPPRESSION_NEGATIVE,
		);
		await tx.avenant.delete({ where: { id: avenantId } });
		return { chantierId: lot.chantierId };
	});
}
```

- [ ] **Step 4: Les actions**

Créer `src/actions/avenants.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ajouterAvenant, CHAMPS_AVENANT, modifierChampAvenant, supprimerAvenant, type ChampAvenant } from '@/donnees/avenants';
import { executer, type Resultat } from './executer';

// Un avenant change le montant engagé : la liste des chantiers (total TTC) se rafraîchit aussi.
const rafraichir = (chantierId: string) => {
	revalidatePath(`/chantiers/${chantierId}`, 'layout');
	revalidatePath('/chantiers');
};

export async function ajouterAvenantAction(lotId: string): Promise<Resultat<{ id: string; numero: number; message: string }>> {
	return executer({}, async () => {
		const { chantierId, id, numero, message } = await ajouterAvenant(z.string().parse(lotId));
		rafraichir(chantierId);
		return { id, numero, message };
	});
}

export async function modifierAvenantAction(avenantId: string, champ: ChampAvenant, valeur: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await modifierChampAvenant(z.string().parse(avenantId), z.enum(CHAMPS_AVENANT).parse(champ), z.string().parse(valeur))).chantierId);
		return null;
	});
}

export async function supprimerAvenantAction(avenantId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await supprimerAvenant(z.string().parse(avenantId))).chantierId);
		return null;
	});
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx tsc --noEmit && npm run test:int -- src/donnees/avenants.int.test.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 6: Commit**

```bash
git add src/donnees/avenants.ts src/actions/avenants.ts src/donnees/avenants.int.test.ts
git commit -m "feat(financier): avenants numérotés sans réemploi, montants contrôlés sous verrou du lot"
```

---
### Task 5: Lettre d'avenant (objet, gabarit, génération en portrait)

**Files:**
- Create: `src/documents/gabarits/LettreAvenant.tsx`
- Modify: `src/documents/schemas.ts`, `src/documents/batir.ts`, `src/documents/donnees.ts`, `src/documents/generer.ts`, `src/documents/gabarits/Gabarit.tsx`, `src/documents/gabarits/Zone.tsx`, `src/documents/styles.ts`, `src/domaine/fichiers.ts`, `src/domaine/fichiers.test.ts`, `src/actions/documents.ts`, `src/composants/ApercuDocument.tsx`
- Test: `src/documents/batirAvenant.test.ts`, `src/documents/avenant.int.test.ts`

**Interfaces:**
- Consumes: `montantsLettre`, `numeroAvenantTexte`, `dateLongue`, `manquesAvenant`, `LIBELLES_MANQUES_AVENANT`, `AVENANT_DISPARU` (Task 1) ; `serieAvenant` (Task 2) ; `SourceAvenant`, `SourceLot.avenants` (Task 3) ; `ajouterAvenant`, `modifierChampAvenant`, `supprimerAvenant` (Task 4) ; `entetePlanning`, `entetePlanningSchema`, `EnTetePlanning` (Planning, Tasks 5 et 6) ; `enregistrerVersion`, `htmlVersPdf` (Socle).
- Produces:
  - `contenuAvenantSchema`, `type ContenuAvenant`, `type DonneesAvenant` (`{ type: 'AVENANT'; contenu; cadre }`)
  - `batirAvenant(c: SourceChantier, l: SourceLot, avenantId: string, p: SourceParametres, maintenant: Date): DonneesAvenant`
  - `construireDonneesAvenant(avenantId: string, maintenant?: Date): Promise<{ chantierId: string; chantier: SourceChantier; lot: SourceLot; avenant: SourceAvenant; donnees: DonneesAvenant }>`
  - `genererAvenant(avenantId: string, utilisateurId: string, deps?): Promise<ResultatGeneration>` ; `imprimerPortrait: RendrePdf` (exporté de `generer.ts`, A4 portrait)
  - `genererAvenantAction(avenantId: string): Promise<Resultat<ResultatGeneration>>`
  - `nomFichierAvenant(p: { reference; numero: string | null; designation; nature; numeroAvenant: number; version: number }): string`
  - `CleZone` + `'objet'` ; `LettreAvenant({ donnees, mode, onSaisie? })`

- [ ] **Step 1: Écrire les tests de l'objet et du nom de fichier**

Créer `src/documents/batirAvenant.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { formatEuros } from '@/domaine/montants';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { batirAvenant, batirCadre, batirMarche, empreinteDocument, type SourceAvenant } from './batir';
import { donneesDocumentSchema } from './schemas';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);
const CARRELAGE = PERRIER_LOTS.find((l) => l.designation === 'CARRELAGE — FAÏENCE')!;
const N1: SourceAvenant = { id: 'a1', numero: 1, devis: 'D-2026-031', montantHt: '850', date: jour('2026-04-20'), objet: "Faïence toute hauteur dans la salle d'eau." };
const N2: SourceAvenant = { id: 'a2', numero: 2, devis: 'D-2026-044', montantHt: '-300', date: jour('2026-05-12'), objet: 'Suppression de la plinthe du cellier.' };
const avec = (...avenants: SourceAvenant[]) => ({ ...CARRELAGE, avenants });
const lettre = (lot: ReturnType<typeof avec>, id: string) => batirAvenant(PERRIER_CHANTIER, lot, id, PERRIER_PARAMETRES, MAINTENANT);

describe('lettre d\'avenant (annexe A)', () => {
	it('lettre n° 02 : moins-value, montants TTC', () => {
		const d = lettre(avec(N1, N2), 'a2');
		expect(d).toEqual({
			type: 'AVENANT',
			contenu: {
				entete: {
					coordination: 'Augustin Jouan', maitreOuvrage: 'M. et Mme PERRIER',
					projet: "Construction d'une maison individuelle — 142 m² + garage", adresseChantier: 'Le Haut Bois – 44110 LOUISFERT',
				},
				lieuDate: 'Châteaubriant, le 12 mai 2026',
				numero: '02',
				entreprise: 'MD CARRELAGE',
				lot: 'CARRELAGE — FAÏENCE',
				sens: 'moins-value',
				objet: 'Suppression de la plinthe du cellier.',
				montants: {
					marcheInitial: formatEuros('16140'),
					devis: { numero: 'D-2026-044', montant: formatEuros('360') },
					difference: formatEuros('360'),
					nouveauMontant: formatEuros('15780'),
				},
			},
			cadre: batirCadre(PERRIER_PARAMETRES, MAINTENANT),
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('lettre n° 01 : plus-value, les avenants suivants ne comptent pas', () => {
		const c = lettre(avec(N1, N2), 'a1').contenu;
		expect([c.sens, c.montants.marcheInitial, c.montants.nouveauMontant]).toEqual(['plus-value', formatEuros('15120'), formatEuros('16140')]);
	});

	it('après suppression du n° 01, la lettre n° 02 repart du marché initial : son empreinte change', () => {
		const avant = lettre(avec(N1, N2), 'a2');
		const apres = lettre(avec(N2), 'a2');
		expect([apres.contenu.montants.marcheInitial, apres.contenu.montants.nouveauMontant]).toEqual([formatEuros('15120'), formatEuros('14760')]);
		expect(empreinteDocument(apres)).not.toBe(empreinteDocument(avant));
	});

	it('un avenant suivant ne change pas la lettre ; un avenant ne change pas le marché imprimé', () => {
		const n3: SourceAvenant = { ...N2, id: 'a3', numero: 3, montantHt: '120' };
		expect(empreinteDocument(lettre(avec(N1, N2, n3), 'a2'))).toBe(empreinteDocument(lettre(avec(N1, N2), 'a2')));
		expect(empreinteDocument(batirMarche(PERRIER_CHANTIER, avec(N1, N2), PERRIER_PARAMETRES, MAINTENANT)))
			.toBe(empreinteDocument(batirMarche(PERRIER_CHANTIER, CARRELAGE, PERRIER_PARAMETRES, MAINTENANT)));
	});

	it('un avenant absent : message clair', () => {
		expect(() => lettre(avec(N1), 'a2')).toThrow("Cet avenant n'existe plus.");
	});
});
```

Dans `src/domaine/fichiers.test.ts`, ajouter `nomFichierAvenant` à l'import et le test :

```ts
	it('lettre d\'avenant', () => {
		expect(nomFichierAvenant({ reference: 'FINANCIER', numero: '11', designation: 'PEINTURE', nature: 'GRE_A_GRE', numeroAvenant: 1, version: 1 }))
			.toBe('FINANCIER-Lot11-PEINTURE-Avenant01-v1.pdf');
		expect(nomFichierAvenant({ reference: 'PERRIER — Louisfert', numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', numeroAvenant: 12, version: 3 }))
			.toBe('PERRIER-LOUISFERT-ST-ESCALIER-Avenant12-v3.pdf');
	});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/documents/batirAvenant.test.ts src/domaine/fichiers.test.ts`
Expected: FAIL — `batirAvenant` et `nomFichierAvenant` ne sont pas exportées.

- [ ] **Step 3: Schéma, objet, nom de fichier**

Dans `src/documents/schemas.ts` :

1. Après `contenuVisaSchema`, ajouter :

```ts
/** Montants en TTC, déjà formatés ; chacun arrondi au centime séparément (spec § 5). */
export const contenuAvenantSchema = z.object({
	entete: entetePlanningSchema,
	/** « Châteaubriant, le 12 mai 2026 » : la date de l'avenant. */
	lieuDate: texte,
	numero: texte,
	entreprise: texte,
	lot: texte,
	sens: z.enum(['plus-value', 'moins-value']),
	objet: texte,
	montants: z.object({
		marcheInitial: texte,
		devis: z.object({ numero: texte, montant: texte }),
		difference: texte,
		nouveauMontant: texte,
	}),
});
```

2. Ajouter la variante à `donneesDocumentSchema` :

```ts
	z.object({ type: z.literal('AVENANT'), contenu: contenuAvenantSchema, cadre: cadreSchema }),
```

3. Ajouter les types :

```ts
export type ContenuAvenant = z.infer<typeof contenuAvenantSchema>;
export type DonneesAvenant = Extract<DonneesDocument, { type: 'AVENANT' }>;
```

Dans `src/documents/batir.ts` :

1. Compléter les imports :

```ts
import { AVENANT_DISPARU, dateLongue, montantsLettre, numeroAvenantTexte, sommeAvenants } from '@/domaine/avenants';
```

(remplace l'import de `sommeAvenants` de la Task 3) et ajouter `DonneesAvenant` à l'import des types de `./schemas`.

2. Après `batirVisa`, ajouter :

```ts
/** Fac-similé de « 4- AVENANT.doc » (maquette `buildDocAvenant`) : le « marché initial » compte les avenants antérieurs encore présents. */
export function batirAvenant(c: SourceChantier, l: SourceLot, avenantId: string, p: SourceParametres, maintenant: Date): DonneesAvenant {
	const a = l.avenants.find((x) => x.id === avenantId);
	if (!a) throw new ErreurMetier(AVENANT_DISPARU);
	const m = montantsLettre({ htInitial: l.montantHtInitial, tauxTva: l.tauxTva, avenants: l.avenants, numero: a.numero });
	return {
		type: 'AVENANT',
		contenu: {
			entete: entetePlanning(c),
			lieuDate: `${p.villeSignature}, le ${dateLongue(a.date)}`,
			numero: numeroAvenantTexte(a.numero),
			entreprise: l.artisan?.nom ?? TIRET,
			lot: l.designation || 'Lot sans désignation',
			sens: m.plusValue ? 'plus-value' : 'moins-value',
			objet: a.objet,
			montants: {
				marcheInitial: formatEuros(m.marcheInitial),
				devis: { numero: a.devis, montant: formatEuros(m.devis) },
				difference: formatEuros(m.devis),
				nouveauMontant: formatEuros(m.nouveauMontant),
			},
		},
		cadre: batirCadre(p, maintenant),
	};
}
```

Dans `src/domaine/fichiers.ts`, remplacer `nomFichierMarche` par :

```ts
/** `Lot02`, `Lot` sans numéro, `ST` en sous-traitance. */
const prefixeLot = (nature: Nature, numero: string | null) => (nature === 'SOUS_TRAITANCE' ? 'ST' : `Lot${numero ? slugifier(numero) : ''}`);

export function nomFichierMarche(p: { reference: string; numero: string | null; designation: string; nature: Nature; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Marche-v${p.version}.pdf`;
}

export function nomFichierAvenant(p: { reference: string; numero: string | null; designation: string; nature: Nature; numeroAvenant: number; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Avenant${String(p.numeroAvenant).padStart(2, '0')}-v${p.version}.pdf`;
}
```

Run: `npm test -- src/documents/batirAvenant.test.ts src/domaine/fichiers.test.ts`
Expected: PASS.

- [ ] **Step 4: Le gabarit**

Dans `src/documents/gabarits/Zone.tsx`, remplacer :

```ts
export type CleZone = 'clauseParticuliere' | 'corpsEtat' | 'travaux';
```

par :

```ts
/** Champs des marchés, ou objet d'une lettre d'avenant. */
export type CleZone = 'clauseParticuliere' | 'corpsEtat' | 'travaux' | 'objet';
```

Créer `src/documents/gabarits/LettreAvenant.tsx` :

```tsx
import type { DonneesAvenant } from '../schemas';
import { EnTetePlanning } from './EnTetePlanning';
import { Zone, type ModeGabarit, type Saisie } from './Zone';

/** Fac-similé de « 4- AVENANT.doc » (maquette `buildDocAvenant`), A4 portrait. */
export function LettreAvenant({ donnees, mode, onSaisie }: { donnees: DonneesAvenant; mode: ModeGabarit; onSaisie?: Saisie }) {
	const { contenu: c, cadre } = donnees;
	const m = c.montants;
	return (
		<article className="sheet sheet-doc sheet-avenant">
			<EnTetePlanning entete={c.entete} cadre={cadre} />
			<p className="av-lieu">{c.lieuDate}</p>
			<p className="doc-titre">{`AVENANT N° ${c.numero}`}</p>
			<p className="doc-phrase">aux marchés travaux de l&apos;entreprise <b>{c.entreprise}</b></p>
			<dl className="doc-kv av-kv">
				<dt>Réf/adresse chantier :</dt><dd>{c.entete.adresseChantier}</dd>
			</dl>
			<p className="av-objet">
				Travaux en <b>{c.sens}</b>{', concernant le lot :'}<br />
				<b>{c.lot}</b>
				{(mode === 'edition' || c.objet) && (
					<>
						<br />
						<Zone cle="objet" valeur={c.objet} mode={mode} onSaisie={onSaisie} placeholder="Objet de l'avenant" classe="normal bloc" />
					</>
				)}
			</p>
			<table className="d-avenant">
				<tbody>
					<tr><td>Montant du marché initial :</td><td className="r mono">{`${m.marcheInitial} TTC`}</td></tr>
					<tr>
						<td>{`Montant du devis complémentaire${m.devis.numero ? ` n° ${m.devis.numero}` : ''} :`}</td>
						<td className="r mono">{`${m.devis.montant} TTC`}</td>
					</tr>
					<tr className="total"><td>{`Soit une ${c.sens} de :`}</td><td className="r mono">{`${m.difference} TTC`}</td></tr>
					<tr className="apres"><td>Nouveau montant du marché :</td><td className="r mono">{`${m.nouveauMontant} TTC`}</td></tr>
				</tbody>
			</table>
			<div className="sign-row sign-row-2 av-sign">
				<div>Le Maître de l&apos;Ouvrage<br /><i>(signature précédée de la mention « Bon pour accord »)</i></div>
				<div>Le Maître d&apos;Œuvre<br /><i>(cachet &amp; signature)</i></div>
			</div>
		</article>
	);
}
```

Dans `src/composants/ApercuDocument.tsx`, la zone `objet` n'est pas un champ du lot : dans `saisir`, remplacer `if (source.type !== 'marche') return;` par :

```ts
	if (source.type !== 'marche' || cle === 'objet') return;
```

(la Task 8 branche l'objet sur l'avenant).

Dans `src/documents/gabarits/Gabarit.tsx`, importer `LettreAvenant` et ajouter au `switch` :

```tsx
		case 'AVENANT':
			return <LettreAvenant donnees={donnees} mode={mode} onSaisie={onSaisie} />;
```

Dans `src/documents/styles.ts`, insérer avant la ligne `/* PDF : la page A4 (marges 10 mm) porte la feuille, sans cadre ni ombre. */` :

```css
/* Lettre d'avenant : A4 portrait (maquette buildDocAvenant). Double classe : « .sheet-doc » fixerait 68rem. */
.sheet-doc.sheet-avenant { width: 46rem; }
.av-lieu { text-align: right; margin: 0 0 1.25rem; }
.av-kv { margin: 0 0 .875rem; }
.av-objet { margin: 0 0 1rem; line-height: 1.6; }
.av-objet .fill { border-bottom: 0; padding: 0; font-style: italic; }
table.d-avenant { width: 100%; border-collapse: collapse; margin: 0 0 .5rem; }
table.d-avenant td { padding: .3125rem .375rem; }
table.d-avenant .r { text-align: right; white-space: nowrap; }
table.d-avenant .mono { font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; }
table.d-avenant tr.total td { border-top: 1px solid #16191b; font-weight: 600; }
table.d-avenant tr.apres td { border-top: 2px solid #16191b; font-weight: 600; font-size: .75rem; }
.av-sign { margin-top: 2.5rem; }
```

- [ ] **Step 5: Écrire les tests d'intégration de la génération**

Créer `src/documents/avenant.int.test.ts` :

```ts
import { PDFDocument } from 'pdf-lib';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from '@/donnees/avenants';
import { prisma } from '@/donnees/prisma';
import { formatEuros } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { genererAvenant } from './generer';
import { fermerNavigateur } from './pdf';
import type { DonneesAvenant } from './schemas';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
let p: Awaited<ReturnType<typeof insererPerrier>>;

async function avenant(designation: string, montant: string) {
	const { id } = await ajouterAvenant(p.lots[designation]);
	if (montant !== '0') await modifierChampAvenant(id, 'montantHt', montant);
	return id;
}
const generer = (id: string) => genererAvenant(id, p.utilisateurId, deps);

describe('lettre d\'avenant', () => {
	afterAll(fermerNavigateur);

	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
	});

	it('v1 : série de l\'avenant, lot, nom de fichier ; rien de nouveau tant que rien ne change', async () => {
		await avenant('CARRELAGE — FAÏENCE', '850');
		const id = await avenant('CARRELAGE — FAÏENCE', '-300');
		const r = await generer(id);
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Avenant02-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['AVENANT', `AVENANT:${id}`, p.lots['CARRELAGE — FAÏENCE']]);
		expect((doc.donnees as DonneesAvenant).contenu.montants.nouveauMontant).toBe(formatEuros('15780'));
		expect(await generer(id)).toMatchObject({ version: 1, nouvelle: false });
		expect(faux).toHaveBeenCalledTimes(1);
	});

	it('un avenant antérieur supprimé : v2 aux nouveaux montants ; les PDF d\'un avenant supprimé restent', async () => {
		const n1 = await avenant('CARRELAGE — FAÏENCE', '850');
		const n2 = await avenant('CARRELAGE — FAÏENCE', '-300');
		await generer(n1);
		await generer(n2);
		await supprimerAvenant(n1);
		const r = await generer(n2);
		expect(r).toMatchObject({ version: 2, nouvelle: true });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect((doc.donnees as DonneesAvenant).contenu.montants.marcheInitial).toBe(formatEuros('15120'));
		expect(await prisma.document.count({ where: { serie: `AVENANT:${n1}` } })).toBe(1);
		await expect(generer(n1)).rejects.toThrow("Cet avenant n'existe plus.");
	});

	it('montant nul ou lot sans entreprise : génération refusée', async () => {
		const nul = await avenant('PEINTURE', '0');
		await expect(generer(nul)).rejects.toThrow("Impossible de générer la lettre : montant de l'avenant.");
		const sansEntreprise = await avenant('ENDUIT EXTÉRIEUR', '100');
		await expect(generer(sansEntreprise)).rejects.toThrow("Impossible de générer la lettre : pas d'entreprise.");
		expect(await prisma.document.count()).toBe(0);
	});

	it('le vrai PDF : une page A4 portrait, même avec un objet de 600 caractères', async () => {
		const id = await avenant('PEINTURE', '-300');
		await modifierChampAvenant(id, 'objet', 'Reprise des peintures du séjour et de la cage d\'escalier après dégât des eaux. '.repeat(8).slice(0, 600));
		const r = await genererAvenant(id, p.utilisateurId, { maintenant: deps.maintenant });
		const pdf = await PDFDocument.load((await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } })).pdf);
		const { width, height } = pdf.getPage(0).getSize();
		expect([pdf.getPageCount(), width < height, Math.round(width)]).toEqual([1, true, 595]);
	});
});
```

- [ ] **Step 6: Vérifier l'échec**

Run: `npm run test:int -- src/documents/avenant.int.test.ts`
Expected: FAIL — `genererAvenant` n'est pas exportée.

- [ ] **Step 7: Génération et action**

Dans `src/documents/donnees.ts` :

1. Compléter les imports : `import { AVENANT_DISPARU } from '@/domaine/avenants';`, `batirAvenant` et `type SourceAvenant` dans l'import de `./batir`, `type DonneesAvenant` dans celui de `./schemas`.
2. Après `construireDonneesMarche`, ajouter :

```ts
export async function construireDonneesAvenant(avenantId: string, maintenant = new Date()): Promise<{ chantierId: string; chantier: SourceChantier; lot: SourceLot; avenant: SourceAvenant; donnees: DonneesAvenant }> {
	const a = await prisma.avenant.findUnique({ where: { id: avenantId }, select: { lot: { select: { id: true, chantierId: true } } } });
	if (!a) throw new ErreurMetier(AVENANT_DISPARU);
	const { chantier, lots, parametres } = await lireSources(a.lot.chantierId);
	const lot = lots.find((l) => l.id === a.lot.id)!;
	// Supprimé entre les deux lectures : batirAvenant le dit.
	const donnees = batirAvenant(chantier, lot, avenantId, parametres, maintenant);
	return { chantierId: a.lot.chantierId, chantier, lot, avenant: lot.avenants.find((x) => x.id === avenantId)!, donnees };
}
```

Dans `src/documents/generer.ts` :

1. Compléter les imports :

```ts
import { LIBELLES_MANQUES_AVENANT, manquesAvenant } from '@/domaine/avenants';
import { nomFichierAvenant, nomFichierMarche, nomFichierPlanning, nomFichierRecap, nomFichierVisa } from '@/domaine/fichiers';
import { serieAvenant, SERIES } from './series';
```

et `construireDonneesAvenant` dans l'import de `./donnees`.

2. Après `imprimerParDefaut`, ajouter :

```ts
/** Lettre d'avenant et certificat de paiement : A4 portrait (spec § 2, « Formats »). */
export const imprimerPortrait: RendrePdf = (html) => htmlVersPdf(html, { paysage: false });
```

3. Après `genererMarche`, ajouter :

```ts
export async function genererAvenant(avenantId: string, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const maintenant = deps.maintenant ?? new Date();
	const { chantierId, chantier, lot, avenant, donnees } = await construireDonneesAvenant(avenantId, maintenant);
	const manques = manquesAvenant({ artisanId: lot.artisanId, montantHt: avenant.montantHt });
	if (manques.length) {
		throw new ErreurMetier(`Impossible de générer la lettre : ${manques.map((m) => LIBELLES_MANQUES_AVENANT[m]).join(', ')}.`);
	}
	return enregistrerVersion({
		chantierId, lotId: lot.id, serie: serieAvenant(avenantId), donnees, utilisateurId, rendrePdf: deps.rendrePdf ?? imprimerPortrait,
		empreinteActuelle: async () => empreinteDocument((await construireDonneesAvenant(avenantId, maintenant)).donnees),
		nomFichier: (version) => nomFichierAvenant({
			reference: chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature,
			numeroAvenant: avenant.numero, version,
		}),
	});
}
```

Dans `src/actions/documents.ts`, ajouter `genererAvenant` à l'import de `@/documents/generer`, puis :

```ts
export async function genererAvenantAction(avenantId: string): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await genererAvenant(avenantId, u.id);
		const { chantierId } = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId }, select: { chantierId: true } });
		rafraichir(chantierId);
		return r;
	});
}
```

- [ ] **Step 8: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/documents src/domaine && npm run test:int -- src/documents/avenant.int.test.ts`
Expected: aucune erreur ; PASS.

- [ ] **Step 9: Commit**

```bash
git add src/composants/ApercuDocument.tsx src/documents/schemas.ts src/documents/batir.ts src/documents/donnees.ts src/documents/generer.ts src/documents/gabarits/LettreAvenant.tsx src/documents/gabarits/Gabarit.tsx src/documents/gabarits/Zone.tsx src/documents/styles.ts src/domaine/fichiers.ts src/domaine/fichiers.test.ts src/actions/documents.ts src/documents/batirAvenant.test.ts src/documents/avenant.int.test.ts
git commit -m "feat(financier): lettre d'avenant versionnée, A4 portrait"
```

---
### Task 6: Feuille du certificat de paiement (objet pur, logo, gabarit, une page)

**Files:**
- Create: `src/documents/certificat.ts`, `src/documents/gabarits/logo.ts`, `src/documents/gabarits/CertificatPaiement.tsx`
- Modify: `src/documents/schemas.ts`, `src/documents/gabarits/Gabarit.tsx`, `src/documents/styles.ts`, `src/documents/uneFeuille.ts`, `src/documents/pdf.ts`, `src/documents/generer.ts`
- Test: `src/documents/certificat.test.ts`, `src/documents/pdfCertificat.int.test.ts`

**Interfaces:**
- Consumes: `calculerCertificat`, `moisLong`, `dateCourteSlash`, `type EntreeCalcul` (Task 1) ; `formatEuros` ; `iso`, `entier` (constantes de `schemas.ts`, Planning) ; `ajusterUneFeuille`, `OPTIONS_UNE_FEUILLE`, `htmlVersPdf` avec `uneSeuleFeuille` (Planning, Task 7) ; `rendreHtml` (Socle).
- Produces:
  - `contenuCertificatSchema`, `societeSchema`, `type ContenuCertificat`, `type Societe`, `type DonneesCertificat` (`{ type: 'CERTIFICAT_PAIEMENT'; contenu; societe }` : pas de `cadre`, l'en-tête SOCOREVE du certificat est `societe`, hors empreinte)
  - `src/documents/certificat.ts` (pur : ni base, ni Node, utilisable dans le navigateur) : `type SourceSociete`, `type SourceCertificat`, `type SaisieCertificat = { cumul: Decimal | null; mois: string; date: string }`, `entreeCalcul(s, cumul): EntreeCalcul`, `batirSociete(p: SourceSociete): Societe`, `batirCertificat(s: SourceCertificat, saisie: SaisieCertificat, opts?: { ligneAjout?: boolean }): DonneesCertificat`
  - `LOGO_SOCOREVE: string` (data URI JPEG)
  - `CertificatPaiement({ donnees, mode, edition? })` et `type EditionCertificat`
  - `LARGEUR_UTILE_PORTRAIT_PX = 718`, `HAUTEUR_UTILE_PORTRAIT_PX = 1045`, `TROP_DE_LIGNES = 'Trop de lignes pour une seule feuille.'` ; `htmlVersPdf(html, { paysage, uneSeuleFeuille, tropLong? })` sait faire tenir une feuille **portrait** sur une page
  - `imprimerCertificat: RendrePdf` (exporté de `generer.ts`)

Le calcul et la construction de la feuille sont dans un module pur, séparé de `batir.ts` : `batir.ts` importe `empreinte` (et donc `node:crypto`), que le navigateur ne peut pas charger ; l'aperçu du certificat (Task 8) recalcule la feuille à la frappe avec `batirCertificat`. L'en-tête du certificat n'est pas le `cadre` des autres documents (RCS, APE, TVA, e-mail, logo) : il vit dans `societe`, exclu de l'empreinte comme le cadre, ce qui laisse intacts le `cadre` et ses tests du Socle.

Une feuille de 10 avenants et 24 acomptes précédents dépasse la hauteur d'une A4 portrait à l'échelle 1 : le certificat s'imprime avec la mesure « une seule feuille » du Planning, étendue au portrait (même fonction `ajusterUneFeuille`, hauteur utile de la page portrait).

- [ ] **Step 1: Écrire les tests de la feuille**

Créer `src/documents/certificat.test.ts` :

```ts
import { readFileSync } from 'node:fs';
import Decimal from 'decimal.js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatEuros } from '@/domaine/montants';
import { empreinteDocument } from './batir';
import { batirCertificat, batirSociete, type SourceCertificat } from './certificat';
import { CertificatPaiement } from './gabarits/CertificatPaiement';
import { Gabarit } from './gabarits/Gabarit';
import { donneesDocumentSchema } from './schemas';

const e = formatEuros;
const SOCIETE = {
	adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26',
	email: 'contact@socoreve-chateaubriant.com', rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503',
	villeSignature: 'Châteaubriant',
};
// Spec, annexe A : CARRELAGE — FAÏENCE (MD CARRELAGE), certificat n° 03.
const CARRELAGE: SourceCertificat = {
	numero: 3,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lot: { numero: '10', designation: 'CARRELAGE — FAÏENCE', entreprise: 'MD CARRELAGE', htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false },
	avenants: [{ numero: 1, montantHt: '850' }],
	precedents: [{ id: 'm1', numero: 1, montantHt: '3000', manuel: true }, { id: 'm2', numero: 2, montantHt: '4200', manuel: true }],
	societe: SOCIETE,
};
const SAISIE = { cumul: new Decimal('9850'), mois: '2026-07', date: '2026-09-30' };
const vides = (n: number, depuis: number) => Array.from({ length: n }, (_, i) => ({ numero: String(depuis + i), montant: '' }));

describe('certificat de paiement (annexe A)', () => {
	const d = batirCertificat(CARRELAGE, SAISIE);

	it('sans caution : la feuille complète', () => {
		expect(d).toEqual({
			type: 'CERTIFICAT_PAIEMENT',
			contenu: {
				numero: '03',
				maitreOuvrage: 'M. et Mme PERRIER',
				objet: "Construction d'une maison individuelle — 142 m² + garage",
				adresseChantier: 'Le Haut Bois – 44110 – LOUISFERT',
				lotNumero: '10', lot: 'CARRELAGE — FAÏENCE', titulaire: 'MD CARRELAGE',
				marcheHt: e('12600'),
				avenants: [
					{ libelle: 'Avenant 1 HT :', montant: e('850') },
					{ libelle: 'Avenant 2 HT :', montant: '' },
					{ libelle: 'Avenant 3 HT :', montant: '' },
					{ libelle: 'Avenant 4 HT :', montant: '' },
				],
				totalHt: e('13450'), totalTva: e('2690'), totalTtc: e('16140'),
				mois: 'Juillet 2026',
				precedents: [{ numero: '1', montant: e('3000') }, { numero: '2', montant: e('4200') }, ...vides(6, 3)],
				precedentsHt: e('7200'), precedentsTva: e('1440'), precedentsTtc: e('8640'),
				realise: e('9850'), presentHt: e('2650'), presentTva: e('530'), presentTtc: e('3180'),
				mandate: e('3021'), caution: 'NON', retenue: e('159'),
				faitLe: '30/09/2026',
				valeurs: {
					htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false,
					avenants: [{ numero: 1, montantHt: '850' }],
					precedents: [{ numero: 1, montantHt: '3000', manuel: true }, { numero: 2, montantHt: '4200', manuel: true }],
					cumul: '9850.00', mois: '2026-07', date: '2026-09-30',
				},
			},
			societe: {
				adresseLigne: '71 rue du Général Patton - 44110 CHÂTEAUBRIANT',
				contactLigne: 'Tél. : 02 40 81 40 26 - contact@socoreve-chateaubriant.com',
				rcsLigne: 'RCS : 328999503 – APE 4120A',
				tvaLigne: 'N° TVA Intra. : FR47328999503',
				villeSignature: 'Châteaubriant',
			},
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('avec caution : pas de retenue', () => {
		const c = batirCertificat({ ...CARRELAGE, lot: { ...CARRELAGE.lot, caution: true } }, SAISIE).contenu;
		expect([c.caution, c.retenue, c.mandate]).toEqual(['OUI', e('0'), e('3180')]);
	});

	it('sans cumul (aperçu) : les lignes qui en dépendent restent vides', () => {
		const c = batirCertificat(CARRELAGE, { ...SAISIE, cumul: null }).contenu;
		expect([c.realise, c.presentHt, c.presentTva, c.presentTtc, c.mandate, c.retenue, c.valeurs.cumul]).toEqual(['', '', '', '', '', '', null]);
		expect(c.totalTtc).toBe(e('16140'));
	});

	it('au-delà de 4 avenants et 8 acomptes : seulement les lignes réelles ; l\'aperçu ajoute une ligne de saisie', () => {
		const long: SourceCertificat = {
			...CARRELAGE,
			numero: 25,
			avenants: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, montantHt: '100' })),
			precedents: Array.from({ length: 24 }, (_, i) => ({ id: `a${i}`, numero: i + 1, montantHt: '300', manuel: false })),
		};
		const c = batirCertificat(long, { ...SAISIE, cumul: new Decimal('8000') }).contenu;
		expect([c.avenants.length, c.precedents.length]).toEqual([10, 24]);
		expect(batirCertificat(long, SAISIE, { ligneAjout: true }).contenu.precedents).toHaveLength(25);
		expect(batirCertificat(CARRELAGE, SAISIE, { ligneAjout: true }).contenu.precedents).toHaveLength(8);
	});

	it('les avenants gardent leur numéro, trous compris', () => {
		const c = batirCertificat({ ...CARRELAGE, avenants: [{ numero: 1, montantHt: '850' }, { numero: 3, montantHt: '-300' }] }, SAISIE).contenu;
		expect(c.avenants.map((a) => a.libelle)).toEqual(['Avenant 1 HT :', 'Avenant 3 HT :', 'Avenant 4 HT :', 'Avenant 5 HT :']);
		expect(c.avenants[1].montant).toBe(e('-300'));
	});

	it('l\'en-tête SOCOREVE n\'entre pas dans l\'empreinte ; sans e-mail, pas de tiret', () => {
		const autre = batirCertificat({ ...CARRELAGE, societe: { ...SOCIETE, email: 'compta@exemple.fr' } }, SAISIE);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
		expect(batirSociete({ ...SOCIETE, email: null }).contactLigne).toBe('Tél. : 02 40 81 40 26');
	});

	it('module pur : ni base, ni Node, ni batir.ts (il tourne dans le navigateur)', () => {
		expect(readFileSync('src/documents/certificat.ts', 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
	});
});

describe('gabarit du certificat', () => {
	it('impression : logo en data URI, textes de la feuille, aucune saisie', () => {
		const html = renderToStaticMarkup(createElement(Gabarit, { donnees: batirCertificat(CARRELAGE, SAISIE), mode: 'impression' }));
		expect(html).toContain('src="data:image/jpeg;base64,');
		expect(html).toContain('CERTIFICAT DE PAIEMENT N° 03');
		expect(html).toContain('mois de Juillet 2026');
		expect(html).toContain('RCS : 328999503 – APE 4120A');
		expect(html).toContain('Fait à Châteaubriant le : 30/09/2026');
		expect(html).toContain(e('3021'));
		expect(html).not.toContain('<input');
	});

	it('édition : cumul, mois, date, caution et acomptes antérieurs se saisissent sur la feuille', () => {
		const rien = () => undefined;
		const html = renderToStaticMarkup(createElement(CertificatPaiement, {
			donnees: batirCertificat(CARRELAGE, { ...SAISIE, cumul: null }, { ligneAjout: true }),
			mode: 'edition',
			edition: {
				cumul: '', mois: '2026-07', date: '2026-09-30',
				acomptes: [{ id: 'm1', saisie: '3 000,00' }, { id: 'm2', saisie: '4 200,00' }],
				surCumul: rien, surMois: rien, surDate: rien, surCaution: rien, surAcompte: rien,
			},
		}));
		for (const libelle of ['Montant des travaux réalisés HT (cumul)', 'Mois de l&#x27;acompte', 'Fait le', 'Acompte 1 HT', 'Ajouter un acompte antérieur']) {
			expect(html).toContain(`aria-label="${libelle}"`);
		}
		expect(html).toContain('Caution bancaire : non');
		expect(html).toContain('Enregistré sur le lot, vaut pour les certificats suivants.');
		expect(html).toContain('à calculer');
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/documents/certificat.test.ts`
Expected: FAIL — `./certificat` introuvable.

- [ ] **Step 3: Le schéma**

Dans `src/documents/schemas.ts`, après `contenuAvenantSchema` (les constantes `iso` et `entier` sont définies plus haut, avec le planning) :

```ts
/** Montants déjà formatés ; `''` pour une ligne vide (lignes de complément, ou cumul pas encore saisi dans l'aperçu). */
export const contenuCertificatSchema = z.object({
	numero: texte,
	maitreOuvrage: texte,
	objet: texte,
	adresseChantier: texte,
	lotNumero: texte,
	lot: texte,
	titulaire: texte,
	marcheHt: texte,
	avenants: z.array(z.object({ libelle: texte, montant: texte })),
	totalHt: texte,
	totalTva: texte,
	totalTtc: texte,
	/** « Juillet 2026 ». */
	mois: texte,
	precedents: z.array(z.object({ numero: texte, montant: texte })),
	precedentsHt: texte,
	precedentsTva: texte,
	precedentsTtc: texte,
	realise: texte,
	presentHt: texte,
	presentTva: texte,
	presentTtc: texte,
	mandate: texte,
	caution: z.enum(['OUI', 'NON']),
	retenue: texte,
	/** « 30/09/2026 ». */
	faitLe: texte,
	/** Les valeurs d'où viennent les montants, figées avec le certificat (spec § 6). */
	valeurs: z.object({
		htInitial: texte,
		tauxTva: texte,
		tauxRetenue: texte,
		caution: z.boolean(),
		avenants: z.array(z.object({ numero: entier, montantHt: texte })),
		precedents: z.array(z.object({ numero: entier, montantHt: texte, manuel: z.boolean() })),
		cumul: texte.nullable(),
		mois: texte,
		date: texte,
	}),
});

/** En-tête SOCOREVE du certificat : figé avec le document, exclu de l'empreinte (comme le cadre des autres documents). */
export const societeSchema = z.object({
	adresseLigne: texte,
	contactLigne: texte,
	rcsLigne: texte,
	tvaLigne: texte,
	villeSignature: texte,
});
```

Ajouter la variante à `donneesDocumentSchema` :

```ts
	z.object({ type: z.literal('CERTIFICAT_PAIEMENT'), contenu: contenuCertificatSchema, societe: societeSchema }),
```

et les types :

```ts
export type ContenuCertificat = z.infer<typeof contenuCertificatSchema>;
export type Societe = z.infer<typeof societeSchema>;
export type DonneesCertificat = Extract<DonneesDocument, { type: 'CERTIFICAT_PAIEMENT' }>;
```

Run: `npx tsc --noEmit`
Expected: aucune erreur. Un code qui lirait `donnees.cadre` sur n'importe quel `DonneesDocument` échouerait ici : il n'y en a pas (les gabarits et le tableur lisent le cadre de leur propre type).

- [ ] **Step 4: La feuille, module pur**

Créer `src/documents/certificat.ts` :

```ts
import Decimal from 'decimal.js';
import { calculerCertificat, dateCourteSlash, moisLong, type EntreeCalcul } from '@/domaine/certificats';
import { formatEuros } from '@/domaine/montants';
import type { DonneesCertificat, Societe } from './schemas';

/*
 * Module pur (ni base, ni Node) : l'aperçu le rappelle à chaque frappe dans le navigateur, le serveur
 * à la génération, avec les valeurs relues en base (spec § 3). Il ne doit importer ni `batir.ts`
 * (qui charge `node:crypto`), ni `@/donnees`.
 */

export type SourceSociete = {
	adresse: string; cp: string; ville: string; telephone: string; email: string | null;
	rcs: string; ape: string; tvaIntracommunautaire: string; villeSignature: string;
};

export type SourceCertificat = {
	/** Nombre d'acomptes précédents + 1. */
	numero: number;
	chantier: { maitreOuvrage: string; natureTravaux: string; adresse: string; cp: string; commune: string };
	lot: {
		numero: string | null; designation: string; entreprise: string | null;
		htInitial: string; tauxTva: string; tauxRetenue: string; caution: boolean;
	};
	/** Triés par numéro (trous possibles). */
	avenants: { numero: number; montantHt: string }[];
	/** Acomptes de numéro inférieur à celui du certificat, triés. */
	precedents: { id: string; numero: number; montantHt: string; manuel: boolean }[];
	societe: SourceSociete;
};

/** Les saisies de la feuille ; `cumul` est nul tant qu'il n'est pas saisi (aperçu seulement). */
export type SaisieCertificat = { cumul: Decimal | null; mois: string; date: string };

const LIGNES_AVENANTS = 4;
const LIGNES_PRECEDENTS = 8;
const TIRET = '—';
const ouTiret = (v: string | null) => (v?.trim() ? v : TIRET);

export function entreeCalcul(s: SourceCertificat, cumul: Decimal): EntreeCalcul {
	return {
		htInitial: s.lot.htInitial,
		avenants: s.avenants.map((a) => a.montantHt),
		tauxTva: s.lot.tauxTva,
		tauxRetenue: s.lot.tauxRetenue,
		caution: s.lot.caution,
		precedents: s.precedents.map((a) => a.montantHt),
		cumulRealise: cumul,
	};
}

/** Maquette `renderCpSheet` : « 71 rue … - 44110 CHÂTEAUBRIANT », « Tél. : … - e-mail », RCS, APE, TVA. */
export function batirSociete(p: SourceSociete): Societe {
	const email = p.email?.trim();
	return {
		adresseLigne: `${p.adresse} - ${p.cp} ${p.ville.toLocaleUpperCase('fr-FR')}`,
		contactLigne: `Tél. : ${p.telephone}${email ? ` - ${email}` : ''}`,
		rcsLigne: `RCS : ${p.rcs} – APE ${p.ape}`,
		tvaLigne: `N° TVA Intra. : ${p.tvaIntracommunautaire}`,
		villeSignature: p.villeSignature,
	};
}

/**
 * Feuille « CERTIFICAT DE PAIEMENT N° 03 » (maquette `renderCpSheet`) : lignes vides jusqu'à 4 avenants
 * et 8 acomptes précédents, au-delà les seules lignes réelles. `ligneAjout` (aperçu) garde une ligne libre
 * sous les acomptes pour en saisir un de plus.
 */
export function batirCertificat(s: SourceCertificat, saisie: SaisieCertificat, opts: { ligneAjout?: boolean } = {}): DonneesCertificat {
	// Sans cumul, les totaux du marché et des acomptes précédents s'affichent déjà ; le reste attend la saisie.
	const k = calculerCertificat(entreeCalcul(s, saisie.cumul ?? new Decimal(0)));
	const siCumul = (x: Decimal) => (saisie.cumul ? formatEuros(x) : '');
	const dernierAvenant = s.avenants.at(-1)?.numero ?? 0;
	const lignesVides = Math.max(0, LIGNES_AVENANTS - s.avenants.length);
	const nbPrecedents = Math.max(LIGNES_PRECEDENTS, s.precedents.length + (opts.ligneAjout ? 1 : 0));
	return {
		type: 'CERTIFICAT_PAIEMENT',
		contenu: {
			numero: String(s.numero).padStart(2, '0'),
			maitreOuvrage: ouTiret(s.chantier.maitreOuvrage),
			objet: ouTiret(s.chantier.natureTravaux),
			adresseChantier: [s.chantier.adresse, s.chantier.cp, s.chantier.commune].filter((x) => x.trim()).join(' – '),
			lotNumero: ouTiret(s.lot.numero),
			lot: ouTiret(s.lot.designation),
			titulaire: ouTiret(s.lot.entreprise),
			marcheHt: formatEuros(k.marcheHt),
			avenants: [
				...s.avenants.map((a, i) => ({ libelle: `Avenant ${a.numero} HT :`, montant: formatEuros(k.avenants[i]) })),
				...Array.from({ length: lignesVides }, (_, i) => ({ libelle: `Avenant ${dernierAvenant + i + 1} HT :`, montant: '' })),
			],
			totalHt: formatEuros(k.totalHt),
			totalTva: formatEuros(k.totalTva),
			totalTtc: formatEuros(k.totalTtc),
			mois: moisLong(saisie.mois),
			precedents: Array.from({ length: nbPrecedents }, (_, i) => ({
				numero: String(i + 1),
				montant: s.precedents[i] ? formatEuros(s.precedents[i].montantHt) : '',
			})),
			precedentsHt: formatEuros(k.precedentsHt),
			precedentsTva: formatEuros(k.precedentsTva),
			precedentsTtc: formatEuros(k.precedentsTtc),
			realise: siCumul(k.realiseHt),
			presentHt: siCumul(k.presentHt),
			presentTva: siCumul(k.presentTva),
			presentTtc: siCumul(k.presentTtc),
			mandate: siCumul(k.mandate),
			caution: s.lot.caution ? 'OUI' : 'NON',
			retenue: siCumul(k.retenue),
			faitLe: dateCourteSlash(saisie.date),
			valeurs: {
				htInitial: s.lot.htInitial,
				tauxTva: s.lot.tauxTva,
				tauxRetenue: s.lot.tauxRetenue,
				caution: s.lot.caution,
				avenants: s.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt })),
				precedents: s.precedents.map((a) => ({ numero: a.numero, montantHt: a.montantHt, manuel: a.manuel })),
				cumul: saisie.cumul ? saisie.cumul.toFixed(2) : null,
				mois: saisie.mois,
				date: saisie.date,
			},
		},
		societe: batirSociete(s.societe),
	};
}
```

- [ ] **Step 5: Le logo**

Le logo de la maquette (`const LOGO_SOCOREVE = 'data:image/jpeg;base64,…';`, ligne 6520, environ 12 Ko) devient un module : Chromium n'a aucun accès réseau pendant la génération, et l'aperçu l'affiche sans requête.

Run:

```bash
node -e '
const fs = require("fs");
const m = fs.readFileSync("docs/maquette/sentinelle-marches.html", "utf8").match(/const LOGO_SOCOREVE = \x27(data:image\/jpeg;base64,[A-Za-z0-9+\/=]+)\x27/);
if (!m) throw new Error("LOGO_SOCOREVE introuvable dans la maquette");
fs.writeFileSync("src/documents/gabarits/logo.ts", `/** Logo SOCOREVE repris de la maquette (LOGO_SOCOREVE), en data URI : Chromium n\x27a aucun accès réseau pendant la génération. */\nexport const LOGO_SOCOREVE =\n\t\x27${m[1]}\x27;\n`);
'
```

Run: `head -c 200 src/documents/gabarits/logo.ts && wc -c src/documents/gabarits/logo.ts`
Expected: le commentaire, `export const LOGO_SOCOREVE =`, `'data:image/jpeg;base64,/9j/4AAQ…` ; environ 12 Ko.

- [ ] **Step 6: Le gabarit**

Créer `src/documents/gabarits/CertificatPaiement.tsx` :

```tsx
import { Fragment, type KeyboardEvent } from 'react';
import type { DonneesCertificat } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 8). Sans hook : les champs sont contrôlés par l'aperçu (cumul, mois, date)
 * ou lus quand on les quitte (acomptes antérieurs), comme les zones des marchés.
 */
export type EditionCertificat = {
	cumul: string;
	mois: string;
	date: string;
	/** Acomptes antérieurs saisissables tant que le lot n'a aucun certificat ; sinon `null`. */
	acomptes: { id: string; saisie: string }[] | null;
	surCumul: (texte: string) => void;
	surMois: (mois: string) => void;
	surDate: (date: string) => void;
	surCaution: () => void;
	/** `id` nul : nouvel acompte ; texte vide : suppression. */
	surAcompte: (id: string | null, texte: string) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

/** Fac-similé du certificat SOCOREVE (maquette `renderCpSheet`), A4 portrait. */
export function CertificatPaiement({ donnees, mode, edition }: { donnees: DonneesCertificat; mode: ModeGabarit; edition?: EditionCertificat }) {
	const { contenu: c, societe: s } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	function celluleAcompte(i: number, montant: string) {
		const acomptes = ed?.acomptes;
		if (!acomptes) return montant;
		const a = acomptes[i];
		if (a) {
			return (
				<input key={`${a.id}:${a.saisie}`} className="zone cp-saisie" aria-label={`Acompte ${i + 1} HT`} defaultValue={a.saisie}
					onKeyDown={quitterSurEntree} onBlur={(e) => { if (e.currentTarget.value !== a.saisie) ed.surAcompte(a.id, e.currentTarget.value); }} />
			);
		}
		if (i !== acomptes.length) return '';
		return (
			<input key={`ajout:${acomptes.length}`} className="zone cp-saisie" aria-label="Ajouter un acompte antérieur" placeholder="ajouter"
				onKeyDown={quitterSurEntree}
				onBlur={(e) => {
					const texte = e.currentTarget.value;
					if (!texte.trim()) return;
					e.currentTarget.value = '';
					ed.surAcompte(null, texte);
				}} />
		);
	}

	return (
		<article className="sheet sheet-doc sheet-cp">
			<div className="cp-tete">
				{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
				<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
				<div className="cp-adr">{s.adresseLigne}<br />{s.contactLigne}<br />{s.rcsLigne}<br />{s.tvaLigne}</div>
			</div>
			<div className="cp-cadre">
				<div className="cp-titre">{`CERTIFICAT DE PAIEMENT N° ${c.numero}`}</div>
				<dl className="cp-kv">
					<dt>Maître de l&apos;Ouvrage :</dt><dd>{c.maitreOuvrage}</dd>
					<dt>Objet du marché :</dt><dd>{c.objet}{c.adresseChantier && <><br />{c.adresseChantier}</>}</dd>
					<dt>{`Lot n° ${c.lotNumero}`}</dt><dd>{c.lot}</dd>
					<dt>Titulaire :</dt><dd>{c.titulaire}</dd>
				</dl>
			</div>
			<div className="cp-cadre cp-montants">
				<span className="k">Montant du marché HT :</span><span className="v">{c.marcheHt}</span>
				<span className="av-titre">AVENANTS :</span>
				{c.avenants.map((a, i) => (
					<Fragment key={i}><span className="k">{a.libelle}</span><span className="v">{a.montant}</span></Fragment>
				))}
				<span className="k">Total HT :</span><span className="v">{c.totalHt}</span>
				<span className="k">TVA :</span><span className="v">{c.totalTva}</span>
				<span className="k">Total TTC :</span><span className="v">{c.totalTtc}</span>
			</div>
			<div className="cp-bande">
				{`État d'acompte n° ${c.numero} mois de `}
				{ed
					? <input type="month" className="cp-saisie cp-date" aria-label="Mois de l'acompte" value={ed.mois} onChange={(e) => ed.surMois(e.target.value)} />
					: c.mois}
			</div>
			<div className="cp-deux">
				<table className="cp-t cp-prec">
					<tbody>
						<tr><th colSpan={2}>Acomptes précédents</th></tr>
						<tr><th>N°</th><th>Montant HT</th></tr>
						{c.precedents.map((p, i) => (
							<tr key={i}><td>{p.numero}</td><td className="m">{celluleAcompte(i, p.montant)}</td></tr>
						))}
						<tr><td>Total HT</td><td className="m">{c.precedentsHt}</td></tr>
						<tr><td>TVA</td><td className="m">{c.precedentsTva}</td></tr>
						<tr><td>Total TTC</td><td className="m">{c.precedentsTtc}</td></tr>
					</tbody>
				</table>
				<table className="cp-t cp-titu">
					<tbody>
						<tr><th className="vide" /><th>Titulaire</th></tr>
						<tr>
							<td className="k">Montant des travaux réalisés HT :</td>
							<td className="m">
								{ed
									? <input className="zone cp-saisie" inputMode="decimal" aria-label="Montant des travaux réalisés HT (cumul)" placeholder="à saisir"
										value={ed.cumul} onChange={(e) => ed.surCumul(e.target.value)} />
									: c.realise}
							</td>
						</tr>
						<tr><td className="k">Montant total des acomptes précédents HT :</td><td className="m">{c.precedentsHt}</td></tr>
						<tr><td className="k">Montant du présent acompte HT :</td><td className="m">{c.presentHt}</td></tr>
						<tr><td className="k">Montant de la TVA :</td><td className="m">{c.presentTva}</td></tr>
						<tr><td className="k">Montant du présent acompte TTC :</td><td className="m">{c.presentTtc}</td></tr>
						<tr className="mandat"><td className="k">Montant total mandaté :</td><td className="m">{c.mandate}</td></tr>
						<tr>
							<td className="k">Caution bancaire (OUI/NON)</td>
							<td className="m cp-centre">
								{ed ? (
									<>
										<button type="button" className="cp-caution" aria-label={`Caution bancaire : ${c.caution === 'OUI' ? 'oui' : 'non'}`} title="Cliquer pour changer" onClick={ed.surCaution}>{c.caution}</button>
										<small className="cp-note">Enregistré sur le lot, vaut pour les certificats suivants.</small>
									</>
								) : c.caution}
							</td>
						</tr>
						<tr><td className="k">Dont retenue de garantie :</td><td className="m">{c.retenue}</td></tr>
					</tbody>
				</table>
			</div>
			<p className="cp-certif">
				Le Maître d&apos;œuvre soussigné certifie qu&apos;il peut être mandaté la somme de :
				<span className="cp-somme">{c.mandate || (ed ? <span className="cp-vide">à calculer</span> : '')}</span>
			</p>
			<p className="cp-fait">
				{`Fait à ${s.villeSignature} le : `}
				{ed ? <input type="date" className="cp-saisie cp-date" aria-label="Fait le" value={ed.date} onChange={(e) => ed.surDate(e.target.value)} /> : c.faitLe}
			</p>
			<p className="cp-sign">Le Maître d&apos;œuvre</p>
		</article>
	);
}
```

Dans `src/documents/gabarits/Gabarit.tsx`, importer `CertificatPaiement` et ajouter au `switch` :

```tsx
		case 'CERTIFICAT_PAIEMENT':
			// Les saisies de l'aperçu passent par ApercuCertificat, qui rend CertificatPaiement directement.
			return <CertificatPaiement donnees={donnees} mode={mode === 'edition' ? 'lecture' : mode} />;
```

Dans `src/documents/styles.ts`, insérer avant la ligne `/* PDF : la page A4 (marges 10 mm) porte la feuille, sans cadre ni ombre. */` :

```css
/* Certificat de paiement : A4 portrait (maquette renderCpSheet). Double classe : « .sheet-doc » fixerait 68rem. */
.sheet-doc.sheet-cp { width: 46rem; }
.cp-tete { display: flex; align-items: center; gap: 1.25rem; margin-bottom: .875rem; }
.cp-tete img { width: 5.5rem; height: auto; flex: none; }
.cp-adr { font-style: italic; font-size: .8125rem; line-height: 1.45; }
.cp-cadre { border: 1px solid #16191b; margin-bottom: .625rem; }
.cp-titre { text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.0625rem; letter-spacing: .03em; padding: .375rem; border-bottom: 1px solid #16191b; }
.cp-kv { display: grid; grid-template-columns: 11rem minmax(0, 1fr); gap: .25rem .5rem; margin: 0; padding: .5rem .75rem .625rem; font-size: .75rem; }
.cp-kv dt { text-align: right; }
.cp-kv dd { margin: 0; font-weight: 700; }
.cp-montants { display: grid; grid-template-columns: 11rem 9rem; gap: .125rem 1.5rem; padding: .5rem .75rem .625rem; font-size: .75rem; }
.cp-montants .k { text-align: right; }
.cp-montants .v { text-align: right; font-weight: 700; font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; }
.cp-montants .av-titre { grid-column: 1 / -1; font-weight: 700; text-decoration: underline; margin-top: .375rem; }
.cp-bande { background: #bfc2c4; border: 1px solid #16191b; text-align: center; font-weight: 700; font-size: .8125rem; padding: .4375rem; margin: .625rem 0 .75rem; }
.cp-deux { display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: 1.5rem; align-items: start; }
table.cp-t { width: 100%; border-collapse: collapse; font-size: .6875rem; }
table.cp-t th, table.cp-t td { border: 1px solid #16191b; padding: .1875rem .375rem; }
table.cp-t th { font-weight: 400; text-align: center; }
table.cp-t td.m { text-align: right; font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.cp-t td.cp-centre { text-align: center; }
table.cp-prec td:first-child { text-align: center; width: 4.75rem; white-space: nowrap; }
table.cp-titu td.k { text-align: right; border-left: 0; }
table.cp-titu td.m { width: 7.5rem; }
table.cp-titu tr.mandat td { background: #cfe2ee; font-weight: 700; }
table.cp-titu th.vide { border: 0; }
.cp-certif { display: flex; align-items: center; justify-content: flex-end; gap: .75rem; margin: 1.25rem 0 .75rem; font-size: .75rem; }
.cp-somme { background: #cfe2ee; font-weight: 700; font-family: 'Spline Sans Mono', monospace; font-size: .9375rem; padding: .3125rem 1.25rem; }
.cp-fait { margin: .5rem 0 0; font-size: .75rem; }
.cp-sign { margin: .25rem 0 0 1rem; font-size: .75rem; min-height: 5rem; }
/* Saisies de l'aperçu : jamais imprimées (le PDF est rendu en mode impression, sans champ). */
.cp-saisie { width: 100%; min-width: 0; font: inherit; text-align: right; border: 0; padding: 0 .25rem; }
.cp-saisie.cp-date { width: auto; text-align: left; background: #e8f0f8; box-shadow: inset 0 -1px 0 #1c4e80; }
.cp-caution { font: inherit; font-weight: 700; cursor: pointer; background: #e8f0f8; border: 0; box-shadow: inset 0 -1px 0 #1c4e80; padding: 0 .5rem; }
.cp-vide { color: #5f7285; font-style: italic; font-weight: 400; }
.cp-note { display: block; white-space: normal; font-family: 'Figtree', system-ui, sans-serif; font-size: .5625rem; line-height: 1.3; color: #5a6062; margin-top: .125rem; }
```

Run: `npm test -- src/documents/certificat.test.ts`
Expected: PASS.

- [ ] **Step 7: Une feuille portrait sur une page**

Créer `src/documents/pdfCertificat.int.test.ts` :

```ts
import Decimal from 'decimal.js';
import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { batirCertificat, type SourceCertificat } from './certificat';
import { imprimerCertificat } from './generer';
import { fermerNavigateur } from './pdf';
import { rendreHtml } from './rendu';

const SOURCE: SourceCertificat = {
	numero: 3,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lot: { numero: '10', designation: 'CARRELAGE — FAÏENCE', entreprise: 'MD CARRELAGE', htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false },
	avenants: [{ numero: 1, montantHt: '850' }],
	precedents: [{ id: 'm1', numero: 1, montantHt: '3000', manuel: true }, { id: 'm2', numero: 2, montantHt: '4200', manuel: true }],
	societe: {
		adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26', email: 'contact@socoreve-chateaubriant.com',
		rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503', villeSignature: 'Châteaubriant',
	},
};
const SAISIE = { cumul: new Decimal('9850'), mois: '2026-07', date: '2026-09-30' };

async function pages(source: SourceCertificat, cumul: string) {
	const pdf = await PDFDocument.load(await imprimerCertificat(await rendreHtml(batirCertificat(source, { ...SAISIE, cumul: new Decimal(cumul) }))));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), portrait: height > width, largeur: Math.round(width) };
}

describe('impression du certificat', () => {
	afterAll(fermerNavigateur);

	it('annexe A : une page A4 portrait', async () => {
		expect(await pages(SOURCE, '9850')).toEqual({ nombre: 1, portrait: true, largeur: 595 });
	});

	it('10 avenants et 24 acomptes précédents : toujours une page', async () => {
		const long: SourceCertificat = {
			...SOURCE,
			numero: 25,
			avenants: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, montantHt: '100' })),
			precedents: Array.from({ length: 24 }, (_, i) => ({ id: `a${i}`, numero: i + 1, montantHt: '300', manuel: i < 3 })),
		};
		expect(await pages(long, '8000')).toEqual({ nombre: 1, portrait: true, largeur: 595 });
	});
});
```

Run: `npm run test:int -- src/documents/pdfCertificat.int.test.ts`
Expected: FAIL — `imprimerCertificat` n'est pas exportée.

Dans `src/documents/uneFeuille.ts`, après `HAUTEUR_UTILE_PX`, ajouter :

```ts
/** A4 portrait moins les marges de 10 mm : 190 × 277 mm, arrondis par défaut comme en paysage. */
export const LARGEUR_UTILE_PORTRAIT_PX = 718;
export const HAUTEUR_UTILE_PORTRAIT_PX = 1045;
/** Certificat de paiement trop long, même réduit (plus d'une centaine d'acomptes). */
export const TROP_DE_LIGNES = 'Trop de lignes pour une seule feuille.';
```

Dans `src/documents/pdf.ts` :

1. Compléter l'import de `./uneFeuille` avec `HAUTEUR_UTILE_PORTRAIT_PX` et `LARGEUR_UTILE_PORTRAIT_PX`.
2. Remplacer la signature par :

```ts
export async function htmlVersPdf(
	html: string,
	opts: { paysage?: boolean; delaiMs?: number; uneSeuleFeuille?: boolean; tropLong?: string } = {},
): Promise<Uint8Array> {
```

3. Dans `travail`, remplacer le bloc qui va de `// Une seule feuille : la mise en page se fait…` jusqu'à `const paysage = opts.paysage ?? true;` inclus par :

```ts
		const paysage = opts.paysage ?? true;
		const utile = paysage
			? { largeur: LARGEUR_UTILE_PX, hauteur: HAUTEUR_UTILE_PX }
			: { largeur: LARGEUR_UTILE_PORTRAIT_PX, hauteur: HAUTEUR_UTILE_PORTRAIT_PX };
		// Une seule feuille : la mise en page se fait à la largeur utile de la page, comme dans l'aperçu.
		if (opts.uneSeuleFeuille) await page.setViewportSize({ width: utile.largeur, height: utile.hauteur });
		await page.setContent(html, { waitUntil: 'load' });
		await page.evaluate(async () => { await document.fonts.ready; });
		let echelle = 1;
		if (opts.uneSeuleFeuille) {
			// Mesures comprises dans le même créneau Chromium que l'impression.
			echelle = (await page.evaluate(ajusterUneFeuille, { ...OPTIONS_UNE_FEUILLE, hauteurUtile: utile.hauteur })).echelle;
			if (echelle < ECHELLE_MIN) throw new ErreurMetier(opts.tropLong ?? TROP_DE_LOTS);
		}
		// ISO A4 mm : format:'A4' de Chromium 1243 donne 842.88 pt (Math.round → 843).
```

(le `return page.pdf({ … })` qui suit ne change pas ; seule la déclaration de `paysage` remonte).

Dans `src/documents/generer.ts`, ajouter `TROP_DE_LIGNES` (import de `./uneFeuille`) et, après `imprimerPortrait` :

```ts
/** Certificat : portrait, toujours une page ; une feuille longue (10 avenants, 24 acomptes) est réduite à l'échelle. */
export const imprimerCertificat: RendrePdf = (html) => htmlVersPdf(html, { paysage: false, uneSeuleFeuille: true, tropLong: TROP_DE_LIGNES });
```

- [ ] **Step 8: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/documents && npm run test:int -- src/documents/pdfCertificat.int.test.ts src/documents/uneFeuille.int.test.ts src/documents/pdf.int.test.ts`
Expected: aucune erreur ; PASS, y compris les mesures du planning (le paysage ne change pas).

- [ ] **Step 9: Commit**

```bash
git add src/documents/certificat.ts src/documents/gabarits/logo.ts src/documents/gabarits/CertificatPaiement.tsx src/documents/schemas.ts src/documents/gabarits/Gabarit.tsx src/documents/styles.ts src/documents/uneFeuille.ts src/documents/pdf.ts src/documents/generer.ts src/documents/certificat.test.ts src/documents/pdfCertificat.int.test.ts
git commit -m "feat(financier): feuille du certificat de paiement, calculée dans un module pur, une page portrait"
```

---
### Task 7: Acomptes, caution, génération et correction du certificat sous verrou

**Files:**
- Create: `src/donnees/acomptes.ts`, `src/actions/certificats.ts`
- Modify: `src/documents/generer.ts`, `src/domaine/fichiers.ts`, `src/domaine/fichiers.test.ts`
- Test: `src/donnees/acomptes.int.test.ts`

**Interfaces:**
- Consumes: `calculerCertificat`, `controlerCertificat`, `certificatPossible`, `lireCumul`, `lireMontantAcompte`, `verifierMois`, `verifierDate`, `MOIS_VALIDE` et les messages (Task 1) ; `sommeAvenants` (Task 1) ; `serieCertificat` (Task 2) ; `sousVerrouLot`, `Tx`, `LotVerrouille` (Task 3) ; `batirCertificat`, `entreeCalcul`, `SourceCertificat`, `imprimerCertificat` (Task 6) ; `empreinteDocument`, `ResultatGeneration` (Socle).
- Produces:
  - dans `src/documents/generer.ts` : `export type Dependances`, `DONNEES_CHANGEES`, `rendrePdfDocument(donnees: DonneesDocument, rendrePdf: RendrePdf): Promise<Uint8Array>`
  - `nomFichierCertificat(p: { reference; numero: string | null; designation; nature; numeroCertificat: number; version: number }): string`
  - dans `src/donnees/acomptes.ts` :
    - `saisiesCertificatSchema` (Zod : `cumul`, `mois` conforme à `MOIS_VALIDE`, `date`), `type SaisiesCertificat = { cumul: string; mois: string; date: string }`
    - `type CertificatOuvert = { lotId: string; chantierId: string; source: SourceCertificat; saisies: SaisiesCertificat; acompteId: string | null; derniereVersion: number | null; acomptesManuels: { id: string; saisie: string }[] | null; blocage: string | null }`
    - `ouvrirNouveauCertificat(lotId: string, maintenant?: Date): Promise<CertificatOuvert>`, `ouvrirCorrection(acompteId: string): Promise<CertificatOuvert>`
    - `genererCertificat(lotId: string, saisies: SaisiesCertificat & { numeroAttendu: number }, utilisateurId: string, deps?: Dependances): Promise<ResultatGeneration & { acompteId: string }>`
    - `corrigerCertificat(acompteId: string, saisies: SaisiesCertificat, utilisateurId: string, deps?: Dependances): Promise<ResultatGeneration>`
    - `ajouterAcompteManuel(lotId: string, saisie: string)`, `modifierAcompteManuel(acompteId: string, saisie: string)`, `supprimerAcompteManuel(acompteId: string)`, `changerCaution(lotId: string, caution: boolean)` : `Promise<{ chantierId: string }>`
  - Server Actions : `genererCertificatAction(lotId, saisies & { numeroAttendu })`, `corrigerCertificatAction(acompteId, saisies)` : `Promise<Resultat<ResultatGeneration>>` ; `ajouterAcompteManuelAction(lotId, saisie)`, `modifierAcompteManuelAction(acompteId, saisie)`, `supprimerAcompteManuelAction(acompteId)`, `changerCautionAction(lotId, caution)` : `Promise<Resultat>`

Déroulé d'une génération (spec § 6) : lecture et calcul hors verrou, PDF hors transaction (quelques secondes), puis sous `SELECT … FOR UPDATE` sur le lot : relecture, numéro attendu toujours libre (ou certificat toujours le dernier), même empreinte que le PDF rendu, écriture de l'`Acompte` et de la version dans la même transaction. Le verrou du lot remplace ici le verrou consultatif de `enregistrerVersion` : toutes les écritures de certificats d'un lot le prennent.

- [ ] **Step 1: Écrire les tests d'intégration**

Créer `src/donnees/acomptes.int.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DonneesCertificat } from '@/documents/schemas';
import {
	AUTRE_CERTIFICAT, CERTIFICAT_IMPOSSIBLE, CERTIFICATS_EXISTENT, CUMUL_MANQUANT, DERNIER_SEUL, PRESENT_NON_POSITIF,
} from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import {
	ajouterAcompteManuel, changerCaution, corrigerCertificat, genererCertificat, modifierAcompteManuel, ouvrirCorrection,
	ouvrirNouveauCertificat, saisiesCertificatSchema, supprimerAcompteManuel,
} from './acomptes';
import { ajouterAvenant, modifierChampAvenant } from './avenants';
import { prisma } from './prisma';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { rendrePdf: faux };
const JUILLET = { mois: '2026-07', date: '2026-09-30' };
let p: Awaited<ReturnType<typeof insererPerrier>>;
let lotId: string;

const acomptes = () => prisma.acompte.findMany({ where: { lotId }, orderBy: { numero: 'asc' } });
const resume = async () => (await acomptes()).map((a) => [a.numero, a.montantHt.toString(), a.manuel]);
const montantDe = async (id: string) => (await prisma.acompte.findUniqueOrThrow({ where: { id } })).montantHt.toString();
const certificat = (numeroAttendu: number, cumul: string, d: { rendrePdf: typeof faux } = deps) =>
	genererCertificat(lotId, { numeroAttendu, cumul, ...JUILLET }, p.utilisateurId, d);
const corriger = (acompteId: string, cumul: string, d: { rendrePdf: typeof faux } = deps) =>
	corrigerCertificat(acompteId, { cumul, ...JUILLET }, p.utilisateurId, d);
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as DonneesCertificat).contenu;

describe('certificats de paiement', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		lotId = p.lots['CARRELAGE — FAÏENCE'];
	});

	it('annexe A de bout en bout : avenant, deux acomptes antérieurs, certificat n° 03', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'montantHt', '850');
		await ajouterAcompteManuel(lotId, '3 000');
		await ajouterAcompteManuel(lotId, '4 200,00');
		const ouvert = await ouvrirNouveauCertificat(lotId, new Date('2026-09-30T08:00:00Z'));
		expect(ouvert).toMatchObject({ acompteId: null, derniereVersion: null, blocage: null, saisies: { cumul: '', mois: '2026-09', date: '2026-09-30' } });
		expect(ouvert.source.numero).toBe(3);
		expect(ouvert.acomptesManuels?.map((a) => a.saisie)).toEqual([formatMontantSaisie('3000'), formatMontantSaisie('4200')]);

		const r = await certificat(3, '9 850');
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Certificat03-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId, doc.version]).toEqual(['CERTIFICAT_PAIEMENT', `CERTIFICAT:${r.acompteId}`, lotId, 1]);
		const c = await contenu(r.documentId);
		expect([c.totalTtc, c.presentHt, c.retenue, c.mandate, c.mois])
			.toEqual([formatEuros('16140'), formatEuros('2650'), formatEuros('159'), formatEuros('3021'), 'Juillet 2026']);
		const a = await prisma.acompte.findUniqueOrThrow({ where: { id: r.acompteId } });
		expect([a.numero, a.montantHt.toString(), a.manuel, a.cumulRealiseHt?.toString(), a.mois, a.date?.toISOString().slice(0, 10)])
			.toEqual([3, '2650', false, '9850', '2026-07', '2026-09-30']);
	});

	it('acomptes antérieurs : renumérotés tant qu\'aucun certificat, figés ensuite', async () => {
		for (const m of ['1000', '2000', '3000']) await ajouterAcompteManuel(lotId, m);
		const [, deuxieme, troisieme] = await acomptes();
		await supprimerAcompteManuel(deuxieme.id);
		expect(await resume()).toEqual([[1, '1000', true], [2, '3000', true]]);
		await modifierAcompteManuel(troisieme.id, '3 500');
		expect(await resume()).toEqual([[1, '1000', true], [2, '3500', true]]);
		await expect(ajouterAcompteManuel(lotId, '0')).rejects.toThrow('Le montant doit être positif.');

		await certificat(3, '9 850');
		await expect(ajouterAcompteManuel(lotId, '100')).rejects.toThrow(CERTIFICATS_EXISTENT);
		await expect(modifierAcompteManuel(troisieme.id, '100')).rejects.toThrow(CERTIFICATS_EXISTENT);
		await expect(supprimerAcompteManuel(troisieme.id)).rejects.toThrow(CERTIFICATS_EXISTENT);
		expect((await ouvrirNouveauCertificat(lotId)).acomptesManuels).toBeNull();
	});

	it('acomptes antérieurs écrits en même temps : numéros continus, aucun conflit', async () => {
		await Promise.all(['100', '200', '300'].map((m) => ajouterAcompteManuel(lotId, m)));
		expect((await acomptes()).map((a) => a.numero)).toEqual([1, 2, 3]);
	});

	it('deux certificats simultanés : un seul passe, l\'autre reçoit le message, rien d\'écrit pour lui', async () => {
		const r = await Promise.allSettled([certificat(1, '1000'), certificat(1, '2000')]);
		expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected']);
		expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason.message).toBe(AUTRE_CERTIFICAT);
		expect([await prisma.acompte.count(), await prisma.document.count()]).toEqual([1, 1]);
		await expect(certificat(1, '3000')).rejects.toThrow(AUTRE_CERTIFICAT);
	});

	it('saisies invalides, lot incomplet : refus, ni PDF ni écriture', async () => {
		await expect(certificat(1, ' ')).rejects.toThrow(CUMUL_MANQUANT);
		await expect(certificat(1, 'abc')).rejects.toThrow('Montant : saisissez un nombre.');
		await expect(certificat(1, '0')).rejects.toThrow(PRESENT_NON_POSITIF);
		await expect(genererCertificat(lotId, { numeroAttendu: 1, cumul: '100', mois: '2026-13', date: '2026-09-30' }, p.utilisateurId, deps))
			.rejects.toThrow('Mois : choisissez un mois.');
		await expect(genererCertificat(lotId, { numeroAttendu: 1, cumul: '100', mois: '2026-07', date: '2026-02-30' }, p.utilisateurId, deps))
			.rejects.toThrow('Date : choisissez une date.');
		expect(saisiesCertificatSchema.safeParse({ cumul: '100', mois: '2026-13', date: '2026-09-30' }).success).toBe(false);
		await expect(genererCertificat(p.lots['ENDUIT EXTÉRIEUR'], { numeroAttendu: 1, cumul: '100', ...JUILLET }, p.utilisateurId, deps))
			.rejects.toThrow(CERTIFICAT_IMPOSSIBLE);
		expect((await ouvrirNouveauCertificat(p.lots['ENDUIT EXTÉRIEUR'])).blocage).toBe(CERTIFICAT_IMPOSSIBLE);
		expect([await prisma.acompte.count(), await prisma.document.count()]).toEqual([0, 0]);
		expect(faux).not.toHaveBeenCalled();
	});

	it('correction du dernier : v2 et acompte à jour ; sans changement, pas de v2 ; un plus ancien est refusé', async () => {
		const r1 = await certificat(1, '5000');
		expect(await corriger(r1.acompteId, '5 000,00')).toMatchObject({ version: 1, nouvelle: false });
		expect(await corriger(r1.acompteId, '6000')).toMatchObject({
			version: 2, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Certificat01-v2.pdf',
		});
		expect(await montantDe(r1.acompteId)).toBe('6000');
		expect(await ouvrirCorrection(r1.acompteId)).toMatchObject({
			acompteId: r1.acompteId, derniereVersion: 2, blocage: null, acomptesManuels: null,
			saisies: { cumul: formatMontantSaisie('6000'), mois: '2026-07', date: '2026-09-30' },
		});

		const r2 = await certificat(2, '8000');
		// Le n° 2 se calcule avec le n° 1 corrigé : 8 000 − 6 000.
		expect((await contenu(r2.documentId)).presentHt).toBe(formatEuros('2000'));
		await expect(corriger(r1.acompteId, '6500')).rejects.toThrow(DERNIER_SEUL);
		expect((await ouvrirCorrection(r1.acompteId)).blocage).toBe(DERNIER_SEUL);
		expect(await prisma.document.count({ where: { serie: `CERTIFICAT:${r1.acompteId}` } })).toBe(2);
	});

	it('un acompte antérieur ne se corrige pas ; un acompte disparu est signalé', async () => {
		await ajouterAcompteManuel(lotId, '1000');
		const [m] = await acomptes();
		await expect(corriger(m.id, '2000')).rejects.toThrow(DERNIER_SEUL);
		await supprimerAcompteManuel(m.id);
		await expect(corriger(m.id, '2000')).rejects.toThrow("Cet acompte n'existe plus.");
		await expect(modifierAcompteManuel(m.id, '10')).rejects.toThrow("Cet acompte n'existe plus.");
	});

	it('correction concurrente : un certificat émis pendant le rendu la fait refuser sous verrou, rien d\'écrit', async () => {
		const r1 = await certificat(1, '5000');
		const pendant = vi.fn(async () => {
			await certificat(2, '8000');
			return new Uint8Array([1]);
		});
		await expect(corriger(r1.acompteId, '6000', { rendrePdf: pendant })).rejects.toThrow(DERNIER_SEUL);
		expect(await montantDe(r1.acompteId)).toBe('5000');
		expect(await prisma.document.count({ where: { serie: `CERTIFICAT:${r1.acompteId}` } })).toBe(1);
	});

	it('le lot change pendant le rendu : aucun certificat', async () => {
		const pendant = vi.fn(async () => {
			await prisma.lot.update({ where: { id: lotId }, data: { tauxTva: '10' } });
			return new Uint8Array([1]);
		});
		await expect(certificat(1, '1000', { rendrePdf: pendant })).rejects.toThrow('Les données ont changé pendant la génération');
		expect(await prisma.acompte.count()).toBe(0);
	});

	it('caution : gardée sur le lot, sans retenue sur les certificats suivants', async () => {
		await changerCaution(lotId, true);
		expect((await prisma.lot.findUniqueOrThrow({ where: { id: lotId } })).cautionBancaire).toBe(true);
		const r = await certificat(1, '1000');
		expect(await contenu(r.documentId)).toMatchObject({ caution: 'OUI', retenue: formatEuros('0'), mandate: formatEuros('1200') });
	});
});
```

Dans `src/domaine/fichiers.test.ts`, ajouter `nomFichierCertificat` à l'import et :

```ts
	it('certificat de paiement', () => {
		expect(nomFichierCertificat({ reference: 'FINANCIER', numero: '11', designation: 'PEINTURE', nature: 'GRE_A_GRE', numeroCertificat: 3, version: 2 }))
			.toBe('FINANCIER-Lot11-PEINTURE-Certificat03-v2.pdf');
	});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm test -- src/domaine/fichiers.test.ts && npm run test:int -- src/donnees/acomptes.int.test.ts`
Expected: FAIL — `nomFichierCertificat` et `./acomptes` introuvables.

- [ ] **Step 3: Nom de fichier et outils de génération partagés**

Dans `src/domaine/fichiers.ts`, après `nomFichierAvenant` :

```ts
export function nomFichierCertificat(p: { reference: string; numero: string | null; designation: string; nature: Nature; numeroCertificat: number; version: number }): string {
	return `${slugifier(p.reference)}-${prefixeLot(p.nature, p.numero)}-${slugifier(p.designation)}-Certificat${String(p.numeroCertificat).padStart(2, '0')}-v${p.version}.pdf`;
}
```

Dans `src/documents/generer.ts` :

1. Remplacer `type Dependances = …` par `export type Dependances = { maintenant?: Date; rendrePdf?: RendrePdf };`.
2. Avant `enregistrerVersion`, ajouter :

```ts
export const DONNEES_CHANGEES = 'Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour.';

/** HTML puis PDF ; un échec inattendu devient un message clair. Ni HTML, ni montant, ni nom de client dans le journal. */
export async function rendrePdfDocument(donnees: DonneesDocument, rendrePdf: RendrePdf): Promise<Uint8Array> {
	try {
		return await rendrePdf(await rendreHtml(donnees));
	} catch (e) {
		if (e instanceof ErreurMetier) throw e;
		console.error('[pdf] échec de génération', { type: donnees.type, erreur: e instanceof Error ? e.name : typeof e });
		throw new ErreurMetier("La génération du PDF a échoué. Réessayez ; si le problème persiste, prévenez l'administrateur.");
	}
}
```

3. Dans `enregistrerVersion`, remplacer le bloc `let pdf: Uint8Array; try { … } catch (e) { … }` par :

```ts
	const pdf = await rendrePdfDocument(p.donnees, p.rendrePdf);
```

et le message `'Les données ont changé pendant la génération. Relancez-la pour obtenir un document à jour.'` par `DONNEES_CHANGEES`.

- [ ] **Step 4: Les acomptes et les certificats**

Créer `src/donnees/acomptes.ts` :

```ts
import { z } from 'zod';
import { empreinteDocument } from '@/documents/batir';
import { batirCertificat, entreeCalcul, type SaisieCertificat, type SourceCertificat } from '@/documents/certificat';
import { DONNEES_CHANGEES, imprimerCertificat, rendrePdfDocument, type Dependances, type ResultatGeneration } from '@/documents/generer';
import type { DonneesCertificat } from '@/documents/schemas';
import { serieCertificat } from '@/documents/series';
import { sommeAvenants } from '@/domaine/avenants';
import {
	ACOMPTE_DISPARU, AUTRE_CERTIFICAT, calculerCertificat, CERTIFICAT_IMPOSSIBLE, CERTIFICATS_EXISTENT, certificatPossible,
	controlerCertificat, DERNIER_SEUL, lireCumul, lireMontantAcompte, MOIS_VALIDE, verifierDate, verifierMois, type CalculCertificat,
} from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';
import { nomFichierCertificat } from '@/domaine/fichiers';
import { formatMontantSaisie, htEngage } from '@/domaine/montants';
import { dateParis, versIso } from '@/domaine/semaines';
import type { Parametres, Prisma } from '@/generated/prisma/client';
import { versSaisieDate } from './chantiers';
import { PARAMETRES_PAR_DEFAUT } from './parametres';
import { prisma } from './prisma';
import { sousVerrouLot, type LotVerrouille, type Tx } from './verrouLot';

/** Les saisies de la feuille, en texte, telles que l'écran les envoie : le serveur recalcule tout (spec § 3). */
export const saisiesCertificatSchema = z.object({
	cumul: z.string().max(40),
	mois: z.string().regex(MOIS_VALIDE, 'Mois : choisissez un mois.'),
	date: z.string().max(10),
});
export type SaisiesCertificat = z.infer<typeof saisiesCertificatSchema>;

/** Ce que l'aperçu du certificat reçoit (Task 8). */
export type CertificatOuvert = {
	lotId: string;
	chantierId: string;
	source: SourceCertificat;
	/** Nouveau : mois et jour courants à Châteaubriant ; correction : les saisies du certificat. */
	saisies: SaisiesCertificat;
	/** Nul pour un nouveau certificat. */
	acompteId: string | null;
	/** Correction : la dernière version de sa série (« Générer la v2 »). */
	derniereVersion: number | null;
	/** Acomptes antérieurs saisissables (lot sans certificat), en texte de saisie ; sinon nul. */
	acomptesManuels: { id: string; saisie: string }[] | null;
	/** Ce qui empêche de générer, ou nul. */
	blocage: string | null;
};

const LOT_CERTIFICAT = {
	chantier: true,
	artisan: { select: { nom: true } },
	avenants: { orderBy: { numero: 'asc' as const }, select: { numero: true, montantHt: true } },
	acomptes: { orderBy: { numero: 'asc' as const } },
} satisfies Prisma.LotInclude;
type LotCertificat = Prisma.LotGetPayload<{ include: typeof LOT_CERTIFICAT }>;

/** `client` : `prisma` hors verrou, ou la transaction qui tient le verrou du lot. */
async function lireLot(lotId: string, client: Tx): Promise<{ lot: LotCertificat; parametres: Parametres }> {
	const lot = await client.lot.findUnique({ where: { id: lotId }, include: LOT_CERTIFICAT });
	if (!lot) throw new ErreurMetier('Lot introuvable.');
	return { lot, parametres: (await client.parametres.findUnique({ where: { id: 1 } })) ?? PARAMETRES_PAR_DEFAUT };
}

function possible(lot: LotCertificat): boolean {
	const avenants = lot.avenants.map((a) => ({ montantHt: a.montantHt.toString() }));
	return certificatPossible({ artisanId: lot.artisanId, htEngage: htEngage(lot.montantHtInitial.toString(), sommeAvenants(avenants)) });
}

/** Le certificat n° `numero` : les acomptes de numéro inférieur sont ses « acomptes précédents ». */
function sourceCertificat(lot: LotCertificat, p: Parametres, numero: number): SourceCertificat {
	const c = lot.chantier;
	return {
		numero,
		chantier: { maitreOuvrage: c.maitreOuvrage, natureTravaux: c.natureTravaux, adresse: c.adresse, cp: c.cp, commune: c.commune },
		lot: {
			numero: lot.numero, designation: lot.designation, entreprise: lot.artisan?.nom ?? null,
			htInitial: lot.montantHtInitial.toString(), tauxTva: lot.tauxTva.toString(), tauxRetenue: lot.retenueGarantie.toString(),
			caution: lot.cautionBancaire,
		},
		avenants: lot.avenants.map((a) => ({ numero: a.numero, montantHt: a.montantHt.toString() })),
		precedents: lot.acomptes
			.filter((a) => a.numero < numero)
			.map((a) => ({ id: a.id, numero: a.numero, montantHt: a.montantHt.toString(), manuel: a.manuel })),
		societe: {
			adresse: p.adresse, cp: p.cp, ville: p.ville, telephone: p.telephone, email: p.email,
			rcs: p.rcs, ape: p.ape, tvaIntracommunautaire: p.tvaIntracommunautaire, villeSignature: p.villeSignature,
		},
	};
}

function lireSaisies(s: SaisiesCertificat): SaisieCertificat & { cumul: NonNullable<SaisieCertificat['cumul']> } {
	return { cumul: lireCumul(s.cumul), mois: verifierMois(s.mois), date: verifierDate(s.date) };
}

/** Calcul contrôlé (présent acompte positif) puis feuille : exactement ce que le PDF imprimera. */
function construire(lot: LotCertificat, p: Parametres, numero: number, saisie: ReturnType<typeof lireSaisies>): { calcul: CalculCertificat; donnees: DonneesCertificat } {
	const source = sourceCertificat(lot, p, numero);
	const calcul = calculerCertificat(entreeCalcul(source, saisie.cumul));
	controlerCertificat(calcul);
	return { calcul, donnees: batirCertificat(source, saisie) };
}

const versDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const jsonDe = (d: DonneesCertificat) => d as unknown as Prisma.InputJsonValue;

export async function ouvrirNouveauCertificat(lotId: string, maintenant = new Date()): Promise<CertificatOuvert> {
	const { lot, parametres } = await lireLot(lotId, prisma);
	const jour = versIso(dateParis(maintenant));
	const sansCertificat = lot.acomptes.every((a) => a.manuel);
	return {
		lotId, chantierId: lot.chantierId,
		source: sourceCertificat(lot, parametres, lot.acomptes.length + 1),
		saisies: { cumul: '', mois: jour.slice(0, 7), date: jour },
		acompteId: null,
		derniereVersion: null,
		acomptesManuels: sansCertificat ? lot.acomptes.map((a) => ({ id: a.id, saisie: formatMontantSaisie(a.montantHt.toString()) })) : null,
		blocage: possible(lot) ? null : CERTIFICAT_IMPOSSIBLE,
	};
}

/** Seul le dernier certificat du lot se rouvre en édition ; les autres s'ouvrent tels qu'émis (page Documents). */
export async function ouvrirCorrection(acompteId: string): Promise<CertificatOuvert> {
	const a = await prisma.acompte.findUnique({ where: { id: acompteId } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	const { lot, parametres } = await lireLot(a.lotId, prisma);
	const dernier = !a.manuel && lot.acomptes.at(-1)?.id === acompteId;
	const version = await prisma.document.findFirst({ where: { serie: serieCertificat(acompteId) }, orderBy: { version: 'desc' }, select: { version: true } });
	return {
		lotId: a.lotId, chantierId: lot.chantierId,
		source: sourceCertificat(lot, parametres, a.numero),
		saisies: {
			cumul: a.cumulRealiseHt ? formatMontantSaisie(a.cumulRealiseHt.toString()) : '',
			mois: a.mois ?? '',
			date: versSaisieDate(a.date),
		},
		acompteId,
		derniereVersion: version?.version ?? null,
		acomptesManuels: null,
		blocage: dernier ? null : DERNIER_SEUL,
	};
}

/** Nouveau certificat : le numéro attendu doit être toujours le suivant, vérifié sous verrou (spec § 6). */
export async function genererCertificat(
	lotId: string,
	saisies: SaisiesCertificat & { numeroAttendu: number },
	utilisateurId: string,
	deps: Dependances = {},
): Promise<ResultatGeneration & { acompteId: string }> {
	const saisie = lireSaisies(saisies);
	const numero = saisies.numeroAttendu;
	const preparer = async (client: Tx) => {
		const { lot, parametres } = await lireLot(lotId, client);
		if (lot.acomptes.length + 1 !== numero) throw new ErreurMetier(AUTRE_CERTIFICAT);
		if (!possible(lot)) throw new ErreurMetier(CERTIFICAT_IMPOSSIBLE);
		return { lot, ...construire(lot, parametres, numero, saisie) };
	};
	const avant = await preparer(prisma);
	const emp = empreinteDocument(avant.donnees);
	const pdf = await rendrePdfDocument(avant.donnees, deps.rendrePdf ?? imprimerCertificat);
	return sousVerrouLot(lotId, async (tx) => {
		const { lot, calcul, donnees } = await preparer(tx);
		if (empreinteDocument(donnees) !== emp) throw new ErreurMetier(DONNEES_CHANGEES);
		const acompte = await tx.acompte.create({
			data: {
				lotId, numero, montantHt: calcul.presentHt.toFixed(2), manuel: false,
				cumulRealiseHt: calcul.realiseHt.toFixed(2), mois: saisie.mois, date: versDate(saisie.date),
			},
		});
		const nomFichier = nomFichierCertificat({
			reference: lot.chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature, numeroCertificat: numero, version: 1,
		});
		const doc = await tx.document.create({
			data: {
				chantierId: lot.chantierId, lotId, serie: serieCertificat(acompte.id), type: 'CERTIFICAT_PAIEMENT', version: 1,
				donnees: jsonDe(donnees), empreinte: emp, pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
			},
		});
		return { documentId: doc.id, version: 1, nomFichier, nouvelle: true, acompteId: acompte.id };
	});
}

/** Correction du dernier certificat : même numéro, nouvelle version ; aucune si rien n'a changé (règle du Socle). */
export async function corrigerCertificat(acompteId: string, saisies: SaisiesCertificat, utilisateurId: string, deps: Dependances = {}): Promise<ResultatGeneration> {
	const saisie = lireSaisies(saisies);
	const a = await prisma.acompte.findUnique({ where: { id: acompteId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	const preparer = async (client: Tx) => {
		const { lot, parametres } = await lireLot(a.lotId, client);
		const acompte = lot.acomptes.find((x) => x.id === acompteId);
		if (!acompte) throw new ErreurMetier(ACOMPTE_DISPARU);
		if (acompte.manuel || lot.acomptes.at(-1)?.id !== acompteId) throw new ErreurMetier(DERNIER_SEUL);
		return { lot, acompte, ...construire(lot, parametres, acompte.numero, saisie) };
	};
	const avant = await preparer(prisma);
	const serie = { chantierId: avant.lot.chantierId, serie: serieCertificat(acompteId) };
	const emp = empreinteDocument(avant.donnees);
	const identique = (d: { id: string; version: number; nomFichier: string; empreinte: string } | null) =>
		d?.empreinte === emp ? { documentId: d.id, version: d.version, nomFichier: d.nomFichier, nouvelle: false } : null;
	const dejaLa = identique(await prisma.document.findFirst({ where: serie, orderBy: { version: 'desc' } }));
	if (dejaLa) return dejaLa;
	const pdf = await rendrePdfDocument(avant.donnees, deps.rendrePdf ?? imprimerCertificat);
	return sousVerrouLot(a.lotId, async (tx) => {
		const { lot, acompte, calcul, donnees } = await preparer(tx);
		if (empreinteDocument(donnees) !== emp) throw new ErreurMetier(DONNEES_CHANGEES);
		const courante = await tx.document.findFirst({ where: serie, orderBy: { version: 'desc' } });
		const memeVersion = identique(courante);
		if (memeVersion) return memeVersion;
		const version = (courante?.version ?? 0) + 1;
		await tx.acompte.update({
			where: { id: acompteId },
			data: { montantHt: calcul.presentHt.toFixed(2), cumulRealiseHt: calcul.realiseHt.toFixed(2), mois: saisie.mois, date: versDate(saisie.date) },
		});
		const nomFichier = nomFichierCertificat({
			reference: lot.chantier.reference, numero: lot.numero, designation: lot.designation, nature: lot.nature,
			numeroCertificat: acompte.numero, version,
		});
		const doc = await tx.document.create({
			data: {
				...serie, lotId: a.lotId, type: 'CERTIFICAT_PAIEMENT', version,
				donnees: jsonDe(donnees), empreinte: emp, pdf: new Uint8Array(pdf), nomFichier, creeParId: utilisateurId,
			},
		});
		return { documentId: doc.id, version, nomFichier, nouvelle: true };
	});
}

function verifierSansCertificat(lot: LotVerrouille): void {
	if (lot.acomptes.some((a) => !a.manuel)) throw new ErreurMetier(CERTIFICATS_EXISTENT);
}

async function lotDeLAcompte(acompteId: string): Promise<string> {
	const a = await prisma.acompte.findUnique({ where: { id: acompteId }, select: { lotId: true } });
	if (!a) throw new ErreurMetier(ACOMPTE_DISPARU);
	return a.lotId;
}

/** Acompte antérieur à l'application (reprise d'un chantier en cours) : numéro suivant, tant qu'aucun certificat. */
export async function ajouterAcompteManuel(lotId: string, saisie: string): Promise<{ chantierId: string }> {
	const montant = lireMontantAcompte(saisie);
	return sousVerrouLot(lotId, async (tx, lot) => {
		verifierSansCertificat(lot);
		await tx.acompte.create({ data: { lotId, numero: lot.acomptes.length + 1, montantHt: montant.toFixed(2), manuel: true } });
		return { chantierId: lot.chantierId };
	});
}

export async function modifierAcompteManuel(acompteId: string, saisie: string): Promise<{ chantierId: string }> {
	const montant = lireMontantAcompte(saisie);
	return sousVerrouLot(await lotDeLAcompte(acompteId), async (tx, lot) => {
		verifierSansCertificat(lot);
		if (!lot.acomptes.some((a) => a.id === acompteId)) throw new ErreurMetier(ACOMPTE_DISPARU);
		await tx.acompte.update({ where: { id: acompteId }, data: { montantHt: montant.toFixed(2) } });
		return { chantierId: lot.chantierId };
	});
}

/** Les suivants reculent d'un numéro, un par un dans l'ordre croissant : l'unicité (lot, numéro) tient à chaque ligne. */
export async function supprimerAcompteManuel(acompteId: string): Promise<{ chantierId: string }> {
	return sousVerrouLot(await lotDeLAcompte(acompteId), async (tx, lot) => {
		verifierSansCertificat(lot);
		const supprime = lot.acomptes.find((a) => a.id === acompteId);
		if (!supprime) throw new ErreurMetier(ACOMPTE_DISPARU);
		await tx.acompte.delete({ where: { id: acompteId } });
		for (const a of lot.acomptes.filter((x) => x.numero > supprime.numero)) {
			await tx.acompte.update({ where: { id: a.id }, data: { numero: a.numero - 1 } });
		}
		return { chantierId: lot.chantierId };
	});
}

/** Donnée du lot, enregistrée aussitôt : elle vaut pour les certificats suivants, même si l'aperçu est fermé sans générer. */
export async function changerCaution(lotId: string, caution: boolean): Promise<{ chantierId: string }> {
	return sousVerrouLot(lotId, async (tx, lot) => {
		await tx.lot.update({ where: { id: lotId }, data: { cautionBancaire: caution } });
		return { chantierId: lot.chantierId };
	});
}
```

Dans `src/domaine/certificats.ts` rien ne change ; `lireSaisies` s'appuie sur `lireCumul` (qui refuse un cumul vide), `verifierMois` et `verifierDate` de la Task 1.

- [ ] **Step 5: Les actions**

Créer `src/actions/certificats.ts` :

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ResultatGeneration } from '@/documents/generer';
import {
	ajouterAcompteManuel, changerCaution, corrigerCertificat, genererCertificat, modifierAcompteManuel, saisiesCertificatSchema,
	supprimerAcompteManuel, type SaisiesCertificat,
} from '@/donnees/acomptes';
import { prisma } from '@/donnees/prisma';
import { executer, type Resultat } from './executer';

const rafraichir = (chantierId: string) => revalidatePath(`/chantiers/${chantierId}`, 'layout');
const chantierDu = async (documentId: string) =>
	(await prisma.document.findUniqueOrThrow({ where: { id: documentId }, select: { chantierId: true } })).chantierId;
const id = z.string().min(1);
const nouveauSchema = saisiesCertificatSchema.extend({ numeroAttendu: z.number().int().min(1) });

export async function genererCertificatAction(lotId: string, saisies: SaisiesCertificat & { numeroAttendu: number }): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const { acompteId: _acompte, ...r } = await genererCertificat(id.parse(lotId), nouveauSchema.parse(saisies), u.id);
		rafraichir(await chantierDu(r.documentId));
		return r;
	});
}

export async function corrigerCertificatAction(acompteId: string, saisies: SaisiesCertificat): Promise<Resultat<ResultatGeneration>> {
	return executer({}, async (u) => {
		const r = await corrigerCertificat(id.parse(acompteId), saisiesCertificatSchema.parse(saisies), u.id);
		rafraichir(await chantierDu(r.documentId));
		return r;
	});
}

export async function ajouterAcompteManuelAction(lotId: string, saisie: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await ajouterAcompteManuel(id.parse(lotId), z.string().max(40).parse(saisie))).chantierId);
		return null;
	});
}

export async function modifierAcompteManuelAction(acompteId: string, saisie: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await modifierAcompteManuel(id.parse(acompteId), z.string().max(40).parse(saisie))).chantierId);
		return null;
	});
}

export async function supprimerAcompteManuelAction(acompteId: string): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await supprimerAcompteManuel(id.parse(acompteId))).chantierId);
		return null;
	});
}

export async function changerCautionAction(lotId: string, caution: boolean): Promise<Resultat> {
	return executer({}, async () => {
		rafraichir((await changerCaution(id.parse(lotId), z.boolean().parse(caution))).chantierId);
		return null;
	});
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npx tsc --noEmit && npm test -- src/domaine && npm run test:int -- src/donnees/acomptes.int.test.ts src/documents`
Expected: aucune erreur ; PASS, y compris les tests de génération du Socle et du Planning (le rendu du PDF a seulement changé de fonction).

- [ ] **Step 7: Commit**

```bash
git add src/donnees/acomptes.ts src/actions/certificats.ts src/documents/generer.ts src/domaine/fichiers.ts src/domaine/fichiers.test.ts src/donnees/acomptes.int.test.ts
git commit -m "feat(financier): certificats générés et corrigés sous verrou du lot, acomptes antérieurs, caution"
```

---
### Task 8: Écran Marchés : avenants du panneau, lettre, aperçu du certificat

**Files:**
- Create: `src/composants/ApercuCertificat.tsx`, `e2e/preparer-financier.ts`, `e2e/financier.spec.ts`
- Modify: `src/donnees/marches.ts`, `src/donnees/marches.int.test.ts`, `src/composants/PanneauLot.tsx`, `src/composants/ApercuDocument.tsx`, `src/app/(app)/chantiers/[id]/marches/page.tsx`, `package.json`

**Interfaces:**
- Consumes: `numeroAvenantTexte`, `confirmationSuppression`, `manquesAvenant`, `LIBELLES_MANQUES_AVENANT` (Task 1) ; `CERTIFICAT_IMPOSSIBLE`, `lireCumul`, `calculerCertificat`, `alerteCertificat`, `PRESENT_NON_POSITIF` (Task 1) ; `ajouterAvenantAction`, `modifierAvenantAction`, `supprimerAvenantAction` (Task 4) ; `construireDonneesAvenant`, `genererAvenantAction` (Task 5) ; `batirCertificat`, `entreeCalcul`, `CertificatPaiement`, `EditionCertificat` (Task 6) ; `ouvrirNouveauCertificat`, `ouvrirCorrection`, `CertificatOuvert` et les actions des certificats (Task 7) ; `telecharger` (`e2e/aidePlanning.ts`, Planning) ; `ADMIN`, `seConnecter` (`e2e/aide.ts`).
- Produces:
  - `LotVue.avenants: { id: string; numero: number; devis: string; montantHt: string; date: string }[]` (date `AAAA-MM-JJ`) ; `LotVue.certificat: { possible: boolean; dernier: { id: string; numero: number } | null }`
  - paramètres d'URL de l'onglet Marchés : `?avenant=<avenantId>` (lettre), `?certificat=<lotId>` (nouveau certificat), `?corriger=<acompteId>` (correction du dernier)
  - `ApercuDocument` : `source` accepte `{ type: 'avenant'; avenantId: string }`
  - `ApercuCertificat({ ouvert: CertificatOuvert; sousTitre: string })` : `div[role=dialog]` nommé « Certificat de paiement »
  - chantier E2E `FINANCIER` (copie de PERRIER) ; `e2e/financier.spec.ts` (étapes 1 à 4 de la spec, § 9)

L'aperçu du certificat recalcule la feuille à chaque frappe (`batirCertificat` et `calculerCertificat`, module pur de la Task 6). Le cumul, le mois et la date sont des champs contrôlés de l'aperçu : ils ne partent au serveur qu'à la génération et se perdent si l'on ferme. La caution et les acomptes antérieurs sont des données du lot : chaque clic ou chaque champ quitté les enregistre, puis `router.refresh()` rapporte la source recalculée par le serveur (numéro du certificat compris) sans toucher aux trois saisies.

- [ ] **Step 1: Écrire le parcours E2E (étapes 1 à 4)**

Créer `e2e/preparer-financier.ts` (lancé par `npm run e2e:serveur`, contre la base E2E) :

```ts
import 'dotenv/config';
import { prisma } from '../src/donnees/prisma';
import { PERRIER_ARTISANS, PERRIER_CHANTIER, PERRIER_LOTS } from '../tests/fixtures/perrier';

/** Chantier `FINANCIER` : une copie de PERRIER pour le parcours du suivi financier (spec § 9). */
const REFERENCE = 'FINANCIER';

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
	console.log(`Suivi financier E2E : chantier ${REFERENCE} prêt.`);
}

main()
	.catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
```

Dans `package.json`, ajouter `tsx e2e/preparer-financier.ts` après `tsx e2e/preparer-planning.ts` dans `e2e:serveur` :

```json
    "e2e:serveur": "dotenv -e .env.test -- sh -c 'export E2E=1 && node scripts/reinitialiser-base-test.mjs && tsx prisma/seed.ts && tsx e2e/preparer-planning.ts && tsx e2e/preparer-financier.ts && next build && next start -p 3100'"
```

Créer `e2e/financier.spec.ts` :

```ts
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';
import { telecharger } from './aidePlanning';

/** Les espaces de formatEuros : fine insécable entre les milliers, insécable avant « € ». */
const saisie = (s: string) => s.replace(/ /g, ' ');
const eur = (s: string) => `${saisie(s)} €`;

const lignePeinture = (page: Page) => page.locator('tr[data-lot="PEINTURE"]');

async function ouvrirPanneau(page: Page) {
	await lignePeinture(page).locator('td').nth(2).click();
	const panneau = page.getByRole('dialog', { name: 'PEINTURE' });
	await expect(panneau).toBeVisible();
	return panneau;
}

// Spec § 9 : PEINTURE (LA DÉCO'TECH), HT initial 9 450,00 €, TVA 20 %, retenue 5 %.
test('avenant, lettre, acomptes antérieurs, certificat et correction', async ({ page }) => {
	test.setTimeout(180_000);
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.getByRole('link', { name: 'FINANCIER', exact: true }).click();
	await expect(page).toHaveURL(/\/marches$/);
	const ttc = lignePeinture(page).getByLabel('Montant TTC');
	await expect(ttc).toHaveValue(saisie('11 340,00'));

	// 0. Le marché de PEINTURE existe avant l'avenant.
	let panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Ouvrir le marché' }).click();
	const marche = page.getByRole('dialog', { name: 'Marché de travaux de gré à gré' });
	expect(await telecharger(page, () => marche.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Marche-v1.pdf');
	await marche.getByRole('button', { name: 'Fermer' }).click();
	await expect(marche).toBeHidden();

	// 1. Avenant n° 01 de −300,00 € HT : le TTC du tableau passe à 10 980,00 €.
	panneau = await ouvrirPanneau(page);
	await expect(panneau).toContainText("Aucun avenant. Le marché vaut son montant d'origine.");
	await panneau.getByRole('button', { name: 'Ajouter un avenant' }).click();
	await expect(page.getByText('Avenant n° 01 ajouté — saisissez son montant.')).toBeVisible();
	const montant = panneau.getByLabel("Montant HT de l'avenant n° 01");
	await montant.fill('-300');
	await montant.press('Enter');
	await expect(ttc).toHaveValue(saisie('10 980,00'));
	await expect(panneau.getByTestId('somme-avenants')).toHaveText(`− ${eur('300,00')}`);
	await expect(panneau).toContainText('Montant initial HT');

	// 2. La lettre : l'objet s'écrit sur la feuille, puis la v1.
	await panneau.getByRole('link', { name: "Ouvrir la lettre de l'avenant n° 01" }).click();
	const lettre = page.getByRole('dialog', { name: 'Avenant n° 01' });
	await expect(lettre).toContainText('Travaux en moins-value');
	await expect(lettre).toContainText(`${eur('360,00')} TTC`);
	await expect(lettre).toContainText(`${eur('10 980,00')} TTC`);
	const objet = lettre.getByRole('textbox', { name: "Objet de l'avenant" });
	await objet.click();
	await objet.pressSequentially('Suppression des peintures du garage.');
	expect(await telecharger(page, () => lettre.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Avenant01-v1.pdf');
	await lettre.getByRole('button', { name: 'Fermer' }).click();
	await expect(lettre).toBeHidden();

	// 3. Deux acomptes antérieurs, puis le certificat n° 03 : cumul 7 000,00 € HT, caution OUI.
	panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Certificat de paiement' }).click();
	const cp = page.getByRole('dialog', { name: 'Certificat de paiement' });
	await expect(cp).toContainText('CERTIFICAT DE PAIEMENT N° 01');
	for (const [i, [frappe, valeur]] of ([['2000', '2 000,00'], ['3000', '3 000,00']] as const).entries()) {
		const ajout = cp.getByLabel('Ajouter un acompte antérieur');
		await ajout.fill(frappe);
		await ajout.press('Enter');
		await expect(cp.getByLabel(`Acompte ${i + 1} HT`)).toHaveValue(saisie(valeur));
	}
	await expect(cp).toContainText('CERTIFICAT DE PAIEMENT N° 03');
	await cp.getByLabel('Montant des travaux réalisés HT (cumul)').fill('7000');
	await cp.getByRole('button', { name: 'Caution bancaire : non' }).click();
	await expect(cp.getByRole('button', { name: 'Caution bancaire : oui' })).toBeVisible();
	const titulaire = (libelle: string) => cp.locator('table.cp-titu tr', { hasText: libelle });
	await expect(cp.locator('.cp-montants')).toContainText(eur('9 150,00'));
	await expect(cp.locator('table.cp-prec')).toContainText(eur('5 000,00'));
	await expect(titulaire('Montant du présent acompte HT')).toContainText(eur('2 000,00'));
	await expect(titulaire('Montant de la TVA')).toContainText(eur('400,00'));
	await expect(titulaire('Montant du présent acompte TTC')).toContainText(eur('2 400,00'));
	await expect(titulaire('Dont retenue de garantie')).toContainText(eur('0,00'));
	await expect(cp.locator('.cp-somme')).toHaveText(eur('2 400,00'));
	expect(await telecharger(page, () => cp.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Certificat03-v1.pdf');
	await expect(cp).toBeHidden();

	// 4. Correction du n° 03 : cumul 7 500,00 € → présent acompte 2 500,00 HT, mandaté 3 000,00 € ; v2.
	panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Corriger le certificat n° 03' }).click();
	const cumul = cp.getByLabel('Montant des travaux réalisés HT (cumul)');
	await expect(cumul).toHaveValue(saisie('7 000,00'));
	await cumul.fill('7500');
	await expect(titulaire('Montant du présent acompte HT')).toContainText(eur('2 500,00'));
	await expect(cp.locator('.cp-somme')).toHaveText(eur('3 000,00'));
	expect(await telecharger(page, () => cp.getByRole('button', { name: 'Générer la v2' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Certificat03-v2.pdf');
	await expect(cp).toBeHidden();
});
```

Dans `src/donnees/marches.int.test.ts`, ajouter l'import `import { insererPerrier } from '../../tests/integration/perrier';` et, dans le `describe` :

```ts
	it('le lot porte ses avenants et l\'état de ses certificats', async () => {
		const p = await insererPerrier();
		const lotId = p.lots.PEINTURE;
		await prisma.avenant.create({ data: { lotId, numero: 2, montantHt: '-300', devis: 'D-7', date: new Date('2026-05-12T00:00:00Z') } });
		await prisma.acompte.create({ data: { lotId, numero: 1, montantHt: '2000', manuel: true } });
		const certificat = await prisma.acompte.create({ data: {
			lotId, numero: 2, montantHt: '1000', cumulRealiseHt: '3000', mois: '2026-07', date: new Date('2026-09-30T00:00:00Z'),
		} });
		const vue = await lireVueMarches(p.chantierId);
		expect(vue.lots.find((l) => l.id === lotId)).toMatchObject({
			avenants: [{ numero: 2, devis: 'D-7', montantHt: '-300', date: '2026-05-12' }],
			certificat: { possible: true, dernier: { id: certificat.id, numero: 2 } },
		});
		expect(vue.lots.find((l) => l.designation === 'ENDUIT EXTÉRIEUR')?.certificat).toEqual({ possible: false, dernier: null });
		expect(vue.lots.find((l) => l.designation === 'GROS ŒUVRE')?.certificat).toEqual({ possible: true, dernier: null });
	});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/donnees/marches.int.test.ts && npm run test:e2e -- e2e/financier.spec.ts`
Expected: FAIL — `avenants` et `certificat` absents de la vue ; le panneau n'a pas de bouton « Ajouter un avenant ».

- [ ] **Step 3: La vue des marchés**

Dans `src/donnees/marches.ts` :

1. Ajouter l'import `import { certificatPossible } from '@/domaine/certificats';` et, avant `lireVueMarches` :

```ts
/** Le dernier acompte du lot, s'il est un certificat : lui seul se corrige. */
function dernierCertificat(acomptes: { id: string; numero: number; manuel: boolean }[]): { id: string; numero: number } | null {
	const d = acomptes.at(-1);
	return d && !d.manuel ? { id: d.id, numero: d.numero } : null;
}
```
2. Dans `LotVue`, après `sommeAvenants: string; htEngage: string; ttcEngage: string; manques: Manque[];`, ajouter :

```ts
	/** Triés par numéro ; `date` au format des champs de saisie (AAAA-MM-JJ). */
	avenants: { id: string; numero: number; devis: string; montantHt: string; date: string }[];
	/** `dernier` : le dernier acompte du lot s'il est un certificat (lui seul se corrige). */
	certificat: { possible: boolean; dernier: { id: string; numero: number } | null };
```

3. Dans la requête, compléter l'`include` des lots :

```ts
			include: { lots: { orderBy: { ordre: 'asc' }, include: {
				artisan: true,
				avenants: { orderBy: { numero: 'asc' } },
				acomptes: { orderBy: { numero: 'asc' }, select: { id: true, numero: true, manuel: true } },
			} } },
```

4. Dans l'objet renvoyé par `c.lots.map`, après `manques: …`, ajouter :

```ts
			avenants: l.avenants.map((a) => ({
				id: a.id, numero: a.numero, devis: a.devis, montantHt: a.montantHt.toString(), date: versSaisieDate(a.date),
			})),
			certificat: {
				possible: certificatPossible({ artisanId: l.artisanId, htEngage: htEngage(ht, somme) }),
				dernier: dernierCertificat(l.acomptes),
			},
```

Run: `npm run test:int -- src/donnees/marches.int.test.ts`
Expected: PASS.

- [ ] **Step 4: Le panneau du lot**

Remplacer `src/composants/PanneauLot.tsx` par :

```tsx
'use client';

import Decimal from 'decimal.js';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
import { changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie, formatTauxSaisie, htEngage } from '@/domaine/montants';
import { formatDateCalendaire, LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';
import { MenuArtisan } from './MenuArtisan';

/** « + 850,00 € » ou « − 300,00 € » (spec § 5). */
function signe(v: string): string {
	const d = new Decimal(v);
	return `${d.isNegative() && !d.isZero() ? '−' : '+'} ${formatEuros(d.abs())}`;
}

type Avenant = LotVue['avenants'][number];

export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarches; onFermer: () => void }) {
	const [enCours, demarrer] = useTransition();
	const artisan = vue.artisans.find((a) => a.id === lot.artisanId);
	const champ = (c: 'montantHt' | 'tauxTva' | 'montantTtc' | 'retenueGarantie' | 'dateSignature') => modifierChampLotAction.bind(null, lot.id, c);
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, apres?: () => void) => demarrer(async () => {
		const r = await fn();
		if (r.ok) apres?.();
		else toast.error(r.erreur);
	});
	const dateChantier = vue.dateSignatureChantier ? formatDateCalendaire(new Date(`${vue.dateSignatureChantier}T00:00:00Z`)) : 'non fixée';
	const avecAvenants = lot.avenants.length > 0;

	function ajouterAvenant() {
		demarrer(async () => {
			const r = await ajouterAvenantAction(lot.id);
			if (r.ok) toast.success(r.donnees.message);
			else toast.error(r.erreur);
		});
	}

	function supprimerAvenant(a: Avenant) {
		const autres = lot.avenants.filter((x) => x.id !== a.id);
		if (!window.confirm(confirmationSuppression(a.numero, lot.htInitial, autres))) return;
		agir(() => supprimerAvenantAction(a.id));
	}

	return (
		<Sheet open onOpenChange={(ouvert) => { if (!ouvert) onFermer(); }}>
			<SheetContent className="w-[34rem] overflow-y-auto sm:max-w-[34rem]">
				<SheetHeader>
					<SheetDescription>{lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'}</SheetDescription>
					<SheetTitle>{lot.designation}</SheetTitle>
				</SheetHeader>
				<div className="space-y-6 p-4 text-sm">
					<div className="flex gap-2" role="radiogroup" aria-label="Nature du marché">
						{(['GRE_A_GRE', 'SOUS_TRAITANCE'] as const).map((n) => (
							<Button key={n} size="sm" role="radio" aria-checked={lot.nature === n} variant={lot.nature === n ? 'default' : 'outline'}
								disabled={enCours} onClick={() => lot.nature !== n && agir(() => changerNatureAction(lot.id, n))}>
								{n === 'GRE_A_GRE' ? 'Gré à gré' : 'Sous-traitance'}
							</Button>
						))}
					</div>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entreprise</h3>
						<MenuArtisan lotId={lot.id} artisanId={lot.artisanId} artisans={vue.artisans} />
						{artisan && (
							<dl className="grid grid-cols-[7rem_1fr] gap-1 text-xs">
								<dt className="text-muted-foreground">Adresse</dt><dd>{artisan.adresseComplete || '—'}</dd>
								<dt className="text-muted-foreground">Interlocuteur</dt><dd>{artisan.interlocuteur || '—'}</dd>
								<dt className="text-muted-foreground">Téléphone</dt><dd className="font-mono">{artisan.telephone || '—'}</dd>
							</dl>
						)}
					</section>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marché</h3>
						<dl className="grid grid-cols-[9rem_1fr] items-center gap-x-3 gap-y-1">
							<dt>{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</dt>
							<dd><ChampEnLigne libelle="Montant HT du marché" alignement="droite" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
							<dt>T.V.A. (%)</dt>
							<dd><ChampEnLigne libelle="Taux de T.V.A." alignement="droite" valeur={formatTauxSaisie(lot.tauxTva)} enregistrer={champ('tauxTva')} /></dd>
							{avecAvenants && (
								<>
									<dt>Avenants</dt>
									<dd className="px-1.5 text-right font-mono tabular-nums" data-testid="somme-avenants">{signe(lot.sommeAvenants)}</dd>
								</>
							)}
							<dt className="font-semibold">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</dt>
							<dd>
								<ChampEnLigne libelle="Montant TTC du marché" alignement="droite" className="font-semibold" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
								{avecAvenants && <p className="px-1.5 text-right text-xs text-muted-foreground">avenants compris : le montant initial HT est recalculé</p>}
							</dd>
							<dt>Retenue de garantie (%)</dt>
							<dd className="flex items-center gap-2">
								<ChampEnLigne libelle="Taux de retenue de garantie" alignement="droite" valeur={formatTauxSaisie(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
								<span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
							</dd>
							<dt>Exemplaires</dt>
							<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
							<dt>Signé le</dt>
							<dd>
								<ChampEnLigne libelle="Date de signature de ce marché" type="date" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
								{!lot.dateSignature && <p className="px-1.5 text-xs text-muted-foreground">à défaut, {dateChantier} — la date du chantier</p>}
							</dd>
						</dl>
					</section>

					<section className="space-y-2">
						{lot.manques.length > 0 && (
							<p className="text-xs text-muted-foreground">Pour générer le marché : {lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.</p>
						)}
						<div className="flex gap-2">
							{lot.manques.length > 0 ? (
								<Button disabled>Ouvrir le marché</Button>
							) : (
								<Link href={`?apercu=${lot.id}`} scroll={false} className={buttonVariants()} onClick={onFermer}>Ouvrir le marché</Link>
							)}
							<Button variant="destructive" disabled={enCours} onClick={() => agir(() => supprimerLotAction(lot.id), onFermer)}>Supprimer le lot</Button>
						</div>
					</section>

					<section className="space-y-2">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avenants</h3>
							<Button size="sm" variant="outline" disabled={enCours} onClick={ajouterAvenant}>Ajouter un avenant</Button>
						</div>
						{avecAvenants ? (
							<table className="w-full text-xs">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="w-8 py-1">N°</th><th className="py-1">Devis</th>
										<th className="w-28 py-1 text-right">Montant HT</th><th className="w-32 py-1">Date</th><th />
									</tr>
								</thead>
								<tbody>
									{lot.avenants.map((a) => {
										const n = numeroAvenantTexte(a.numero);
										return (
											<tr key={a.id} data-avenant={n} className="border-t">
												<td className="py-1 font-mono">{n}</td>
												<td><ChampEnLigne libelle={`Devis de l'avenant n° ${n}`} placeholder="n° du devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
												<td><ChampEnLigne libelle={`Montant HT de l'avenant n° ${n}`} alignement="droite" valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
												<td><ChampEnLigne libelle={`Date de l'avenant n° ${n}`} type="date" valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
												<td className="whitespace-nowrap text-right">
													<Link href={`?avenant=${a.id}`} scroll={false} onClick={onFermer} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}
														className={buttonVariants({ size: 'sm', variant: 'ghost' })}>Ouvrir</Link>
													<Button size="sm" variant="ghost" disabled={enCours} aria-label={`Supprimer l'avenant n° ${n}`} onClick={() => supprimerAvenant(a)}>Supprimer</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<p className="text-xs text-muted-foreground">Aucun avenant. Le marché vaut son montant d&apos;origine.</p>
						)}
						<p className="text-xs text-muted-foreground">
							Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine ; c&apos;est l&apos;avenant qui porte la différence.
						</p>
					</section>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certificats de paiement</h3>
						{!lot.certificat.possible && <p className="text-xs text-muted-foreground">{CERTIFICAT_IMPOSSIBLE}</p>}
						<div className="flex flex-wrap gap-2">
							{lot.certificat.possible ? (
								<Link href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer} className={buttonVariants({ variant: 'outline' })}>Certificat de paiement</Link>
							) : (
								<Button variant="outline" disabled>Certificat de paiement</Button>
							)}
							{lot.certificat.dernier && (
								<Link href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer} className={buttonVariants({ variant: 'outline' })}>
									{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
								</Link>
							)}
						</div>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
```

Si le fichier livré par le Socle diffère de ce texte hors des parties Marché, Avenants et Certificats (ordre des sections, libellés), garder ses différences et n'appliquer que ces ajouts.

- [ ] **Step 5: La lettre dans l'aperçu des documents**

Dans `src/composants/ApercuDocument.tsx` :

1. Compléter les imports :

```tsx
import { genererAvenantAction, genererMarcheAction, genererRecapAction } from '@/actions/documents';
import { modifierAvenantAction } from '@/actions/avenants';
import type { Resultat } from '@/actions/executer';
```

(le premier remplace l'import existant de `@/actions/documents`).

2. Remplacer le type `Source` par :

```tsx
type Source =
	| { type: 'marche'; lotId: string } | { type: 'avenant'; avenantId: string }
	| { type: 'recap'; chantierId: string } | { type: 'version'; documentId: string };
```

3. Remplacer le début de `saisir` (jusqu'à la création de `enregistrement` incluse) par :

```tsx
	function saisir(cle: CleZone, texte: string) {
		// La lettre d'avenant n'a qu'une zone, son objet ; le marché écrit dans le lot.
		let envoi: Promise<Resultat> | null = null;
		if (source.type === 'marche' && cle !== 'objet') envoi = modifierChampLotAction(source.lotId, cle, texte);
		if (source.type === 'avenant' && cle === 'objet') envoi = modifierAvenantAction(source.avenantId, 'objet', texte);
		if (!envoi) return;
		const enregistrement = envoi.then((r) => {
			if (!r.ok) toast.error(r.erreur);
			return r;
		});
```

(les deux lignes suivantes, qui ajoutent `enregistrement` à `enregistrements.current` et l'en retirent à la fin, ne changent pas).

4. Dans `generer`, remplacer le choix de l'action par :

```tsx
			const r = source.type === 'marche' ? await genererMarcheAction(source.lotId)
				: source.type === 'avenant' ? await genererAvenantAction(source.avenantId)
					: source.type === 'recap' ? await genererRecapAction(source.chantierId) : null;
```

5. Dans le rendu, avant le `return`, ajouter `const ecrit = source.type === 'marche' || source.type === 'avenant';`, puis remplacer :
   - `{source.type === 'marche' && (` (texte des zones bleues) par `{ecrit && (`, et le texte par `Les zones bleues s&apos;écrivent directement sur {source.type === 'avenant' ? 'la lettre' : 'le marché'} — le bleu ne s&apos;imprime pas.` ;
   - `Pour générer ce marché : {manques.join(', ')}.` par `Pour générer {source.type === 'avenant' ? 'cette lettre' : 'ce marché'} : {manques.join(', ')}.` ;
   - dans la branche qui rend `<Gabarit … />` (celle qui n'est pas la feuille unique du planning), `mode={source.type === 'marche' ? 'edition' : 'lecture'}` par `mode={ecrit ? 'edition' : 'lecture'}`.

- [ ] **Step 6: L'aperçu du certificat**

Créer `src/composants/ApercuCertificat.tsx` :

```tsx
'use client';

import type Decimal from 'decimal.js';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ajouterAcompteManuelAction, changerCautionAction, corrigerCertificatAction, genererCertificatAction,
	modifierAcompteManuelAction, supprimerAcompteManuelAction,
} from '@/actions/certificats';
import type { Resultat } from '@/actions/executer';
import { Button } from '@/components/ui/button';
import { batirCertificat, entreeCalcul } from '@/documents/certificat';
import { CertificatPaiement, type EditionCertificat } from '@/documents/gabarits/CertificatPaiement';
import { TITRES_TYPES } from '@/documents/libelles';
import { CSS_DOCUMENTS } from '@/documents/styles';
import type { CertificatOuvert } from '@/donnees/acomptes';
import { alerteCertificat, calculerCertificat, lireCumul, PRESENT_NON_POSITIF } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';

/** Le cumul tel que le serveur le lira : nul tant qu'il est vide, message s'il est illisible. */
function lireSaisieCumul(texte: string): { cumul: Decimal | null; erreur: string | null } {
	if (!texte.trim()) return { cumul: null, erreur: null };
	try {
		return { cumul: lireCumul(texte), erreur: null };
	} catch (e) {
		if (e instanceof ErreurMetier) return { cumul: null, erreur: e.message };
		throw e;
	}
}

/** Téléchargement sans quitter la page (l'aperçu se ferme juste après). */
function telecharger(documentId: string) {
	const lien = document.createElement('a');
	lien.href = `/api/documents/${documentId}/pdf`;
	lien.download = '';
	lien.click();
}

/**
 * Aperçu plein écran du certificat (spec § 6) : la feuille se recalcule à la frappe avec les règles du domaine ;
 * seules les saisies partent au serveur, qui recalcule tout. Cumul, mois et date vivent ici et se perdent à la
 * fermeture ; la caution et les acomptes antérieurs sont des données du lot, enregistrées aussitôt.
 */
export function ApercuCertificat({ ouvert, sousTitre }: { ouvert: CertificatOuvert; sousTitre: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const [cumul, setCumul] = useState(ouvert.saisies.cumul);
	const [mois, setMois] = useState(ouvert.saisies.mois);
	const [date, setDate] = useState(ouvert.saisies.date);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());

	// Un document ouvert bloque le défilement de la page de derrière ; Échap le ferme.
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

	const { source, acompteId, blocage } = ouvert;
	// Un certificat qui n'est plus le dernier s'ouvre tel quel, sans saisie.
	const lecture = acompteId !== null && blocage !== null;
	const lu = lireSaisieCumul(cumul);
	const calcul = lu.cumul ? calculerCertificat(entreeCalcul(source, lu.cumul)) : null;
	const donnees = batirCertificat(source, { cumul: lu.cumul, mois, date }, { ligneAjout: ouvert.acomptesManuels !== null });
	const messages = [blocage, lu.erreur, calcul && !calcul.presentHt.greaterThan(0) ? PRESENT_NON_POSITIF : null]
		.filter((m): m is string => m !== null);
	const alerte = calcul ? alerteCertificat(calcul) : null;

	function enregistrer(envoi: Promise<Resultat>) {
		const suivi = envoi.then((r) => {
			if (r.ok) router.refresh();
			else toast.error(r.erreur);
		});
		enregistrements.current.add(suivi);
		void suivi.finally(() => enregistrements.current.delete(suivi));
	}

	const edition: EditionCertificat = {
		cumul, mois, date,
		acomptes: ouvert.acomptesManuels,
		surCumul: setCumul,
		surMois: setMois,
		surDate: setDate,
		surCaution: () => enregistrer(changerCautionAction(ouvert.lotId, !source.lot.caution)),
		surAcompte: (id, texte) => enregistrer(
			id === null ? ajouterAcompteManuelAction(ouvert.lotId, texte)
				: texte.trim() ? modifierAcompteManuelAction(id, texte) : supprimerAcompteManuelAction(id),
		),
	};

	function fermer() {
		router.replace(chemin, { scroll: false });
	}

	function generer() {
		demarrer(async () => {
			// Un acompte antérieur ou la caution en cours d'enregistrement changent la feuille : on la laisse se mettre à jour.
			if (enregistrements.current.size) {
				await Promise.all(enregistrements.current);
				toast.info('Enregistré : vérifiez la feuille, puis générez-la.');
				return;
			}
			const saisies = { cumul, mois, date };
			const r = acompteId
				? await corrigerCertificatAction(acompteId, saisies)
				: await genererCertificatAction(ouvert.lotId, { ...saisies, numeroAttendu: source.numero });
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			telecharger(r.donnees.documentId);
			fermer();
			router.refresh();
		});
	}

	return (
		<div role="dialog" aria-label={TITRES_TYPES.CERTIFICAT_PAIEMENT} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">
						{acompteId ? `Correction du certificat n° ${donnees.contenu.numero}` : TITRES_TYPES.CERTIFICAT_PAIEMENT}
					</p>
					<p className="font-semibold">{sousTitre}</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					{!lecture && (
						<>
							<span className="text-xs text-muted-foreground">Le cumul réalisé, le mois et la date se saisissent sur la feuille — le bleu ne s&apos;imprime pas.</span>
							<Button onClick={generer} disabled={enCours || messages.length > 0 || !lu.cumul}>
								{enCours ? 'Génération…' : acompteId ? `Générer la v${(ouvert.derniereVersion ?? 0) + 1}` : 'Générer le PDF'}
							</Button>
						</>
					)}
					<Button variant="outline" onClick={fermer}>Fermer</Button>
				</div>
			</header>
			{messages.map((m) => <p key={m} role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{m}</p>)}
			<div className="flex flex-1 flex-col items-center gap-3 overflow-auto overscroll-contain p-7">
				<CertificatPaiement donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
				{alerte && <p role="note" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{alerte}</p>}
			</div>
		</div>
	);
}
```

- [ ] **Step 7: La page Marchés ouvre la lettre et le certificat**

Remplacer `src/app/(app)/chantiers/[id]/marches/page.tsx` par :

```tsx
import { buttonVariants } from '@/components/ui/button';
import { ApercuCertificat } from '@/composants/ApercuCertificat';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { BoutonMarchesManquants } from '@/composants/BoutonMarchesManquants';
import { TableauLots } from '@/composants/TableauLots';
import { construireDonneesAvenant, construireDonneesMarche } from '@/documents/donnees';
import { TITRES_TYPES } from '@/documents/libelles';
import { ouvrirCorrection, ouvrirNouveauCertificat } from '@/donnees/acomptes';
import { lireVueMarches } from '@/donnees/marches';
import { LIBELLES_MANQUES_AVENANT, manquesAvenant, numeroAvenantTexte } from '@/domaine/avenants';
import { ErreurMetier } from '@/domaine/erreurs';
import { LIBELLES_MANQUES } from '@/domaine/regles';

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ apercu?: string; avenant?: string; certificat?: string; corriger?: string }>;
};

/** Un avenant ou un acompte supprimé entre-temps (ou un lien périmé) : rien ne s'ouvre. */
async function siPresent<T>(lire: () => Promise<T>): Promise<T | null> {
	try {
		return await lire();
	} catch (e) {
		if (e instanceof ErreurMetier) return null;
		throw e;
	}
}

async function apercuAvenant(chantierId: string, avenantId: string) {
	const a = await siPresent(() => construireDonneesAvenant(avenantId));
	if (!a || a.chantierId !== chantierId) return null;
	return (
		<ApercuDocument
			titre={`Avenant n° ${numeroAvenantTexte(a.avenant.numero)}`}
			sousTitre={`Lot ${a.lot.numero ?? '—'} — ${a.lot.designation} — ${a.lot.artisan?.nom ?? 'non attribué'}`}
			donnees={a.donnees}
			source={{ type: 'avenant', avenantId }}
			manques={manquesAvenant({ artisanId: a.lot.artisanId, montantHt: a.avenant.montantHt }).map((m) => LIBELLES_MANQUES_AVENANT[m])}
		/>
	);
}

async function apercuCertificat(chantierId: string, p: { certificat?: string; corriger?: string }) {
	const ouvert = await siPresent(() => (p.corriger ? ouvrirCorrection(p.corriger) : ouvrirNouveauCertificat(p.certificat ?? '')));
	if (!ouvert || ouvert.chantierId !== chantierId) return null;
	const l = ouvert.source.lot;
	return (
		<ApercuCertificat
			key={ouvert.acompteId ?? `nouveau:${ouvert.lotId}`}
			ouvert={ouvert}
			sousTitre={`Lot ${l.numero ?? '—'} — ${l.designation} — ${l.entreprise ?? 'non attribué'}`}
		/>
	);
}

export default async function PageMarches({ params, searchParams }: Props) {
	const { id } = await params;
	const { apercu, avenant, certificat, corriger } = await searchParams;
	const vue = await lireVueMarches(id);
	const lot = apercu ? vue.lots.find((l) => l.id === apercu) : undefined;
	const donnees = lot ? (await construireDonneesMarche(lot.id)).donnees : null;
	const autreApercu = avenant ? await apercuAvenant(id, avenant)
		: certificat || corriger ? await apercuCertificat(id, { certificat, corriger })
			: null;
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">Marchés &amp; récapitulatif</h2>
			<TableauLots
				vue={vue}
				actions={(
					<>
						<BoutonMarchesManquants chantierId={id} />
						<a href={`/api/chantiers/${id}/recap-xlsx`} className={buttonVariants({ variant: 'outline' })}>Exporter le récap</a>
					</>
				)}
			/>
			{lot && donnees && (
				<ApercuDocument
					titre={TITRES_TYPES[donnees.type]}
					sousTitre={`Lot ${lot.numero ?? '—'} — ${lot.designation} — ${lot.entreprise ?? 'non attribué'}`}
					donnees={donnees}
					source={{ type: 'marche', lotId: lot.id }}
					manques={lot.manques.map((m) => LIBELLES_MANQUES[m])}
				/>
			)}
			{autreApercu}
		</section>
	);
}
```

- [ ] **Step 8: Vérifier le succès**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: aucune erreur ; PASS.

Run: `npm run test:e2e -- e2e/financier.spec.ts e2e/marches.spec.ts e2e/parcours.spec.ts`
Expected: PASS. Le parcours du Socle ouvre toujours le panneau et le marché comme avant.

- [ ] **Step 9: Commit**

```bash
git add src/donnees/marches.ts src/donnees/marches.int.test.ts src/composants/PanneauLot.tsx src/composants/ApercuDocument.tsx src/composants/ApercuCertificat.tsx src/app/\(app\)/chantiers/\[id\]/marches/page.tsx e2e/preparer-financier.ts e2e/financier.spec.ts package.json
git commit -m "feat(financier): avenants du panneau du lot, lettre et certificat de paiement à l'écran"
```

---
### Task 9: Page Documents : colonnes Avenants et Certificats, historique

**Files:**
- Modify: `src/documents/series.ts`, `src/documents/etats.ts`, `src/composants/TableauDocuments.tsx`, `e2e/financier.spec.ts`
- Test: `src/documents/etatsFinanciers.int.test.ts`

**Interfaces:**
- Consumes: `manquesAvenant`, `sommeAvenants`, `ManqueAvenant`, `certificatPossible` (Task 1) ; `serieAvenant`, `serieCertificat` (Task 2) ; `SourceLot.avenants` (Task 3) ; `batirAvenant` (Task 5) ; les écritures des Tasks 4 et 7 (tests) ; `etatsDocumentsChantier`, `VersionResume`, `SerieDocuments`, `Historique({ versions })` (Planning, Tasks 8 et 11).
- Produces:
  - `avenantDeLaSerie(serie: string): string | null`
  - `VersionResume.libelle?: string` (« Avenant n° 02 », « Avenant n° 01 · avenant supprimé »)
  - `type CaseAvenant = { avenantId: string; numero: number; etat: EtatSerie; versions: VersionResume[]; manques: ManqueAvenant[] }`
  - `type CaseCertificat = { acompteId: string; numero: number; manuel: boolean; versions: VersionResume[]; corrigeable: boolean }` (aucun état : un certificat n'est jamais « modifié »)
  - `LigneDocuments` + `avenants: CaseAvenant[]`, `certificats: CaseCertificat[]`, `certificatPossible: boolean`, `historique: VersionResume[]`
  - cases `[data-case="avenant"]` et `[data-case="certificat"]` de la page Documents

- [ ] **Step 1: Écrire les tests d'intégration**

Créer `src/documents/etatsFinanciers.int.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterAcompteManuel, corrigerCertificat, genererCertificat } from '@/donnees/acomptes';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from '@/donnees/avenants';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier } from './etats';
import { genererAvenant, genererMarche } from './generer';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
const JUILLET = { mois: '2026-07', date: '2026-09-30' };
let p: Awaited<ReturnType<typeof insererPerrier>>;
let lotId: string;

const ligne = async (id = lotId) =>
	(await etatsDocumentsChantier(p.chantierId, deps.maintenant)).entreprises.flatMap((e) => e.lots).find((l) => l.lotId === id)!;
async function avenant(montant: string) {
	const { id } = await ajouterAvenant(lotId);
	if (montant !== '0') await modifierChampAvenant(id, 'montantHt', montant);
	return id;
}

describe('page Documents : avenants et certificats', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		lotId = p.lots['CARRELAGE — FAÏENCE'];
	});

	it('lettres : à jour, « modifiée » quand un avenant antérieur change, à produire, montant nul', async () => {
		await genererMarche(lotId, p.utilisateurId, deps);
		const n1 = await avenant('850');
		const n2 = await avenant('-300');
		await genererAvenant(n1, p.utilisateurId, deps);
		await genererAvenant(n2, p.utilisateurId, deps);
		let l = await ligne();
		expect(l.avenants.map((a) => [a.numero, a.etat, a.versions.length])).toEqual([[1, 'a-jour', 1], [2, 'a-jour', 1]]);

		await modifierChampAvenant(n1, 'montantHt', '900');
		await avenant('0');
		l = await ligne();
		expect(l.avenants.map((a) => [a.numero, a.etat, a.manques])).toEqual([
			[1, 'modifie', []], [2, 'modifie', []], [3, 'a-produire', ['montantAvenant']],
		]);
		// Un avenant ne touche pas au marché imprimé.
		expect(l.marche.etat).toBe('a-jour');
	});

	it('historique : versions du marché et des lettres, avenants supprimés compris', async () => {
		await genererMarche(lotId, p.utilisateurId, deps);
		const n1 = await avenant('850');
		await avenant('-300');
		await genererAvenant(n1, p.utilisateurId, deps);
		await supprimerAvenant(n1);
		const l = await ligne();
		expect(l.avenants.map((a) => a.numero)).toEqual([2]);
		expect(l.historique.map((v) => v.libelle ?? v.type)).toEqual(['Avenant n° 01 · avenant supprimé', 'MARCHE_GRE_A_GRE']);
		expect(l.historique[0].nomFichier).toBe('PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Avenant01-v1.pdf');
	});

	it('certificats : acomptes antérieurs sans document, versions, seul le dernier se corrige, jamais « modifié »', async () => {
		await ajouterAcompteManuel(lotId, '1000');
		const c2 = await genererCertificat(lotId, { numeroAttendu: 2, cumul: '3000', ...JUILLET }, p.utilisateurId, deps);
		await corrigerCertificat(c2.acompteId, { cumul: '3500', ...JUILLET }, p.utilisateurId, deps);
		await avenant('850');
		const l = await ligne();
		expect(l.certificatPossible).toBe(true);
		expect(l.certificats.map((c) => [c.numero, c.manuel, c.versions.map((v) => v.version), c.corrigeable]))
			.toEqual([[1, true, [], false], [2, false, [2, 1], true]]);
		// Un avenant ajouté après le certificat : pas d'état à recalculer, aucune version nouvelle.
		expect(l.certificats[1]).not.toHaveProperty('etat');
		expect(await prisma.document.count({ where: { type: 'CERTIFICAT_PAIEMENT' } })).toBe(2);
		// Les certificats ne vont pas dans l'historique du marché.
		expect(l.historique).toEqual([]);
	});

	it('lot sans entreprise : pas de nouveau certificat', async () => {
		expect((await ligne(p.lots['ENDUIT EXTÉRIEUR'])).certificatPossible).toBe(false);
	});
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npm run test:int -- src/documents/etatsFinanciers.int.test.ts`
Expected: FAIL — `avenants`, `certificats`, `historique` absents de `LigneDocuments`.

- [ ] **Step 3: Les états**

Dans `src/documents/series.ts`, ajouter :

```ts
/** L'id de l'avenant d'une série de lettre, ou null pour une autre série. */
export const avenantDeLaSerie = (serie: string): string | null => (serie.startsWith('AVENANT:') ? serie.slice('AVENANT:'.length) : null);
```

Dans `src/documents/etats.ts` (version de la Task 8 du Planning) :

1. Compléter les imports :

```ts
import { manquesAvenant, sommeAvenants, type ManqueAvenant } from '@/domaine/avenants';
import { certificatPossible } from '@/domaine/certificats';
import { htEngage } from '@/domaine/montants';
import { batirAvenant, batirMarche, batirPlanning, batirRecap, empreinteDocument } from './batir';
import { avenantDeLaSerie, serieAvenant, serieCertificat, SERIES } from './series';
```

(les deux derniers remplacent les imports existants de `./batir` et `./series`).

2. Remplacer `VersionResume` et `LigneDocuments` par :

```ts
export type VersionResume = {
	id: string; version: number; type: TypeDocument;
	creeLe: string; auteur: string; nomFichier: string;
	/** Historique d'un lot : « Avenant n° 02 », « Avenant n° 01 · avenant supprimé » ; sinon le libellé du type. */
	libelle?: string;
};
```

```ts
export type CaseAvenant = { avenantId: string; numero: number; etat: EtatSerie; versions: VersionResume[]; manques: ManqueAvenant[] };
/** Pas d'état : un certificat est un acte de paiement, figé tel qu'émis ; seule sa correction crée une version (spec § 6). */
export type CaseCertificat = { acompteId: string; numero: number; manuel: boolean; versions: VersionResume[]; corrigeable: boolean };
export type LigneDocuments = {
	lotId: string; lotTexte: string; manques: Manque[]; marche: SerieDocuments;
	avenants: CaseAvenant[]; certificats: CaseCertificat[]; certificatPossible: boolean;
	/** Versions du marché et des lettres d'avenants (supprimés compris), de la plus récente à la plus ancienne. */
	historique: VersionResume[];
};
```

3. Dans `SELECTION`, ajouter `lotId: true,` ; dans `DocLu`, ajouter `lotId: string | null;`.

4. Dans `etatsDocumentsChantier`, compléter le `Promise.all` initial de deux lectures :

```ts
	const [{ chantier, lots, parametres }, docs, empreinteDuPlanning, acomptes, lettres] = await Promise.all([
		lireSources(chantierId),
		prisma.document.findMany({ where: { chantierId }, orderBy: { version: 'desc' }, select: SELECTION }),
		empreintePlanning(chantierId, maintenant),
		prisma.acompte.findMany({ where: { lot: { chantierId } }, orderBy: { numero: 'asc' }, select: { id: true, lotId: true, numero: true, manuel: true } }),
		// Le numéro imprimé d'une lettre survit à son avenant : il sert à l'historique des avenants supprimés.
		prisma.document.findMany({ where: { chantierId, type: 'AVENANT' }, select: { id: true, donnees: true } }),
	]);
	const numeroLettre = new Map(lettres.map((d) => [d.id, (d.donnees as { contenu?: { numero?: string } }).contenu?.numero ?? '?']));
```

5. Dans la boucle sur les lots, remplacer la construction de `ligne` par :

```ts
		const actuels = new Set(lot.avenants.map((a) => a.id));
		const acomptesDuLot = acomptes.filter((a) => a.lotId === lot.id);
		const ligne: LigneDocuments = {
			lotId: lot.id,
			lotTexte: `${lot.numero ? `${lot.numero} — ` : ''}${lot.designation}`,
			manques: manquesPourGenerer({
				artisanId: lot.artisanId, montantHtInitial: lot.montantHtInitial,
				maitreOuvrage: chantier.maitreOuvrage, adresseChantier: chantier.adresse,
			}),
			marche: serie(docsDe(lot.id), empreinteDocument(batirMarche(chantier, lot, parametres, maintenant))),
			avenants: lot.avenants.map((a) => ({
				avenantId: a.id,
				numero: a.numero,
				manques: manquesAvenant({ artisanId: lot.artisanId, montantHt: a.montantHt }),
				...serie(docsDe(serieAvenant(a.id)), empreinteDocument(batirAvenant(chantier, lot, a.id, parametres, maintenant))),
			})),
			certificats: acomptesDuLot.map((a, i) => ({
				acompteId: a.id,
				numero: a.numero,
				manuel: a.manuel,
				versions: docsDe(serieCertificat(a.id)).map(resume),
				corrigeable: !a.manuel && i === acomptesDuLot.length - 1,
			})),
			certificatPossible: certificatPossible({
				artisanId: lot.artisanId, htEngage: htEngage(lot.montantHtInitial, sommeAvenants(lot.avenants)),
			}),
			historique: docs
				.filter((d) => d.lotId === lot.id && (d.serie === lot.id || avenantDeLaSerie(d.serie) !== null))
				.map((d) => {
					const avenantId = avenantDeLaSerie(d.serie);
					if (avenantId === null) return resume(d);
					return { ...resume(d), libelle: `Avenant n° ${numeroLettre.get(d.id)}${actuels.has(avenantId) ? '' : ' · avenant supprimé'}` };
				})
				.sort((a, b) => b.creeLe.localeCompare(a.creeLe)),
		};
```

Le certificat n'est jamais reconstruit ni comparé : `etatsDocumentsChantier` ne lit que ses versions.

Run: `npx tsc --noEmit && npm run test:int -- src/documents/etatsFinanciers.int.test.ts src/documents/etats.int.test.ts`
Expected: PASS.

- [ ] **Step 4: Le tableau de chaque entreprise**

Dans `src/composants/TableauDocuments.tsx` :

1. Compléter les imports :

```tsx
import type { CaseAvenant, LigneDocuments, SerieDocuments, SerieVisa, VersionResume, VueDocuments } from '@/documents/etats';
import type { ManqueAvenant } from '@/domaine/avenants';
```

(le premier remplace l'import des types de `@/documents/etats`).

2. Dans `Historique`, remplacer `{LIBELLES_TYPES[v.type]}` par `{v.libelle ?? LIBELLES_TYPES[v.type]}`.

3. Après `CaseMarche`, ajouter :

```tsx
const deux = (n: number) => String(n).padStart(2, '0');
/** Spec § 7 : « n° 04 · montant nul ». */
const MANQUES_CASE: Record<ManqueAvenant, string> = { entreprise: "pas d'entreprise", montantAvenant: 'montant nul' };

function CaseLettre({ chantierId, a }: { chantierId: string; a: CaseAvenant }) {
	const n = `n° ${deux(a.numero)}`;
	const ouvrir = `/chantiers/${chantierId}/marches?avenant=${a.avenantId}`;
	if (a.etat === 'a-produire') {
		return a.manques.length ? (
			<span data-case="avenant" className="inline-block rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
				{`${n} · ${a.manques.map((m) => MANQUES_CASE[m]).join(', ')}`}
			</span>
		) : (
			<Link data-case="avenant" href={ouvrir} className="inline-block rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent">{`${n} à produire`}</Link>
		);
	}
	const derniere = a.versions[0];
	return (
		<span data-case="avenant" className="inline-flex items-center gap-1.5">
			<Link href={`?version=${derniere.id}`} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">{`${n} · v${derniere.version}`}</Link>
			{a.etat === 'modifie' && (
				<>
					<Badge variant="secondary">modifié</Badge>
					<Link href={ouvrir} className="text-xs underline">Régénérer</Link>
				</>
			)}
		</span>
	);
}

/** Un acompte antérieur est gris et sans lien ; un certificat s'ouvre tel qu'émis, le dernier se corrige. Jamais « modifié ». */
function CasesCertificats({ chantierId, ligne }: { chantierId: string; ligne: LigneDocuments }) {
	return (
		<div className="flex flex-wrap items-start gap-1.5">
			{ligne.certificats.map((c) => {
				const n = `n° ${deux(c.numero)}`;
				const derniere = c.versions[0];
				if (c.manuel || !derniere) {
					return <span key={c.acompteId} data-case="certificat" className="inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{`${n} · hors appli`}</span>;
				}
				return (
					<span key={c.acompteId} data-case="certificat" className="inline-flex flex-col gap-0.5">
						<span className="inline-flex items-center gap-1.5">
							<Link href={`?version=${derniere.id}`} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">{`${n} · v${derniere.version}`}</Link>
							{c.corrigeable && <Link href={`/chantiers/${chantierId}/marches?corriger=${c.acompteId}`} className="text-xs underline">Corriger</Link>}
						</span>
						{c.versions.length > 1 && <Historique versions={c.versions} />}
					</span>
				);
			})}
			{ligne.certificatPossible ? (
				<Link href={`/chantiers/${chantierId}/marches?certificat=${ligne.lotId}`} aria-label="Nouveau certificat de paiement"
					className="inline-block rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent">+</Link>
			) : (
				<span title="Lot sans entreprise ou sans montant" className="inline-block rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground opacity-50">+</span>
			)}
		</div>
	);
}
```

(Un certificat a toujours sa v1, écrite dans la même transaction que son acompte : la branche `!derniere` ne sert qu'à ne jamais planter.)

4. Dans le tableau de chaque entreprise, remplacer l'en-tête et les lignes par :

```tsx
						<thead>
							<tr className="text-left text-muted-foreground">
								<th className="w-1/4 px-4 py-2">Lot</th><th className="px-4 py-2">Marché</th><th className="px-4 py-2">Avenants</th>
								<th className="px-4 py-2">Certificats</th><th className="px-4 py-2">Historique</th>
							</tr>
						</thead>
						<tbody>
							{groupe.lots.map((ligne) => (
								<tr key={ligne.lotId} data-lot={ligne.lotTexte} className="border-t align-top">
									<td className="px-4 py-2">{ligne.lotTexte}</td>
									<td className="px-4 py-2"><CaseMarche chantierId={vue.chantierId} ligne={ligne} /></td>
									<td className="px-4 py-2">
										{ligne.avenants.length ? (
											<div className="flex flex-wrap gap-1.5">
												{ligne.avenants.map((a) => <CaseLettre key={a.avenantId} chantierId={vue.chantierId} a={a} />)}
											</div>
										) : <span className="text-xs text-muted-foreground">—</span>}
									</td>
									<td className="px-4 py-2"><CasesCertificats chantierId={vue.chantierId} ligne={ligne} /></td>
									<td className="px-4 py-2"><Historique versions={ligne.historique} /></td>
								</tr>
							))}
						</tbody>
```

5. Compléter la légende :

```tsx
			<p className="text-xs text-muted-foreground">
				Pointillé : à produire. Bleu : à jour, s&apos;ouvre en lecture seule. Pastille « modifié » : les données ont changé depuis la dernière version — régénérez-la.
				Pastille « périmé » : le visa fait signer une version du planning qui n&apos;est plus la dernière.
				Gris : acompte antérieur à l&apos;application, saisi sans document.
			</p>
```

- [ ] **Step 5: Étape 5 du parcours E2E**

Dans `e2e/financier.spec.ts`, ajouter à la fin du test (après l'étape 4) :

```ts
	// 5. Documents : colonnes Avenants et Certificats ; « n° 01 · hors appli », « n° 03 · v2 », sans pastille « modifié ».
	await page.getByRole('link', { name: 'Documents', exact: true }).click();
	const ligneDoc = page.locator('tr[data-lot="11 — PEINTURE"]');
	const colonne = (i: number) => ligneDoc.locator('td').nth(i);
	await expect(page.getByRole('columnheader', { name: 'Avenants' }).first()).toBeVisible();
	await expect(page.getByRole('columnheader', { name: 'Certificats' }).first()).toBeVisible();
	// Le marché généré avant l'avenant reste à jour ; la lettre aussi.
	await expect(colonne(1).getByText('modifié', { exact: true })).toHaveCount(0);
	await expect(colonne(2).locator('[data-case="avenant"]')).toHaveText('n° 01 · v1');
	const certificats = colonne(3).locator('[data-case="certificat"]');
	await expect(certificats).toHaveCount(3);
	await expect(certificats.nth(0)).toHaveText('n° 01 · hors appli');
	await expect(certificats.nth(1)).toHaveText('n° 02 · hors appli');
	await expect(certificats.nth(2)).toContainText('n° 03 · v2');
	await expect(colonne(3).getByText('modifié', { exact: true })).toHaveCount(0);
	await expect(colonne(4)).toContainText('2 versions');
	await certificats.nth(2).getByRole('link', { name: 'n° 03 · v2' }).click();
	const version = page.getByRole('dialog', { name: 'Certificat de paiement — version 2' });
	await expect(version.locator('.cp-somme')).toHaveText(eur('3 000,00'));
	await expect(version.getByRole('link', { name: 'Télécharger le PDF' })).toBeVisible();
```

(L'historique du lot compte le marché v1 et la lettre v1 : « 2 versions ».)

- [ ] **Step 6: Vérifier le succès**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run test:int`
Expected: aucune erreur ; PASS.

Run: `npm run test:e2e`
Expected: PASS, y compris `financier.spec.ts` (étapes 1 à 5), les parcours du Planning (`planning-documents.spec.ts` lit les cartes Planning et Visa, inchangées) et ceux du Socle.

- [ ] **Step 7: Commit**

```bash
git add src/documents/series.ts src/documents/etats.ts src/composants/TableauDocuments.tsx src/documents/etatsFinanciers.int.test.ts e2e/financier.spec.ts
git commit -m "feat(financier): page Documents, colonnes Avenants et Certificats, lettres d'avenants supprimés"
```
