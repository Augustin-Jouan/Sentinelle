'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bouton } from './Bouton';
import { cx } from './cx';

type Demande = { texte: React.ReactNode; libelle: string; dangereux?: boolean };
type EnCours = Demande & { resoudre: (oui: boolean) => void };

const Contexte = createContext<((d: Demande) => Promise<boolean>) | null>(null);

/** La fenêtre de confirmation (ex-.ask). Annuler, Échap ou un clic hors de la carte : non. */
export function ConfirmationFournisseur({ children }: { children: React.ReactNode }) {
	const [enCours, setEnCours] = useState<EnCours | null>(null);
	const oui = useRef<HTMLButtonElement>(null);

	const demander = useCallback((d: Demande) => new Promise<boolean>((resoudre) => {
		setEnCours((avant) => {
			avant?.resoudre(false);   // jamais deux fenêtres : la précédente vaut « non »
			return { ...d, resoudre };
		});
	}), []);

	function repondre(r: boolean) {
		enCours?.resoudre(r);
		setEnCours(null);
	}

	useEffect(() => {
		if (!enCours) return;
		oui.current?.focus();
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); repondre(false); } };
		window.addEventListener('keydown', touche, true);
		return () => window.removeEventListener('keydown', touche, true);
	});

	const ouverte = enCours ? '' : undefined;
	return (
		<Contexte.Provider value={demander}>
			{children}
			{/* data-bloque-clavier, seulement ouverte : le planning ignore ses raccourcis tant qu'un tel élément existe (useClavier). */}
			<div role="alertdialog" aria-modal="true" aria-labelledby="confirmation-texte"
				data-surcouche="confirmation" data-ouvert={ouverte} data-verrou-defilement={ouverte} data-bloque-clavier={ouverte}
				onClick={(e) => { if (e.target === e.currentTarget) repondre(false); }}
				className={cx('fixed inset-0 z-80 items-center justify-center bg-voile/50 p-6', enCours ? 'flex' : 'hidden')}>
				{enCours && (
					<div className="w-[min(27rem,100%)] rounded-md border border-rule-strong bg-raise px-5.5 pt-5 pb-4.5 shadow-ombre-h">
						<p className="mb-4.5 text-14 leading-normal" id="confirmation-texte">{enCours.texte}</p>
						<div className="flex justify-end gap-2">
							<Bouton onClick={() => repondre(false)}>Annuler</Bouton>
							<Bouton ref={oui} variante={enCours.dangereux ? 'danger' : 'primaire'} onClick={() => repondre(true)}>{enCours.libelle}</Bouton>
						</div>
					</div>
				)}
			</div>
		</Contexte.Provider>
	);
}

export function useConfirmation() {
	const demander = useContext(Contexte);
	if (!demander) throw new Error('useConfirmation hors de ConfirmationFournisseur');
	return demander;
}
