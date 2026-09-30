'use client';

import { Fragment, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { couleurDe } from '@/domaine/couleurs';
import { colonnes, moisDesColonnes } from '@/domaine/planning';
import { rangIso, type LotPlanning, type PlanningVue } from '@/domaine/planningVue';
import { cn } from '@/lib/utils';
import { barresDuLot, HAUTEUR_LIGNE, liens } from './geometrie';
import type { Outil } from './preferences';

type Props = {
	cadre: RefObject<HTMLDivElement | null>;
	onScroll: () => void;
	planning: PlanningVue;
	lotsAffiches: LotPlanning[];
	debutAxe: number;
	nbSemaines: number;
	w: number;
	rangAujourdhui: number;
	selection: string[];
	outil: Outil;
	onOuvrirLot: (lotId: string) => void;
	onToutAfficher: () => void;
	/** Branchés par les gestes (Task 10). */
	saisi?: boolean;
	fantome?: { lotId: string; debut: number; duree: number } | null;
	onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
};

/** Grille du Gantt (maquette `renderPlanning`) : en-tête des mois et semaines, fermetures, pistes, flèches, légende. */
export function GrillePlanning({
	cadre, onScroll, planning, lotsAffiches, debutAxe: d0, nbSemaines, w, rangAujourdhui,
	selection, outil, onOuvrirLot, onToutAfficher, saisi, fantome, onPointerDown,
}: Props) {
	const largeur = nbSemaines * w;
	const cols = colonnes({ debut: d0, fin: d0 + nbSemaines - 1, nb: nbSemaines });
	const mois = moisDesColonnes(cols);
	const fermetures = planning.fermetures.map((f) => ({ ...f, gauche: (rangIso(f.debut) - d0) * w, largeur: f.duree * w }));
	const dansAxe = rangAujourdhui >= d0 && rangAujourdhui < d0 + nbSemaines;

	// Alternance des mois : on les distingue sans lire leur nom.
	const bandesMois = mois.map((m, i) => {
		const gauche = mois.slice(0, i).reduce((s, x) => s + x.nb, 0) * w;
		return <div key={`m${i}`} className={cn('g-bmois', i % 2 === 1 && 'pair')} style={{ left: gauche, width: m.nb * w }} />;
	});
	const fond = (
		<>
			{bandesMois}
			{fermetures.map((f) => <div key={f.id} className="g-ferm" style={{ left: f.gauche, width: f.largeur }} />)}
			{dansAxe && <div className="g-auj" style={{ left: (rangAujourdhui - d0) * w, width: w }} />}
		</>
	);
	const traits = liens(lotsAffiches, d0, w);

	return (
		<>
			<div
				ref={cadre}
				className={cn('gantt', outil === 'main' && 'outil-main', saisi && 'est-saisi')}
				style={{ '--p-sem-w': `${w}px` } as CSSProperties}
				onScroll={onScroll}
				onPointerDown={onPointerDown}
			>
				<div className="g-row g-head">
					<div className="g-fixe"><span className="g-th">Lot et entreprise</span></div>
					<div className="g-axe" style={{ width: largeur }}>
						<div className="g-mois">
							{mois.map((m, i) => <span key={i} className={i % 2 === 1 ? 'pair' : undefined} style={{ width: m.nb * w }}>{m.libelle}</span>)}
						</div>
						<div className="g-sems">
							{cols.map((c) => (
								<span key={c.rang} style={{ width: w }} className={c.rang === rangAujourdhui ? 'auj' : c.semaine === 1 ? 'an-neuf' : undefined}>
									{c.semaine}
								</span>
							))}
						</div>
					</div>
				</div>
				<div className="g-row g-ferm-row">
					<div className="g-fixe g-fixe-lbl">Fermetures</div>
					<div className="g-piste g-piste-lbl" style={{ width: largeur }}>
						{fermetures.map((f) => <div key={f.id} className="g-ferm-lbl" style={{ left: f.gauche, width: f.largeur }}>{f.libelle}</div>)}
					</div>
				</div>
				{lotsAffiches.length ? (
					<div className="g-corps">
						{lotsAffiches.map((l) => {
							const couleur = couleurDe(l.couleur);
							return (
								<div key={l.id} className="g-row" data-lot={l.id}>
									<div
										className="g-fixe" role="button" tabIndex={0} title="Modifier les périodes et la couleur"
										onClick={() => onOuvrirLot(l.id)}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												onOuvrirLot(l.id);
											}
										}}
									>
										<i className="g-puce" style={{ background: couleur.fond }} />
										<span className="g-nom">{l.designation || 'Lot sans désignation'}</span>
										<span className="g-sous">
											{l.entreprise ?? <i className="unset">à attribuer</i>}
											{l.telephone && <>{' · '}<span className="num">{l.telephone}</span></>}
										</span>
									</div>
									<div className="g-piste" data-lot={l.id} style={{ width: largeur }}>
										{fond}
										{barresDuLot(l, d0, w).map((b) => (
											<Fragment key={b.periode.id}>
												<div
													className={cn('g-bar', selection.includes(b.periode.id) && 'is-sel')}
													data-periode={b.periode.id} data-lot={l.id} title={b.titre}
													style={{ left: b.gauche, width: b.largeur, background: couleur.fond, color: couleur.texte }}
												>
													<span className="g-bar-txt">{b.texte}</span>
													<span className="g-poignee" />
												</div>
												{b.etiquette && (
													<div className="g-etiq" title={b.titre} style={{ left: b.etiquette.gauche, maxWidth: b.etiquette.largeurMax }}>
														{b.periode.intitule}
													</div>
												)}
											</Fragment>
										))}
										{fantome?.lotId === l.id && <div className="g-fantome" style={{ left: fantome.debut * w, width: fantome.duree * w }} />}
									</div>
								</div>
							);
						})}
						{traits.length > 0 && (
							<svg className="g-liens" width={largeur} height={lotsAffiches.length * HAUTEUR_LIGNE} aria-hidden="true">
								<defs>
									<marker id="g-fleche" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
										<path d="M0 0 L8 4 L0 8 z" />
									</marker>
								</defs>
								<g markerEnd="url(#g-fleche)">{traits.map((t) => <path key={t.id} d={t.d} />)}</g>
							</svg>
						)}
					</div>
				) : (
					<div className="g-vide">
						{planning.lots.length ? (
							<>Tous les lots sont masqués. <Button size="sm" variant="outline" onClick={onToutAfficher}>Tout afficher</Button></>
						) : "Ce chantier n'a pas encore de lot. Ajoutez-les depuis l'écran Marchés."}
					</div>
				)}
			</div>
			<div className="g-legende">
				{lotsAffiches.map((l) => (
					<span key={l.id} className="leg"><i style={{ background: couleurDe(l.couleur).fond }} />{l.designation || '—'}</span>
				))}
			</div>
		</>
	);
}
