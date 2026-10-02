import type { ComponentProps } from 'react';
import { cx } from './cx';

/** Le cadre qui porte un tableau et le fait défiler à l'horizontale (ex-.table-frame, .dm-cadre). */
export function CadreTableau({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('overflow-x-auto rounded-md border border-rule bg-raise shadow-ombre', className)}>{children}</div>;
}

/** L'en-tête de tous les tableaux : petites capitales sur fond surface. */
const ENTETE = '[&_thead_th]:border-b [&_thead_th]:border-rule-strong [&_thead_th]:bg-surface [&_thead_th]:text-left [&_thead_th]:font-titre '
	+ '[&_thead_th]:text-11 [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.07em] [&_thead_th]:whitespace-nowrap [&_thead_th]:text-muted [&_thead_th]:uppercase';

/**
 * Ce qu'une cellule ou une ligne demande par un attribut, plus fort que les règles de la variante :
 * data-droite (aligné à droite), data-saisie (le champ porte le rembourrage), data-actions (boutons sur une ligne),
 * data-vide (« aucun résultat »), data-premiere (la colonne du lot, tableau dm) ; ligne : data-ouvert, data-inactif.
 */
const CELLULES = '[&_[data-droite]]:text-right [&_[data-saisie]]:px-0 [&_[data-actions]]:whitespace-nowrap [&_[data-actions]>*+*]:ml-1.5 '
	+ '[&_[data-vide]]:px-3 [&_[data-vide]]:py-7 [&_[data-vide]]:text-center [&_[data-vide]]:italic [&_[data-vide]]:text-muted [&_[data-inactif]>*]:text-muted';

const VARIANTE = {
	/** Une liste (ex-table.plain). */
	plain: `min-w-184 ${ENTETE} [&_thead_th]:px-3 [&_thead_th]:py-2 [&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 [&_tbody_tr:hover]:bg-surface`,
	/** Serré, dans un panneau ; les colonnes de chiffres se serrent sur leur contenu (ex-table.plain.plain-mini). */
	mini: `min-w-0 text-13 ${ENTETE} [&_thead_th]:px-2 [&_thead_th]:py-1.5 [&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-1 [&_tbody_td]:py-0.75 `
		+ '[&_tbody_tr:hover]:bg-surface [&_[data-droite]]:w-[1%] [&_[data-droite]]:whitespace-nowrap',
	/** Les lots : en-tête collé, lignes cliquables, ligne ouverte en accent (ex-table.lots). */
	lots: `min-w-208 ${ENTETE} [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-5 [&_thead_th]:px-3 [&_thead_th]:py-2 `
		+ '[&_tbody_td]:border-b [&_tbody_td]:border-rule [&_tbody_td]:px-3 [&_tbody_td]:py-1.75 [&_tbody_td]:align-middle [&_tbody_tr]:cursor-pointer '
		+ '[&_tbody_tr:not([data-ouvert]):hover]:bg-surface [&_tbody_tr[data-ouvert]]:bg-accent-soft',
	/** Les documents par lot : la première colonne est un <th> de ligne (ex-table.dm). */
	dm: `min-w-224 ${ENTETE} [&_thead_th]:px-3 [&_thead_th]:py-2.5 [&_td]:border-b [&_td]:border-rule [&_td]:px-3 [&_td]:py-1.75 [&_td]:align-middle `
		+ '[&_tbody_th]:border-b [&_tbody_th]:border-rule [&_tbody_th]:px-3 [&_tbody_th]:py-1.75 [&_tbody_th]:text-left [&_tbody_th]:align-middle [&_tbody_th]:font-normal '
		+ '[&_tbody_tr:last-child>*]:border-b-0 [&_tbody_tr:hover]:bg-surface [&_[data-premiere]]:w-[34%] [&_[data-premiere]]:pl-4',
} as const;

/** Un tableau de la maquette. Les cellules restent du HTML ; leurs écarts passent par des attributs data-* (CELLULES). */
export function Tableau({ variante, className, ...reste }: { variante: keyof typeof VARIANTE; className?: string } & Omit<ComponentProps<'table'>, 'className'>) {
	return <table {...reste} className={cx('w-full border-collapse', CELLULES, VARIANTE[variante], className)} />;
}
