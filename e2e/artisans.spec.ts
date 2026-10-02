import { expect, test } from '@playwright/test';
import { ADMIN, seConnecter } from './aide';

test('la raison sociale vide est refusée, sur son champ', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/artisans');
	await page.getByRole('button', { name: 'Ajouter une entreprise' }).click();
	const fiche = page.getByRole('dialog', { name: 'Ajouter au référentiel' });
	await fiche.getByRole('button', { name: 'Ajouter', exact: true }).click();
	const nom = fiche.getByRole('textbox', { name: 'Raison sociale' });
	await expect(nom).toBeFocused();
	await expect(nom).toHaveAccessibleDescription('La raison sociale est obligatoire.');
	await expect(nom).toHaveAttribute('aria-invalid', 'true');
});

test('ajoute une entreprise, l\'archive puis la réactive', async ({ page }) => {
	await seConnecter(page, ADMIN.email, ADMIN.motDePasse);
	await page.goto('/artisans');
	await page.getByRole('button', { name: 'Ajouter une entreprise' }).click();
	const fiche = page.getByRole('dialog', { name: 'Ajouter au référentiel' });
	await fiche.getByRole('textbox', { name: 'Raison sociale' }).fill('ÉBÉNISTERIE DU BANC');
	await fiche.getByRole('textbox', { name: 'Commune' }).fill('DERVAL');
	await fiche.getByRole('button', { name: 'Ajouter', exact: true }).click();
	await expect(page.getByText('ÉBÉNISTERIE DU BANC ajoutée au référentiel.')).toBeVisible();

	const ligne = page.getByRole('row').filter({ hasText: 'ÉBÉNISTERIE DU BANC' });
	await ligne.getByRole('button', { name: 'Supprimer' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Archiver' }).click();
	await expect(ligne.getByText('Archivée', { exact: true })).toBeVisible();
	await expect(ligne.getByRole('cell').first()).toHaveCSS('text-decoration-line', 'line-through');

	await ligne.getByRole('button', { name: 'Réactiver' }).click();
	await expect(ligne.getByText('Archivée', { exact: true })).toHaveCount(0);
	await expect(ligne.getByRole('button', { name: 'Supprimer' })).toBeVisible();
});
