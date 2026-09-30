import { expect, test, type Page } from '@playwright/test';
import { barre, ligne, ouvrirPlanning, W } from './aidePlanning';

type Point = { x: number; y: number };

/** Point de la piste d'un lot : colonne `col` de l'axe (0 = S15 2026 pour PERRIER), à `dx` px de son bord gauche. */
async function point(page: Page, designation: string, col: number, dx = W / 2): Promise<Point> {
	const box = await ligne(page, designation).locator('.g-piste').boundingBox();
	if (!box) throw new Error(`Piste ${designation} introuvable.`);
	return { x: box.x + col * W + dx, y: box.y + box.height / 2 };
}

async function glisser(page: Page, de: Point, a: Point) {
	await page.mouse.move(de.x, de.y);
	await page.mouse.down();
	await page.mouse.move(a.x, a.y, { steps: 8 });
	await page.mouse.up();
}

test('tracer, déplacer, allonger, sélectionner, décaler, cadre, supprimer, outil Main', async ({ page }) => {
	await ouvrirPlanning(page, 'PLANNING — Gestes');
	const gantt = page.locator('.gantt');
	await ligne(page, 'CHARPENTE').scrollIntoViewIfNeeded();
	await gantt.evaluate((el) => { el.scrollLeft = 0; });
	const toast = (texte: string) => expect(page.locator('[data-sonner-toast]').filter({ hasText: texte }).first()).toBeVisible();
	const fondations = barre(page, 'Fondations et soubassements');
	const rdc = barre(page, 'Élévation RDC');
	const plancher = barre(page, 'Plancher intermédiaire');

	// 1. Tracer sur CHARPENTE, de la S17 à la S19 : période créée, sélectionnée, panneau ouvert.
	await glisser(page, await point(page, 'CHARPENTE', 2), await point(page, 'CHARPENTE', 4));
	await toast('Période créée — semaine 17, 3 sem. Nommez-la si besoin.');
	const panneauCharpente = page.getByRole('dialog', { name: 'CHARPENTE' });
	await expect(panneauCharpente).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(panneauCharpente).toBeHidden();
	await expect(page.locator('.g-bar')).toHaveCount(24);

	// 2. Fondations (S16) portée deux semaines plus tard : pendant le glisser, ni recalage ni cascade.
	const saisie = await point(page, 'GROS ŒUVRE', 2);
	await page.mouse.move(saisie.x, saisie.y);
	await page.mouse.down();
	await page.mouse.move(saisie.x + 2 * W, saisie.y, { steps: 8 });
	await expect(page.locator('.g-chip')).toHaveText('S18 → S20 · 3 sem.');
	await expect(rdc).toHaveAttribute('title', /semaine 20 de 2026/);
	await page.mouse.up();
	await expect(page.locator('.g-chip')).toHaveCount(0);
	await expect(fondations).toHaveAttribute('title', 'Fondations et soubassements — semaine 18 de 2026, 3 semaines');
	await expect(rdc).toHaveAttribute('title', 'Élévation RDC — semaine 21 de 2026, 4 semaines');
	await expect(plancher).toHaveAttribute('title', 'Plancher intermédiaire — semaine 25 de 2026, 2 semaines');
	await toast('1 période décalée à la suite.');

	// 3. Bord droit de l'Élévation RDC (S21-S24) tiré d'une semaine : 5 semaines, le plancher passe en S26.
	const bord = await point(page, 'GROS ŒUVRE', 10, -3);
	await glisser(page, bord, { x: bord.x + W, y: bord.y });
	await expect(rdc).toHaveAttribute('title', 'Élévation RDC — semaine 21 de 2026, 5 semaines');
	await expect(plancher).toHaveAttribute('title', /semaine 26 de 2026/);

	// 4. Clic net : sélection seule et panneau ; Maj + clic : sélection de deux ; → : décalage du groupe.
	await fondations.click();
	const panneauGo = page.getByRole('dialog', { name: 'GROS ŒUVRE' });
	await expect(panneauGo).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(panneauGo).toBeHidden();
	await barre(page, 'Accès et plateforme').click({ modifiers: ['Shift'] });
	await expect(page.locator('.g-bar.is-sel')).toHaveCount(2);
	await expect(page.getByText('2 périodes sélectionnées — ← → pour décaler, Maj = 4 semaines, Suppr, Échap')).toBeVisible();
	await page.keyboard.press('ArrowRight');
	await toast('2 périodes décalées de 1 semaine plus tard — 3 à la suite.');
	await expect(barre(page, 'Accès et plateforme')).toHaveAttribute('title', /semaine 16 de 2026/);
	await expect(fondations).toHaveAttribute('title', /semaine 19 de 2026/);
	await expect(rdc).toHaveAttribute('title', /semaine 22 de 2026/);

	// 5. Échap vide la sélection multiple.
	await page.keyboard.press('Escape');
	await expect(page.locator('.g-bar.is-sel')).toHaveCount(0);
	await expect(page.getByText('Maj + clic ou Maj + glisser : sélection multiple')).toBeVisible();

	// 6. Maj + glisser dans le vide : le cadre sélectionne les barres touchées (Fondations S19-S21, Élévation RDC dès S22).
	const depart = await point(page, 'TERRASSEMENT — V.R.D.', 3);
	const arrivee = await point(page, 'GROS ŒUVRE', 7);
	await page.keyboard.down('Shift');
	await glisser(page, depart, arrivee);
	await page.keyboard.up('Shift');
	await expect(page.locator('.g-bar.is-sel')).toHaveCount(2);
	await expect(fondations).toHaveClass(/is-sel/);
	await expect(rdc).toHaveClass(/is-sel/);

	// 7. Suppr sur deux périodes : confirmation d'abord.
	await page.keyboard.press('Delete');
	const confirmation = page.locator('.ask.is-on');
	await expect(confirmation).toContainText('Supprimer les 2 périodes sélectionnées ?');
	await confirmation.getByRole('button', { name: 'Supprimer' }).click();
	await toast('2 périodes supprimées.');
	await expect(page.locator('.g-bar')).toHaveCount(22);

	// 8. Outil Main : glisser fait défiler la vue ; un clic net sur une barre ouvre le panneau de son lot.
	await page.getByRole('button', { name: 'Main — faire glisser le planning' }).click();
	const prise = await point(page, 'GROS ŒUVRE', 12);
	await glisser(page, prise, { x: prise.x - 300, y: prise.y });
	await expect.poll(() => gantt.evaluate((el) => el.scrollLeft)).toBeGreaterThan(200);
	await plancher.click();
	await expect(page.getByRole('dialog', { name: 'GROS ŒUVRE' })).toBeVisible();
});
