import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireBlocs, type Bloc } from './blocs';
import { ECRANS } from './ecrans';
import { PARTIES_TACHES } from './taches';

const TACHES = PARTIES_TACHES.flatMap((p) => p.taches);
const TEXTES = PARTIES_TACHES.flatMap((p) => [p.intro ?? '', ...p.taches.map((t) => t.texte)]);
const lignes = (b: Bloc) => b.type === 'paragraphe' ? [b.ligne] : b.type === 'capture' ? [] : b.items;

describe('le guide', () => {
	it('chaque écran : un identifiant unique, des légendes et sa capture (npm run aide:captures)', () => {
		expect(new Set(ECRANS.map((e) => e.id)).size).toBe(ECRANS.length);
		for (const e of ECRANS) {
			expect(e.reperes.length, e.id).toBeGreaterThan(0);
			expect(existsSync(`public/guide/${e.id}.webp`), `public/guide/${e.id}.webp`).toBe(true);
		}
	});

	it('chaque tâche se lit, ses captures existent et ses liens internes mènent quelque part', () => {
		expect(new Set(TACHES.map((t) => t.id)).size).toBe(TACHES.length);
		const ancres = new Set(TACHES.map((t) => t.id));
		const ecrans = new Set<string>(ECRANS.map((e) => e.id));
		for (const texte of TEXTES) {
			for (const bloc of lireBlocs(texte)) {
				if (bloc.type === 'capture') expect(ecrans.has(bloc.ecran), bloc.ecran).toBe(true);
				for (const m of lignes(bloc).flat()) {
					if (m.lien?.startsWith('#')) expect(ancres.has(m.lien.slice(1)), m.lien).toBe(true);
					if (m.lien?.startsWith('/aide#')) expect(ecrans.has(m.lien.slice(6)), m.lien).toBe(true);
				}
			}
		}
	});

	it('un numéro entouré ne dépasse jamais le nombre de pastilles de la capture qui précède', () => {
		const ENTOURES = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
		for (const texte of TEXTES) {
			let max = Infinity;
			for (const bloc of lireBlocs(texte)) {
				if (bloc.type === 'capture') { max = ECRANS.find((e) => e.id === bloc.ecran)!.reperes.length; continue; }
				for (const m of lignes(bloc).flat()) {
					// « (⑦ de l'onglet Marchés) » renvoie à une autre capture : seuls les numéros nus sont vérifiés.
					const nus = m.texte.replace(/\([^)]*\)/g, '');
					for (const c of nus) {
						const n = ENTOURES.indexOf(c) + 1;
						if (n > 0) expect(n, `${c} dans « ${m.texte} »`).toBeLessThanOrEqual(max);
					}
				}
			}
		}
	});
});
