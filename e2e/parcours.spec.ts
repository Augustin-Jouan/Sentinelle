import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

async function telecharger(page: Page, action: () => Promise<void>) {
	const attente = page.waitForEvent('download');
	await action();
	return (await attente).suggestedFilename();
}

async function saisirTtc(page: Page, designation: string, ttc: string) {
	const champ = page.locator(`tr[data-lot="${designation}"]`).getByLabel('Montant TTC');
	await champ.fill(ttc);
	await champ.press('Enter');
	await expect(champ).not.toHaveValue(ttc);
}

test('du chantier au récapitulatif, en passant par trois versions de marché', async ({ page }) => {
	test.setTimeout(180_000);
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);

	// 2. créer un chantier avec les lots de base
	await page.goto('/chantiers/nouveau');
	await page.getByLabel('Nom du client').fill('M. et Mme MARTIN');
	await page.getByLabel('Adresse du chantier').fill('La Touche');
	await page.getByLabel('Code postal').fill('44110');
	await page.getByLabel('Commune').fill('ERBRAY');
	await page.getByLabel('Signature des marchés prévue le').fill('2026-04-03');
	await page.getByLabel('Référence dossier').fill('PARCOURS');
	await page.getByRole('button', { name: 'Créer le chantier' }).first().click();
	await expect(page).toHaveURL(/\/marches$/);
	const marches = page.url();

	// 3. attribuer une entreprise et saisir un TTC
	await saisirTtc(page, 'GROS ŒUVRE', '115 500');
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: 'à attribuer' }).click();
	await page.getByRole('button', { name: 'Attribuée à' }).click();
	await page.getByPlaceholder('Nom, commune…').fill('rebours');
	await page.keyboard.press('Enter');
	await expect(page.locator('#dd-ent').getByTestId('dd-valeur')).toHaveText('CONSTRUCTIONS REBOURS');

	// 4. ouvrir le marché, écrire la clause sur la feuille, générer la v1
	await page.getByRole('link', { name: 'Ouvrir le marché' }).click();
	const apercu = page.getByRole('dialog', { name: 'Marché de travaux de gré à gré' });
	await apercu.getByRole('textbox', { name: 'Texte libre imprimé en bas du marché — ou rien' }).fill('Clause écrite sur la feuille.');
	expect(await telecharger(page, () => apercu.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PARCOURS-Lot02-GROS-OEUVRE-Marche-v1.pdf');
	await apercu.getByRole('button', { name: 'Fermer' }).click();

	// la v1 se rouvre en lecture seule avec la clause saisie
	await page.getByRole('link', { name: 'Documents' }).click();
	const ligne = page.locator('tr[data-lot="02 — GROS ŒUVRE"]');
	await ligne.getByRole('link', { name: /^v1 ·/ }).click();
	await page.getByRole('button', { name: /^Version/ }).click();
	await page.getByRole('option', { name: /^v1 ·/ }).click();
	const lecture = page.getByRole('dialog', { name: 'Marché de travaux de gré à gré — version 1' });
	await expect(lecture.getByRole('note')).toHaveText('Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.');
	await expect(lecture).toContainText('Clause écrite sur la feuille.');
	await lecture.getByRole('button', { name: 'Fermer' }).click();

	// 5. modifier le lot : « modifié »
	await page.goto(marches);
	await saisirTtc(page, 'GROS ŒUVRE', '116 000');
	await page.getByRole('link', { name: 'Documents' }).click();
	await expect(ligne.getByText('modifié')).toBeVisible();

	// 6. régénérer : v2 — la case du marché rouvre l'aperçu (Task 11)
	await ligne.locator('[data-case="marche"]').click();
	expect(await telecharger(page, () => page.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PARCOURS-Lot02-GROS-OEUVRE-Marche-v2.pdf');
	await page.getByRole('button', { name: 'Fermer' }).click();

	// 7. passer en sous-traitance : v3, même série, autre type
	await page.locator('tr[data-lot="GROS ŒUVRE"]').getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ }).click();
	await page.getByRole('radio', { name: 'Sous-traitance' }).click();
	await expect(page.getByRole('radio', { name: 'Sous-traitance' })).toHaveAttribute('aria-checked', 'true');
	await page.getByRole('link', { name: 'Ouvrir le marché' }).click();
	const st = page.getByRole('dialog', { name: 'Marché de sous-traitance' });
	expect(await telecharger(page, () => st.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PARCOURS-ST-GROS-OEUVRE-Marche-v3.pdf');
	await st.getByRole('button', { name: 'Fermer' }).click();
	await page.getByRole('link', { name: 'Documents' }).click();
	await ligne.locator('[data-case="marche"]').click();
	await page.getByRole('button', { name: /^Version/ }).click();
	const historique = page.getByRole('listbox', { name: 'Version' });
	await expect(historique.getByRole('option', { name: /^v3 ·/ })).toBeVisible();
	await expect(historique.getByRole('option', { name: /^v1 ·/ })).toBeVisible();
	await expect(page.getByRole('dialog', { name: 'Marché de sous-traitance' })).toBeVisible();
	await historique.getByRole('option', { name: /^v1 ·/ }).click();
	await expect(page.getByRole('dialog', { name: 'Marché de travaux de gré à gré — version 1' })).toBeVisible();
	await page.getByRole('button', { name: 'Fermer' }).click();

	// 8. récapitulatif : « Exporter le récap » (Marchés) ouvre l'aperçu ; « Générer le PDF » crée la v1 de la page Documents
	await page.goto(marches);
	await page.getByRole('link', { name: 'Exporter le récap' }).click();
	const recap = page.getByRole('dialog', { name: 'Récapitulatif des marchés' });
	await expect(recap).toContainText('M. et Mme MARTIN');
	await expect(recap.getByText('Télécharger le tableur')).toHaveCount(0);
	expect(await telecharger(page, () => recap.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PARCOURS-RecapMarches-v1.pdf');
	await recap.getByRole('button', { name: 'Fermer' }).click();
	await page.getByRole('link', { name: 'Documents' }).click();
	await expect(page.locator('[data-serie="recap"]')).toContainText('v1');
});
