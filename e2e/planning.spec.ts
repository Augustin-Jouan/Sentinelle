import { expect, test } from '@playwright/test';
import { barre, ligne, ouvrirPlanning } from './aidePlanning';

test.describe('écran Planning', () => {
	test.beforeEach(async ({ page }) => {
		await ouvrirPlanning(page, 'PLANNING — Écran');
	});

	test('onglet, résumé, grille, fermetures, entreprises, infobulles et flèches', async ({ page }) => {
		const onglets = page.getByRole('navigation', { name: 'Écrans du chantier' }).getByRole('link');
		await expect(onglets).toHaveText([/Marchés/, /Planning/, /Documents/]);
		await expect(page.locator('#g-resume')).toHaveText('23 périodes · semaine 15 de 2026 à la semaine 13 de 2027');
		await expect(page.locator('.g-row[data-lot]')).toHaveCount(13);
		await expect(page.locator('.g-bar')).toHaveCount(23);
		await expect(page.locator('.g-ferm-lbl')).toHaveText(["Congés d'été", 'Congés de Noël']);
		await expect(barre(page, 'Fondations et soubassements')).toHaveAttribute('title', 'Fondations et soubassements — semaine 16 de 2026, 3 semaines');
		await expect(ligne(page, 'ENDUIT EXTÉRIEUR').locator('.g-sous')).toHaveText('à attribuer');
		await expect(ligne(page, 'GROS ŒUVRE').locator('.g-sous')).toHaveText('CONSTRUCTIONS REBOURS · 06-77-07-05-38');
		await expect(page.locator('.g-liens g > path')).toHaveCount(13);
	});

	test('panneau du lot : couleur, durée, saisie refusée, lien retiré', async ({ page }) => {
		await ligne(page, 'PEINTURE').locator('.g-fixe').click();
		const panneau = page.getByRole('dialog', { name: 'PEINTURE' });
		await panneau.getByRole('button', { name: 'Violet' }).click();
		await expect(ligne(page, 'PEINTURE').locator('.g-puce')).toHaveCSS('background-color', 'rgb(122, 64, 146)');

		const duree = panneau.getByRole('textbox', { name: 'Durée' });
		await duree.fill('4');
		await duree.press('Enter');
		await expect(barre(page, 'Peintures')).toHaveAttribute('title', 'Peintures — semaine 7 de 2027, 4 semaines');

		await duree.fill('abc');
		await duree.press('Enter');
		await expect(page.getByText('Durée : saisissez un nombre entier.')).toBeVisible();
		await expect(duree).toHaveAttribute('aria-invalid', 'true');

		await panneau.getByRole('button', { name: /Commence après/ }).click();
		await panneau.getByRole('option', { name: '— rien, date libre —' }).click();
		await expect(page.getByText('Lien retiré — la période redevient libre.')).toBeVisible();
	});

	test('fermetures : ajouter, renommer, supprimer', async ({ page }) => {
		await page.getByRole('button', { name: 'Fermetures', exact: true }).click();
		const fenetre = page.getByRole('dialog', { name: 'Périodes de fermeture' });
		await fenetre.getByRole('button', { name: 'Ajouter' }).click();
		const libelles = fenetre.getByRole('textbox', { name: 'Libellé' });
		await expect(libelles).toHaveCount(3);
		// Ajoutée au début de l'axe (S15 2026), elle passe en tête.
		await expect(libelles.first()).toHaveValue('Congés');
		await libelles.first().fill('Pont de mai');
		await libelles.first().press('Enter');
		await expect(page.locator('.g-ferm-lbl').first()).toHaveText('Pont de mai');
		await fenetre.getByRole('button', { name: 'Supprimer la fermeture Pont de mai' }).click();
		await expect(page.locator('.g-ferm-lbl')).toHaveCount(2);
	});

	test('densité et lots masqués, gardés au rechargement', async ({ page }) => {
		const largeurSemaine = () => page.locator('.gantt').evaluate((el) => getComputedStyle(el).getPropertyValue('--sem-w').trim());
		await page.getByRole('button', { name: 'Large' }).click();
		await expect.poll(largeurSemaine).toBe('68px');

		await page.getByRole('button', { name: 'Tous les lots' }).click();
		await page.locator('#lots-vus').getByRole('option', { name: /ESCALIER/ }).click();
		await expect(page.locator('#g-resume')).toHaveText('22 périodes sur 23 · semaine 15 de 2026 à la semaine 13 de 2027');
		await page.keyboard.press('Escape');

		await page.reload();
		await expect(page.locator('.g-row[data-lot]')).toHaveCount(12);
		await expect.poll(largeurSemaine).toBe('68px');

		await page.getByRole('button', { name: '12 lots sur 13' }).click();
		await page.locator('#lots-vus').getByRole('option', { name: 'Tout afficher' }).click();
		await expect(page.locator('.g-row[data-lot]')).toHaveCount(13);
	});
});
