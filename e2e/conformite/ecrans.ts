import { expect, type Locator, type Page } from '@playwright/test';
import 'dotenv/config';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Cible = 'maquette' | 'app';
/**
 * Un écran du banc. Les deux côtés n'ont pas le même balisage : `aller` et `masques` reçoivent la cible,
 * et `selon` choisit le sélecteur. Côté app : rôles, libellés, data-testid — jamais une classe de style
 * (sauf g-* du Gantt). Côté maquette : ses classes, puisqu'elle ne change plus.
 */
export type Ecran = {
	nom: string;
	masques?: (page: Page, cible: Cible) => Locator[];
	aller?: (page: Page, cible: Cible) => Promise<void>;
};

export const selon = <T>(cible: Cible, maquette: T, app: T): T => (cible === 'maquette' ? maquette : app);

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

const ouvrirPerrier = async (page: Page, cible: Cible) => {
	await selon(cible, page.locator('.chantier', { hasText: 'PERRIER — Louisfert' }).first(),
		page.getByRole('button', { name: /^PERRIER — Louisfert/ })).click();
	await expect(page.getByRole('heading', { name: 'Marchés & récapitulatif' })).toBeVisible();
};
const onglet = (nom: string) => async (page: Page, cible: Cible) => {
	await ouvrirPerrier(page, cible);
	await selon(cible, page.locator('.nav-o', { hasText: nom }),
		page.locator('header').getByRole('link', { name: new RegExp(`^${nom}`) })).click();
};

const allerAuxArtisans = async (page: Page, cible: Cible) => {
	await selon(cible, page.locator('.nav-b', { hasText: 'Artisans' }), page.getByRole('link', { name: /^Artisans/ })).click();
};

/** Le Gantt au début du chantier ; la semaine en cours bouge avec la date, elle est masquée. */
const allerAuPlanning = async (page: Page, cible: Cible) => {
	await onglet('Planning')(page, cible);
	await page.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
};
const masquesPlanning = (page: Page) => [page.locator('.g-auj'), page.locator('.g-sems .auj')];

/**
 * Playwright peint le masque sur la boîte de l'élément. Le menu compte de l'app est plus haut
 * (écart 1 : Paramètres, Comptes) : un masque sur le menu diffère. Clip de taille fixe,
 * ancré sur le menu, assez grand pour l'app et son ombre (--ombre-h).
 */
async function poserMasqueCompte(page: Page, cible: Cible) {
	const menu = selon(cible, page.locator('.compte-menu'), page.getByRole('menu'));
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
	{ nom: 'connexion', masques: (page, cible) => [selon(cible, page.locator('.login-foot'), page.getByText('Accès réservé aux comptes SOCOREVE.'))] },
	{ nom: 'chantiers', aller: async () => {} },
	{ nom: 'selecteur', aller: async (page, cible) => {
		await selon(cible, page.locator('.picker-btn'), page.getByRole('button', { name: /^Affichage/ })).click();
	} },
	{ nom: 'compte', masques: (page) => [page.locator('#conformite-masque')], aller: async (page, cible) => {
		await selon(cible, page.locator('.avatar'), page.getByRole('button', { name: 'Mon compte' })).click();
		await poserMasqueCompte(page, cible);
	} },
	// Chargé d'affaire : un menu de comptes dans l'app, un champ texte dans la maquette (écart 4). Le même cadre est masqué des deux côtés.
	{ nom: 'nouveau', masques: (page, cible) => [selon(cible, page.locator('.field:has(#f-ca)'), page.locator('#f-ca').locator('xpath=..'))],
		aller: async (page, cible) => {
			await selon(cible, page.locator('.topbar-actions .btn-primary', { hasText: 'Nouveau chantier' }),
				page.getByRole('link', { name: 'Nouveau chantier', exact: true })).click();
		} },
	{ nom: 'marches', aller: ouvrirPerrier },
	{ nom: 'panneau-lot', aller: async (page, cible) => {
		await ouvrirPerrier(page, cible);
		await selon(cible, page.locator('table.lots tbody tr', { hasText: 'CONSTRUCTIONS REBOURS' }).locator('.cell-ent'),
			page.getByRole('row').filter({ hasText: 'CONSTRUCTIONS REBOURS' }).getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ })).click();
	} },
	{ nom: 'planning', masques: masquesPlanning, aller: allerAuPlanning },
	{ nom: 'panneau-planning', masques: masquesPlanning, aller: async (page, cible) => {
		await allerAuPlanning(page, cible);
		await page.locator('.g-fixe[title="Modifier les périodes et la couleur"]').first().click();
	} },
	{ nom: 'fermetures', masques: masquesPlanning, aller: async (page, cible) => {
		await allerAuPlanning(page, cible);
		await page.getByRole('button', { name: 'Fermetures' }).click();
	} },
	{ nom: 'documents', aller: onglet('Documents') },
	{ nom: 'artisans', aller: allerAuxArtisans },
	{ nom: 'fiche-artisan', aller: async (page, cible) => {
		await allerAuxArtisans(page, cible);
		await page.getByRole('row').filter({ hasText: 'AM COUVERTURE' }).getByRole('cell').first().click();
	} },
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
	await ecran.aller?.(page, cible);
	await page.mouse.move(0, 0);   // aucun survol dans la capture
}
