'use client';

import { useEffect } from 'react';
import type { Resultat } from '@/actions/executer';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
import { COULEURS } from '@/domaine/couleurs';
import { rangIso, type LotPlanning, type PeriodeVue, type PlanningVue } from '@/domaine/planningVue';
import { semaineDuRang } from '@/domaine/semaines';
import type { ChampPeriode } from '@/donnees/planning';
import { optionsGroupees } from './geometrie';

type Props = {
	lot: LotPlanning | null;
	planning: PlanningVue;
	principale: string | null;
	onFermer: () => void;
	onCouleur: (cle: string) => void;
	onModifier: (periodeId: string, champ: ChampPeriode, valeur: string) => Promise<Resultat<unknown>>;
	onLier: (periodeId: string, dependDeId: string | null) => void;
	onSupprimer: (periodeId: string) => void;
	onAjouter: () => void;
};

export function PanneauLotPlanning({ lot, planning, principale, onFermer, onCouleur, onModifier, onLier, onSupprimer, onAjouter }: Props) {
	useEffect(() => { document.querySelector('.panel.is-on tr[data-vise]')?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
	return (
		<Panneau ouvert={lot !== null} surtitre={lot?.numero ? `LOT ${lot.numero}` : 'LOT'} titre={lot?.designation || 'Désignation à saisir'}
			libelle={lot?.designation || undefined} onFermer={onFermer} pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
			{lot && (
				<>
					<div className="block">
						<div className="block-head"><span className="eyebrow">Couleur du lot</span></div>
						<div className="block-body">
							<div className="pal">
								{COULEURS.map((c) => (
									<button key={c.cle} type="button" className={c.cle === lot.couleur ? 'pal-c is-on' : 'pal-c'} style={{ background: c.fond }}
										title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)} />
								))}
							</div>
							<p className="pal-note">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
						</div>
					</div>
					<div className="block">
						<div className="block-head"><span className="eyebrow">Périodes</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
						<div className="block-body" style={{ padding: 0 }}>
							{lot.periodes.length ? (
								<table className="plain plain-mini">
									<thead><tr><th>Intitulé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
									{lot.periodes.map((x) => (
										<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
											onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
									))}
								</table>
							) : <p className="vide-mini">Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».</p>}
						</div>
					</div>
				</>
			)}
		</Panneau>
	);
}

type LigneProps = {
	periode: PeriodeVue;
	vise: boolean;
	options: ReturnType<typeof optionsGroupees>;
	onModifier: Props['onModifier'];
	onLier: Props['onLier'];
	onSupprimer: Props['onSupprimer'];
};

/** Deux rangs par période : les champs, puis « Commence après » (openLotPlanning de la maquette). */
function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprimer }: LigneProps) {
	const s = semaineDuRang(rangIso(x.debut));
	return (
		<tbody data-periode={x.id}>
			<tr className={vise ? 'ligne-per est-vise' : 'ligne-per'} data-vise={vise ? '1' : undefined}>
				<td><ChampEnLigne libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
				<td className="ta-r"><ChampEnLigne variante="montant-mini" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
				<td className="ta-r cell-actions">
					<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(x.id)}
						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></button>
				</td>
			</tr>
			<tr className={vise ? 'ligne-dep est-vise' : 'ligne-dep'}>
				<td colSpan={5}>
					<MenuDeroulant id={`dd-dep-${x.id}`} k="Commence après" classe="dd-large" valeur={x.dependDeId ?? ''}
						options={[
							{ v: '', t: '— rien, date libre —' },
							// optionsDep() de la maquette : un séparateur et le nom du lot, puis ses périodes (« Fondations » · « S16 2026 »).
							...options.flatMap((g) => [{ sep: true as const }, { tete: g.lot }, ...g.periodes.map((o) => {
								const [t, meta] = o.libelle.split(' — ');
								return { v: o.id, t, meta };
							})]),
						]}
						onChoisir={(v) => onLier(x.id, v || null)} />
				</td>
			</tr>
		</tbody>
	);
}
