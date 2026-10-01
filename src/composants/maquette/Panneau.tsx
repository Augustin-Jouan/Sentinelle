'use client';

import { useEffect } from 'react';
import { nomAccessible } from './nomPanneau';

type Props = {
	ouvert: boolean;
	/** L'eyebrow (« LOT 02 », « ENTREPRISE »). */
	surtitre: string;
	titre: string;
	onFermer: () => void;
	pied?: React.ReactNode;
	/** Nom accessible de la surcouche ; par défaut le titre. */
	libelle?: string;
	/** Retire le ✕ : le panneau ne se ferme que par le pied (mot de passe provisoire). */
	sansFermeture?: boolean;
	children: React.ReactNode;
};

/** Échap le ferme, le fond le ferme, la page derrière ne défile plus (html:has(.panel.is-on) dans la maquette). */
export function Panneau({ ouvert, surtitre, titre, onFermer, pied, libelle, sansFermeture, children }: Props) {
	useEffect(() => {
		if (!ouvert) return;
		// Une confirmation ouverte garde Échap pour elle.
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on')) onFermer(); };
		window.addEventListener('keydown', touche);
		return () => window.removeEventListener('keydown', touche);
	}, [ouvert, onFermer]);
	return (
		<>
			<div className={ouvert ? 'scrim is-on' : 'scrim'} onClick={onFermer} />
			{/* data-bloque-clavier, seulement ouvert : sinon les raccourcis du planning seraient coupés en permanence (useClavier). */}
			<aside className={ouvert ? 'panel is-on' : 'panel'} role="dialog" aria-label={nomAccessible(libelle, titre)} aria-hidden={!ouvert}
				data-bloque-clavier={ouvert ? '' : undefined}>
				<div className="panel-head">
					<div>
						<div className="eyebrow">{surtitre}</div>
						<h2 style={{ fontSize: '1.125rem' }}>{titre}</h2>
					</div>
					{!sansFermeture && <button type="button" className="btn btn-ghost btn-sm" onClick={onFermer} aria-label="Fermer">✕</button>}
				</div>
				<div className="panel-body">{ouvert && children}</div>
				{pied && <div className="panel-foot">{pied}</div>}
			</aside>
		</>
	);
}
