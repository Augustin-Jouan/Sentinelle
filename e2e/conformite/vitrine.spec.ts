import { expect, test, type Page } from '@playwright/test';
import { preparer, seConnecterSur, type Cible } from './ecrans';

/**
 * La vitrine n'existe que dans l'app : ses références se capturent sur l'app
 * (CONFORMITE_CIBLE=app … --update-snapshots -g vitrine), puis se relisent à l'œil.
 */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;
const SECTIONS = ['boutons', 'etiquettes', 'champs', 'structure', 'navigation', 'tableaux', 'menus'];
const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;

async function ouvrirVitrine(page: Page, theme: 'light' | 'dark') {
	await preparer(page, 'app');
	await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
	await seConnecterSur(page, 'app');
	await page.goto('/vitrine');
	await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
	const suffixe = theme === 'light' ? 'clair' : 'sombre';

	test.describe(`vitrine (${suffixe})`, () => {
		test.skip(CIBLE !== 'app', 'la vitrine n’existe pas dans la maquette');

		test(`vitrine ${suffixe} : sections`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			for (const section of SECTIONS) {
				await expect(page.getByTestId(`vitrine-${section}`)).toHaveScreenshot(`vitrine-${section}-${suffixe}.png`, OPTIONS);
			}
		});

		test(`vitrine ${suffixe} : menu ouvert`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.locator('#v-vus').getByRole('button').click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-menu-${suffixe}.png`, OPTIONS);
		});

		test(`vitrine ${suffixe} : panneau et confirmation`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Ouvrir le panneau' }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-panneau-${suffixe}.png`, OPTIONS);
			await page.getByRole('dialog', { name: 'GROS ŒUVRE' }).getByRole('button', { name: 'Supprimer le lot' }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-confirmation-${suffixe}.png`, OPTIONS);
		});

		test(`vitrine ${suffixe} : message`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Afficher un message' }).click();
			await expect(page.locator('[data-sonner-toast]')).toHaveScreenshot(`vitrine-message-${suffixe}.png`, OPTIONS);
		});
	});
}
