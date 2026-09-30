'use client';

import { Trash2 } from 'lucide-react';
import type { Resultat } from '@/actions/executer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { COULEURS } from '@/domaine/couleurs';
import { rangIso, type LotPlanning, type PeriodeVue, type PlanningVue } from '@/domaine/planningVue';
import { semaineDuRang } from '@/domaine/semaines';
import type { ChampPeriode } from '@/donnees/planning';
import { cn } from '@/lib/utils';
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
	return (
		<Sheet open={lot !== null} onOpenChange={(ouvert) => { if (!ouvert) onFermer(); }}>
			<SheetContent className="planning overflow-y-auto sm:max-w-lg" data-bloque-clavier="">
				{lot && (
					<>
						<SheetHeader>
							<SheetDescription>{lot.numero ? `LOT ${lot.numero}` : 'LOT'}</SheetDescription>
							<SheetTitle>{lot.designation || 'Désignation à saisir'}</SheetTitle>
						</SheetHeader>
						<section className="space-y-2 px-4">
							<h3 className="eyebrow">Couleur du lot</h3>
							<div className="pal">
								{COULEURS.map((c) => (
									<button key={c.cle} type="button" className={cn('pal-c', c.cle === lot.couleur && 'is-on')} style={{ background: c.fond }}
										title={c.nom} aria-label={c.nom} aria-pressed={c.cle === lot.couleur} onClick={() => onCouleur(c.cle)} />
								))}
							</div>
							<p className="pal-note">Donnez la même couleur à des lots d&apos;une même famille — les fluides, les menuiseries — comme dans votre planning actuel.</p>
						</section>
						<section className="space-y-2 px-4 pb-6">
							<div className="flex items-center justify-between">
								<h3 className="eyebrow">Périodes</h3>
								<Button size="sm" variant="outline" onClick={onAjouter}>Ajouter</Button>
							</div>
							{lot.periodes.length ? (
								<table className="w-full text-sm">
									<thead>
										<tr className="text-left text-xs text-muted-foreground">
											<th className="font-medium">Intitulé</th>
											<th className="w-14 text-right font-medium">Sem.</th>
											<th className="w-16 text-right font-medium">Année</th>
											<th className="w-14 text-right font-medium">Durée</th>
											<th className="w-8" />
										</tr>
									</thead>
									{lot.periodes.map((x) => (
										<LignePeriode key={x.id} periode={x} vise={x.id === principale} options={optionsGroupees(planning, x.id)}
											onModifier={onModifier} onLier={onLier} onSupprimer={onSupprimer} />
									))}
								</table>
							) : (
								<p className="py-4 text-center text-sm italic text-muted-foreground">
									Aucune période. Tracez-en une à la souris sur la grille, ou cliquez « Ajouter ».
								</p>
							)}
						</section>
					</>
				)}
			</SheetContent>
		</Sheet>
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

/** Deux rangs par période : les champs, puis le lien « commence après » (maquette `openLotPlanning`). */
function LignePeriode({ periode: x, vise, options, onModifier, onLier, onSupprimer }: LigneProps) {
	const s = semaineDuRang(rangIso(x.debut));
	return (
		<tbody data-periode={x.id} className={cn('border-t', vise && 'bg-accent')}>
			<tr>
				<td><ChampEnLigne libelle="Intitulé" placeholder="sans intitulé" valeur={x.intitule} enregistrer={(v) => onModifier(x.id, 'intitule', v)} /></td>
				<td><ChampEnLigne libelle="Semaine" alignement="droite" valeur={String(s.semaine)} enregistrer={(v) => onModifier(x.id, 'semaine', v)} /></td>
				<td><ChampEnLigne libelle="Année" alignement="droite" valeur={String(s.annee)} enregistrer={(v) => onModifier(x.id, 'annee', v)} /></td>
				<td><ChampEnLigne libelle="Durée" alignement="droite" valeur={String(x.duree)} enregistrer={(v) => onModifier(x.id, 'duree', v)} /></td>
				<td>
					<Button size="icon-sm" variant="ghost" title="Supprimer cette période" aria-label={`Supprimer la période ${x.intitule || 'sans intitulé'}`}
						onClick={() => onSupprimer(x.id)}>
						<Trash2 />
					</Button>
				</td>
			</tr>
			<tr>
				<td colSpan={5} className="pb-2 pl-5">
					<label className="flex items-center gap-2 text-xs text-muted-foreground">
						<span aria-hidden="true">↳</span> Commence après
						<select aria-label="Commence après" className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm text-foreground"
							value={x.dependDeId ?? ''} onChange={(e) => onLier(x.id, e.target.value || null)}>
							<option value="">— rien, date libre —</option>
							{options.map((g) => (
								<optgroup key={g.lot} label={g.lot}>
									{g.periodes.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
								</optgroup>
							))}
						</select>
					</label>
				</td>
			</tr>
		</tbody>
	);
}
