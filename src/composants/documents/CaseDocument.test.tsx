import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CadreApercu, NoteApercu } from '../briques/CadreApercu';
import { CaseDocument } from './CaseDocument';

describe('CaseDocument', () => {
	it('un lien quand elle mène quelque part, sinon un texte', () => {
		expect(renderToStaticMarkup(<CaseDocument ton="fait" href="?version=1" cas="marche">v1</CaseDocument>)).toMatch(/^<a [^>]*data-case="marche"/);
		expect(renderToStaticMarkup(<CaseDocument ton="manque" cas="avenant">n° 01</CaseDocument>)).toMatch(/^<span /);
	});

	it('les réserves prennent les jetons d’alerte, jamais une couleur en dur', () => {
		const html = renderToStaticMarkup(<CaseDocument ton="alerte" href="?pv=1">avec réserves</CaseDocument>);
		expect(html).toContain('bg-alerte-soft');
		expect(html).toContain('text-alerte');
		expect(html).not.toMatch(/#[0-9a-f]{3,6}/i);
	});

	it('dans la légende, la case est inerte', () => {
		expect(renderToStaticMarkup(<CaseDocument ton="fait" taille="legende">fait</CaseDocument>)).toContain('cursor-default');
	});
});

describe('CadreApercu', () => {
	it('se déclare surcouche ouverte, fige la page et bloque les raccourcis du planning', () => {
		const html = renderToStaticMarkup(
			<CadreApercu libelle="Marché" surtitre="Marché" titre="Lot 02" actions={null} disposition="simple" onFermer={() => {}}>feuille</CadreApercu>);
		expect(html).toContain('role="dialog" aria-label="Marché" data-surcouche="apercu" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""');
	});

	it('NoteApercu : en danger, ou discrète en info', () => {
		expect(renderToStaticMarkup(<NoteApercu>Manque : montant</NoteApercu>)).toContain('text-danger');
		expect(renderToStaticMarkup(<NoteApercu info>Le PDF fait foi</NoteApercu>)).toContain('text-muted');
	});
});
