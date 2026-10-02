/** Click et clavier : ne pas laisser remonter à la carte `role="button"`. */
export function sansOuvrirLaCarte(e: { stopPropagation(): void }) {
	e.stopPropagation();
}
