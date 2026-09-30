import { readFileSync } from 'node:fs';
import { unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
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
