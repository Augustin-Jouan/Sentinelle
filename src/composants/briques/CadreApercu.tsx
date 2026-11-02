'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CSS_DOCUMENTS } from '@/documents/styles';
import { Bouton } from './Bouton';
import { cx } from './cx';
import { useEtroit } from './etroit';
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
	/**
	 * 'champs' : la colonne des champs puis la feuille (le marché) ; 'solo' : la feuille seule, dans la grille (compte rendu,
	 * certificat, PV) ; 'simple' : la feuille seule ; 'formulaire' : un formulaire de saisie puis la feuille, qui défilent
	 * ensemble (le compte rendu sur un téléphone : on n'écrit pas dans une feuille réduite à moitié).
	 */
	disposition: 'champs' | 'solo' | 'simple' | 'formulaire';
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
	/** La feuille agrandie : les champs sont cachés, elle prend toute la hauteur. */
	seule: 'grid min-h-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]',
} as const;

/**
 * Le cadre de la feuille : elle y garde la mise en page de l'impression (sa largeur réelle, voir base.css) et, plus
 * large que le cadre (un téléphone, une fenêtre étroite), elle est réduite d'un bloc pour tenir en largeur, comme une
 * visionneuse de PDF : ce qu'on voit est ce qui sortira de l'imprimante. La réduction est un transform: scale, pas un
 * zoom CSS : le zoom recalcule la mise en page à petite échelle (arrondis des polices, lignes qui tombent autrement),
 * le transform se contente de réduire l'image d'une page mise en page à taille réelle. Le bloc qui la porte prend la
 * taille réduite, pour que le défilement et le centrage restent justes.
 */
function Feuille({ agrandie, surAgrandir, children }: { agrandie: boolean; surAgrandir: () => void; children: React.ReactNode }) {
	const cadre = useRef<HTMLDivElement>(null);
	const bloc = useRef<HTMLDivElement>(null);
	const page = useRef<HTMLDivElement>(null);
	// « Taille réelle » (téléphone) : la feuille n'est plus réduite, on la parcourt en la faisant glisser — pour la lire,
	// ou écrire dans ses zones bleues à une taille où le doigt les atteint.
	const [reelle, setReelle] = useState(false);
	useLayoutEffect(() => {
		const c = cadre.current, b = bloc.current, p = page.current;
		if (!c || !b || !p) return;
		const ajuster = () => {
			// Mesure à taille réelle (avant peinture : rien ne clignote).
			p.style.transform = ''; p.style.width = '';
			b.style.width = ''; b.style.height = ''; b.style.overflow = '';
			if (reelle) return;
			const s = getComputedStyle(c);
			const dispo = c.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
			const naturelle = p.scrollWidth;
			if (naturelle <= dispo + 0.5) return;
			const echelle = dispo / naturelle;
			p.style.width = `${naturelle}px`;
			p.style.transform = `scale(${echelle})`;
			b.style.width = `${dispo}px`;
			b.style.height = `${p.offsetHeight * echelle}px`;
			b.style.overflow = 'hidden';
		};
		ajuster();
		// Le cadre change de taille (rotation, fenêtre) ou la page de hauteur (saisie, feuille unique mesurée après coup).
		const observateur = new ResizeObserver(() => ajuster());
		observateur.observe(c);
		observateur.observe(p);
		return () => observateur.disconnect();
	}, [reelle]);
	return (
		<div className="flex min-h-0 flex-col">
			{/* Sur un téléphone seulement : sur ordinateur la feuille tient à sa taille. */}
			<div className="hidden flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 pt-3 max-etroit:flex">
				<span className="min-w-0 flex-1 basis-32 text-12 text-muted">{reelle ? 'Faites glisser la feuille pour la parcourir.' : 'La feuille est réduite pour tenir dans l\'écran.'}</span>
				<div className="flex gap-2">
					{/* « Agrandir » : la feuille prend tout l'écran (l'en-tête et les champs s'effacent) ; « Réduire » les rend. */}
					<Bouton taille="sm" aria-pressed={agrandie} onClick={surAgrandir}>{agrandie ? 'Réduire' : 'Agrandir'}</Bouton>
					<Bouton taille="sm" aria-pressed={reelle} onClick={() => setReelle((r) => !r)}>{reelle ? 'Ajuster à l\'écran' : 'Taille réelle'}</Bouton>
				</div>
			</div>
			<div ref={cadre} className="flex min-h-0 flex-1 items-start justify-center-safe overflow-auto overscroll-contain p-7 max-etroit:p-3.5" data-testid="cadre-feuille">
				<div ref={bloc} className="min-w-0">
					{/* La page reprend la disposition du cadre (feuille et notes côte à côte) ; elle se réduit depuis son coin haut gauche. */}
					<div ref={page} className="flex origin-top-left items-start">{children}</div>
				</div>
			</div>
		</div>
	);
}

/**
 * L'aperçu plein écran d'un document (ex-.gen) : la page de derrière ne défile plus (data-verrou-defilement),
 * Échap le ferme sauf si un menu, une confirmation ou un panneau ouvert au-dessus le garde (AU_DESSUS_DE_L_APERCU).
 */
export function CadreApercu({ libelle, surtitre, titre, aide, notes, actions, disposition, champs, onFermer, children }: Props) {
	// La feuille agrandie (téléphone) : seule à l'écran, l'en-tête et les champs restent montés mais cachés (une saisie en
	// cours n'est pas perdue). Sur un écran large, il n'y a rien à agrandir : la demande retombe d'elle-même.
	const etroit = useEtroit();
	const [agrandieDemandee, setAgrandie] = useState(false);
	const agrandie = agrandieDemandee && etroit;
	const fermer = useRef(onFermer);
	const reduire = useRef(agrandie);
	useEffect(() => { fermer.current = onFermer; reduire.current = agrandie; });
	useEffect(() => {
		// Échap réduit d'abord une feuille agrandie, puis ferme l'aperçu.
		const touche = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || document.querySelector(AU_DESSUS_DE_L_APERCU)) return;
			if (reduire.current) setAgrandie(false); else fermer.current();
		};
		window.addEventListener('keydown', touche);
		return () => window.removeEventListener('keydown', touche);
	}, []);
	const feuille = <Feuille agrandie={agrandie} surAgrandir={() => setAgrandie((a) => !a)}>{children}</Feuille>;
	const cache = agrandie && 'hidden';
	return (
		<div role="dialog" aria-label={libelle} data-surcouche="apercu" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""
			// paysage: l'aperçu défile d'un bloc ; son en-tête (titre, actions) ne reste pas collé au-dessus de la feuille.
			className={cx('fixed inset-0 z-60 bg-paper',
				// 'formulaire' : tout défile d'un bloc (en-tête, formulaire, feuille) ; sinon la feuille défile sous l'en-tête.
				// Agrandie : la feuille, seule, occupe toute la hauteur et défile en elle-même.
				agrandie ? 'grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]'
					: disposition === 'formulaire' ? 'block overflow-y-auto' : 'grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] paysage:block paysage:overflow-y-auto')}>
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<div className={cx('flex flex-wrap items-center justify-between gap-4 border-b border-rule bg-surface px-5 py-3.5', cache)}>
				{/* En colonne : le surtitre (un span) prend sa propre hauteur de ligne. */}
				{/* min-w-0 : une note longue passe à la ligne au lieu d'élargir l'en-tête (et la feuille avec lui). */}
				<div className="flex min-w-0 flex-col">
					<Surtitre>{surtitre}</Surtitre>
					<h2 className="text-17">{titre}</h2>
					{aide && <p className="mt-0.5 text-12 text-muted">{aide}</p>}
					{notes}
				</div>
				{/* flex-wrap : sur un téléphone, l'action principale (Générer, Enregistrer) passe à la ligne au lieu de sortir de l'écran. */}
				<div className="flex flex-wrap items-center gap-2">{actions}</div>
			</div>
			{disposition === 'champs' ? (
				<div className={agrandie ? SPLIT.seule : SPLIT.champs}>
					<div className={cx('flex flex-col gap-4.5 overflow-y-auto overscroll-contain border-r border-rule bg-surface p-4.5 max-etroit:max-h-[40vh] max-etroit:border-r-0 max-etroit:border-b', cache)}>{champs}</div>
					{feuille}
				</div>
			) : disposition === 'solo' ? <div className={agrandie ? SPLIT.seule : SPLIT.solo}>{feuille}</div>
				: disposition === 'formulaire' ? (
					<>
						<div className={cx('flex flex-col gap-4.5 border-b border-rule bg-surface p-4.5', cache)}>{champs}</div>
						<div className={cx('px-4.5 pt-4', cache)}><Surtitre>La feuille imprimée</Surtitre></div>
						{feuille}
					</>
				) : feuille}
		</div>
	);
}
