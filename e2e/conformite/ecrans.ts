import { expect, type Page } from '@playwright/test';
import 'dotenv/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Cible = 'maquette' | 'app';
export type Ecran = { nom: string; masques?: string[]; aller?: (page: Page) => Promise<void> };

const MAQUETTE = pathToFileURL(path.resolve('docs/maquette/sentinelle-marches.html')).href;
const POLICES: Record<string, string> = {
	'Figtree:400': 'figtree-400', 'Figtree:500': 'figtree-500', 'Figtree:600': 'figtree-600',
	'Outfit:500': 'outfit-500', 'Outfit:600': 'outfit-600', 'Outfit:700': 'outfit-700',
	'Spline Sans Mono:400': 'spline-sans-mono-400', 'Spline Sans Mono:500': 'spline-sans-mono-500', 'Spline Sans Mono:600': 'spline-sans-mono-600',
};

/** Mêmes polices des deux côtés, sans réseau : la feuille Google Fonts de la maquette pointe vers public/polices. */
async function policesLocales(page: Page) {
	const css = Object.entries(POLICES).map(([cle, fichier]) => {
		const [famille, poids] = cle.split(':');
		return `@font-face{font-family:'${famille}';font-weight:${poids};font-display:block;src:url('https://fonts.gstatic.com/local/${fichier}.woff2') format('woff2')}`;
	}).join('\n');
	await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: css }));
	await page.route('https://fonts.gstatic.com/local/**', (r) => r.fulfill({
		path: `public/polices/${path.basename(new URL(r.request().url()).pathname)}`,
		contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' },
	}));
}

export async function preparer(page: Page, cible: Cible) {
	await page.clock.setFixedTime(new Date('2026-09-30T10:00:00+02:00'));
	await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
	if (cible === 'maquette') await policesLocales(page);
	await page.goto(cible === 'maquette' ? MAQUETTE : '/connexion');
	await page.evaluate(() => document.fonts.ready);
}

export async function seConnecterSur(page: Page, cible: Cible) {
	if (cible === 'app') {
		await page.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL ?? '');
		await page.getByLabel('Mot de passe').fill(process.env.ADMIN_MOT_DE_PASSE ?? '');
	}
	await page.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await expect(page.getByRole('heading', { name: 'Mes chantiers' })).toBeVisible();
}

const ouvrirPerrier = async (page: Page) => {
	await page.locator('.chantier', { hasText: 'PERRIER — Louisfert' }).first().click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
};
const onglet = (nom: string) => async (page: Page) => {
	await ouvrirPerrier(page);
	await page.locator('.nav-o', { hasText: nom }).click();
};

/**
 * Playwright peint le masque sur la boîte de l'élément. Le menu compte de l'app est plus haut
 * (écart 1 : Paramètres, Comptes) : un masque sur `.compte-menu` diffère. Clip de taille fixe,
 * ancré sur le menu, assez grand pour l'app et son ombre (--ombre-h).
 */
async function poserMasqueCompte(page: Page) {
	const menu = page.locator('.compte-menu');
	await expect(menu).toBeVisible();
	await menu.evaluate((el) => {
		const r = el.getBoundingClientRect();
		const clip = document.createElement('div');
		clip.id = 'conformite-masque';
		const marge = 24;
		Object.assign(clip.style, {
			position: 'fixed',
			top: `${r.top - marge}px`,
			left: `${r.left - marge}px`,
			width: `${r.width + marge * 2}px`,
			height: '280px',
			zIndex: '99999',
			pointerEvents: 'none',
		});
		document.body.appendChild(clip);
	});
}

export const ECRANS: Ecran[] = [
	{ nom: 'connexion', masques: ['.login-foot'] },
	{ nom: 'chantiers', aller: async () => {} },
	{ nom: 'selecteur', aller: async (page) => { await page.locator('.picker-btn').click(); } },
	{ nom: 'compte', masques: ['#conformite-masque'], aller: async (page) => {
		await page.locator('.avatar').click();
		await poserMasqueCompte(page);
	} },
	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
	{ nom: 'nouveau', masques: ['.field:has(#f-ca)'], aller: async (page) => { await page.locator('.topbar-actions .btn-primary', { hasText: 'Nouveau chantier' }).click(); } },
	{ nom: 'marches', aller: ouvrirPerrier },
	{ nom: 'panneau-lot', aller: async (page) => { await ouvrirPerrier(page); await page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent').click(); } },
	{ nom: 'planning', masques: ['.g-auj', '.g-sems .auj'], aller: async (page) => {
		await onglet('Planning')(page);
		await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
	} },
	{ nom: 'documents', aller: onglet('Documents') },
	{ nom: 'artisans', aller: async (page) => { await page.locator('.nav-b', { hasText: 'Artisans' }).click(); } },
];

export async function ouvrirEcran(page: Page, cible: Cible, ecran: Ecran) {
	await preparer(page, cible);
	if (ecran.nom === 'connexion') {
		// L'app n'a pas de valeurs préremplies : on tape celles que montre la maquette.
		if (cible === 'app') {
			await page.getByLabel('Adresse e-mail').fill('a.jouan@socoreve.fr');
			await page.getByLabel('Mot de passe').fill('demonstration');
		}
		return;
	}
	await seConnecterSur(page, cible);
	await ecran.aller?.(page);
	await page.mouse.move(0, 0);   // aucun survol dans la capture
}
