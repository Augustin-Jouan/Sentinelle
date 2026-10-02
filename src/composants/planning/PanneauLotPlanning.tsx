'use client';

import { useEffect } from 'react';
import type { Resultat } from '@/actions/executer';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { Bloc } from '@/composants/briques/Bloc';
import { Bouton } from '@/composants/briques/Bouton';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
import { PANNEAU_OUVERT } from '@/composants/briques/surcouches';
import { Vide } from '@/composants/briques/Vide';
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
	useEffect(() => { document.querySelector(`${PANNEAU_OUVERT} tr[data-vise]`)?.scrollIntoView({ block: 'nearest' }); }, [lot?.id, principale]);
	return (
		<Panneau ouvert={lot !== null} surtitre={lot?.numero ? `LOT ${lot.numero}` : 'LOT'} titre={lot?.designation || 'Désignation à saisir'}
			libelle={lot?.designation || undefined} onFermer={onFermer} pied={<Bouton variante="fantome" onClick={onFermer}>Fermer</Bouton>}>
			{lot && (
				<>
					<Bloc titre="Couleur du lot">
						<div className="flex flex-wrap gap-1.5">
							{COULEURS.map((c) => (
								<button key={c.cle} type="button" style={{ background: c.fond }} title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)}
									className={cx('size-7 cursor-pointer rounded-xs border p-0', c.cle === lot.couleur ? 'border-accent ring-2 ring-accent' : 'border-rule-strong')} />
							))}
						</div>
						<p className="mt-2.5 text-12 text-muted">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
					</Bloc>
					<Bloc titre="Périodes" corps="nu" action={<Bouton taille="sm" onClick={onAjouter}>Ajouter</Bouton>}>
						{lot.periodes.length ? (
							<table className="periodes">
								<thead><tr><th>Intitulé</th><th data-droite>Sem.</th><th data-droite>Année</th><th data-droite>Durée</th><th /></tr></thead>
								{lot.periodes.map((x) => (
									<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
										onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
								))}
							</table>
						) : <Vide variante="mini">Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».</Vide>}
					</Bloc>
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
				<td><ChampEnLigne gras={vise} libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
				<td data-droite><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
				<td data-droite data-actions>
					<Bouton taille="sm" variante="danger" seulIcone onClick={() => onSupprimer(x.id)}
						title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}><Icone.Corbeille /></Bouton>
				</td>
			</tr>
			<tr className={vise ? 'ligne-dep est-vise' : 'ligne-dep'}>
				<td colSpan={5}>
					<MenuDeroulant id={`dd-dep-${x.id}`} k="Commence après" largeur="large" className="max-w-full" valeur={x.dependDeId ?? ''}
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
