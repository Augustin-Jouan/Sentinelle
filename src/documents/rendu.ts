import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createElement } from 'react';
import { Gabarit } from './gabarits/Gabarit';
import type { DonneesDocument } from './schemas';
import { CSS_DOCUMENTS } from './styles';

const POLICES: [famille: string, graisse: number, fichier: string][] = [
	['Figtree', 400, 'figtree-400'], ['Figtree', 500, 'figtree-500'], ['Figtree', 600, 'figtree-600'],
	['Outfit', 500, 'outfit-500'], ['Outfit', 600, 'outfit-600'], ['Outfit', 700, 'outfit-700'],
	['Spline Sans Mono', 400, 'spline-sans-mono-400'], ['Spline Sans Mono', 500, 'spline-sans-mono-500'], ['Spline Sans Mono', 600, 'spline-sans-mono-600'],
];

let policesCss: Promise<string> | null = null;

/** Polices incluses en base64 : Chromium n'a aucun accès réseau pendant la génération. */
function chargerPolices(): Promise<string> {
	policesCss ??= Promise.all(POLICES.map(async ([famille, graisse, fichier]) => {
		const octets = await readFile(path.join(process.cwd(), 'public', 'polices', `${fichier}.woff2`));
		return `@font-face{font-family:'${famille}';font-weight:${graisse};src:url(data:font/woff2;base64,${octets.toString('base64')}) format('woff2');}`;
	})).then((regles) => regles.join('\n'));
	return policesCss;
}

export async function rendreHtml(donnees: DonneesDocument): Promise<string> {
	// Import dynamique : Next.js 16 accepte react-dom/server ainsi dans une Server Action ou une route (vérifié).
	const { renderToStaticMarkup } = await import('react-dom/server');
	const corps = renderToStaticMarkup(createElement(Gabarit, { donnees, mode: 'impression' }));
	return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${await chargerPolices()}${CSS_DOCUMENTS}</style></head><body class="mode-impression">${corps}</body></html>`;
}
