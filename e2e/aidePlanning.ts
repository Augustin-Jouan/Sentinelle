import { expect, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Densité Normale : 46 px par semaine. */
export const W = 46;

export async function ouvrirPlanning(page: Page, reference: string) {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.getByRole('link', { name: reference }).click();
	await page.getByRole('link', { name: 'Planning', exact: true }).click();
	await expect(page).toHaveURL(/\/planning$/);
	await expect(page.locator('.g-bar').first()).toBeVisible();
}

export const ligne = (page: Page, designation: string) =>
	page.locator('.g-row[data-lot]').filter({ has: page.locator('.g-nom').getByText(designation, { exact: true }) });

/** Une barre, par le début de son infobulle (« <intitulé> — semaine … »). */
export const barre = (page: Page, intitule: string) => page.locator(`.g-bar[title^="${intitule} — "]`);

export async function telecharger(page: Page, action: () => Promise<void>) {
	const attente = page.waitForEvent('download');
	await action();
	return (await attente).suggestedFilename();
}
