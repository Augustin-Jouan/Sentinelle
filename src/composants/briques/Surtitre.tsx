import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { SURTITRE } from './typo';

type Props = Omit<HTMLAttributes<HTMLElement>, 'className'> & {
	/** Souligné d'un filet, sur sa propre ligne (ex-.fgroup > .eyebrow). */
	filet?: boolean;
	className?: string;
};

/** Le surtitre en petites capitales (ex-.eyebrow). */
export function Surtitre({ filet = false, className, ...reste }: Props) {
	return filet
		? <div {...reste} className={cx(SURTITRE, 'border-b border-rule pb-1.25', className)} />
		: <span {...reste} className={cx(SURTITRE, className)} />;
}
