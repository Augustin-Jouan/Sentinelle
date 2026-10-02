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
