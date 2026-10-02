import { cx } from './cx';

const TON = {
	/** Sous-traitance (ex-.nature-tag.st). */
	accent: 'border-accent text-accent-2',
	/** Avenants (ex-.nature-tag.av). */
	neutre: 'border-rule-strong text-muted',
} as const;

const TAILLE = { normale: 'text-10', mini: 'text-9' } as const;

/** Le marqueur encadré posé à côté d'une désignation (ex-.nature-tag). */
export function Etiquette({ ton = 'neutre', taille = 'normale', className, title, children }: {
	ton?: keyof typeof TON;
	taille?: keyof typeof TAILLE;
	className?: string;
	title?: string;
	children: React.ReactNode;
}) {
	return (
		<span title={title} className={cx('rounded-xs border pt-0.25 px-1.25 pb-0.5 font-titre font-semibold tracking-[0.05em] uppercase whitespace-nowrap',
			TAILLE[taille], TON[ton], className)}>
			{children}
		</span>
	);
}
