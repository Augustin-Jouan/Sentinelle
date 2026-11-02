'use client';

import { Children, useEffect, useRef, useState } from 'react';
import { Bouton } from './Bouton';
import { cx } from './cx';

/**
 * Les actions d'un écran (barre de titre). Sur ordinateur, rien ne change : les conteneurs sont en display: contents,
 * les boutons s'alignent comme avant. Sur un téléphone (max-etroit:) :
 * - l'action principale flotte en bas à droite, sous le pouce, et reste là pendant qu'on fait défiler ;
 * - avec « replier », les autres actions passent derrière un bouton « ⋯ » qui les montre en liste.
 * Chaque action n'est rendue qu'une fois : seule sa place change.
 */
export function ActionsEcran({ principale, actions, replier = false, basColle }: {
	principale?: React.ReactNode;
	actions?: React.ReactNode;
	replier?: boolean;
	/** Ce qui colle déjà au bas de l'écran (la barre des totaux de Marchés) : l'action flottante se pose au-dessus. */
	basColle?: string;
}) {
	const [ouvert, setOuvert] = useState(false);
	const racine = useRef<HTMLDivElement>(null);
	const autres = Children.toArray(actions);
	const replie = replier && autres.length > 0;

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		return () => { document.removeEventListener('click', dehors); document.removeEventListener('keydown', touche); };
	}, [ouvert]);

	return (
		<div ref={racine} className="relative flex flex-wrap items-center gap-2">
			{principale && (
				<div style={{ '--bas-action': basColle ? `calc(1rem + ${basColle})` : '1rem' } as React.CSSProperties}
					className="contents max-etroit:fixed max-etroit:right-4 max-etroit:bottom-(--bas-action) max-etroit:z-20 max-etroit:flex max-etroit:rounded-sm max-etroit:shadow-ombre-h">
					{principale}
				</div>
			)}
			{replie ? (
				<>
					<div className="hidden max-etroit:flex">
						<Bouton seulIcone aria-label="Autres actions" aria-haspopup="true" aria-expanded={ouvert}
							onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>⋯</Bouton>
					</div>
					{/* Toucher une action la lance et referme la liste. */}
					<div onClick={() => setOuvert(false)}
						className={cx('contents max-etroit:absolute max-etroit:top-[calc(100%+0.375rem)] max-etroit:right-0 max-etroit:z-30 max-etroit:w-max max-etroit:flex-col max-etroit:items-stretch',
							'max-etroit:gap-2 max-etroit:rounded-sm max-etroit:border max-etroit:border-rule-strong max-etroit:bg-raise max-etroit:p-2 max-etroit:shadow-ombre-h',
							ouvert ? 'max-etroit:flex' : 'max-etroit:hidden')}>
						{autres}
					</div>
				</>
			) : autres}
		</div>
	);
}
