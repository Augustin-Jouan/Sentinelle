'use client';

import { useEffect } from 'react';
import { Bouton } from './Bouton';
import { cx } from './cx';
import { nomAccessible } from './nomPanneau';
import { Surtitre } from './Surtitre';
import { CONFIRMATION_OUVERTE } from './surcouches';

type Props = {
	ouvert: boolean;
	/** Le surtitre (« LOT 02 », « ENTREPRISE »). */
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

/** Le panneau latéral (ex-.panel, .scrim) : Échap le ferme, le voile le ferme, la page derrière ne défile plus. */
export function Panneau({ ouvert, surtitre, titre, onFermer, pied, libelle, sansFermeture, children }: Props) {
	useEffect(() => {
		if (!ouvert) return;
		// Une confirmation ouverte garde Échap pour elle.
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector(CONFIRMATION_OUVERTE)) onFermer(); };
		window.addEventListener('keydown', touche);
		return () => window.removeEventListener('keydown', touche);
	}, [ouvert, onFermer]);
	const ouverture = ouvert ? '' : undefined;
	return (
		<>
			<div aria-hidden="true" onClick={onFermer}
				className={cx('fixed inset-0 z-40 bg-voile/42 transition-opacity duration-180', ouvert ? 'opacity-100' : 'pointer-events-none opacity-0')} />
			{/* data-bloque-clavier, seulement ouvert : sinon les raccourcis du planning seraient coupés en permanence (useClavier). */}
			<aside role="dialog" aria-label={nomAccessible(libelle, titre)} aria-hidden={!ouvert}
				data-surcouche="panneau" data-ouvert={ouverture} data-verrou-defilement={ouverture} data-bloque-clavier={ouverture}
				className={cx('fixed inset-y-0 right-0 z-50 flex w-[min(31rem,100vw)] flex-col overflow-hidden rounded-l-lg border-l border-rule-strong bg-paper shadow-ombre-h',
					'transition-transform duration-200 ease-[ease]', !ouvert && 'translate-x-full')}>
				<div className="flex items-start justify-between gap-4 border-b border-rule bg-surface px-5 pt-4 pb-3.5">
					{/* En colonne : le surtitre (un span) prend sa propre hauteur de ligne, pas celle du corps. */}
					<div className="flex flex-col">
						<Surtitre>{surtitre}</Surtitre>
						<h2 className="text-18">{titre}</h2>
					</div>
					{!sansFermeture && <Bouton variante="fantome" taille="sm" onClick={onFermer} aria-label="Fermer">✕</Bouton>}
				</div>
				{/* Les enfants gardent leur hauteur : c'est le corps qui défile, pas eux. */}
				<div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain p-5 *:flex-none">{ouvert && children}</div>
				{pied && <div className="flex flex-wrap gap-2 border-t border-rule bg-surface px-5 py-3.5">{pied}</div>}
			</aside>
		</>
	);
}
