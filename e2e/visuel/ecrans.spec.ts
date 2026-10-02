import { expect, test } from '@playwright/test';
import { ECRANS, ouvrirEcran } from './ecrans';

/** Chaque écran face à sa référence. Après un changement voulu : npm run visuel:references, puis relire les PNG du diff. */
for (const ecran of ECRANS) {
	test(`${ecran.nom} : inchangé`, async ({ page }) => {
		await ouvrirEcran(page, ecran);
		await expect(page).toHaveScreenshot(`${ecran.nom}.png`, {
			animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
			mask: ecran.masques?.(page) ?? [],
		});
	});
}
