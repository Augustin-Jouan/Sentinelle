import { expect, test, type Locator, type Page } from '@playwright/test';
import { ADMIN, carteChantier, seConnecter } from './aide';

async function creerChantierVide(page: Page, reference: string) {
	await page.goto('/chantiers/nouveau');
	await page.getByLabel('Nom du client').fill('Client test');
	await page.getByLabel('Référence dossier').fill(reference);
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page).toHaveURL(/\/marches$/);
	await page.goto('/chantiers');
	await expect(carteChantier(page, reference)).toBeVisible();
}

async function ouvrirAlerteSuppression(page: Page, reference: string): Promise<Locator> {
	await carteChantier(page, reference).getByRole('button', { name: `Supprimer ${reference}` }).click();
	const alerte = page.getByRole('alertdialog');
	await expect(alerte).toBeVisible();
	await expect(alerte.getByText('Chargement…')).toBeHidden();
	return alerte;
}

function champPhrase(alerte: Locator, reference: string) {
	return alerte.getByLabel(`Pour confirmer, tapez : je supprime ${reference}`);
}

test('EX-3 — supprime un chantier après avoir tapé la phrase', async ({ page }) => {
	const reference = 'SUPPR EX3 — Phrase';
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await creerChantierVide(page, reference);
	const alerte = await ouvrirAlerteSuppression(page, reference);
	const supprimer = alerte.getByRole('button', { name: 'Supprimer' });
	await champPhrase(alerte, reference).fill('je supprime');
	await expect(supprimer).toBeDisabled();
	await champPhrase(alerte, reference).fill(`je supprime ${reference}`.toLowerCase());
	await expect(supprimer).toBeEnabled();
	await supprimer.click();
	await expect(alerte).toBeHidden();
	await expect(carteChantier(page, reference)).toBeHidden();
	await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'supprimé.' }).first()).toBeVisible();
});

test('EX-3 — Échap ferme l\'alerte sans supprimer', async ({ page }) => {
	const reference = 'SUPPR EX3 — Échap';
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await creerChantierVide(page, reference);
	const alerte = await ouvrirAlerteSuppression(page, reference);
	await champPhrase(alerte, reference).fill(`je supprime ${reference}`);
	await page.keyboard.press('Escape');
	await expect(alerte).toBeHidden();
	await expect(carteChantier(page, reference)).toBeVisible();
});

test('EX-3 — le champ a le focus et Entrée ne supprime qu\'avec la bonne phrase', async ({ page }) => {
	const reference = 'SUPPR EX3 — Entrée';
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await creerChantierVide(page, reference);
	const alerte = await ouvrirAlerteSuppression(page, reference);
	const saisie = champPhrase(alerte, reference);
	await expect(saisie).toBeFocused();
	await saisie.fill('je supprime');
	await saisie.press('Enter');
	await expect(alerte).toBeVisible();
	await expect(carteChantier(page, reference)).toBeVisible();
	await saisie.fill(`je supprime ${reference}`.toLowerCase());
	await saisie.press('Enter');
	await expect(alerte).toBeHidden();
	await expect(carteChantier(page, reference)).toBeHidden();
});

test('EX-3 — un clic hors de l\'alerte ferme sans supprimer et la saisie est vide à la réouverture', async ({ page }) => {
	const reference = 'SUPPR EX3 — Voile';
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await creerChantierVide(page, reference);
	const alerte = await ouvrirAlerteSuppression(page, reference);
	await champPhrase(alerte, reference).fill('je supprime inachevé');
	const cadre = await alerte.boundingBox();
	if (!cadre) throw new Error('Surcouche de suppression introuvable.');
	await page.mouse.click(cadre.x + 8, cadre.y + 8);
	await expect(alerte).toBeHidden();
	await expect(carteChantier(page, reference)).toBeVisible();
	const reouverture = await ouvrirAlerteSuppression(page, reference);
	await expect(champPhrase(reouverture, reference)).toHaveValue('');
});
