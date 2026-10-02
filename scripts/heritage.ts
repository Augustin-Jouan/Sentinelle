// L'héritage de la maquette (src/styles/heritage.css) pendant la migration vers les briques.
//   npx tsx scripts/heritage.ts elaguer             retire les sélecteurs dont une classe n'est plus écrite nulle part
//   npx tsx scripts/heritage.ts retirer lots 'g-*'  retire les sélecteurs qui citent ces classes (mot encore présent ailleurs, règle déplacée)
//   npx tsx scripts/heritage.ts restes <fichiers>   les classes de l'héritage encore écrites dans ces fichiers
//   npx tsx scripts/heritage.ts figer               fige la liste des sélecteurs (une seule fois, à la création)
import { existsSync, writeFileSync } from 'node:fs';
import {
	classesDe, correspond, elaguer, FICHIER_HERITAGE, FICHIER_SELECTEURS, fichiersSources, lireHeritage,
	lireSelecteursFiges, motsDesChaines, selecteursDe,
} from '../src/styles/heritage';

const [commande, ...args] = process.argv.slice(2);

/** Réécrit l'héritage ; la liste figée ne perd que ce qui a disparu, elle ne gagne jamais rien. */
function ecrire(css: string, avant: number) {
	writeFileSync(FICHIER_HERITAGE, css);
	const apres = selecteursDe(css);
	if (existsSync(FICHIER_SELECTEURS)) {
		const restants = new Set(apres);
		const liste = [...lireSelecteursFiges()].filter((s) => restants.has(s));
		writeFileSync(FICHIER_SELECTEURS, liste.join('\n') + '\n');
	}
	console.log(`${avant - apres.length} sélecteur(s) retiré(s), ${apres.length} restant(s).`);
}

const css = lireHeritage();
const avant = selecteursDe(css).length;

if (commande === 'elaguer') {
	const mots = motsDesChaines(fichiersSources());
	ecrire(elaguer(css, (s) => classesDe(s).every((c) => mots.has(c))), avant);
} else if (commande === 'retirer' && args.length) {
	ecrire(elaguer(css, (s) => !classesDe(s).some((c) => correspond(c, args))), avant);
} else if (commande === 'restes' && args.length) {
	const classes = new Set(selecteursDe(css).flatMap(classesDe));
	for (const f of args) {
		const vues = [...motsDesChaines([f])].filter((m) => classes.has(m));
		if (vues.length) console.log(`${f} : ${vues.sort().join(' ')}`);
	}
} else if (commande === 'figer') {
	const liste = [...new Set(selecteursDe(css))];
	writeFileSync(FICHIER_SELECTEURS, liste.join('\n') + '\n');
	console.log(`${liste.length} sélecteur(s) figé(s) dans ${FICHIER_SELECTEURS}.`);
} else {
	console.error('Usage : npx tsx scripts/heritage.ts elaguer | retirer <classe|préfixe-*>… | restes <fichier>… | figer');
	process.exitCode = 1;
}
