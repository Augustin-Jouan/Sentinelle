/** A4 paysage moins les marges de 10 mm du Socle, à 96 px par pouce : 277 × 190 mm. */
export const LARGEUR_UTILE_PX = 1046;
/** 190 mm = 718,1 px, arrondi par défaut : la feuille ne déborde jamais d'un pixel. */
export const HAUTEUR_UTILE_PX = 717;
/** La place qu'il faut à un numéro de semaine lisible (maquette : LARGEUR_NUMERO). */
export const LARGEUR_NUMERO_PX = 13;
/** En dessous, la feuille serait illisible : on refuse. */
export const ECHELLE_MIN = 0.4;
export const TROP_DE_LOTS = 'Trop de lots pour une seule feuille.';

export type OptionsUneFeuille = { selecteur: string; largeurNumero: number; hauteurUtile: number };

export const OPTIONS_UNE_FEUILLE: OptionsUneFeuille = {
	selecteur: '.sheet',
	largeurNumero: LARGEUR_NUMERO_PX,
	hauteurUtile: HAUTEUR_UTILE_PX,
};

/**
 * Fait tenir la feuille sur une page, en deux temps :
 * 1. si les colonnes sont trop serrées pour porter chacune son numéro, n'en garde qu'un sur `pas`
 *    (la grille garde toutes ses colonnes) ;
 * 2. renvoie l'échelle qui ramène la hauteur de la feuille à celle d'une page.
 *
 * DOM pur et autonome : Playwright l'exécute dans la page par `page.evaluate(ajusterUneFeuille, options)`,
 * l'aperçu l'appelle directement. Ni import, ni fonction extérieure, ni fonction nommée à l'intérieur
 * (le texte de la fonction est envoyé tel quel au navigateur).
 */
export function ajusterUneFeuille(o: OptionsUneFeuille): { pas: number; echelle: number } {
	const feuille = document.querySelector<HTMLElement>(o.selecteur);
	if (!feuille) return { pas: 1, echelle: 1 };
	const numeros = Array.from(feuille.querySelectorAll<HTMLElement>('.d-sems span'));
	for (const n of numeros) n.style.visibility = '';
	let pas = 1;
	const piste = feuille.querySelector<HTMLElement>('th.d-piste');
	if (piste && numeros.length) {
		const parSemaine = piste.getBoundingClientRect().width / numeros.length;
		// Une mesure nulle veut dire que rien n'est mis en page : on garde tous les numéros.
		if (parSemaine > 0) pas = Math.max(1, Math.ceil(o.largeurNumero / parSemaine));
		for (let i = 0; i < numeros.length; i++) {
			if (i % pas) numeros[i].style.visibility = 'hidden';
		}
	}
	const hauteur = feuille.getBoundingClientRect().height;
	const echelle = hauteur > 0 ? Math.min(1, o.hauteurUtile / hauteur) : 1;
	return { pas, echelle };
}
