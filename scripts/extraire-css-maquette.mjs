// Extrait la feuille de style de la maquette vers src/app/maquette.css, sans rien réécrire.
// On n'écarte que ce que src/documents/styles.ts porte déjà (les feuilles imprimables)
// et les règles d'impression de la maquette (l'app imprime des PDF).
// Usage : node scripts/extraire-css-maquette.mjs          → écrit le fichier
//         node scripts/extraire-css-maquette.mjs --stdout → l'affiche (test)
import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const html = readFileSync('docs/maquette/sentinelle-marches.html', 'utf8');
// La grande feuille : le <style> en début de ligne, pas ceux que citent les notes d'en-tête.
const source = html.match(/^<style>\n([\s\S]*?)^<\/style>/m)[1];

/** Racine d'un sélecteur, sans le préfixe de thème : « :root[data-theme='dark'] .dm-case.est-alerte » → « .dm-case.est-alerte ». */
const racine = (s) => s.trim().replace(/^:root(\[[^\]]*\]|:not\([^)]*\))*\s+/, '').split(/[\s>+~:]/)[0].replace(/\[.*$/, '');

/** Les feuilles imprimables et leur saisie : styles.ts les porte pour l'écran comme pour le PDF. */
const FEUILLE = [
	/^\.sheet(-[a-z]+)?(\.sheet-[a-z]+)?$/, /^\.fill(\.[a-z]+)?$/, /^\.sign-row(-2)?$/, /^\.recap-[a-z]+$/,
	/^table\.(recap|d-avenant|d-gantt|d-visa|cr-lots|cp-t|cp-prec|cp-titu)$/, /^\.av-(lieu|kv|objet)$/, /^\.d-[a-z-]+$/,
	/^\.cr-[a-z-]+(\.[a-z-]+)?$/, /^\.cp-(?!alerte$)[a-z-]+$/, /^\.pv-[a-z-]+$/, /^\.doc-(entete|kv|titre|phrase|note|feuille)$/,
	/^\.dp-pages$/, /^\.print-on$/, /^#(cr|cp|pv|gen)(\.lecture)?$/, /^(div)?\.zone$/, /^(button)?\.saisie$/,
	/^(div|p)?\.imprime$/, /^\.ecran$/, /^\.est-cache$/,
];
const estFeuille = (r) => r.selectors.every((s) => FEUILLE.some((re) => re.test(racine(s))));

const racineCss = postcss.parse(source);
racineCss.walkAtRules('media', (m) => { if (/print/.test(m.params)) m.remove(); });
racineCss.walkRules((r) => {
	if (r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name)) return;
	if (estFeuille(r)) r.remove();
});
racineCss.walkAtRules('media', (m) => { if (!m.nodes?.length) m.remove(); });

const entete = `/* GÉNÉRÉ par scripts/extraire-css-maquette.mjs depuis docs/maquette/sentinelle-marches.html.
   Ne pas éditer : relancer le script. Les ajouts propres à l'app vont dans maquette-ajouts.css. */\n`;
const sortie = entete + racineCss.toString().trim() + '\n';
if (process.argv.includes('--stdout')) process.stdout.write(sortie);
else writeFileSync('src/app/maquette.css', sortie);
