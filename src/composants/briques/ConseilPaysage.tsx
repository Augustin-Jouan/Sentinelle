'use client';

import { cx } from './cx';
import * as Icone from './icones';
import { usePreference } from './preference';

const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';

/**
 * « Tournez le téléphone » : un conseil pour ce qui se lit mieux en largeur (le planning, sa feuille A4 paysage).
 * Il ne paraît que sur un téléphone tenu debout (écran étroit, en portrait, au doigt seul) : une fois le téléphone
 * tourné, ou sur ordinateur, il n'est pas là. « Compris » le range pour de bon (sur cet appareil).
 */
export function ConseilPaysage({ children, className }: { children: React.ReactNode; className?: string }) {
	const [vu, setVu] = usePreference('sentinelle-conseil-paysage-vu', false, estBooleen);
	if (vu) return null;
	return (
		<div role="note"
			className={cx('hidden items-center gap-3 rounded-sm border border-rule bg-accent-soft py-1 pr-1 pl-3 text-13 text-accent-2 max-etroit:portrait:pointer-coarse:not-any-pointer-fine:flex [&_svg]:size-5 [&_svg]:shrink-0', className)}>
			<Icone.Pivoter />
			<span className="min-w-0 flex-1">{children}</span>
			<button type="button" onClick={() => setVu(true)}
				className="min-h-11 shrink-0 cursor-pointer rounded-sm px-3 text-13 font-medium underline underline-offset-2">Compris</button>
		</div>
	);
}
