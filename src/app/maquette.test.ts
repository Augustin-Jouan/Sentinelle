import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' ? [] : sources(chemin);
		return /\.tsx$/.test(e.name) ? [chemin] : [];
	});
}

describe('feuille de style de la maquette', () => {
	it('maquette.css est exactement ce que produit le script (jamais édité à la main)', () => {
		const attendu = execFileSync('node', ['scripts/extraire-css-maquette.mjs', '--stdout'], { encoding: 'utf8' });
		expect(readFileSync('src/app/maquette.css', 'utf8')).toBe(attendu);
	});

	it('reprend l\'interface et écarte les feuilles imprimables', () => {
		const css = readFileSync('src/app/maquette.css', 'utf8');
		for (const present of ['.nav-haut', '.picker-btn', '.chantier-grid', '.totals', '.panel', '.gen-head', '.dm-case.est-alerte', '.g-bar', '.synth-cell', '.toast']) {
			expect(css, present).toContain(present);
		}
		for (const absent of ['.sheet .col-r', '.cr-tete', '.cp-titre', '.pv-cadre', '@media print']) expect(css, absent).not.toContain(absent);
	});

	// `.block` de la maquette (cadre d'un bloc du panneau) : l'utilitaire Tailwind du même nom lui prendrait sa place.
	it.each(sources('src'))('%s : pas d\'utilitaire Tailwind « block »', (fichier) => {
		const classes = [...readFileSync(fichier, 'utf8').matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g)]
			.map((m) => m[1] ?? m[2] ?? m[3]);
		for (const c of classes) expect(c.split(/\s+/), `${fichier} : « ${c} »`).not.toContain('block');
	});
});
