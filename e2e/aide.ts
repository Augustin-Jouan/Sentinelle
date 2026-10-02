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

/** Un onglet du chantier ouvert, par le début de son nom (son compteur le suit). */
export const onglet = (page: Page, nom: string) =>
	page.getByRole('navigation', { name: 'Écrans du chantier' }).getByRole('link', { name: new RegExp(`^${nom}`) });

/** Ouvre le menu du compte (le bouton rond des initiales). */
export const ouvrirMenuCompte = (page: Page) => page.getByRole('button', { name: 'Mon compte' }).click();

/** La carte d'un chantier sur l'accueil, par sa référence. */
export const carteChantier = (page: Page, reference: string) => page.getByTestId('carte-chantier').filter({ hasText: reference });
