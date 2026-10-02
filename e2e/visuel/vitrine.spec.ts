import { expect, test, type Page } from '@playwright/test';
import { preparer, seConnecterAdmin } from './ecrans';

/** Chaque brique, ses variantes et ses états, en clair et en sombre. Une brique ou une variante nouvelle y entre, puis npm run visuel:references. */
const SECTIONS = ['boutons', 'etiquettes', 'champs', 'formulaires', 'structure', 'navigation', 'tableaux', 'menus', 'ecran-centre'];
const OPTIONS = { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01 } as const;

async function ouvrirVitrine(page: Page, theme: 'light' | 'dark') {
	await preparer(page);
	await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
	await seConnecterAdmin(page);
	await page.goto('/vitrine');
	await expect(page.getByRole('heading', { name: 'Vitrine' })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);
}

for (const theme of ['light', 'dark'] as const) {
	const suffixe = theme === 'light' ? 'clair' : 'sombre';

	test.describe(`vitrine (${suffixe})`, () => {
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

		test(`vitrine ${suffixe} : aperçu et son menu`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Ouvrir un aperçu' }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-apercu-${suffixe}.png`, OPTIONS);
			await page.getByRole('dialog', { name: 'Certificat de paiement' }).getByRole('button', { name: /^Version/ }).click();
			await page.mouse.move(0, 0);
			await expect(page).toHaveScreenshot(`vitrine-apercu-menu-${suffixe}.png`, OPTIONS);
		});

		test(`vitrine ${suffixe} : message`, async ({ page }) => {
			await ouvrirVitrine(page, theme);
			await page.getByRole('button', { name: 'Afficher un message' }).click();
			await expect(page.locator('[data-sonner-toast]')).toHaveScreenshot(`vitrine-message-${suffixe}.png`, OPTIONS);
		});
	});
}
