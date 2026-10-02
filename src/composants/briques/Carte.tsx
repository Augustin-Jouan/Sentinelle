import Link from 'next/link';
import type { HTMLAttributes } from 'react';
import { cx } from './cx';

const SOULEVE = 'cursor-pointer transition-[box-shadow,border-color,translate] duration-160 hover:-translate-y-0.5 hover:border-accent hover:shadow-ombre-h active:translate-y-0';

const VARIANTE = {
	/** Une carte qui s'ouvre : elle se soulève au survol (ex-.chantier). */
	cliquable: `gap-3 border-rule bg-raise px-5.5 pt-5 pb-4.5 shadow-ombre ${SOULEVE}`,
	/** La carte d'ajout, en pointillés, contenu centré (ex-.chantier-new). */
	ajout: `items-start justify-center gap-1.5 border-dashed border-rule bg-surface px-5.5 pt-5 pb-4.5 shadow-ombre ${SOULEVE}`,
	/** Une carte de série (ex-.dm-carte). */
	compacte: 'items-start gap-1 border-rule bg-raise px-4 py-3.5 shadow-ombre',
	/** La même, encore vide (ex-.dm-carte.est-vide). */
	compacteVide: 'items-start gap-1 border-dashed border-rule-strong bg-surface px-4 py-3.5',
} as const;

type Apparence = {
	variante: keyof typeof VARIANTE;
	/** Estompée : un chantier terminé (ex-.chantier.is-done). */
	estompee?: boolean;
	/** Placement seulement. */
	className?: string;
};

const classes = ({ variante, estompee, className }: Apparence) =>
	cx('flex flex-col rounded-md border text-left', VARIANTE[variante], estompee && 'opacity-72', className);

/** Le cadre d'une carte : fond, filet, rondeur, ombre. Un href en fait un lien. */
export function Carte(props: Apparence & Omit<HTMLAttributes<HTMLDivElement>, 'className'> & { href?: undefined } | Apparence & { href: string; children: React.ReactNode }) {
	if (props.href !== undefined) {
		const { variante, estompee, className, href, children } = props;
		return <Link href={href} className={classes({ variante, estompee, className })}>{children}</Link>;
	}
	const { variante, estompee, className, href: _href, ...reste } = props;
	return <div {...reste} className={classes({ variante, estompee, className })} />;
}
