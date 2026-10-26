import { expect, test, type Locator, type Page } from '@playwright/test';
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ECRANS, ecran, type IdEcran } from '../../src/aide/ecrans';

/**
 * Les captures du guide (page Aide), pastilles rouges comprises : `npm run aide:captures`, à relancer quand un
 * écran change. Chaque écran pose ses pastilles dans l'ordre des légendes de src/aide/ecrans.ts (la pastille n
 * est la légende n) ; le test échoue si un repère manque ou si leur nombre diffère de celui des légendes.
 * Données : la base du banc visuel (les 4 chantiers de la maquette) ; quelques documents sont générés en route.
 */

type Position = 'gauche' | 'droite' | 'haut' | 'hautdroite' | 'hautcentre' | 'droitedans' | 'gauchedans' | 'bas' | 'dedans';
type Options = { pos?: Position; cadre?: boolean; dx?: number; dy?: number };
type Repere = [Locator, Options?];

const DOSSIER = 'public/guide';
/** La taille d'affichage de chaque capture (la moitié de ses pixels, prise en densité 2), lue par la page Aide. */
const DIMENSIONS = 'src/aide/dimensions.json';
const dimensions: Record<string, { largeur: number; hauteur: number }> = {};
const ROUGE = '#e03131';

type Cadrage = { pleinePage?: boolean; clip?: { x: number; y: number; width: number; height: number }; autour?: Locator };

/**
 * Pose les pastilles (et un cadre autour de l'élément), prend la capture en WebP, retire le calque.
 * `autour` recadre sur un élément et ses abords (un écran centré, presque vide sinon).
 */
async function capturer(page: Page, id: IdEcran, reperes: Repere[], options: Cadrage = {}) {
	expect(reperes.length, `${id} : autant de repères que de légendes`).toBe(ecran(id).reperes.length);
	await page.evaluate(() => document.fonts.ready);
	const poses = [];
	for (const [n, [loc, o = {}]] of reperes.entries()) {
		const el = loc.first();
		await expect(el, `${id} : repère ${n + 1}`).toBeVisible();
		const b = await el.boundingBox();
		if (!b) throw new Error(`${id} : repère ${n + 1} sans boîte`);
		poses.push({ n: n + 1, b, pos: o.pos ?? 'gauche', cadre: o.cadre ?? true, dx: o.dx ?? 0, dy: o.dy ?? 0 });
	}
	await page.evaluate(({ poses, ROUGE }) => {
		const calque = document.createElement('div');
		calque.id = 'reperes-guide';
		Object.assign(calque.style, { position: 'absolute', left: '0', top: '0', width: '0', height: '0', zIndex: '2147483647', pointerEvents: 'none' });
		const sx = window.scrollX, sy = window.scrollY, R = 12;
		for (const { n, b, pos, cadre, dx, dy } of poses) {
			if (cadre) {
				const c = document.createElement('div');
				Object.assign(c.style, { position: 'absolute', left: `${b.x + sx - 3}px`, top: `${b.y + sy - 3}px`, width: `${b.width + 6}px`, height: `${b.height + 6}px`,
					border: `2px solid ${ROUGE}`, borderRadius: '7px', boxSizing: 'border-box' });
				calque.appendChild(c);
			}
			let x, y;
			if (pos === 'gauche') { x = b.x - R - 8; y = b.y + b.height / 2; }
			else if (pos === 'droite') { x = b.x + b.width + R + 8; y = b.y + b.height / 2; }
			else if (pos === 'haut') { x = b.x; y = b.y - 2; }
			else if (pos === 'hautdroite') { x = b.x + b.width; y = b.y - 2; }
			else if (pos === 'hautcentre') { x = b.x + b.width / 2; y = b.y - R - 5; }
			else if (pos === 'droitedans') { x = b.x + b.width - R - 8; y = b.y + b.height / 2; }
			else if (pos === 'gauchedans') { x = b.x + R + 8; y = b.y + b.height / 2; }
			else if (pos === 'bas') { x = b.x + b.width / 2; y = b.y + b.height + R + 6; }
			else { x = b.x + b.width / 2; y = b.y + b.height / 2; }
			x = Math.max(R + 2, x + dx); y = Math.max(R + 2, y + dy);
			const p = document.createElement('div');
			p.textContent = String(n);
			Object.assign(p.style, { position: 'absolute', left: `${x + sx - R}px`, top: `${y + sy - R}px`, width: `${2 * R}px`, height: `${2 * R}px`,
				borderRadius: '50%', background: ROUGE, color: '#fff', font: '700 13px/24px system-ui, sans-serif', textAlign: 'center',
				boxShadow: '0 0 0 2px #fff, 0 2px 6px rgba(0,0,0,.35)' });
			calque.appendChild(p);
		}
		document.body.appendChild(calque);
	}, { poses, ROUGE });
	const zone = options.autour ? await options.autour.boundingBox() : null;
	const clip = zone ? { x: zone.x - 72, y: zone.y - 48, width: zone.width + 144, height: zone.height + 96 } : options.clip;
	const png = await page.screenshot({ fullPage: options.pleinePage ?? false, clip, animations: 'disabled', caret: 'hide' });
	await page.evaluate(() => document.getElementById('reperes-guide')?.remove());
	await writeFile(`${DOSSIER}/${id}.webp`, await sharp(png).webp({ quality: 82 }).toBuffer());
	const { width = 0, height = 0 } = await sharp(png).metadata();
	dimensions[id] = { largeur: Math.round(width / 2), hauteur: Math.round(height / 2) };
}

const pause = (p: Page, ms = 600) => p.waitForTimeout(ms);
const echap = async (p: Page) => { await p.keyboard.press('Escape'); await pause(p, 400); };
const dlg = (p: Page) => p.getByRole('dialog').last();
const ligne = (p: Page, texte: string) => p.getByRole('row').filter({ hasText: texte });

async function ouvrirPerrier(p: Page) {
	await p.goto('/chantiers');
	await p.getByRole('button', { name: /^PERRIER — Louisfert/ }).click();
	await p.getByRole('heading', { name: 'Marchés & récapitulatif' }).waitFor();
}
async function documents(p: Page) {
	await ouvrirPerrier(p);
	await p.locator('header').getByRole('link', { name: /^Documents/ }).click();
	await p.getByRole('heading', { name: 'Documents du chantier' }).waitFor();
}
async function planning(p: Page) {
	await ouvrirPerrier(p);
	await p.locator('header').getByRole('link', { name: /^Planning/ }).click();
	await p.locator('.gantt').waitFor();
	await p.locator('.gantt').evaluate((g) => { g.style.scrollBehavior = 'auto'; g.scrollLeft = 0; });
}

test('captures du guide', async ({ page: p }) => {
	await mkdir(DOSSIER, { recursive: true });

	// ——— Connexion (sans compte)
	await p.goto('/connexion');
	await p.getByLabel('Adresse e-mail').fill('prenom.nom@exemple.fr');
	await capturer(p, 'connexion', [
		[p.getByLabel('Adresse e-mail')],
		[p.getByLabel('Mot de passe')],
		[p.getByRole('button', { name: 'Ouvrir mes chantiers' })],
	], { autour: p.locator('main > div').first() });

	await p.getByLabel('Adresse e-mail').fill(process.env.ADMIN_EMAIL ?? '');
	await p.getByLabel('Mot de passe').fill(process.env.ADMIN_MOT_DE_PASSE ?? '');
	await p.getByRole('button', { name: 'Ouvrir mes chantiers' }).click();
	await p.getByRole('heading', { name: 'Mes chantiers' }).waitFor();

	// ——— Accueil
	const perrier = p.getByRole('button', { name: /^PERRIER — Louisfert/ });
	await capturer(p, 'accueil', [
		[p.getByRole('link', { name: "Sentinelle — revenir à l'accueil" }), { pos: 'bas' }],
		[p.getByRole('link', { name: 'Tous les chantiers' }), { pos: 'bas' }],
		[p.getByRole('button', { name: /^Affichage/ }), { pos: 'bas' }],
		[p.getByRole('link', { name: /^Artisans/ }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Basculer clair / sombre' }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Mon compte' }), { pos: 'bas' }],
		[p.getByRole('link', { name: 'Nouveau chantier', exact: true }), { pos: 'gauche' }],
		[p.getByText('Chantiers en cours', { exact: true }), { pos: 'gauche', cadre: false, dx: -4 }],
		[p.getByRole('searchbox', { name: 'Rechercher un chantier' })],
		[p.getByRole('button', { name: /^Trier par/ }), { pos: 'haut' }],
		[p.getByText('Masquer les terminés', { exact: true }), { pos: 'droite' }],
		[perrier, { pos: 'haut' }],
		[perrier.getByRole('button', { name: 'Terminer' }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Supprimer PERRIER — Louisfert', exact: true }), { pos: 'droite' }],
		[p.getByRole('link', { name: /^\+ Nouveau chantier/ })],
	]);

	// ——— Sélecteur de chantier
	await p.getByRole('button', { name: /^Affichage/ }).click(); await pause(p);
	const liste = p.getByRole('listbox', { name: 'Choisir un chantier' });
	await capturer(p, 'selecteur', [
		[liste.getByRole('option', { name: /^Tous les chantiers/ }), { pos: 'droite' }],
		[liste.getByRole('option', { name: /^PERRIER/ }), { pos: 'droite' }],
		[liste.getByText('Terminés'), { pos: 'gauche', cadre: false }],
		[liste.getByRole('button', { name: '+ Nouveau chantier' }), { pos: 'droite' }],
	], { clip: { x: 120, y: 0, width: 560, height: 420 } });
	await echap(p);

	// ——— Menu Mon compte
	await p.getByRole('button', { name: 'Mon compte' }).click(); await pause(p);
	const menu = p.getByRole('menu');
	await capturer(p, 'compte', [
		[menu.getByText('Administrateur'), { pos: 'gauche', cadre: false }],
		[menu.getByRole('menuitem', { name: "Aide — guide d'utilisation" })],
		[menu.getByRole('menuitem', { name: 'Changer mon mot de passe' })],
		[menu.getByRole('menuitem', { name: 'Paramètres' })],
		[menu.getByRole('menuitem', { name: 'Comptes' })],
		[menu.getByRole('menuitem', { name: 'Se déconnecter' })],
	], { clip: { x: 1040, y: 0, width: 400, height: 330 } });
	await echap(p);

	// ——— Nouveau chantier (rempli avec l'exemple ; le message « Exemple chargé » doit être parti)
	await p.goto('/chantiers/nouveau');
	await p.getByRole('button', { name: 'Remplir avec un exemple' }).click(); await pause(p, 6000);
	await capturer(p, 'nouveau', [
		[p.getByLabel('Nom du client')],
		[p.getByLabel('Adresse actuelle du client')],
		[p.getByText(/^Il habite déjà sur le chantier/)],
		[p.getByLabel('Nature des travaux')],
		[p.getByLabel('Adresse du chantier')],
		[p.getByLabel('Référence dossier')],
		[p.getByRole('button', { name: /^Compte / })],
		[p.getByRole('radiogroup', { name: 'Type de mission' })],
		[p.getByLabel('Signature des marchés prévue le')],
		[p.getByText('Partir des 13 lots de base', { exact: true })],
		[p.getByRole('figure'), { pos: 'haut' }],
		[p.getByRole('button', { name: 'Remplir avec un exemple' })],
		[p.getByRole('button', { name: 'Créer le chantier' }).first(), { pos: 'bas' }],
	], { pleinePage: true });

	// ——— Onglet Marchés
	await ouvrirPerrier(p);
	const rebours = ligne(p, 'CONSTRUCTIONS REBOURS');
	await capturer(p, 'marches', [
		[p.getByRole('button', { name: /^Chantier ouvert/ }), { pos: 'droite' }],
		[p.locator('header').getByRole('link', { name: /^Marchés/ }), { pos: 'bas' }],
		[p.locator('header').getByRole('link', { name: /^Planning/ }), { pos: 'bas' }],
		[p.locator('header').getByRole('link', { name: /^Documents/ }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Ajouter un lot' }), { pos: 'haut' }],
		[p.getByRole('link', { name: 'Exporter le récap' }), { pos: 'haut' }],
		[p.getByRole('button', { name: 'Générer les marchés manquants' }), { pos: 'haut' }],
		[p.getByRole('button', { name: /^Client M\. et Mme PERRIER/ }), { pos: 'droitedans' }],
		[p.getByRole('searchbox', { name: 'Rechercher un lot' })],
		[p.getByRole('button', { name: /^Trier par/ }), { pos: 'droite' }],
		[rebours.getByRole('textbox', { name: 'Désignation du lot' }), { pos: 'gauche', dx: -40 }],
		[rebours.getByText('1 avenant'), { pos: 'hautcentre' }],
		[rebours.getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ }), { pos: 'droitedans' }],
		[rebours.getByRole('textbox', { name: 'Montant HT' }), { pos: 'gauchedans' }],
		[rebours.getByRole('textbox', { name: 'Taux de TVA' }), { pos: 'gauchedans', dx: -6 }],
		[rebours.getByRole('textbox', { name: 'Montant TTC' }), { pos: 'gauchedans' }],
		[p.getByText('Total marchés TTC'), { pos: 'gauche', cadre: false }],
	]);

	// ——— En-tête du chantier
	await p.getByRole('button', { name: /^Client M\. et Mme PERRIER/ }).click(); await pause(p);
	const entete = dlg(p);
	await capturer(p, 'entete', [
		[entete.getByLabel('Nom du client')],
		[entete.getByRole('radiogroup', { name: 'Type de mission' })],
		[entete.getByRole('button', { name: /^Compte / })],
		[entete.getByRole('button', { name: 'Marquer terminé' })],
	]);
	await echap(p);

	// ——— Panneau du lot
	await rebours.getByRole('cell', { name: /CONSTRUCTIONS REBOURS/ }).click(); await pause(p);
	const lot = dlg(p);
	await capturer(p, 'lot', [
		[lot.getByRole('radiogroup', { name: 'Nature du marché' })],
		[lot.getByRole('button', { name: /^Attribuée à/ })],
		[lot.getByRole('link', { name: 'Voir la fiche' }), { pos: 'gauche' }],
		[lot.getByText('Ces lignes sont lues')],
		[lot.getByRole('textbox', { name: 'Montant HT du marché' })],
		[lot.getByText('+ 3 720,00 €'), { cadre: false }],
		[lot.getByRole('textbox', { name: 'Montant TTC du marché' })],
		[lot.getByRole('textbox', { name: 'Taux de retenue de garantie' })],
		[lot.getByRole('textbox', { name: 'Date de signature de ce marché' })],
		[lot.getByRole('link', { name: 'Ouvrir le marché' }), { pos: 'haut' }],
		[lot.getByRole('link', { name: 'Certificat de paiement' }), { pos: 'haut' }],
		[lot.getByRole('link', { name: 'PV de réception' }), { pos: 'haut' }],
		[lot.getByRole('button', { name: 'Supprimer le lot' })],
	]);

	// ——— Bloc Avenants (bas du panneau)
	await lot.getByRole('button', { name: 'Ajouter un avenant' }).scrollIntoViewIfNeeded(); await pause(p, 300);
	await capturer(p, 'avenants', [
		[lot.getByRole('button', { name: 'Ajouter un avenant' })],
		[lot.getByRole('columnheader', { name: 'Devis' }), { pos: 'hautcentre', cadre: false, dx: 24 }],
		[lot.getByRole('columnheader', { name: 'Montant HT' }), { pos: 'hautcentre', cadre: false }],
		[lot.getByRole('columnheader', { name: 'Date' }), { pos: 'hautcentre', cadre: false }],
		[lot.getByRole('link', { name: "Ouvrir la lettre de l'avenant n° 01" }), { pos: 'hautcentre' }],
		[lot.getByRole('button', { name: "Supprimer l'avenant n° 01" }), { pos: 'bas' }],
	]);

	// ——— Aperçu d'un marché
	await lot.getByRole('link', { name: 'Ouvrir le marché' }).click(); await pause(p, 900);
	const marche = dlg(p);
	await capturer(p, 'apercu-marche', [
		[marche.getByRole('heading', { level: 2 }), { pos: 'droite' }],
		[marche.getByText('chantier · maitreOuvrage'), { pos: 'droite', cadre: false }],
		[marche.getByRole('article'), { pos: 'haut', cadre: false, dx: 30, dy: 20 }],
		[marche.locator('article [contenteditable]').first(), { pos: 'gauche' }],
		[marche.getByRole('button', { name: /^Version/ }), { pos: 'bas' }],
		[marche.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[marche.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await echap(p); await echap(p);

	// ——— Aperçu du récapitulatif
	await ouvrirPerrier(p);
	await p.getByRole('link', { name: 'Exporter le récap' }).click(); await pause(p, 900);
	const recap = dlg(p);
	await capturer(p, 'apercu-recap', [
		[recap.getByRole('heading', { name: 'RÉCAPITULATIF DES MARCHÉS' }), { pos: 'gauche' }],
		[recap.getByRole('table'), { pos: 'gauche', cadre: false }],
		[recap.getByRole('button', { name: /^Version/ }), { pos: 'bas' }],
		[recap.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[recap.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await echap(p);

	// ——— Onglet Planning
	await planning(p);
	await capturer(p, 'planning', [
		[p.getByRole('button', { name: 'Fermetures' }), { pos: 'bas' }],
		[p.getByRole('link', { name: 'Feuille de visa' }), { pos: 'bas' }],
		[p.getByRole('link', { name: 'Planning imprimable' }), { pos: 'bas' }],
		[p.getByText(/périodes · semaine/), { pos: 'droite', cadre: false }],
		[p.getByRole('button', { name: /^Lots affichés/ }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Main — faire glisser le planning' }), { pos: 'bas' }],
		[p.getByRole('button', { name: 'Cible — tracer une période' }), { pos: 'bas' }],
		[p.getByRole('button', { name: "Aujourd'hui" }), { pos: 'bas' }],
		[p.getByRole('group', { name: 'Densité' }), { pos: 'bas' }],
		[p.locator('.g-sems').first(), { pos: 'gauche', cadre: false }],
		[p.locator('.g-ferm-row').first(), { pos: 'gauche' }],
		[p.getByRole('button', { name: /^GROS ŒUVRE/ }), { pos: 'gauche', dx: 20 }],
		[p.locator('.g-bar').filter({ hasText: 'Élévation RDC' }), { pos: 'bas' }],
		[p.locator('.g-liens g path').first(), { pos: 'bas', cadre: false }],
	]);

	// ——— Panneau du lot (planning)
	await p.getByRole('button', { name: /^TERRASSEMENT/ }).click(); await pause(p);
	const lotPlanning = dlg(p);
	await capturer(p, 'planning-lot', [
		[lotPlanning.getByRole('button', { name: 'Noir' }), { pos: 'gauche' }],
		[lotPlanning.getByRole('button', { name: 'Ajouter' }), { pos: 'gauche' }],
		[lotPlanning.getByRole('textbox').first(), { pos: 'gauche' }],
		[lotPlanning.getByRole('textbox').nth(1), { pos: 'haut' }],
		[lotPlanning.getByRole('button', { name: /^Commence après/ }).first(), { pos: 'gauche' }],
		[lotPlanning.getByRole('button', { name: /^Supprimer la période/ }).first(), { pos: 'hautcentre' }],
	]);
	await echap(p);

	// ——— Fermetures
	await p.getByRole('button', { name: 'Fermetures' }).click(); await pause(p);
	const fermetures = dlg(p);
	await capturer(p, 'fermetures', [
		[fermetures.getByRole('button', { name: 'Ajouter' }), { pos: 'gauche' }],
		[fermetures.getByRole('textbox').first(), { pos: 'gauche' }],
		[fermetures.getByRole('button', { name: /^Supprimer la fermeture/ }).first(), { pos: 'hautcentre' }],
	]);
	await echap(p);

	// ——— Planning imprimable, puis généré : la feuille de visa en a besoin
	await p.getByRole('link', { name: 'Planning imprimable' }).click(); await pause(p, 1200);
	const imprimable = dlg(p);
	await capturer(p, 'apercu-planning', [
		[imprimable.getByRole('article'), { pos: 'gauche', cadre: false }],
		[imprimable.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[imprimable.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await imprimable.getByRole('button', { name: 'Générer le PDF' }).click(); await pause(p, 4000);
	await echap(p);

	// ——— Feuille de visa
	await planning(p);
	await p.getByRole('link', { name: 'Feuille de visa' }).click(); await pause(p, 1200);
	const visa = dlg(p);
	await capturer(p, 'apercu-visa', [
		[visa.getByRole('article'), { pos: 'gauche', cadre: false }],
		[visa.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[visa.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await echap(p);

	// ——— Onglet Documents
	await documents(p);
	const reboursDocs = ligne(p, 'CONSTRUCTIONS REBOURS');
	const compteRendu = p.getByRole('button', { name: /^(Nouveau compte rendu|Reprendre le brouillon)$/ });
	await capturer(p, 'documents', [
		[p.getByText(/documents produits/), { pos: 'droite', cadre: false }],
		[p.getByRole('link', { name: 'Tout télécharger' }), { pos: 'bas' }],
		[compteRendu, { pos: 'bas' }],
		[p.getByRole('link', { name: 'Exporter à jour' }), { pos: 'bas' }],
		[p.getByRole('link', { name: /^(Planning imprimable|Réimprimer)$/ }), { pos: 'bas' }],
		[p.getByRole('link', { name: 'Produire' }), { pos: 'bas' }],
		[p.getByRole('button', { name: /^Générer les \d+ manquants/ }), { pos: 'hautcentre' }],
		[p.getByRole('link', { name: 'Tous les lots' }), { pos: 'hautcentre' }],
		[reboursDocs.getByRole('link', { name: /^v2/ }), { pos: 'gauche' }],
		[ligne(p, 'GILLOT TP').getByRole('link', { name: '+ Générer' }), { pos: 'gauche' }],
		[reboursDocs.getByRole('link', { name: /^n° 01/ }), { pos: 'gauche' }],
		[reboursDocs.getByRole('link', { name: /^Nouveau certificat/ }), { pos: 'droite' }],
		[reboursDocs.getByRole('link', { name: '+ Réception' }), { pos: 'droite' }],
	]);

	// ——— Certificat de paiement
	await reboursDocs.getByRole('link', { name: /^Nouveau certificat/ }).click(); await pause(p, 900);
	const certificat = dlg(p);
	const cumul = certificat.getByRole('textbox', { name: /^Montant des travaux réalisés HT/ });
	await cumul.fill('45 000'); await cumul.press('Tab'); await pause(p, 500);
	await capturer(p, 'certificat', [
		[certificat.getByText(/^Montant du marché HT/), { pos: 'gauche', cadre: false }],
		[certificat.getByRole('textbox', { name: "Mois de l'acompte" }), { pos: 'gauche' }],
		[certificat.getByRole('textbox', { name: 'Ajouter un acompte antérieur' }), { pos: 'gauche' }],
		[cumul, { pos: 'gauche' }],
		[certificat.getByRole('button', { name: /^Caution bancaire/ }), { pos: 'droite' }],
		[certificat.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[certificat.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await echap(p);

	// ——— Brouillon de compte rendu (abandonné ensuite)
	await documents(p);
	await compteRendu.click(); await pause(p, 900);
	const cr = dlg(p);
	await capturer(p, 'compte-rendu', [
		[cr.getByPlaceholder('votre nom'), { pos: 'gauche' }],
		[cr.locator('input[type="date"]').first(), { pos: 'bas' }],
		[cr.locator('input[type="date"]').nth(1), { pos: 'bas' }],
		[cr.getByRole('button', { name: /^Convocation GROS ŒUVRE/ }), { pos: 'droite' }],
		[cr.getByText('AVANCEMENT :'), { pos: 'gauche', cadre: false }],
		[cr.getByText('COORDINATION :'), { pos: 'gauche', cadre: false }],
		[cr.getByRole('button', { name: 'Repartir des lots' }), { pos: 'bas' }],
		[cr.getByRole('button', { name: 'Abandonner le brouillon' }), { pos: 'bas' }],
		[cr.getByRole('button', { name: /^Enregistrer le n°/ }), { pos: 'bas' }],
		[cr.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await cr.getByRole('button', { name: 'Abandonner le brouillon' }).click(); await pause(p, 400);
	await p.getByRole('button', { name: 'Abandonner' }).last().click().catch(() => {}); await pause(p, 600);

	// ——— PV de réception (avec réserves, le temps de la capture)
	await documents(p);
	await reboursDocs.getByRole('link', { name: '+ Réception' }).click(); await pause(p, 900);
	const pv = dlg(p);
	await pv.getByRole('button', { name: 'Avec réserves' }).click(); await pause(p, 500);
	await capturer(p, 'pv', [
		[pv.getByRole('button', { name: /^Procès-verbal pour/ }), { pos: 'bas' }],
		[pv.getByText(/^En date du/).first(), { pos: 'gauche', cadre: false }],
		[pv.getByPlaceholder('votre nom'), { pos: 'gauche' }],
		[pv.getByPlaceholder('interlocuteur'), { pos: 'gauche' }],
		[pv.getByRole('button', { name: 'Avec réserves' }), { pos: 'gauche' }],
		[pv.getByText('NATURE DES RÉSERVES').first(), { pos: 'gauche', cadre: false }],
		[pv.getByRole('button', { name: 'Générer le PDF' }), { pos: 'bas' }],
		[pv.getByRole('button', { name: 'Fermer' }), { pos: 'bas' }],
	]);
	await pv.getByRole('button', { name: 'Sans réserves' }).click(); await pause(p, 300);
	await echap(p);

	// ——— Référentiel des artisans
	await p.goto('/artisans');
	await capturer(p, 'artisans', [
		[p.getByRole('button', { name: 'Ajouter une entreprise' }), { pos: 'gauche' }],
		[p.getByRole('searchbox', { name: 'Rechercher une entreprise' })],
		[p.getByText(/\d+ entreprises/), { pos: 'droite', cadre: false }],
		[p.getByRole('row').nth(1).getByRole('cell').first(), { pos: 'droitedans' }],
		[p.getByRole('button', { name: 'Modifier' }).first(), { pos: 'hautcentre' }],
		[p.getByRole('button', { name: 'Supprimer' }).first(), { pos: 'droite', dx: -4 }],
	]);

	// ——— Fiche d'une entreprise
	await p.getByRole('button', { name: 'Ajouter une entreprise' }).click(); await pause(p);
	const fiche = dlg(p);
	await capturer(p, 'fiche-artisan', [
		[fiche.getByLabel('Raison sociale')],
		[fiche.getByLabel('Adresse')],
		[fiche.getByLabel('Interlocuteur')],
		[fiche.getByLabel('Courriel (optionnel)')],
		[fiche.getByRole('button', { name: 'Ajouter' }), { pos: 'gauche' }],
	]);
	await echap(p);

	// ——— Comptes : un second compte, pour montrer ses actions
	await p.goto('/admin/comptes');
	await p.getByRole('button', { name: 'Nouveau compte' }).click(); await pause(p);
	const nouveau = dlg(p);
	const champs = nouveau.getByRole('textbox');
	await champs.nth(0).fill('Marie Martin'); await champs.nth(1).fill('m.martin@exemple.fr');
	await capturer(p, 'nouveau-compte', [
		[champs.nth(0)],
		[champs.nth(1)],
		[nouveau.getByRole('button', { name: 'Créer le compte' }), { pos: 'gauche' }],
	]);
	await nouveau.getByRole('button', { name: 'Créer le compte' }).click(); await pause(p, 900);
	const provisoire = dlg(p);
	// Le vrai mot de passe provisoire ne doit pas finir dans une image : un faux le remplace.
	await provisoire.getByTestId('mot-de-passe-provisoire').evaluate((e) => { e.textContent = 'Xk7mQ2vR9pLw4sTn'; });
	await capturer(p, 'mot-de-passe-provisoire', [
		[provisoire.getByTestId('mot-de-passe-provisoire'), { pos: 'gauche' }],
		[provisoire.getByRole('button', { name: 'Copier' }), { pos: 'hautcentre' }],
	]);
	await echap(p); await p.reload();
	const marie = ligne(p, 'Marie Martin');
	await capturer(p, 'comptes', [
		[p.getByRole('button', { name: 'Nouveau compte' }), { pos: 'gauche' }],
		[marie.getByRole('cell').first(), { pos: 'droitedans' }],
		[marie.getByRole('textbox').first(), { pos: 'haut' }],
		[marie.getByRole('button', { name: /^Passer/ }), { pos: 'haut' }],
		[marie.getByRole('button', { name: /^(Bloquer|Débloquer)$/ }), { pos: 'haut' }],
		[marie.getByRole('button', { name: 'Réinitialiser le mot de passe' }), { pos: 'haut' }],
	]);

	// ——— Paramètres de l'entreprise
	await p.goto('/parametres');
	await capturer(p, 'parametres', [
		[p.getByRole('heading', { name: 'Entreprise', exact: true }), { pos: 'droitedans' }],
		[p.getByRole('heading', { name: 'Coordonnées' }), { pos: 'droitedans' }],
		[p.getByRole('heading', { name: 'Mentions légales' }), { pos: 'droitedans' }],
		[p.getByRole('heading', { name: 'Signature' }), { pos: 'droitedans' }],
	], { pleinePage: true });

	// ——— Changer de mot de passe
	await p.goto('/mot-de-passe');
	await capturer(p, 'mot-de-passe', [
		[p.getByLabel('Mot de passe actuel')],
		[p.getByLabel('Nouveau mot de passe', { exact: true })],
		[p.getByLabel('Confirmer le nouveau mot de passe')],
		[p.getByRole('button', { name: 'Enregistrer' }), { pos: 'gauche' }],
	], { autour: p.locator('main > div').first() });

	const triees = Object.fromEntries(ECRANS.map((e) => [e.id, dimensions[e.id]]));
	await writeFile(DIMENSIONS, `${JSON.stringify(triees, null, '\t')}\n`);
});
