import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

async function nouveauChantier(page: Page, reference: string) {
	await page.goto('/chantiers/nouveau');
	await page.getByLabel('Nom du client').fill('M. et Mme PERRIER');
	await page.getByLabel('Adresse du chantier').fill('Le Haut Bois');
	await page.getByLabel('Référence dossier').fill(reference);
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page).toHaveURL(/\/marches$/);
}

test('attribue une entreprise par recherche et saisit un TTC', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — E2E');
	const ligne = page.locator('tr[data-lot="GROS ŒUVRE"]');
	await expect(page.locator('tbody tr')).toHaveCount(13);

	await ligne.getByLabel('Montant TTC').fill('115 500');
	await ligne.getByLabel('Montant TTC').press('Enter');
	await expect(ligne.getByLabel('Montant HT')).toHaveValue('96 250,00');
	await expect(page.getByTestId('total-ttc')).toHaveText('115 500,00 €');

	await ligne.getByRole('cell', { name: 'à attribuer' }).click();
	await page.getByRole('button', { name: 'Attribuée à' }).click();
	await page.getByPlaceholder('Nom, commune…').fill('rebours martigne');
	await page.keyboard.press('Enter');
	await expect(page.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');
	await page.keyboard.press('Escape');
	await expect(ligne).toContainText('MARTIGNÉ-FERCHAUD');
});

test('attribuer une entreprise au clavier : recherche, Entrée choisit le premier résultat, Échap referme le menu seul', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — CLAVIER');
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: 'à attribuer' }).click();
	const panneau = page.getByRole('dialog', { name: 'GROS ŒUVRE' });
	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
	await page.getByRole('searchbox', { name: 'Rechercher dans Attribuée à' }).fill('rebours');
	await page.keyboard.press('Enter');
	await expect(panneau.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');
	await panneau.getByRole('button', { name: /Attribuée à/ }).click();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox', { name: 'Attribuée à' })).toBeHidden();
	await expect(panneau).toBeVisible();   // Échap ferme le menu, pas le panneau
});

test('supprimer un avenant puis annuler par Échap : rien ne change', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — AVENANT');
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: 'à attribuer' }).click();
	const panneau = page.getByRole('dialog', { name: 'GROS ŒUVRE' });
	await panneau.getByRole('button', { name: 'Ajouter un avenant' }).click();
	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
	await panneau.getByRole('button', { name: "Supprimer l'avenant n° 01" }).click();
	await expect(page.getByRole('alertdialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('alertdialog')).toBeHidden();
	await expect(panneau).toBeVisible();   // Échap annule la confirmation, pas le panneau
	await expect(panneau.locator('tr[data-avenant="01"]')).toBeVisible();
});

test('une saisie invalide reste en rouge avec un message', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await nouveauChantier(page, 'MARCHES — ERREUR');
	const champ = page.locator('tr[data-lot="CHARPENTE"]').getByLabel('Montant HT');
	await champ.fill('abc');
	await champ.press('Enter');
	await expect(page.getByText("« abc » n'est pas un nombre.")).toBeVisible();
	await expect(champ).toHaveAttribute('aria-invalid', 'true');
	await expect(champ).toHaveValue('abc');
});
