import Link from 'next/link';
import { cx } from './cx';

/** L'étage des onglets du chantier ouvert (ex-.nav-onglets). */
export function BarreOnglets({ libelle, children }: { libelle: string; children: React.ReactNode }) {
	return (
		<nav aria-label={libelle} className="flex gap-0.5 overflow-x-auto border-t border-rule bg-paper px-6 [scrollbar-width:none] max-etroit:px-3.5 [&::-webkit-scrollbar]:hidden">
			{children}
		</nav>
	);
}

/** Un onglet (ex-.nav-o) : son icône, son libellé, son compteur ; l'onglet courant porte aria-current. */
export function Onglet({ href, actif, icone, compteur, children }: { href: string; actif: boolean; icone: React.ReactNode; compteur?: number; children: React.ReactNode }) {
	return (
		<Link href={href} aria-current={actif ? 'page' : undefined}
			className={cx('inline-flex flex-none items-center gap-2 border-b-2 px-3.5 pt-2.75 pb-2.25 text-14 whitespace-nowrap no-underline transition-[color,border-color] duration-120',
				'[&_svg]:size-4 [&_svg]:flex-none [&_svg]:stroke-[1.5] [&_svg]:opacity-80',
				actif ? 'border-accent font-semibold text-accent' : 'border-transparent text-muted hover:text-ink')}>
			{icone}{children}
			{compteur !== undefined && (
				<span data-testid="compteur" className={cx('font-mono text-11', actif ? 'text-accent opacity-75' : 'text-faint')}>{compteur}</span>
			)}
		</Link>
	);
}
