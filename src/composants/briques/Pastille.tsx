import { cx } from './cx';

const BASE = 'inline-flex items-center gap-1.5 rounded-xs pt-0.5 px-1.75 pb-0.75 font-titre text-11 font-semibold tracking-[0.045em] uppercase whitespace-nowrap '
	+ "before:size-1.5 before:flex-none before:rounded-full before:content-['']";

const TON = {
	/** Ouvert, actif, modifié (ex-.pill-actif, .pill-modif). */
	accent: 'bg-accent-soft text-accent-2 before:bg-current',
	/** Terminé, archivé, bloqué : la puce n'est qu'un cercle (ex-.pill-fini). */
	neutre: 'bg-idle-soft text-muted before:border before:border-current',
} as const;

/** La pastille d'état de la maquette (ex-.pill). */
export function Pastille({ ton = 'accent', className, children }: { ton?: keyof typeof TON; className?: string; children: React.ReactNode }) {
	return <span className={cx(BASE, TON[ton], className)}>{children}</span>;
}
