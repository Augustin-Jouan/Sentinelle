import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

test('crée un chantier et l\'ouvre', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.getByRole('link', { name: 'Nouveau chantier' }).click();
	await page.getByLabel('Nom du client').fill('M. et Mme DURAND');
	await page.getByLabel('Adresse du chantier').fill('La Forge');
	await page.getByLabel('Commune').fill('ERBRAY');
	await page.getByLabel('Référence dossier').fill('DURAND — Erbray');
	await page.getByRole('button', { name: 'Créer le chantier' }).click();
	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
	await expect(page.getByRole('heading', { name: 'M. et Mme DURAND' })).toBeVisible();

	await page.goto('/chantiers');
	await expect(page.getByRole('link', { name: 'DURAND — Erbray' })).toBeVisible();
});

test('la référence en double est refusée', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	for (const essai of [1, 2]) {
		await page.goto('/chantiers/nouveau');
		await page.getByLabel('Nom du client').fill('X');
		await page.getByLabel('Référence dossier').fill('DOUBLON');
		await page.getByRole('button', { name: 'Créer le chantier' }).click();
		if (essai === 1) await expect(page).toHaveURL(/\/marches$/);
	}
	await expect(page.getByText('Cette référence existe déjà.')).toBeVisible();
});
