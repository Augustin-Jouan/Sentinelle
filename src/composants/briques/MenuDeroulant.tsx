'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cx } from './cx';
import { estChoix, filtrerOptions, placerMenu, type OptionMenu } from './menu';

/** Le dessin des menus déroulants (ex-.dd-*, .picker-*) : MenuDeroulant et le sélecteur de chantier le partagent. */
export const MENU = {
	bouton: 'grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] items-center gap-x-2 rounded-sm border border-l-2 border-rule-strong border-l-accent bg-raise '
		+ 'pt-1.25 pr-2 pb-1.5 pl-2.5 text-left transition-[border-color,background-color] duration-120 hover:border-muted hover:border-l-accent hover:bg-idle-soft',
	cle: 'col-start-1 row-start-1 font-titre text-9 font-semibold tracking-[0.1em] uppercase text-faint',
	valeur: 'col-start-1 row-start-2 truncate font-titre text-15 leading-[1.15] font-semibold',
	fleche: 'col-start-2 row-[1/3] size-3.5 stroke-muted transition-transform duration-140',
	liste: 'max-h-88 overflow-y-auto rounded-sm border border-rule-strong bg-raise p-0.75 shadow-ombre-h',
	item: 'flex w-full cursor-pointer items-baseline gap-2 rounded-[4px] px-2 py-1.5 text-left',
	itemCourant: 'bg-accent-soft font-semibold text-accent-2',
	itemAutre: 'text-ink hover:bg-idle-soft',
	nom: 'min-w-0 flex-1 truncate text-13',
	meta: 'flex-none font-mono text-10 text-faint',
	tete: 'px-2 pt-1.75 pb-1 font-titre text-9 font-semibold tracking-[0.1em] uppercase text-faint',
	separateur: 'my-0.75 border-0 border-t border-rule',
} as const;

/** La racine est bornée : sans plafond, une valeur longue élargirait le bouton au lieu de se tronquer. */
const LARGEUR = {
	normale: { racine: 'relative max-w-80 flex-none', bouton: 'min-w-44' },
	large: { racine: 'relative max-w-96 flex-none', bouton: 'min-w-60' },
	/** Toute la place de son conteneur (ex-.dd-plein). */
	pleine: { racine: 'relative min-w-0 flex-1', bouton: 'min-w-0' },
} as const;

/** La case d'un choix multiple : cochée, elle prend l'accent. */
const COCHE = "relative pl-7 before:absolute before:top-2 before:left-2 before:size-3 before:rounded-[3px] before:border before:content-['']";
const COCHEE = "before:border-accent before:bg-accent before:inset-ring before:inset-ring-accent after:absolute after:top-2.75 after:left-[0.71875rem] after:h-1.5 after:w-0.75 "
	+ "after:rotate-45 after:border-r-[1.5px] after:border-b-[1.5px] after:border-on-accent after:content-['']";
const DECOCHEE = 'before:border-rule-strong before:bg-raise';

type Props = {
	id: string;
	/** Le surtitre (« Trier par », « Attribuée à »…). */
	k: string;
	options: OptionMenu[];
	onChoisir: (v: string) => void;
	valeur?: string;
	/** Choix multiple : les valeurs cochées ; le menu ne se referme pas au clic. */
	multi?: boolean;
	valeurs?: string[];
	/** Remplace la valeur affichée sur le bouton (choix multiple). */
	libelle?: string;
	vide?: string;
	/** true : « Rechercher… » ; un texte : son invite. */
	recherche?: boolean | string;
	largeur?: keyof typeof LARGEUR;
	desactive?: boolean;
	/** Placement seulement (self-stretch dans une barre d'outils). */
	className?: string;
};

export function MenuDeroulant(p: Props) {
	const [ouvert, setOuvert] = useState(false);
	const [requete, setRequete] = useState('');
	const racine = useRef<HTMLDivElement>(null);
	const bouton = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const champ = useRef<HTMLInputElement>(null);
	const [place, setPlace] = useState<React.CSSProperties>({});
	const choisie = p.options.find((o) => estChoix(o) && o.v === p.valeur);
	const libelle = p.libelle ?? (choisie && estChoix(choisie) ? choisie.t : (p.vide ?? '—'));
	const visibles = filtrerOptions(p.options, requete);
	const choix = visibles.filter(estChoix);
	const largeur = LARGEUR[p.largeur ?? 'normale'];
	const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];

	function placer() {
		if (!bouton.current || !menu.current) return;
		const r = placerMenu(bouton.current.getBoundingClientRect(), { largeur: menu.current.offsetWidth, hauteur: menu.current.offsetHeight },
			{ largeur: window.innerWidth, hauteur: window.innerHeight });
		setPlace({ top: r.top, bottom: r.bottom, left: r.left, width: r.largeur });
	}

	useLayoutEffect(() => { if (ouvert) placer(); }, [ouvert, requete]);

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) fermer(); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); fermer(); bouton.current?.focus(); } };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche, true);
		window.addEventListener('scroll', placer, true);
		window.addEventListener('resize', placer);
		// Un menu avec recherche s'ouvre prêt à taper ; les autres, sur l'entrée courante.
		const courant = menu.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ?? items()[0];
		(champ.current ?? courant)?.focus({ preventScroll: true });
		return () => {
			document.removeEventListener('click', dehors);
			document.removeEventListener('keydown', touche, true);
			window.removeEventListener('scroll', placer, true);
			window.removeEventListener('resize', placer);
		};
	}, [ouvert]);

	function fermer() { setOuvert(false); setRequete(''); }

	function choisir(v: string) {
		p.onChoisir(v);
		if (!p.multi) fermer();
	}

	/** Les flèches parcourent la liste, comme sur un <select>. */
	function clavierListe(e: React.KeyboardEvent) {
		const liste = items();
		const i = liste.indexOf(document.activeElement as HTMLElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			liste[(i + (e.key === 'ArrowDown' ? 1 : -1) + liste.length) % liste.length]?.focus();
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			(e.key === 'Home' ? liste[0] : liste.at(-1))?.focus();
		}
	}

	return (
		<div ref={racine} id={p.id} data-surcouche="menu" data-ouvert={ouvert ? '' : undefined} className={cx(largeur.racine, p.className)}>
			<button ref={bouton} type="button" className={cx(MENU.bouton, largeur.bouton)} aria-haspopup="listbox" aria-expanded={ouvert} disabled={p.desactive}
				title={`${p.k} : ${libelle}`} onClick={(e) => { e.stopPropagation(); if (ouvert) fermer(); else setOuvert(true); }}
				onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ouvert) { e.preventDefault(); setOuvert(true); } }}>
				<span className={MENU.cle}>{p.k}</span>
				<span className={MENU.valeur} data-testid="dd-valeur">{libelle}</span>
				<svg className={cx(MENU.fleche, ouvert && 'rotate-180')} viewBox="0 0 16 16" fill="none" strokeWidth={1.6} aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			{ouvert && (
				// Ouvert, le menu quitte le flux (position fixe, calculée par placerMenu) : un panneau qui défile ne le rogne pas.
				<div ref={menu} className={cx(MENU.liste, 'fixed z-70 w-80 overscroll-contain')} role="listbox" aria-label={p.k} style={place} onKeyDown={clavierListe}>
					{p.recherche && (
						// La recherche reste en haut quand la liste défile.
						<div className="sticky -top-0.75 z-1 -mx-0.75 -mt-0.75 mb-0.75 border-b border-rule bg-raise p-1.5">
							<input ref={champ} type="search" placeholder={p.recherche === true ? 'Rechercher…' : p.recherche} aria-label={`Rechercher dans ${p.k}`}
								autoComplete="off" value={requete} onChange={(e) => setRequete(e.target.value)}
								className="w-full rounded-xs border border-rule-strong bg-surface px-2.5 py-1.75 text-13 text-ink focus:border-accent focus:bg-raise focus:outline-none"
								onKeyDown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); if (choix[0]) choisir(choix[0].v); }
									else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); items()[0]?.focus(); }
								}} />
						</div>
					)}
					{visibles.map((o, i) => {
						if ('sep' in o) return <hr key={`sep${i}`} className={MENU.separateur} />;
						if ('tete' in o) return <div key={`tete${i}`} className={MENU.tete}>{o.tete}</div>;
						const courant = p.multi ? (p.valeurs ?? []).includes(o.v) : o.v === p.valeur;
						return (
							<button key={o.v} type="button" role="option" aria-selected={courant} data-v={o.v}
								className={cx(MENU.item, 'focus-visible:-outline-offset-2', courant ? MENU.itemCourant : MENU.itemAutre, p.multi && COCHE, p.multi && (courant ? COCHEE : DECOCHEE))}
								onClick={(e) => { e.stopPropagation(); choisir(o.v); }}>
								<span className={MENU.nom}>{o.t}</span>
								{o.meta && <span className={MENU.meta}>{o.meta}</span>}
							</button>
						);
					})}
					{!choix.length && <p className="px-2 py-3 text-center text-13 italic text-muted">Aucun résultat.</p>}
				</div>
			)}
		</div>
	);
}
