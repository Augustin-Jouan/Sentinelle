import { expect, test } from '@playwright/test';
import { ECRANS, ouvrirEcran, type Cible } from './ecrans';

/** « maquette » : capture les références (avec --update-snapshots) ; « app » (défaut) : compare l'app aux références. */
const CIBLE = (process.env.CONFORMITE_CIBLE ?? 'app') as Cible;

for (const ecran of ECRANS) {
	test(`${ecran.nom} : l'app est la maquette`, async ({ page }) => {
		await ouvrirEcran(page, CIBLE, ecran);
		await expect(page).toHaveScreenshot(`${ecran.nom}.png`, {
			animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.01,
			mask: (ecran.masques ?? []).map((m) => page.locator(m)),
		});
	});
}
