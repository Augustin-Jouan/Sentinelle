import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

test('un visiteur sans session est renvoyé vers la connexion', async ({ page }) => {
	await page.goto('/chantiers');
	await expect(page).toHaveURL(/\/connexion$/);
});

test('un mauvais mot de passe est refusé', async ({ page }) => {
	await page.goto('/connexion');
	await page.getByLabel('Adresse e-mail').fill(ADMIN.email);
	await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page.locator('form p[role="alert"]')).toHaveText('E-mail ou mot de passe incorrect, ou compte bloqué.');
});

test('l\'admin se connecte puis se déconnecte', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
	await page.locator('.avatar').click();
	await expect(page.getByRole('menuitem', { name: 'Comptes' })).toBeVisible();
	await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();
	await expect(page).toHaveURL(/\/connexion$/);
});
