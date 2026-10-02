import { cx } from './cx';

const VARIANTE = {
	/** À la place d'une liste de cartes, sur toute la largeur de la grille (ex-.empty-list). */
	liste: 'col-span-full rounded-sm border border-rule bg-raise px-5 py-8 text-center italic text-muted',
	/** Dans un bloc de panneau (ex-.vide-mini). */
	mini: 'px-3.5 py-5 text-center text-13 italic text-muted',
} as const;

/** Ce qui s'affiche quand il n'y a rien. */
export function Vide({ variante, className, children }: { variante: keyof typeof VARIANTE; className?: string; children: React.ReactNode }) {
	return <p className={cx(VARIANTE[variante], className)}>{children}</p>;
}
