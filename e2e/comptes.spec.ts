import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

test('l\'admin crée un compte, le collègue change son mot de passe provisoire', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/admin/comptes');
	await page.getByRole('button', { name: 'Nouveau compte' }).click();
	await page.getByLabel('Nom').fill('Jean Martin');
	await page.getByLabel('E-mail').fill('jean.martin@socoreve.local');
	await page.getByRole('radiogroup', { name: 'Rôle' }).getByText('Utilisateur', { exact: true }).click();
	await page.getByRole('button', { name: 'Créer le compte' }).click();
	const dialogue = page.getByRole('dialog', { name: 'Mot de passe provisoire' });
	const provisoire = (await dialogue.getByTestId('mot-de-passe-provisoire').textContent()) ?? '';
	expect(provisoire).toHaveLength(16);
	await dialogue.getByRole('button', { name: 'Fermer' }).click();
	await page.locator('.avatar').click();
	await page.getByRole('menuitem', { name: 'Se déconnecter' }).click();

	await seConnecter(page, 'jean.martin@socoreve.local', provisoire);
	await expect(page).toHaveURL(/\/mot-de-passe$/);
	await page.getByLabel('Mot de passe actuel').fill(provisoire);
	await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('nouveau-mot-de-passe-jean');
	await page.getByLabel('Confirmer le nouveau mot de passe').fill('nouveau-mot-de-passe-jean');
	await page.getByRole('button', { name: 'Enregistrer' }).click();
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
	await page.locator('.avatar').click();
	await expect(page.getByRole('menuitem', { name: 'Se déconnecter' })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: 'Comptes' })).toHaveCount(0);
});
