import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { onglet } from './aide';
import { barre, ligne, ouvrirPlanning, telecharger } from './aidePlanning';

/** Mesures du planning PERRIER dans le Chromium du PDF (Task 7) : l'aperçu doit trouver les mêmes. */
const MESURES = JSON.parse(readFileSync('tests/fixtures/mesures-perrier-planning.json', 'utf8')) as { pas: number; echelle: number };

test('planning imprimable, feuille de visa, états dans Documents', async ({ page }) => {
	test.setTimeout(180_000);
	await ouvrirPlanning(page, 'PLANNING — Documents');
	const apercu = page.getByRole('dialog', { name: 'Planning prévisionnel', exact: true });
	const visa = page.getByRole('dialog', { name: 'Feuille de visa du planning' });
	const cartePlanning = page.locator('[data-serie="planning"]');
	const carteVisa = page.locator('[data-serie="visa"]');
	const allerA = (nom: string) => onglet(page, nom).click();

	// 1. Planning imprimable : l'aperçu mesure comme le PDF ; la génération crée la v1.
	await page.getByRole('link', { name: 'Planning imprimable' }).click();
	await expect(apercu.locator('#feuille-unique')).toHaveAttribute('data-pas', String(MESURES.pas));
	await expect(apercu.locator('#feuille-unique')).toHaveAttribute('data-echelle', String(MESURES.echelle));
	expect(await telecharger(page, () => apercu.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PLANNING-DOCUMENTS-Planning-v1.pdf');
	await apercu.getByRole('button', { name: 'Fermer' }).click();
	await expect(apercu).toBeHidden();

	// 2. Feuille de visa : elle porte sur la v1.
	await page.getByRole('link', { name: 'Feuille de visa' }).click();
	await expect(visa).toContainText(
		/Planning prévisionnel des travaux sur la période de la Semaine 15 de 2026 à la Semaine 9 de 2027 \(version 1 du \d{2}\.\d{2}\.\d{4}\)/,
	);
	expect(await telecharger(page, () => visa.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PLANNING-DOCUMENTS-VisaPlanning-v1.pdf');
	await page.keyboard.press('Escape');
	await expect(visa).toBeHidden();

	// 3. Documents : les deux séries à jour ; la version 1 s'ouvre sur une seule feuille, mesurée pareil.
	await allerA('Documents');
	await expect(cartePlanning.getByTestId('carte-version')).toHaveText('v1');
	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
	await expect(carteVisa.getByTestId('carte-version')).toHaveText('v1');
	await expect(carteVisa.getByText('périmé', { exact: true })).toHaveCount(0);
	await cartePlanning.getByTestId('carte-valeur').click();
	await expect(apercu.locator('#feuille-unique')).toHaveAttribute('data-pas', String(MESURES.pas));
	await page.keyboard.press('Escape');
	await expect(apercu).toBeHidden();

	// 4. Une période change : le planning est « modifié » ; le visa reste sur la dernière version générée.
	await allerA('Planning');
	await ligne(page, 'PEINTURE').locator('.g-fixe').click();
	const duree = page.getByRole('dialog', { name: 'PEINTURE' }).getByRole('textbox', { name: 'Durée' });
	await duree.fill('4');
	await duree.press('Enter');
	await expect(barre(page, 'Peintures')).toHaveAttribute('title', /4 semaines$/);
	await page.keyboard.press('Escape');
	await allerA('Documents');
	await expect(cartePlanning.getByText('modifié', { exact: true })).toBeVisible();
	await expect(carteVisa.getByText('périmé', { exact: true })).toHaveCount(0);

	// 5. Le visa signale le planning modifié ; on génère d'abord le planning (v2).
	await carteVisa.getByRole('link', { name: 'Réimprimer' }).click();
	await expect(visa).toContainText('Le planning a changé depuis la v1 : ce visa portera sur la v1.');
	await expect(visa.getByRole('button', { name: 'Générer le visa sur la v1' })).toBeVisible();
	await visa.getByRole('link', { name: "Générer le planning d'abord" }).click();
	expect(await telecharger(page, () => apercu.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('PLANNING-DOCUMENTS-Planning-v2.pdf');
	await apercu.getByRole('button', { name: 'Fermer' }).click();

	// 6. Documents : le visa fait signer la v1, la v2 existe : périmé.
	await allerA('Documents');
	await expect(cartePlanning.getByTestId('carte-version')).toHaveText('v2');
	await expect(cartePlanning.getByText('modifié', { exact: true })).toHaveCount(0);
	await expect(carteVisa.getByText('périmé', { exact: true })).toBeVisible();
});
