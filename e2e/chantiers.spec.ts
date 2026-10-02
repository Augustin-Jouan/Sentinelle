import { expect, test } from '@playwright/test';
import { ADMIN, carteChantier, seConnecter } from './aide';

test('crée un chantier et l\'ouvre', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.getByRole('link', { name: 'Nouveau chantier' }).first().click();
	await page.getByLabel('Nom du client').fill('M. et Mme DURAND');
	await page.getByLabel('Adresse du chantier').fill('La Forge');
	await page.getByLabel('Commune').fill('ERBRAY');
	await page.getByLabel('Référence dossier').fill('DURAND — Erbray');
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page).toHaveURL(/\/chantiers\/[^/]+\/marches$/);
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();

	await page.goto('/chantiers');
	await expect(carteChantier(page, 'DURAND — Erbray')).toBeVisible();
});

test('la référence en double est refusée', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	for (const essai of [1, 2]) {
		await page.goto('/chantiers/nouveau');
		await page.getByLabel('Nom du client').fill('X');
		await page.getByLabel('Référence dossier').fill('DOUBLON');
		await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
		if (essai === 1) await expect(page).toHaveURL(/\/marches$/);
	}
	await expect(page.getByRole('textbox', { name: 'Référence dossier' })).toHaveAccessibleDescription('Cette référence existe déjà.');
});

test('choisit la mission au clavier', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers/nouveau');
	const mission = page.getByRole('radiogroup', { name: 'Type de mission' });
	await expect(mission.getByRole('radio', { name: 'Complète' })).toBeChecked();
	// Un seul arrêt de tabulation (Tab quitte le groupe) ; les flèches, Début et Fin choisissent.
	await mission.getByRole('radio', { name: 'Complète' }).focus();
	await page.keyboard.press('Tab');
	await expect(mission.getByRole('radio', { name: 'Partielle' })).not.toBeFocused();
	await mission.getByRole('radio', { name: 'Complète' }).focus();
	await page.keyboard.press('ArrowRight');
	await expect(mission.getByRole('radio', { name: 'Partielle' })).toBeFocused();
	await expect(mission.getByRole('radio', { name: 'Partielle' })).toBeChecked();
	await expect(mission.getByRole('radio', { name: 'Complète' })).not.toBeChecked();
	await page.keyboard.press('ArrowRight');
	await expect(mission.getByRole('radio', { name: 'Complète' })).toBeChecked();
	await page.keyboard.press('End');
	await expect(mission.getByRole('radio', { name: 'Partielle' })).toBeChecked();
	await page.keyboard.press('Home');
	await expect(mission.getByRole('radio', { name: 'Complète' })).toBeChecked();
});

test('une référence très longue se tronque dans le sélecteur, sans pousser la barre', async ({ page }) => {
	// 80 caractères : la plus longue référence admise.
	const reference = 'SOCIÉTÉ NOUVELLE DE CONSTRUCTIONS MÉTALLIQUES ET DE SERRURERIE — CHÂTEAUBRIANT'.padEnd(80, '·');
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers/nouveau');
	await page.getByLabel('Nom du client').fill('X');
	await page.getByLabel('Référence dossier').fill(reference);
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page).toHaveURL(/\/marches$/);
	const selecteur = page.getByRole('banner').getByRole('button', { name: new RegExp(reference.slice(0, 20)) });
	const cadre = await selecteur.boundingBox();
	expect(cadre!.width).toBeLessThanOrEqual(384);
	expect(await selecteur.locator('span').nth(1).evaluate((v) => v.scrollWidth > v.clientWidth)).toBe(true);
	const artisans = await page.getByRole('banner').getByRole('link', { name: /Artisans/ }).boundingBox();
	expect(artisans!.x + artisans!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});
