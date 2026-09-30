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
