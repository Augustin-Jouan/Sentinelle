import { describe, expect, it } from 'vitest';
import { filtrerOptions, placerMenu, type OptionMenu } from './menu';

const OPTIONS: OptionMenu[] = [
	{ v: '', t: '— non attribué —' }, { sep: true },
	{ v: 'a', t: 'PLÂTRERIE DELAUNAY', meta: 'MOISDON-LA-RIVIÈRE' },
	{ v: 'b', t: 'AM COUVERTURE', meta: 'DERVAL' },
	{ tete: 'Archivées' },
	{ v: 'c', t: 'ISSÉ MENUISERIE', meta: 'ISSÉ' },
];

describe('filtrerOptions (ddFiltre de la maquette)', () => {
	it('sans recherche : tout, séparateurs et intertitres compris', () => {
		expect(filtrerOptions(OPTIONS, '  ')).toEqual(OPTIONS);
	});
	it('sans accents ni casse, sur le libellé et le complément ; les séparateurs disparaissent', () => {
		expect(filtrerOptions(OPTIONS, 'platrerie')).toEqual([OPTIONS[2]]);
		expect(filtrerOptions(OPTIONS, 'derval')).toEqual([OPTIONS[3]]);
		expect(filtrerOptions(OPTIONS, 'isse menui')).toEqual([OPTIONS[5]]);
	});
	it('aucun résultat : liste vide', () => {
		expect(filtrerOptions(OPTIONS, 'zzz')).toEqual([]);
	});
});

describe('placerMenu (ddPlace de la maquette)', () => {
	const fenetre = { largeur: 1440, hauteur: 900 };
	it('sous le bouton quand la place suffit, au moins 240 px de large', () => {
		const bouton = { top: 100, bottom: 140, left: 50, width: 180 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 240, hauteur: 300 }, fenetre)).toEqual({ top: 146, left: 50, largeur: 240, versHaut: false });
	});
	it('au-dessus quand le bas manque et que le haut suffit', () => {
		const bouton = { top: 700, bottom: 740, left: 50, width: 300 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 300, hauteur: 300 }, fenetre)).toEqual({ bottom: 206, left: 50, largeur: 300, versHaut: true });
	});
	it('jamais au-delà du bord droit', () => {
		const bouton = { top: 100, bottom: 140, left: 1300, width: 200 } as DOMRect;
		expect(placerMenu(bouton, { largeur: 320, hauteur: 200 }, fenetre).left).toBe(1440 - 320 - 8);
	});
});
