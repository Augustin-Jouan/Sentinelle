import Link from 'next/link';
import { cx } from '@/composants/briques/cx';

/** L'état d'un document dans le tableau (ex-.dm-case.est-*). */
const TON = {
	/** Produit : la case l'ouvre. */
	fait: 'border-transparent bg-accent-soft text-accent-2 hover:border-accent',
	/** À produire : en pointillés. */
	manque: 'border-dashed border-rule-strong bg-transparent text-ink-2 hover:border-accent hover:text-accent-2',
	/** Des réserves à suivre : l'orangé, en clair comme en sombre (jetons --alerte*). */
	alerte: 'border-transparent bg-alerte-soft text-alerte hover:border-alerte-trait',
	/** Saisi hors de l'application : une case sans lien. */
	hors: 'border-transparent bg-idle-soft text-muted',
} as const;

const TAILLE = {
	normale: 'px-2 py-0.75 text-12',
	/** Dans la légende du pied de tableau (ex-.dm-legende .dm-case). */
	legende: 'px-1.5 py-0 text-11',
} as const;

export type TonCase = keyof typeof TON;

/** Une case du tableau Documents : un lien quand elle mène quelque part, sinon un texte. */
export function CaseDocument({ ton, taille = 'normale', href, titre, cas, etat, children }: {
	ton: TonCase;
	taille?: keyof typeof TAILLE;
	href?: string;
	titre?: string;
	/** data-case et data-etat : les E2E lisent la colonne et l'état. */
	cas?: string;
	etat?: string;
	children: React.ReactNode;
}) {
	const inerte = taille === 'legende' || ton === 'hors';
	const classes = cx('inline-flex items-center rounded-[6px] border leading-[1.35] whitespace-nowrap no-underline', TAILLE[taille], TON[ton],
		inerte ? 'cursor-default' : 'cursor-pointer');
	return href
		? <Link className={classes} href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>
		: <span className={classes} title={titre} data-case={cas} data-etat={etat}>{children}</span>;
}
