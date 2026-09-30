'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type Demande = { texte: React.ReactNode; libelle: string; dangereux?: boolean };
type EnCours = Demande & { resoudre: (oui: boolean) => void };

const Contexte = createContext<((d: Demande) => Promise<boolean>) | null>(null);

/** La fenêtre de confirmation de la maquette (.ask). Annuler, Échap ou un clic hors de la carte : non. */
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

	return (
		<Contexte.Provider value={demander}>
			{children}
			{/* data-bloque-clavier, seulement ouverte : le planning ignore ses raccourcis tant qu'un tel élément existe (useClavier). */}
			<div className={enCours ? 'ask is-on' : 'ask'} role="dialog" aria-modal="true" aria-labelledby="ask-txt"
				data-bloque-clavier={enCours ? '' : undefined}
				onClick={(e) => { if (e.target === e.currentTarget) repondre(false); }}>
				{enCours && (
					<div className="ask-card">
						<p className="ask-txt" id="ask-txt">{enCours.texte}</p>
						<div className="ask-actions">
							<button type="button" className="btn" onClick={() => repondre(false)}>Annuler</button>
							<button ref={oui} type="button" className={enCours.dangereux ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => repondre(true)}>{enCours.libelle}</button>
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
