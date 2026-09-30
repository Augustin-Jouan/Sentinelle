'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ChantierNavigation } from '@/donnees/navigation';

/** Le sélecteur nomme ce qu'on regarde : le chantier sur ses trois écrans, « Tous les chantiers » partout ailleurs. */
export function SelecteurChantier({ chantiers, courant }: { chantiers: ChantierNavigation[]; courant: ChantierNavigation | null }) {
	const router = useRouter();
	const [ouvert, setOuvert] = useState(false);
	const racine = useRef<HTMLDivElement>(null);
	const nom = courant ? courant.reference : 'Tous les chantiers';

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		return () => { document.removeEventListener('click', dehors); document.removeEventListener('keydown', touche); };
	}, [ouvert]);

	function aller(href: string) {
		setOuvert(false);
		router.push(href);
	}

	const ligne = (x: ChantierNavigation) => {
		const estCourant = courant?.id === x.id;
		return (
			<button key={x.id} type="button" role="option" aria-selected={estCourant}
				className={['picker-item', estCourant && 'is-current', x.termine && 'is-done'].filter(Boolean).join(' ')}
				onClick={() => aller(`/chantiers/${x.id}/marches`)}>
				<span className="picker-item-name">{x.reference}</span>
				<span className="picker-item-meta">{x.lots ? `${x.lots} lot${x.lots > 1 ? 's' : ''}` : '—'}</span>
			</button>
		);
	};
	const actifs = chantiers.filter((x) => !x.termine);
	const finis = chantiers.filter((x) => x.termine);

	return (
		<div ref={racine} className={ouvert ? 'picker is-open' : 'picker'}>
			<button type="button" className="picker-btn" aria-haspopup="listbox" aria-expanded={ouvert}
				title={courant ? `Chantier ouvert : ${nom}` : 'Tous les chantiers — en ouvrir un'}
				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
				<span className="picker-k">{courant ? 'Chantier ouvert' : 'Affichage'}</span>
				<span className="picker-v">{nom}</span>
				<svg className="picker-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
			</button>
			<div className="picker-menu" role="listbox" aria-label="Choisir un chantier">
				<button type="button" role="option" aria-selected={!courant} className={courant ? 'picker-item' : 'picker-item is-current'} onClick={() => aller('/chantiers')}>
					<span className="picker-item-name">Tous les chantiers</span>
					<span className="picker-item-meta">{chantiers.length}</span>
				</button>
				<hr className="picker-sep" />
				{actifs.length ? actifs.map(ligne) : <div className="picker-head">Aucun chantier en cours</div>}
				{finis.length > 0 && <><hr className="picker-sep" /><div className="picker-head">Terminés</div>{finis.map(ligne)}</>}
				<hr className="picker-sep" />
				<button type="button" className="picker-item picker-new" onClick={() => aller('/chantiers/nouveau')}>
					<span className="picker-item-name">+ Nouveau chantier</span>
				</button>
			</div>
		</div>
	);
}
