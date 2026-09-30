import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { batirMarche, batirRecap } from './batir';
import { Gabarit } from './gabarits/Gabarit';
import { rendreHtml } from './rendu';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const lot = (d: string) => PERRIER_LOTS.find((l) => l.designation === d)!;
const gag = batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT);
const st = batirMarche(PERRIER_CHANTIER, lot('ESCALIER'), PERRIER_PARAMETRES, MAINTENANT);

describe('rendu HTML', () => {
	it('marché de gré à gré : titre, montants, textes corrigés', async () => {
		const html = await rendreHtml(gag);
		expect(html).toMatch(/^<!doctype html>/);
		expect(html).toContain('MARCHE DE TRAVAUX DE GRE A GRE');
		expect(html).toContain('115 500,00 €');
		expect(html).toContain('20,00 %');
		expect(html).toContain('réglées à <span class="fill">95</span> %');
		expect(html).toContain('Fait en <span class="fill">triple</span> exemplaire à Châteaubriant le : <span class="fill">03.04.2026</span>');
		expect(html).toContain('tous les différends découlant');
		expect(html).not.toContain('différents');
		expect(html).toContain('71 rue du Général Patton - 44110 – Châteaubriant');
		// Corps seulement : le base64 des polices peut contenir la sous-chaîne « Fax ».
		expect(html.split('</head>')[1]).not.toContain('Fax');
		expect(html).toContain('@font-face');
	});

	it('marché de sous-traitance : les six corrections de l\'annexe C', async () => {
		const html = await rendreHtml(st);
		expect(html).toContain('MARCHE DE SOUS-TRAITANCE DE TRAVAUX');
		for (const correct of [
			'avant le 5<sup>ème</sup> jour du mois suivant',
			'sera déduit du présent marché',
			'Les travaux sous-traités sans accord',
			'les situations seront réglées par traite acceptée à 60 jours maximum',
			'dans le cas où le client cesserait',
			'tous les différends découlant',
		]) expect(html).toContain(correct);
		for (const ancien of ['le mois 5', 'sera déduits', 'sous-traiter sans accord', 'situations,', '60 jour ', 'cas ou ', 'différents']) {
			expect(html).not.toContain(ancien);
		}
		expect(html).toContain('20 %');
		expect(html).toContain('<span class="fill">escalier</span>');
	});

	it('imprime le fax seulement s\'il est renseigné', async () => {
		const avecFax = batirMarche(PERRIER_CHANTIER, lot('ESCALIER'), { ...PERRIER_PARAMETRES, fax: '02 40 28 36 23' }, MAINTENANT);
		expect(await rendreHtml(avecFax)).toContain('Tél. 02 40 81 40 26 - Fax. 02 40 28 36 23');
	});

	it('sans date saisie, imprime la date de génération', async () => {
		const sansDate = batirMarche({ ...PERRIER_CHANTIER, dateSignaturePrevue: null }, lot('CHARPENTE'), PERRIER_PARAMETRES, MAINTENANT);
		expect(await rendreHtml(sansDate)).toContain('<span class="fill">29.09.2026</span>');
	});

	it('échappe le HTML saisi dans une zone', async () => {
		const piege = batirMarche(PERRIER_CHANTIER, { ...lot('GROS ŒUVRE'), clauseParticuliere: '<script>alert(1)</script><img src=x>' }, PERRIER_PARAMETRES, MAINTENANT);
		const html = await rendreHtml(piege);
		expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x&gt;');
		expect(html).not.toContain('<script>');
	});

	it('récapitulatif : lignes, lot sans entreprise, total', async () => {
		const html = await rendreHtml(batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES, MAINTENANT));
		expect(html).toContain('RÉCAPITULATIF DES MARCHÉS');
		expect(html).toContain('Châteaubriant le 03.04.2026');
		expect(html).toContain('<i>à attribuer</i>');
		expect(html).toContain('Total marchés — 13 lots');
		expect(html).toContain('374 016,00 €');
	});

	it('le mode édition rend des zones modifiables, le mode impression du texte', () => {
		const edition = renderToStaticMarkup(createElement(Gabarit, { donnees: st, mode: 'edition', onSaisie: () => {} }));
		// React 19 sérialise contentEditable en camelCase (HTML attendu: contenteditable).
		expect(edition).toContain('contentEditable="plaintext-only"');
		expect(edition).toContain('data-placeholder="travaux à exécuter"');
		const impression = renderToStaticMarkup(createElement(Gabarit, { donnees: st, mode: 'impression' }));
		expect(impression).not.toContain('contenteditable');
	});
});
