import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bloc } from './Bloc';
import { Carte } from './Carte';
import { Cle, CleValeur, Valeur } from './CleValeur';
import { Ecran } from './Ecran';
import { Onglet } from './Onglet';
import { Tableau } from './Tableau';

describe('briques de structure', () => {
	it('Carte : un div qui garde ses attributs, ou un lien', () => {
		const div = renderToStaticMarkup(<Carte variante="cliquable" role="button" tabIndex={0} data-testid="carte-chantier">x</Carte>);
		expect(div).toMatch(/^<div role="button" tabindex="0" data-testid="carte-chantier" class="[^"]*shadow-ombre/);
		const lien = renderToStaticMarkup(<Carte variante="ajout" href="/chantiers/nouveau">+</Carte>);
		expect(lien).toMatch(/^<a /);
		expect(lien).toContain('href="/chantiers/nouveau"');
		expect(lien).toContain('border-dashed');
		expect(renderToStaticMarkup(<Carte variante="cliquable" estompee>x</Carte>)).toContain('opacity-72');
	});

	it('Bloc : sans titre ni action, pas d\'en-tête', () => {
		expect(renderToStaticMarkup(<Bloc>corps</Bloc>)).not.toContain('border-b');
		expect(renderToStaticMarkup(<Bloc titre="Avenants" corps="nu">corps</Bloc>)).toContain('>Avenants</span>');
	});

	it('CleValeur : une moins-value en danger, en chiffres', () => {
		const html = renderToStaticMarkup(<CleValeur><Cle>Avenants</Cle><Valeur chiffres moins data-testid="somme-avenants">− 300,00 €</Valeur></CleValeur>);
		expect(html).toContain('<dd data-testid="somme-avenants" class="text-13 font-mono tabular-nums text-danger">');
	});

	it('Tableau : les attributs de cellule passent avant les règles de la variante', () => {
		const c = renderToStaticMarkup(<Tableau variante="mini"><tbody /></Tableau>).replaceAll('&amp;', '&').replaceAll('&gt;', '>');
		for (const attendu of ['[&_[data-droite]]:text-right', '[&_[data-saisie]]:px-0', '[&_[data-vide]]:italic', '[&_[data-droite]]:w-[1%]']) expect(c).toContain(attendu);
	});

	it('Onglet : l\'onglet courant porte aria-current, le compteur un data-testid', () => {
		const html = renderToStaticMarkup(<Onglet href="/x" actif icone={null} compteur={3}>Marchés</Onglet>);
		expect(html).toContain('aria-current="page"');
		expect(html).toContain('data-testid="compteur"');
	});

	it('Ecran : un titre de niveau 1', () => {
		expect(renderToStaticMarkup(<Ecran titre="Artisans">x</Ecran>)).toContain('<h1 class="text-22">Artisans</h1>');
	});
});
