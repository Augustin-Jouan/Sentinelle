import { cx } from './cx';

/** La barre au-dessus d'une liste : recherche, tri, filtres (ex-.toolbar). « etalee » écarte ses deux bouts (ex-.g-toolbar). */
export function BarreOutils({ etalee = false, children }: { etalee?: boolean; children: React.ReactNode }) {
	return <div className={cx('mb-4 flex flex-wrap items-center gap-2.5', etalee && 'justify-between')}>{children}</div>;
}
