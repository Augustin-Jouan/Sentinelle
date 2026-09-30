import { expect, test, type Page } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';
import { telecharger } from './aidePlanning';

/** Les espaces de formatEuros : fine insécable entre les milliers, insécable avant « € ». */
const saisie = (s: string) => s.replace(/ /g, ' ');
const eur = (s: string) => `${saisie(s)} €`;

const lignePeinture = (page: Page) => page.locator('tr[data-lot="PEINTURE"]');

async function ouvrirPanneau(page: Page) {
	await lignePeinture(page).locator('td').nth(2).click();
	const panneau = page.getByRole('dialog', { name: 'PEINTURE' });
	await expect(panneau).toBeVisible();
	return panneau;
}

// Spec § 9 : PEINTURE (LA DÉCO'TECH), HT initial 9 450,00 €, TVA 20 %, retenue 5 %.
test('avenant, lettre, acomptes antérieurs, certificat et correction', async ({ page }) => {
	test.setTimeout(180_000);
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/chantiers');
	await page.locator('.chantier', { hasText: 'FINANCIER' }).click();
	await expect(page).toHaveURL(/\/marches$/);
	const ttc = lignePeinture(page).getByLabel('Montant TTC');
	await expect(ttc).toHaveValue(saisie('11 340,00'));

	// 0. Le marché de PEINTURE existe avant l'avenant.
	let panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Ouvrir le marché' }).click();
	const marche = page.getByRole('dialog', { name: 'Marché de travaux de gré à gré' });
	expect(await telecharger(page, () => marche.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Marche-v1.pdf');
	await marche.getByRole('button', { name: 'Fermer' }).click();
	await expect(marche).toBeHidden();

	// 1. Avenant n° 01 de −300,00 € HT : le TTC du tableau passe à 10 980,00 €.
	panneau = await ouvrirPanneau(page);
	await expect(panneau).toContainText("Aucun avenant. Le marché vaut son montant d'origine.");
	await panneau.getByRole('button', { name: 'Ajouter un avenant' }).click();
	await expect(page.getByText('Avenant n° 01 ajouté — saisissez son montant.')).toBeVisible();
	const montant = panneau.getByLabel("Montant HT de l'avenant n° 01");
	await montant.fill('-300');
	await montant.press('Enter');
	await expect(ttc).toHaveValue(saisie('10 980,00'));
	await expect(panneau.getByTestId('somme-avenants')).toHaveText(`− ${eur('300,00')}`);
	await expect(panneau).toContainText('Montant initial HT');

	// 2. La lettre : l'objet s'écrit sur la feuille, puis la v1.
	await panneau.getByRole('link', { name: "Ouvrir la lettre de l'avenant n° 01" }).click();
	const lettre = page.getByRole('dialog', { name: 'Avenant n° 01' });
	await expect(lettre).toContainText('Travaux en moins-value');
	await expect(lettre).toContainText(`${eur('360,00')} TTC`);
	await expect(lettre).toContainText(`${eur('10 980,00')} TTC`);
	const objet = lettre.getByRole('textbox', { name: "Objet de l'avenant" });
	await objet.click();
	await objet.pressSequentially('Suppression des peintures du garage.');
	expect(await telecharger(page, () => lettre.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Avenant01-v1.pdf');
	await lettre.getByRole('button', { name: 'Fermer' }).click();
	await expect(lettre).toBeHidden();

	// 3. Deux acomptes antérieurs, puis le certificat n° 03 : cumul 7 000,00 € HT, caution OUI.
	panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Certificat de paiement' }).click();
	const cp = page.getByRole('dialog', { name: 'Certificat de paiement' });
	await expect(cp).toContainText('CERTIFICAT DE PAIEMENT N° 01');
	for (const [i, [frappe, valeur]] of ([['2000', '2 000,00'], ['3000', '3 000,00']] as const).entries()) {
		const ajout = cp.getByLabel('Ajouter un acompte antérieur');
		await ajout.fill(frappe);
		await ajout.press('Enter');
		await expect(cp.getByLabel(`Acompte ${i + 1} HT`)).toHaveValue(saisie(valeur));
	}
	await expect(cp).toContainText('CERTIFICAT DE PAIEMENT N° 03');
	await cp.getByLabel('Montant des travaux réalisés HT (cumul)').fill('7000');
	await cp.getByRole('button', { name: 'Caution bancaire : non' }).click();
	await expect(cp.getByRole('button', { name: 'Caution bancaire : oui' })).toBeVisible();
	const titulaire = (libelle: string) => cp.locator('table.cp-titu tr', { hasText: libelle });
	await expect(cp.locator('.cp-montants')).toContainText(eur('9 150,00'));
	await expect(cp.locator('table.cp-prec')).toContainText(eur('5 000,00'));
	await expect(titulaire('Montant du présent acompte HT')).toContainText(eur('2 000,00'));
	await expect(titulaire('Montant de la TVA')).toContainText(eur('400,00'));
	await expect(titulaire('Montant du présent acompte TTC')).toContainText(eur('2 400,00'));
	await expect(titulaire('Dont retenue de garantie')).toContainText(eur('0,00'));
	await expect(cp.locator('.cp-somme')).toHaveText(eur('2 400,00'));
	expect(await telecharger(page, () => cp.getByRole('button', { name: 'Générer le PDF' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Certificat03-v1.pdf');
	await expect(cp).toBeHidden();

	// 4. Correction du n° 03 : cumul 7 500,00 € → présent acompte 2 500,00 HT, mandaté 3 000,00 € ; v2.
	panneau = await ouvrirPanneau(page);
	await panneau.getByRole('link', { name: 'Corriger le certificat n° 03' }).click();
	const cumul = cp.getByLabel('Montant des travaux réalisés HT (cumul)');
	await expect(cumul).toHaveValue(saisie('7 000,00'));
	await cumul.fill('7500');
	await expect(titulaire('Montant du présent acompte HT')).toContainText(eur('2 500,00'));
	await expect(cp.locator('.cp-somme')).toHaveText(eur('3 000,00'));
	expect(await telecharger(page, () => cp.getByRole('button', { name: 'Générer la v2' }).click()))
		.toBe('FINANCIER-Lot11-PEINTURE-Certificat03-v2.pdf');
	await expect(cp).toBeHidden();

	// 5. Documents : colonnes Avenants et Certificats ; « n° 01 · hors appli », « n° 03 · v2 », sans pastille « modifié ».
	await page.getByRole('link', { name: 'Documents' }).click();
	const ligneDoc = page.locator('tr[data-lot="11 — PEINTURE"]');
	const colonne = (i: number) => ligneDoc.locator('td').nth(i);
	await expect(page.getByRole('columnheader', { name: 'Avenants' }).first()).toBeVisible();
	await expect(page.getByRole('columnheader', { name: 'Certificats' }).first()).toBeVisible();
	// Le marché généré avant l'avenant reste à jour ; la lettre aussi.
	await expect(colonne(0).getByText('modifié', { exact: true })).toHaveCount(0);
	await expect(colonne(1).locator('[data-case="avenant"]')).toHaveText(/n° 01 · − 300/);
	const certificats = colonne(2).locator('[data-case="certificat"]');
	await expect(colonne(2).locator('.dm-plus')).toHaveText('1 avant');
	await expect(certificats).toHaveCount(2);
	await expect(certificats.nth(0)).toHaveText('n° 02 · hors appli');
	await expect(certificats.nth(1)).toContainText('n° 03 · v2');
	await expect(colonne(2).getByText('modifié', { exact: true })).toHaveCount(0);
	// Historique des versions : aperçu, Task 12.
	await certificats.nth(1).click();
	const version = page.getByRole('dialog', { name: 'Certificat de paiement — version 2' });
	await expect(version.locator('.cp-somme')).toHaveText(eur('3 000,00'));
	await expect(version.getByRole('link', { name: 'Télécharger le PDF' })).toBeVisible();
});
