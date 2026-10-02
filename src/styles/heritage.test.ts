import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	chainesDe, classesDe, correspond, elaguer, fichiersSources, lireHeritage, lireSelecteursFiges, motsDesChaines,
	normaliser, selecteursDe, selecteursMorts,
} from './heritage';

function fichierTemporaire(nom: string, contenu: string): string {
	const chemin = path.join(mkdtempSync(path.join(tmpdir(), 'heritage-')), nom);
	writeFileSync(chemin, contenu);
	return chemin;
}

describe('outils de l\'héritage', () => {
	it('normalise les blancs d\'un sélecteur', () => {
		expect(normaliser('table.lots\n\tthead   th')).toBe('table.lots thead th');
	});

	it('lit les classes d\'un sélecteur, états compris', () => {
		expect(classesDe('.chantier-actions .btn:hover')).toEqual(['chantier-actions', 'btn']);
		expect(classesDe(":root[data-theme='dark'] .dm-case.est-alerte")).toEqual(['dm-case', 'est-alerte']);
		expect(classesDe('table thead th')).toEqual([]);
	});

	it('compte un sélecteur par entrée, sans les images clés', () => {
		expect(selecteursDe('.a, .b .c { color: red } @keyframes k { from { opacity: 0 } to { opacity: 1 } }')).toEqual(['.a', '.b .c']);
	});

	it('lit les chaînes d\'un fichier, gabarits compris, sans le texte JSX', () => {
		const f = fichierTemporaire('a.tsx', "const x = <p className={`btn ${y ? 'is-on' : ''}`}>Le btn-texte</p>;\nconst z = \"dm-case\";");
		expect(chainesDe(f).filter(Boolean)).toEqual(['btn ', 'is-on', 'dm-case']);
		expect([...motsDesChaines([f])].sort()).toEqual(['btn', 'dm-case', 'is-on']);
	});

	it('un sélecteur meurt dès qu\'une de ses classes n\'est plus écrite', () => {
		const css = '.btn { } .chantier-actions .btn { } table thead th { }';
		expect(selecteursMorts(css, new Set(['btn']))).toEqual(['.chantier-actions .btn']);
	});

	it('élague sélecteurs, règles, @media et images clés devenus vides', () => {
		const css = '.a, .b { color: red } @media (max-width: 60rem) { .b { color: blue } } .c { animation: monte 1s } @keyframes monte { to { opacity: 1 } } @keyframes rise { to { opacity: 0 } }';
		const garde = elaguer(css, (s) => s !== '.b');
		expect(selecteursDe(garde)).toEqual(['.a', '.c']);
		expect(garde).not.toContain('@media');
		expect(garde).toContain('@keyframes monte');
		expect(garde).not.toContain('@keyframes rise');
	});

	it('reconnaît une classe exacte ou un préfixe', () => {
		expect(correspond('g-bar', ['g-*'])).toBe(true);
		expect(correspond('gantt', ['g-*'])).toBe(false);
		expect(correspond('lots', ['lots'])).toBe(true);
	});
});

describe('héritage de la maquette (src/styles/heritage.css)', () => {
	const css = lireHeritage();

	it('ne gagne aucun sélecteur : on migre vers une brique au lieu de le rafistoler', () => {
		const figes = lireSelecteursFiges();
		expect(selecteursDe(css).filter((s) => !figes.has(s))).toEqual([]);
	});

	it('ne garde aucune règle morte (npx tsx scripts/heritage.ts elaguer)', () => {
		expect(selecteursMorts(css, motsDesChaines(fichiersSources()))).toEqual([]);
	});

	// .block (le bloc de la maquette) et l'utilitaire Tailwind « block » portent le même nom : tant que l'héritage
	// garde .block, l'utilitaire collerait au premier le cadre du second.
	it('aucune chaîne ne mêle l\'utilitaire « block » à d\'autres classes tant que .block existe', () => {
		if (!selecteursDe(css).some((s) => classesDe(s).includes('block'))) return;
		const fautives = fichiersSources().flatMap((f) => chainesDe(f)
			.filter((c) => { const jetons = c.trim().split(/\s+/); return jetons.length > 1 && jetons.includes('block'); })
			.map((c) => `${f} : « ${c} »`));
		expect(fautives).toEqual([]);
	});
});
