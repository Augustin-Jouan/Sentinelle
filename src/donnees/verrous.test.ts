import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
		const chemin = path.join(dossier, e.name);
		if (e.isDirectory()) return e.name === 'generated' ? [] : sources(chemin);
		return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [chemin] : [];
	});
}

/*
 * `FOR UPDATE` (sans `NO KEY UPDATE`) bloque aussi les insertions qui référencent la ligne (contrôle de clé étrangère, `FOR KEY SHARE`) :
 * lot verrouillé + document du chantier d'un côté, chantier verrouillé + période du lot de l'autre, et PostgreSQL
 * tue l'une des deux (40P01). `FOR NO KEY UPDATE` sérialise toujours les écritures entre elles, sans ce blocage.
 */
describe('verrous de ligne', () => {
	it.each(sources('src'))('%s : pas de FOR UPDATE, seulement FOR NO KEY UPDATE', (fichier) => {
		const verrouFort = new RegExp(`(?<!NO KEY )FOR${' '}UPDATE`);
		expect(readFileSync(fichier, 'utf8')).not.toMatch(verrouFort);
	});
});
