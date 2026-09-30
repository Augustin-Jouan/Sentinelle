'use client';

import { useEffect, useRef } from 'react';
import { CSS_DOCUMENTS } from '@/documents/styles';

type Props = {
	/** Nom accessible de la surcouche (les E2E le cherchent) : le titre du type de document. */
	libelle: string;
	surtitre: string;
	titre: string;
	/** « Les zones bleues s'écrivent directement sur le marché — le bleu ne s'imprime pas. » */
	aide?: string;
	/** Ce qui empêche de générer, ou une précision sur la version affichée. */
	notes?: React.ReactNode;
	actions: React.ReactNode;
	/** 'champs' : colonne gen-fields + feuille (le marché) ; 'solo' : gen-split solo (compte rendu, certificat, PV) ; 'simple' : la feuille seule. */
	disposition: 'champs' | 'solo' | 'simple';
	champs?: React.ReactNode;
	onFermer: () => void;
	children: React.ReactNode;
};

/** L'aperçu .gen de la maquette : la page de derrière ne défile plus, Échap le ferme (sauf menu ou confirmation ouverts, qui le gardent). */
export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, disposition, champs, onFermer, children }: Props) {
	const fermer = useRef(onFermer);
	useEffect(() => { fermer.current = onFermer; });
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.ask.is-on, .dd.is-open, .panel.is-on')) fermer.current(); };
		window.addEventListener('keydown', touche);
		return () => { document.body.style.overflow = avant; window.removeEventListener('keydown', touche); };
	}, []);
	const feuille = <div className="gen-preview">{children}</div>;
	return (
		<div className="gen is-on" role="dialog" aria-label={libelle} data-bloque-clavier="">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<div className="gen-head">
				<div>
					<div className="eyebrow">{surtitre}</div>
					<h2 style={{ fontSize: '1.0625rem' }}>{titre}</h2>
					{aide && <p className="saisie-aide">{aide}</p>}
					{notes}
				</div>
				<div className="topbar-actions">{actions}</div>
			</div>
			{disposition === 'champs' ? <div className="gen-split"><div className="gen-fields">{champs}</div>{feuille}</div>
				: disposition === 'solo' ? <div className="gen-split solo">{feuille}</div>
				: feuille}
		</div>
	);
}
