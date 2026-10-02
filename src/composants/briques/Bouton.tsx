import Link from 'next/link';
import type { ComponentProps, ComponentPropsWithRef } from 'react';
import { cx } from './cx';

const BASE = 'inline-flex items-center rounded-sm border leading-[1.3] whitespace-nowrap not-italic no-underline cursor-pointer '
	+ 'transition-[background-color,border-color] duration-120 [&_svg]:size-3.5 '
	+ 'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const TAILLE = {
	normal: 'gap-1.75 px-3.25 py-1.75 text-13',
	sm: 'gap-1.75 px-2 py-1 text-12',
	/** Le bouton plein de la connexion, centré. */
	grand: 'justify-center gap-1.75 p-2.25 text-13',
} as const;

/** Réduit à l'icône (ex-.btn-ico) : remplace la taille. */
const SEUL_ICONE = 'gap-0 p-1 text-12';

const VARIANTE = {
	normal: 'border-rule-strong bg-raise text-ink hover:border-muted hover:bg-idle-soft',
	primaire: 'border-accent bg-accent font-medium text-on-accent hover:border-accent-2 hover:bg-accent-2',
	fantome: 'border-transparent bg-transparent text-muted hover:bg-idle-soft hover:text-ink',
	/** Action destructrice : elle ne se confond jamais avec sa voisine. */
	danger: 'border-rule-strong bg-raise text-danger hover:border-danger hover:bg-danger-soft [&_svg]:opacity-85',
	/** Posé sur une carte cliquable, où un bouton fantôme passerait pour du texte (ex-.chantier-actions .btn). */
	surCarte: 'border-rule-strong bg-surface text-ink-2 hover:border-muted hover:bg-idle-soft hover:text-ink [&_svg]:opacity-70',
} as const;

type Apparence = {
	variante?: keyof typeof VARIANTE;
	taille?: keyof typeof TAILLE;
	/** Le libellé passe alors par aria-label et title. */
	seulIcone?: boolean;
	/** Placement seulement (marges, place dans un flex ou une grille, largeur). */
	className?: string;
};

type PropsBouton = Apparence & Omit<ComponentPropsWithRef<'button'>, 'className' | 'disabled'> & {
	href?: undefined;
	desactive?: boolean;
	/** Pendant l'action : désactivé et aria-busy. */
	enCours?: boolean;
};
type PropsLien = Apparence & Omit<ComponentProps<typeof Link>, 'className'> & { natif?: false };
/** Un lien hors du routeur (fichier d'une route /api, téléchargement). */
type PropsLienNatif = Apparence & Omit<ComponentPropsWithRef<'a'>, 'className'> & { href: string; natif: true };

export function classesBouton({ variante = 'normal', taille = 'normal', seulIcone = false, className }: Apparence): string {
	return cx(BASE, seulIcone ? SEUL_ICONE : TAILLE[taille], VARIANTE[variante], className);
}

/** Le bouton de la maquette (ex-.btn et ses variantes). Un href en fait un lien. */
export function Bouton(props: PropsBouton | PropsLien | PropsLienNatif) {
	if (props.href === undefined) {
		const { variante, taille, seulIcone, className, desactive, enCours, type = 'button', ...reste } = props;
		return (
			<button {...reste} type={type} disabled={desactive || enCours} aria-busy={enCours || undefined}
				className={classesBouton({ variante, taille, seulIcone, className })} />
		);
	}
	if (props.natif) {
		const { variante, taille, seulIcone, className, natif: _natif, ...reste } = props;
		return <a {...reste} className={classesBouton({ variante, taille, seulIcone, className })} />;
	}
	const { variante, taille, seulIcone, className, natif: _natif, ...reste } = props;
	return <Link {...reste} className={classesBouton({ variante, taille, seulIcone, className })} />;
}
