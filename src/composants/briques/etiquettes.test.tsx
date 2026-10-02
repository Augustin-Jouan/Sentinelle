import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Etiquette } from './Etiquette';
import { LienAction } from './LienAction';
import { Pastille } from './Pastille';
import { Surtitre } from './Surtitre';

describe('petites briques', () => {
	it('Pastille : le ton neutre cercle la puce au lieu de la remplir', () => {
		expect(renderToStaticMarkup(<Pastille>Ouvert</Pastille>)).toContain('before:bg-current');
		const neutre = renderToStaticMarkup(<Pastille ton="neutre">Terminé</Pastille>);
		expect(neutre).toContain('before:border-current');
		expect(neutre).not.toContain('before:bg-current');
	});

	it('Surtitre : filet le pose sur sa ligne, souligné', () => {
		expect(renderToStaticMarkup(<Surtitre>Client</Surtitre>)).toMatch(/^<span class="[^"]*uppercase/);
		expect(renderToStaticMarkup(<Surtitre filet>Montant</Surtitre>)).toMatch(/^<div class="[^"]*border-b border-rule/);
		expect(renderToStaticMarkup(<Surtitre id="g-resume">3 périodes</Surtitre>)).toContain('id="g-resume"');
	});

	it('Etiquette : taille mini et ton accent', () => {
		const html = renderToStaticMarkup(<Etiquette ton="accent" taille="mini">Sous-traitance</Etiquette>);
		expect(html).toContain('text-9');
		expect(html).toContain('border-accent');
	});

	it('LienAction : un bouton, ou un lien avec href', () => {
		expect(renderToStaticMarkup(<LienAction>Corriger</LienAction>)).toMatch(/^<button type="button"/);
		expect(renderToStaticMarkup(<LienAction href="?pv=tous">Tous les lots</LienAction>)).toMatch(/^<a [^>]*href="\?pv=tous"/);
	});
});
