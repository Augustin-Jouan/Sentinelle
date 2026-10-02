import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EcranCentre, FormulaireCentre } from './EcranCentre';

describe('EcranCentre', () => {
	it('un titre de niveau 1, son accroche, le contenu puis le pied', () => {
		const html = renderToStaticMarkup(<EcranCentre titre="Page introuvable" accroche="Ce chantier n'existe pas." pied="Pied"><button type="button">Retour</button></EcranCentre>);
		expect(html).toMatch(/<h1 [^>]*>Page introuvable<\/h1>/);
		expect(html.indexOf('Ce chantier')).toBeLessThan(html.indexOf('Retour'));
		expect(html.indexOf('Retour')).toBeLessThan(html.indexOf('Pied'));
		expect(html).not.toContain('plaque-clair');
	});

	it('avec le sigle, ses définitions viennent avec lui', () => {
		const html = renderToStaticMarkup(<EcranCentre sigle titre="Sentinelle" accroche="…">x</EcranCentre>);
		expect(html).toContain('id="plaque-clair"');
		expect(html).toContain('href="#plaque-clair"');
	});

	it('FormulaireCentre garde ses attributs', () => {
		expect(renderToStaticMarkup(<FormulaireCentre aria-label="Connexion">x</FormulaireCentre>)).toMatch(/^<form aria-label="Connexion" class="flex flex-col/);
	});
});
