// Recopie ARTISANS_SEED de la maquette dans prisma/donnees/artisans.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('docs/maquette/sentinelle-marches.html', 'utf8');
const marque = 'const ARTISANS_SEED = ';
const debut = html.indexOf(marque) + marque.length;
const fin = html.indexOf('\n];', debut) + 2;
const lignes = JSON.parse(html.slice(debut, fin));
const artisans = lignes.map(([nom, adresse, cp, commune, interlocuteur, telephone]) => ({
	nom, adresse, cp, commune, interlocuteur, telephone,
}));
mkdirSync('prisma/donnees', { recursive: true });
writeFileSync('prisma/donnees/artisans.json', `${JSON.stringify(artisans, null, '\t')}\n`);
console.log(`${artisans.length} artisans extraits.`);
