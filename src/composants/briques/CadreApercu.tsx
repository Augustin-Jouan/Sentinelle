'use client';

import { useEffect, useRef } from 'react';
import { CSS_DOCUMENTS } from '@/documents/styles';
import { cx } from './cx';
import { Surtitre } from './Surtitre';
import { AU_DESSUS_DE_L_APERCU } from './surcouches';

type Props = {
	/** Nom accessible de la surcouche (les E2E le cherchent) : le titre du type de document. */
	libelle: string;
	surtitre: string;
	titre: string;
	/** « Les zones bleues s'écrivent directement sur le marché — le bleu ne s'imprime pas. » */
	aide?: string;
	/** Ce qui empêche de générer, ou une précision sur la version affichée (des NoteApercu). */
	notes?: React.ReactNode;
	actions: React.ReactNode;
	/** 'champs' : la colonne des champs puis la feuille (le marché) ; 'solo' : la feuille seule, dans la grille (compte rendu, certificat, PV) ; 'simple' : la feuille seule. */
	disposition: 'champs' | 'solo' | 'simple';
	champs?: React.ReactNode;
	onFermer: () => void;
	children: React.ReactNode;
};

/** Une note sous le titre d'un aperçu (ex-.gen-note) : ce qui empêche de générer, ou, « info », une précision discrète. */
export function NoteApercu({ info = false, children }: { info?: boolean; children: React.ReactNode }) {
	return <p role="note" className={cx('mt-1.5 text-12', info ? 'text-muted' : 'text-danger')}>{children}</p>;
}

/** La grille sous l'en-tête (ex-.gen-split) ; sous 60 rem, les champs passent au-dessus de la feuille. */
const SPLIT = {
	champs: 'grid min-h-0 grid-cols-[minmax(0,22rem)_minmax(0,1fr)] max-etroit:grid-cols-1 max-etroit:grid-rows-[auto_minmax(0,1fr)]',
	solo: 'grid min-h-0 grid-cols-[minmax(0,1fr)] max-etroit:grid-rows-[auto_minmax(0,1fr)]',
} as const;

/**
 * L'aperçu plein écran d'un document (ex-.gen) : la page de derrière ne défile plus (data-verrou-defilement),
 * Échap le ferme sauf si un menu, une confirmation ou un panneau ouvert au-dessus le garde (AU_DESSUS_DE_L_APERCU).
 */
export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, disposition, champs, onFermer, children }: Props) {
	const fermer = useRef(onFermer);
	useEffect(() => { fermer.current = onFermer; });
	useEffect(() => {
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector(AU_DESSUS_DE_L_APERCU)) fermer.current(); };
		window.addEventListener('keydown', touche);
		return () => window.removeEventListener('keydown', touche);
	}, []);
	const feuille = <div className="flex items-start justify-center overflow-auto overscroll-contain p-7">{children}</div>;
	return (
		<div role="dialog" aria-label={libelle} data-surcouche="apercu" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""
			className="fixed inset-0 z-60 grid grid-rows-[auto_minmax(0,1fr)] bg-paper">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule bg-surface px-5 py-3.5">
				{/* En colonne : le surtitre (un span) prend sa propre hauteur de ligne. */}
				<div className="flex flex-col">
					<Surtitre>{surtitre}</Surtitre>
					<h2 className="text-17">{titre}</h2>
					{aide && <p className="mt-0.5 text-12 text-muted">{aide}</p>}
					{notes}
				</div>
				<div className="flex items-center gap-2">{actions}</div>
			</div>
			{disposition === 'champs' ? (
				<div className={SPLIT.champs}>
					<div className="flex flex-col gap-4.5 overflow-y-auto overscroll-contain border-r border-rule bg-surface p-4.5 max-etroit:max-h-[40vh] max-etroit:border-r-0 max-etroit:border-b">{champs}</div>
					{feuille}
				</div>
			) : disposition === 'solo' ? <div className={SPLIT.solo}>{feuille}</div> : feuille}
		</div>
	);
}
