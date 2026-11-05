import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

/** Une image bien plus grande que ce que les documents impriment, dessinée dans la page. */
async function grandPng(page: Page): Promise<Buffer> {
	const base64 = await page.evaluate(() => {
		const toile = document.createElement('canvas');
		toile.width = 2400;
		toile.height = 600;
		const c = toile.getContext('2d')!;
		c.fillStyle = '#1c4e80';
		c.fillRect(0, 0, 2400, 600);
		return toile.toDataURL('image/png').split(',')[1];
	});
	return Buffer.from(base64, 'base64');
}

const logos = (page: Page) => page.getByRole('img', { name: 'Logo de l\'entreprise' });

test('dépose un logo, le réduit, le garde au rechargement, puis le retire', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/parametres');
	const avant = await logos(page).first().getAttribute('src');

	await page.getByLabel('Choisir un logo').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await grandPng(page) });
	await expect(logos(page).first()).not.toHaveAttribute('src', avant!);
	await expect(page.getByText('Logo enregistré.')).toBeVisible();

	await page.reload();
	// Le champ et les deux feuilles d'aperçu.
	await expect(logos(page)).toHaveCount(3);
	const src = await logos(page).first().getAttribute('src');
	expect(src).toMatch(/^data:image\/png;base64,/);
	const largeur = await logos(page).first().evaluate((i: HTMLImageElement) => i.naturalWidth);
	expect(largeur).toBe(600);

	await page.getByRole('button', { name: 'Retirer' }).click();
	await expect(logos(page)).toHaveCount(0);
	await expect(page.getByText('Aucun logo')).toBeVisible();
	await page.reload();
	await expect(logos(page)).toHaveCount(0);
});

test('refuse un fichier qui n\'est pas une image PNG ou JPEG', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/parametres');
	await page.getByLabel('Choisir un logo').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
	await expect(page.getByText('Choisissez une image PNG ou JPEG.')).toBeVisible();
});
