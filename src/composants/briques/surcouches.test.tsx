import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ConfirmationFournisseur } from './Confirmation';
import { MenuDeroulant } from './MenuDeroulant';
import { Panneau } from './Panneau';
import { AU_DESSUS_DE_L_APERCU, CONFIRMATION_OUVERTE, PANNEAU_OUVERT } from './surcouches';

const rien = () => {};

describe('surcouches', () => {
	it('les sélecteurs visent des attributs, jamais des classes', () => {
		for (const s of [CONFIRMATION_OUVERTE, PANNEAU_OUVERT, AU_DESSUS_DE_L_APERCU]) expect(s).not.toMatch(/(^|[\s,])\./);
		expect(AU_DESSUS_DE_L_APERCU).toBe('[data-surcouche="confirmation"][data-ouvert], [data-surcouche="menu"][data-ouvert], [data-surcouche="panneau"][data-ouvert]');
	});

	it('Panneau ouvert : data-ouvert, verrou de défilement, blocage du clavier', () => {
		const html = renderToStaticMarkup(<Panneau ouvert surtitre="LOT 02" titre="GROS ŒUVRE" onFermer={rien}>corps</Panneau>);
		expect(html).toContain('data-surcouche="panneau" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""');
		expect(html).toContain('>corps<');
		expect(html).not.toContain('translate-x-full');
	});

	it('Panneau fermé : hors écran, sans verrou ni contenu', () => {
		const html = renderToStaticMarkup(<Panneau ouvert={false} surtitre="LOT 02" titre="GROS ŒUVRE" onFermer={rien}>corps</Panneau>);
		expect(html).toContain('data-surcouche="panneau"');
		expect(html).not.toContain('data-ouvert');
		expect(html).not.toContain('data-verrou-defilement');
		expect(html).toContain('translate-x-full');
		expect(html).not.toContain('>corps<');
	});

	it('Confirmation fermée : un alertdialog masqué, sans verrou', () => {
		const html = renderToStaticMarkup(<ConfirmationFournisseur>page</ConfirmationFournisseur>);
		expect(html).toContain('role="alertdialog"');
		expect(html).toContain('data-surcouche="confirmation"');
		expect(html).not.toContain('data-ouvert');
		expect(html).toMatch(/class="[^"]*\bhidden\b/);
	});

	it('MenuDeroulant : surcouche « menu », valeur repérable, largeur par prop, placement par className', () => {
		const html = renderToStaticMarkup(<MenuDeroulant id="dd-ent" k="Attribuée à" valeur="b" largeur="pleine" className="self-stretch"
			options={[{ v: 'a', t: 'ALPHA' }, { v: 'b', t: 'CONSTRUCTIONS REBOURS' }]} onChoisir={rien} />);
		expect(html).toContain('id="dd-ent" data-surcouche="menu"');
		expect(html).not.toContain('data-ouvert');
		expect(html).toMatch(/data-testid="dd-valeur">CONSTRUCTIONS REBOURS</);
		expect(html).toMatch(/id="dd-ent"[^>]*class="relative min-w-0 flex-1 self-stretch"/);
		expect(html).toContain('title="Attribuée à : CONSTRUCTIONS REBOURS"');
	});
});
