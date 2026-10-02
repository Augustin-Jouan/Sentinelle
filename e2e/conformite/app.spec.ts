import { expect, test, type Page } from '@playwright/test';
import { preparer, seConnecterSur, type Cible } from './ecrans';

/**
 * Les écrans qui n'existent que dans l'app (écart 1 : Paramètres, Comptes). Leurs références se capturent
 * sur l'app avant de les migrer (CONFORMITE_CIBLE=app … --update-snapshots -g "app :") : la migration ne les change pas.
 */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;
const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;

async function ouvrir(page: Page, chemin: string, titre: string) {
	await preparer(page, 'app');
	await seConnecterSur(page, 'app');
	await page.goto(chemin);
	await expect(page.getByRole('heading', { name: titre })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
	await page.mouse.move(0, 0);
}

test.describe('écrans propres à l’app', () => {
	test.skip(CIBLE !== 'app', 'ces écrans n’existent pas dans la maquette');

	test('app : paramètres', async ({ page }) => {
		await ouvrir(page, '/parametres', 'Paramètres de l\'entreprise');
		await expect(page).toHaveScreenshot('app-parametres.png', OPTIONS);
	});

	test('app : comptes, création, mot de passe provisoire', async ({ page }) => {
		await ouvrir(page, '/admin/comptes', 'Comptes');
		await expect(page).toHaveScreenshot('app-comptes.png', OPTIONS);

		await page.getByRole('button', { name: 'Nouveau compte' }).click();
		await page.mouse.move(0, 0);
		await expect(page).toHaveScreenshot('app-nouveau-compte.png', OPTIONS);

		await page.getByLabel('Nom').fill('Camille Banc');
		await page.getByLabel('E-mail').fill('camille.banc@socoreve.local');
		await page.getByRole('button', { name: 'Créer le compte' }).click();
		const fenetre = page.getByRole('dialog', { name: 'Mot de passe provisoire' });
		// Tiré au hasard : on le remplace par un texte fixe de même longueur.
		await fenetre.getByTestId('mot-de-passe-provisoire').evaluate((el) => { el.textContent = 'ABCDEFGHJKMNPQRS'; });
		await page.mouse.move(0, 0);
		await expect(page).toHaveScreenshot('app-mot-de-passe-provisoire.png', OPTIONS);
	});
});
