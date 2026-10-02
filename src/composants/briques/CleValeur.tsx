import type { HTMLAttributes } from 'react';
import { cx } from './cx';
import { CHIFFRES } from './typo';

/** Des paires clé — valeur sur deux colonnes (ex-.kv). */
export function CleValeur({ className, children }: { className?: string; children: React.ReactNode }) {
	return <dl className={cx('grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3.5 gap-y-1.5', className)}>{children}</dl>;
}

export function Cle({ children }: { children: React.ReactNode }) {
	return <dt className="text-12 text-muted">{children}</dt>;
}

/** « chiffres » : alignés ; « moins » : une moins-value, en danger (ex-.kv dd.num.moins). */
export function Valeur({ chiffres = false, moins = false, children, ...reste }: Omit<HTMLAttributes<HTMLElement>, 'className'> & { chiffres?: boolean; moins?: boolean }) {
	return <dd {...reste} className={cx('text-13', chiffres && CHIFFRES, moins && 'text-danger')}>{children}</dd>;
}
