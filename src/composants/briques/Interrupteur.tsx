import { cx } from './cx';

const TEXTE = {
	normale: 'text-13',
	/** Dans un champ de formulaire, comme son libellé (ex-.field label). */
	discrete: 'text-12 text-muted',
} as const;

const BOITE = 'relative h-4 w-7.5 flex-none rounded-full border border-rule-strong bg-raise transition-[background-color,border-color] duration-140 '
	+ "after:absolute after:top-0.5 after:left-0.5 after:size-2.5 after:rounded-full after:bg-muted after:transition-[translate,background-color] after:duration-140 after:content-[''] "
	+ 'peer-checked:border-accent peer-checked:bg-accent peer-checked:after:translate-x-3.5 peer-checked:after:bg-on-accent '
	+ 'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus';

/** L'interrupteur de la maquette (ex-.switch) : une case à cocher habillée. */
export function Interrupteur({ coche, onChange, children, id, variante = 'normale' }: {
	coche: boolean;
	onChange: (v: boolean) => void;
	children: React.ReactNode;
	id?: string;
	variante?: keyof typeof TEXTE;
}) {
	return (
		<label className={cx('inline-flex cursor-pointer items-center gap-2 select-none', TEXTE[variante])}>
			<input type="checkbox" id={id} checked={coche} onChange={(e) => onChange(e.target.checked)} className="peer absolute size-0 opacity-0" />
			<span aria-hidden="true" className={BOITE} />
			{children}
		</label>
	);
}
