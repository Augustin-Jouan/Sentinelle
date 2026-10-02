import { normaliser } from '@/domaine/recherche';

export type OptionMenu = { v: string; t: string; meta?: string } | { sep: true } | { tete: string };
export const estChoix = (o: OptionMenu): o is { v: string; t: string; meta?: string } => 'v' in o;

/** ddFiltre : chaque mot doit figurer, sans accents ni casse, dans le libellé ou le complément ; pendant une recherche, plus de séparateurs. */
export function filtrerOptions(options: OptionMenu[], requete: string): OptionMenu[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	if (!mots.length) return options;
	return options.filter((o) => estChoix(o) && mots.every((m) => normaliser(`${o.t} ${o.meta ?? ''}`).includes(m)));
}

/** ddPlace : sous le bouton s'il y a la place, au-dessus sinon, jamais au-delà d'un bord ; 240 px de large au moins. */
export function placerMenu(
	bouton: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
	menu: { largeur: number; hauteur: number },
	fenetre: { largeur: number; hauteur: number },
): { top?: number; bottom?: number; left: number; largeur: number; versHaut: boolean } {
	const largeur = Math.max(bouton.width, 240);
	const versHaut = bouton.bottom + menu.hauteur + 10 > fenetre.hauteur && bouton.top - menu.hauteur - 10 > 0;
	const left = Math.max(8, Math.min(bouton.left, fenetre.largeur - Math.max(largeur, menu.largeur) - 8));
	return versHaut
		? { bottom: fenetre.hauteur - bouton.top + 6, left, largeur, versHaut }
		: { top: bouton.bottom + 6, left, largeur, versHaut };
}
