'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { estChoix, filtrerOptions, placerMenu, type OptionMenu } from './menu';

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
	classe?: string;
	desactive?: boolean;
};

export function MenuDeroulant(p: Props) {
	const [ouvert, setOuvert] = useState(false);
	const [requete, setRequete] = useState('');
	const racine = useRef<HTMLDivElement>(null);
	const bouton = useRef<HTMLButtonElement>(null);
	const menu = useRef<HTMLDivElement>(null);
	const [place, setPlace] = useState<React.CSSProperties>({});
	const choisie = p.options.find((o) => estChoix(o) && o.v === p.valeur);
	const libelle = p.libelle ?? (choisie && estChoix(choisie) ? choisie.t : (p.vide ?? '—'));
	const visibles = filtrerOptions(p.options, requete);
	const choix = visibles.filter(estChoix);

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
		const champ = menu.current?.querySelector<HTMLInputElement>('.dd-recherche input');
		const courant = menu.current?.querySelector<HTMLElement>('.dd-item.is-current') ?? menu.current?.querySelector<HTMLElement>('.dd-item');
		(champ ?? courant)?.focus({ preventScroll: true });
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
		const items = [...(menu.current?.querySelectorAll<HTMLElement>('.dd-item') ?? [])];
		const i = items.indexOf(document.activeElement as HTMLElement);
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			(e.key === 'Home' ? items[0] : items.at(-1))?.focus();
		}
	}

	return (
		<div ref={racine} id={p.id} className={['dd', p.classe, ouvert && 'is-open est-flottant'].filter(Boolean).join(' ')}>
			<button ref={bouton} type="button" className="dd-btn" aria-haspopup="listbox" aria-expanded={ouvert} disabled={p.desactive}
				title={`${p.k} : ${libelle}`} onClick={(e) => { e.stopPropagation(); if (ouvert) fermer(); else setOuvert(true); }}
				onKeyDown={(e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ouvert) { e.preventDefault(); setOuvert(true); } }}>
				<span className="dd-k">{p.k}</span>
				<span className="dd-v">{libelle}</span>
				<svg className="dd-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			{ouvert && (
				<div ref={menu} className="dd-menu" role="listbox" aria-label={p.k} style={place} onKeyDown={clavierListe}>
					{p.recherche && (
						<div className="dd-recherche">
							<input type="search" placeholder={p.recherche === true ? 'Rechercher…' : p.recherche} aria-label={`Rechercher dans ${p.k}`}
								autoComplete="off" value={requete} onChange={(e) => setRequete(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') { e.preventDefault(); if (choix[0]) choisir(choix[0].v); }
									else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); menu.current?.querySelector<HTMLElement>('.dd-item')?.focus(); }
								}} />
						</div>
					)}
					{visibles.map((o, i) => {
						if ('sep' in o) return <hr key={`sep${i}`} className="dd-sep" />;
						if ('tete' in o) return <div key={`tete${i}`} className="dd-head">{o.tete}</div>;
						const courant = p.multi ? (p.valeurs ?? []).includes(o.v) : o.v === p.valeur;
						return (
							<button key={o.v} type="button" role="option" aria-selected={courant} data-v={o.v}
								className={['dd-item', courant && 'is-current', p.multi && 'dd-coche'].filter(Boolean).join(' ')}
								onClick={(e) => { e.stopPropagation(); choisir(o.v); }}>
								<span className="dd-item-name">{o.t}</span>
								{o.meta && <span className="dd-item-meta">{o.meta}</span>}
							</button>
						);
					})}
					{!choix.length && <p className="dd-aucun">Aucun résultat.</p>}
				</div>
			)}
		</div>
	);
}
