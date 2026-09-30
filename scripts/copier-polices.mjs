// Copie les polices de @fontsource dans public/polices : l'écran et les PDF les chargent localement.
import { copyFileSync, mkdirSync } from 'node:fs';

const polices = [
	['figtree', 'figtree', [400, 500, 600]],
	['outfit', 'outfit', [500, 600, 700]],
	['spline-sans-mono', 'spline-sans-mono', [400, 500, 600]],
];
mkdirSync('public/polices', { recursive: true });
for (const [paquet, nom, graisses] of polices) {
	for (const g of graisses) {
		copyFileSync(`node_modules/@fontsource/${paquet}/files/${nom}-latin-${g}-normal.woff2`, `public/polices/${nom}-${g}.woff2`);
	}
}
console.log('Polices copiées dans public/polices.');
