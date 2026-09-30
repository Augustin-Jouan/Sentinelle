import { expect, type Page } from '@playwright/test';
import 'dotenv/config';

export const ADMIN = {
	email: process.env.ADMIN_EMAIL ?? 'admin@socoreve.local',
	motDePasse: process.env.ADMIN_MOT_DE_PASSE ?? '',
};

export async function seConnecter(page: Page, email: string, motDePasse: string) {
	await page.goto('/connexion');
	await page.getByLabel('Adresse e-mail').fill(email);
	await page.getByLabel('Mot de passe').fill(motDePasse);
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page).not.toHaveURL(/\/connexion/);
}
