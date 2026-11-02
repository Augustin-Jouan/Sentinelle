'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/composants/briques/cx';
import { MENU } from '@/composants/briques/MenuDeroulant';
import type { ChantierNavigation } from '@/donnees/navigation';

/** Le sélecteur nomme ce qu'on regarde : le chantier sur ses trois écrans, « Tous les chantiers » partout ailleurs (ex-.picker). */
export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierNavigation[]; courant: ChantierNavigation | null }) {
	const router = useRouter();
	const [ouvert, setOuvert] = useState(false);
	/** Le bas du bouton, à l'ouverture : en étroit, la liste se cale sur la largeur de l'écran, juste dessous. */
	const [dessous, setDessous] = useState(0);
	const racine = useRef<HTMLDivElement>(null);
	const nom = courant ? courant.reference : 'Tous les chantiers';

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		// En étroit, la liste est fixe et l'en-tête qui porte le bouton défile avec la page : elle se ferme au défilement
		// plutôt que de rester suspendue sans lui.
		const defile = () => { if (window.matchMedia('(width < 60rem)').matches) setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		window.addEventListener('scroll', defile, { passive: true });
		return () => {
			document.removeEventListener('click', dehors);
			document.removeEventListener('keydown', touche);
			window.removeEventListener('scroll', defile);
		};
	}, [ouvert]);

	function aller(href: string) {
		setOuvert(false);
		router.push(href);
	}

	const ligne = (x: ChantierNavigation) => {
		const estCourant = courant?.id === x.id;
		return (
			<button key={x.id} type="button" role="option" aria-selected={estCourant}
				className={cx(MENU.item, estCourant ? MENU.itemCourant : MENU.itemAutre)} onClick={() => aller(`/chantiers/${x.id}/marches`)}>
				{/* Un chantier terminé est barré. */}
				<span className={cx(MENU.nom, x.termine && 'text-muted line-through')}>{x.reference}</span>
				<span className={MENU.meta}>{x.lots ? `${x.lots} lot${x.lots > 1 ? 's' : ''}` : '—'}</span>
			</button>
		);
	};
	const actifs = chantiers.filter((x) => !x.termine);
	const finis = chantiers.filter((x) => x.termine);

	return (
		<div ref={racine} className="relative max-w-96 flex-none max-etroit:min-w-0 max-etroit:flex-initial">
			<button type="button" className={cx(MENU.bouton, 'min-w-60 max-etroit:min-w-0')} aria-haspopup="listbox" aria-expanded={ouvert}
				title={courant ? `Chantier ouvert : ${nom}` : 'Tous les chantiers — en ouvrir un'}
				onClick={(e) => { e.stopPropagation(); setDessous(e.currentTarget.getBoundingClientRect().bottom + 6); setOuvert((o) => !o); }}>
				<span className={MENU.cle}>{courant ? 'Chantier ouvert' : 'Affichage'}</span>
				<span className={MENU.valeur}>{nom}</span>
				<svg className={cx(MENU.fleche, ouvert && 'rotate-180')} viewBox="0 0 16 16" fill="none" strokeWidth={1.6} aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			<div role="listbox" aria-label="Choisir un chantier"
				style={{ '--dessous': `${dessous}px` } as React.CSSProperties}
				className={cx(MENU.liste, 'absolute top-[calc(100%+0.375rem)] left-0 z-30 w-80 min-w-full',
					// En étroit, partie du sélecteur, la liste débordait à droite : elle prend la largeur de l'écran, marges comprises.
					'max-etroit:fixed max-etroit:inset-x-3.5 max-etroit:top-(--dessous) max-etroit:w-auto max-etroit:min-w-0', !ouvert && 'hidden')}>
				<button type="button" role="option" aria-selected={!courant} className={cx(MENU.item, courant ? MENU.itemAutre : MENU.itemCourant)} onClick={() => aller('/chantiers')}>
					<span className={MENU.nom}>Tous les chantiers</span>
					<span className={MENU.meta}>{chantiers.length}</span>
				</button>
				<hr className={MENU.separateur} />
				{actifs.length ? actifs.map(ligne) : <div className={MENU.tete}>Aucun chantier en cours</div>}
				{finis.length > 0 && <><hr className={MENU.separateur} /><div className={MENU.tete}>Terminés</div>{finis.map(ligne)}</>}
				<hr className={MENU.separateur} />
				<button type="button" className={cx(MENU.item, 'font-medium text-accent-2 hover:bg-idle-soft')} onClick={() => aller('/chantiers/nouveau')}>
					<span className={MENU.nom}>+ Nouveau chantier</span>
				</button>
			</div>
		</div>
	);
}
