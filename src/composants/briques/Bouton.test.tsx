import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Bouton, classesBouton } from './Bouton';

const classes = (html: string) => /class="([^"]*)"/.exec(html)?.[1].split(' ') ?? [];

describe('Bouton', () => {
	it('est un <button type="button">, variante normale, taille normale', () => {
		const html = renderToStaticMarkup(<Bouton>Annuler</Bouton>);
		expect(html).toMatch(/^<button type="button" class="[^"]+">Annuler<\/button>$/);
		expect(classes(html)).toEqual(expect.arrayContaining(['bg-raise', 'border-rule-strong', 'px-3.25', 'text-13']));
	});

	it('en cours : désactivé et occupé', () => {
		const html = renderToStaticMarkup(<Bouton enCours>Créer</Bouton>);
		expect(html).toContain('disabled=""');
		expect(html).toContain('aria-busy="true"');
	});

	it('un href rend un lien du routeur ; natif, un <a> ordinaire', () => {
		expect(renderToStaticMarkup(<Bouton href="/chantiers">Retour</Bouton>)).toMatch(/^<a [^>]*href="\/chantiers"/);
		const natif = renderToStaticMarkup(<Bouton natif href="/api/x" download>PDF</Bouton>);
		expect(natif).toMatch(/^<a href="\/api\/x" download=""/);
		expect(natif).not.toContain('natif');
	});

	it('seulIcone remplace la taille', () => {
		const c = classesBouton({ seulIcone: true, taille: 'sm' }).split(' ');
		expect(c).toContain('p-1');
		expect(c).not.toContain('px-2');
	});

	it('className s\'ajoute en dernier (placement)', () => {
		expect(classesBouton({ className: 'ml-3' }).split(' ').at(-1)).toBe('ml-3');
	});
});
