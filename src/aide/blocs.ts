/**
 * Le texte du guide (src/aide/taches.ts) s'écrit dans un format réduit, une ligne par élément :
 * - `1. …` : une étape numérotée ; la liste commence au premier numéro (une liste coupée par une capture reprend à 4) ;
 * - `- …` : une puce ;
 * - `![accueil]` : la capture d'un écran du guide (src/aide/ecrans.ts) ;
 * - toute autre ligne : un paragraphe ; les lignes vides ne comptent pas.
 * Dans une ligne : `**gras**`, `[texte](adresse)` ; `\*` écrit un astérisque.
 */
import type { IdEcran } from './ecrans';

export type Morceau = { texte: string; gras?: true; lien?: string };
export type Ligne = Morceau[];
export type Bloc =
	| { type: 'paragraphe'; ligne: Ligne }
	| { type: 'etapes'; debut: number; items: Ligne[] }
	| { type: 'puces'; items: Ligne[] }
	| { type: 'capture'; ecran: IdEcran };

const ASTERISQUE = '\u0000';

/** Une ligne en morceaux : texte, gras, liens. Un gras non refermé est une erreur d'écriture du guide. */
export function lireLigne(source: string): Ligne {
	const texte = source.replaceAll('\\*', ASTERISQUE);
	const segments = texte.split('**');
	if (segments.length % 2 === 0) throw new Error(`Gras non refermé dans le guide : « ${source} »`);
	const morceaux: Ligne = [];
	segments.forEach((segment, i) => {
		const gras = i % 2 === 1;
		let reste = segment;
		for (const m of segment.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)) {
			const [tout, libelle, lien] = m;
			const avant = reste.slice(0, reste.indexOf(tout));
			if (avant) morceaux.push(morceau(avant, gras));
			morceaux.push({ ...morceau(libelle, gras), lien });
			reste = reste.slice(reste.indexOf(tout) + tout.length);
		}
		if (reste) morceaux.push(morceau(reste, gras));
	});
	return morceaux;
}

function morceau(texte: string, gras: boolean): Morceau {
	const propre = texte.replaceAll(ASTERISQUE, '*');
	return gras ? { texte: propre, gras: true } : { texte: propre };
}

/** Le texte d'une tâche en blocs. */
export function lireBlocs(source: string): Bloc[] {
	const blocs: Bloc[] = [];
	for (const brute of source.split('\n')) {
		const ligne = brute.trim();
		if (!ligne) continue;
		const dernier = blocs.at(-1);
		const etape = /^(\d+)\.\s+(.*)$/.exec(ligne);
		const capture = /^!\[([a-z-]+)\]$/.exec(ligne);
		if (etape) {
			if (dernier?.type === 'etapes') dernier.items.push(lireLigne(etape[2]));
			else blocs.push({ type: 'etapes', debut: Number(etape[1]), items: [lireLigne(etape[2])] });
		} else if (ligne.startsWith('- ')) {
			if (dernier?.type === 'puces') dernier.items.push(lireLigne(ligne.slice(2)));
			else blocs.push({ type: 'puces', items: [lireLigne(ligne.slice(2))] });
		} else if (capture) {
			blocs.push({ type: 'capture', ecran: capture[1] as IdEcran });
		} else {
			blocs.push({ type: 'paragraphe', ligne: lireLigne(ligne) });
		}
	}
	return blocs;
}
