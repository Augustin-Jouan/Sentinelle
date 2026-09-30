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
	// « Ajouter un lot » ouvre le panneau du lot (maquette) : le quitter pour retrouver la barre.
	await page.keyboard.press('Escape');
	// Hors d'un chantier, pas d'onglets ; le sélecteur dit « Affichage ».
	await page.getByTitle('Tous les chantiers').click();
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
