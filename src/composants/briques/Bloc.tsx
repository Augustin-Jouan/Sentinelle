import { cx } from './cx';
import { Surtitre } from './Surtitre';

const CORPS = {
	normal: 'p-3.5',
	/** Un tableau qui touche les bords. */
	nu: 'p-0',
	/** Des éléments empilés, espacés. */
	colonne: 'flex flex-col gap-3 p-3.5',
} as const;

/** Un bloc d'un panneau : en-tête (surtitre, action) et corps (ex-.block, .block-head, .block-body). */
export function Bloc({ titre, action, corps = 'normal', className, children }: {
	titre?: React.ReactNode;
	action?: React.ReactNode;
	corps?: keyof typeof CORPS;
	/** Placement seulement. */
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cx('overflow-hidden rounded-md border border-rule bg-raise', className)}>
			{(titre || action) && (
				<div className="flex items-center justify-between gap-3 border-b border-rule bg-surface px-3.5 py-2">
					{titre && <Surtitre>{titre}</Surtitre>}
					{action}
				</div>
			)}
			<div className={CORPS[corps]}>{children}</div>
		</div>
	);
}
