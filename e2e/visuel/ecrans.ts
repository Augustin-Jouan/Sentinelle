import { expect, type Locator, type Page } from '@playwright/test';
import 'dotenv/config';

/**
 * Un écran du banc visuel : comment y aller, et ce qui y change d'un jour à l'autre (masqué).
 * Sélecteurs : rôles, libellés, data-testid — jamais une classe de style (sauf g-* du Gantt).
 */
export type Ecran = {
	nom: string;
	/** Sans connexion (l'écran de connexion lui-même). */
	anonyme?: boolean;
	masques?: (page: Page) => Locator[];
	aller?: (page: Page) => Promise<void>;
};

/** Horloge figée, thème clair, aucun mouvement, polices chargées. */
export async function preparer(page: Page) {
	await page.clock.setFixedTime(new Date('2026-09-30T10:00:00+02:00'));
	await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
	await page.goto('/connexion');
	await page.evaluate(() => document.fonts.ready);
}

export async function seConnecterAdmin(page: Page) {
	await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL ?? '');
	await page.getByLabel('Mot de passe').fill(process.env.ADMIN_MOT_DE_PASSE ?? '');
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
}

const ouvrirPerrier = async (page: Page) => {
	await page.getByRole('button', { name: /^PERRIER — Louisfert/ }).click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
};
const onglet = (nom: string) => async (page: Page) => {
	await ouvrirPerrier(page);
	await page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) }).click();
};

/** Le Gantt au début du chantier. « Aujourd'hui » vient du serveur, pas de l'horloge figée : la semaine en cours est masquée. */
const allerAuPlanning = async (page: Page) => {
	await onglet('Planning')(page);
	await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
};
const masquesPlanning = (page: Page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')];

const allerAuxArtisans = (page: Page) => page.getByRole('link', { name: /^Artisans/ }).click();

const allerA = (chemin: string, titre: string) => async (page: Page) => {
	await page.goto(chemin);
	await expect(page.getByRole('heading', { name: titre })).toBeVisible();
};
const allerAuxComptes = allerA('/admin/comptes', 'Comptes');

export const ECRANS: Ecran[] = [
	{ nom: 'connexion', anonyme: true, aller: async (page) => {
		await page.getByLabel('Adresse e-mail').fill('a.jouan@socoreve.fr');
		await page.getByLabel('Mot de passe').fill('demonstration');
	} },
	{ nom: 'chantiers' },
	{ nom: 'selecteur', aller: (page) => page.getByRole('button', { name: /^Affichage/ }).click() },
	{ nom: 'compte', aller: (page) => page.getByRole('button', { name: 'Mon compte' }).click() },
	{ nom: 'nouveau', aller: (page) => page.getByRole('link', { name: 'Nouveau chantier', exact: true }).click() },
	{ nom: 'marches', aller: ouvrirPerrier },
	{ nom: 'panneau-lot', aller: async (page) => {
		await ouvrirPerrier(page);
		await page.getByRole('row').filter({ hasText: 'CONSTRUCTIONS REBOURS' }).getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ }).click();
	} },
	{ nom: 'planning', masques: masquesPlanning, aller: allerAuPlanning },
	{ nom: 'panneau-planning', masques: masquesPlanning, aller: async (page) => {
		await allerAuPlanning(page);
		await page.locator('.g-fixe[title="Modifier les périodes et la couleur"]').first().click();
	} },
	{ nom: 'fermetures', masques: masquesPlanning, aller: async (page) => {
		await allerAuPlanning(page);
		await page.getByRole('button', { name: 'Fermetures' }).click();
	} },
	{ nom: 'documents', aller: onglet('Documents') },
	{ nom: 'artisans', aller: allerAuxArtisans },
	{ nom: 'fiche-artisan', aller: async (page) => {
		await allerAuxArtisans(page);
		await page.getByRole('row').filter({ hasText: 'AM COUVERTURE' }).getByRole('cell').first().click();
	} },
	{ nom: 'parametres', aller: allerA('/parametres', 'Paramètres de l\'entreprise') },
	{ nom: 'comptes', aller: allerAuxComptes },
	{ nom: 'nouveau-compte', aller: async (page) => {
		await allerAuxComptes(page);
		await page.getByRole('button', { name: 'Nouveau compte' }).click();
	} },
	// Crée un compte : vient après « comptes », que ce compte ne doit pas encore changer.
	{ nom: 'mot-de-passe-provisoire', aller: async (page) => {
		await allerAuxComptes(page);
		await page.getByRole('button', { name: 'Nouveau compte' }).click();
		await page.getByLabel('Nom').fill('Camille Banc');
		await page.getByLabel('E-mail').fill('camille.banc@socoreve.local');
		await page.getByRole('button', { name: 'Créer le compte' }).click();
		// Tiré au hasard : remplacé par un texte fixe de même longueur.
		await page.getByRole('dialog', { name: 'Mot de passe provisoire' }).getByTestId('mot-de-passe-provisoire')
			.evaluate((el) => { el.textContent = 'ABCDEFGHJKMNPQRS'; });
	} },
];

export async function ouvrirEcran(page: Page, ecran: Ecran) {
	await preparer(page);
	if (!ecran.anonyme) await seConnecterAdmin(page);
	await ecran.aller?.(page);
	await page.mouse.move(0, 0);   // aucun survol dans la capture
}
