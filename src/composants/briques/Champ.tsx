import type { ComponentPropsWithRef } from 'react';
import { cx } from './cx';
import { CHIFFRES, SURTITRE } from './typo';

/** Saisie posée dans une cellule : invisible au repos, cadre au survol, accent au focus (ex-.text-input, .money-input). */
const EN_CELLULE = 'rounded-sm border border-transparent bg-transparent px-[calc(0.75rem-1px)] py-0.75 transition-[border-color,background-color] duration-120 '
	+ 'hover:border-rule-strong hover:bg-surface focus:border-accent focus:bg-raise focus:outline-none';
/** Saisie à cadre d'un panneau (ex-.champ-kv). */
const KV = 'rounded-sm border border-rule-strong bg-surface px-1.75 py-0.75 text-left font-mono tabular-nums text-13 transition-[border-color,background-color] duration-120 '
	+ 'hover:bg-raise focus:border-accent focus:bg-raise focus:outline-none';

const SAISIE = {
	/** Le champ d'un formulaire (ex-.field input). */
	champ: 'w-full rounded-sm border border-rule-strong bg-surface px-2.5 py-2 text-ink focus:border-accent focus:bg-raise focus:outline-none',
	texte: `w-full ${EN_CELLULE} text-13 placeholder:font-normal placeholder:italic placeholder:text-faint`,
	'texte-mini': `w-full ${EN_CELLULE} font-mono text-12 text-muted placeholder:font-normal placeholder:italic placeholder:text-faint`,
	montant: `w-full ${EN_CELLULE} text-right font-mono tabular-nums text-13`,
	'montant-mini': `w-full ${EN_CELLULE} text-right font-mono tabular-nums text-12 text-muted`,
	/** Dans le tableau serré d'un panneau (semaine, année, durée). */
	'montant-etroit': `w-13 ${EN_CELLULE} text-right font-mono tabular-nums text-12 text-muted`,
	kv: `w-36 ${KV}`,
	'kv-etroit': `w-16 ${KV}`,
	/** Une date posée dans le texte (ex-.date-lot). */
	date: 'rounded-sm border border-rule-strong bg-surface px-1.5 py-0.75 text-13 text-ink',
} as const;

/** La graisse propre à chaque saisie ; « gras » la remplace. */
const POIDS: Partial<Record<VarianteSaisie, string>> = { texte: 'font-medium' };

/** Refusée par le serveur : rouge, la saisie reste (ex-.est-erreur). Pendant l'enregistrement : estompée (ex-.est-en-cours). */
const ETATS = 'aria-invalid:border-danger aria-invalid:bg-danger-soft aria-busy:opacity-70';

export type VarianteSaisie = keyof typeof SAISIE;

/** Les classes d'une saisie : pour Saisie, ZoneTexte, ChampEnLigne, ou un <input> qui ne peut pas être une brique. */
export function classesSaisie(variante: VarianteSaisie, o: { gras?: boolean; chiffres?: boolean } = {}): string {
	return cx(SAISIE[variante], o.gras ? 'font-semibold' : POIDS[variante], o.chiffres && CHIFFRES, ETATS);
}

/** L'id du message d'erreur d'un champ, que la saisie annonce par aria-describedby. */
export const idErreur = (id: string) => `${id}-erreur`;

type PropsSaisie<E extends 'input' | 'textarea'> = Omit<ComponentPropsWithRef<E>, 'className'> & {
	variante?: VarianteSaisie;
	gras?: boolean;
	chiffres?: boolean;
	/** Le message (ou true) : la saisie passe en erreur et l'annonce. */
	erreur?: string | boolean;
	className?: string;
};

const aria = (id: string | undefined, erreur: string | boolean | undefined) => ({
	'aria-invalid': erreur ? true : undefined,
	'aria-describedby': typeof erreur === 'string' && id ? idErreur(id) : undefined,
});

export function Saisie({ variante = 'champ', gras, chiffres, erreur, className, ...reste }: PropsSaisie<'input'>) {
	return <input {...aria(reste.id, erreur)} {...reste} className={cx(classesSaisie(variante, { gras, chiffres }), className)} />;
}

/** Un texte sur plusieurs lignes, qui s'agrandit à la main (ex-.gen-fields textarea). */
export function ZoneTexte({ variante = 'champ', gras, chiffres, erreur, className, ...reste }: PropsSaisie<'textarea'>) {
	return <textarea {...aria(reste.id, erreur)} {...reste} className={cx(classesSaisie(variante, { gras, chiffres }), 'resize-y leading-[1.45]', className)} />;
}

const TAILLE_ERREUR = { normale: 'text-12', petite: 'text-11' } as const;

/** Un message d'erreur (ex-.erreur). « alerte » l'annonce aussitôt (role="alert"). */
export function Erreur({ id, alerte = false, taille = 'normale', children }: { id?: string; alerte?: boolean; taille?: keyof typeof TAILLE_ERREUR; children: React.ReactNode }) {
	return <p id={id} role={alerte ? 'alert' : undefined} className={cx('m-0 text-danger', TAILLE_ERREUR[taille])}>{children}</p>;
}

/** Un champ de formulaire : libellé, contrôle, aide, erreur (ex-.field). */
export function Champ({ libelle, pour, aide, erreur, pleineLargeur = false, className, children }: {
	libelle?: React.ReactNode;
	/** L'id du contrôle : le libellé lui est relié, et le message d'erreur prend idErreur(pour). */
	pour?: string;
	aide?: React.ReactNode;
	erreur?: string;
	/** Toute la largeur de la grille (ex-.field.span). */
	pleineLargeur?: boolean;
	/** Placement seulement. */
	className?: string;
	children: React.ReactNode;
}) {
	const etiquette = 'text-12 text-muted';
	return (
		<div className={cx('flex min-w-0 flex-col gap-1', pleineLargeur && 'col-span-full', className)}>
			{libelle !== undefined && (pour ? <label htmlFor={pour} className={etiquette}>{libelle}</label> : <span className={etiquette}>{libelle}</span>)}
			{children}
			{aide && <span className="text-11 text-faint">{aide}</span>}
			{erreur && <Erreur id={pour ? idErreur(pour) : undefined} taille="petite">{erreur}</Erreur>}
		</div>
	);
}

/** Des champs sur deux colonnes ou plus, selon la place (ex-.grid-2). */
export function GrilleChamps({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-4 gap-y-3.5', className)}>{children}</div>;
}

/** Un groupe de champs sous son surtitre, dans un cadre (ex-.fieldset). */
export function GroupeChamps({ titre, className, children }: { titre: React.ReactNode; className?: string; children: React.ReactNode }) {
	return (
		<div className={cx('mb-4 break-inside-avoid rounded-md border border-rule bg-raise px-5.5 pt-5 pb-5.5 shadow-ombre', className)}>
			<div className={cx(SURTITRE, 'mb-3.5 border-b border-rule pb-2.5')}>{titre}</div>
			{children}
		</div>
	);
}

/** Une section d'un formulaire en une seule colonne : son titre puis ses champs, un filet la sépare de la précédente. */
export function SectionChamps({ titre, children }: { titre: React.ReactNode; children: React.ReactNode }) {
	return (
		<section className="flex flex-col gap-3.5 border-t border-rule pt-5.5 first:border-t-0 first:pt-0">
			<h2 className="text-15">{titre}</h2>
			{children}
		</section>
	);
}

/** Les groupes coulent sur trois colonnes dès qu'il y a la place (ex-.form-wrap). */
export function ColonnesFormulaire({ className, children }: { className?: string; children: React.ReactNode }) {
	return <div className={cx('columns-[3_24rem] gap-x-5', className)}>{children}</div>;
}

/** Les actions, sous toutes les colonnes (ex-.form-actions). */
export function PiedFormulaire({ children }: { children: React.ReactNode }) {
	return <div className="flex items-center gap-2.5 pt-1 [column-span:all]">{children}</div>;
}
