'use client';

import { Trash2 } from 'lucide-react';
import type { Resultat } from '@/actions/executer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { rangIso, type FermetureVue } from '@/domaine/planningVue';
import { semaineDuRang } from '@/domaine/semaines';
import type { ChampFermeture } from '@/donnees/planning';

type Props = {
	ouverte: boolean;
	onFermer: () => void;
	fermetures: FermetureVue[];
	onAjouter: () => void;
	onModifier: (id: string, champ: ChampFermeture, valeur: string) => Promise<Resultat<unknown>>;
	onSupprimer: (id: string) => void;
};

export function FenetreFermetures({ ouverte, onFermer, fermetures, onAjouter, onModifier, onSupprimer }: Props) {
	return (
		<Dialog open={ouverte} onOpenChange={(o) => { if (!o) onFermer(); }}>
			<DialogContent className="planning sm:max-w-xl" data-bloque-clavier="">
				<DialogHeader>
					<DialogTitle>Périodes de fermeture</DialogTitle>
					<DialogDescription>Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</DialogDescription>
				</DialogHeader>
				{fermetures.length ? (
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-xs text-muted-foreground">
								<th className="font-medium">Libellé</th>
								<th className="w-14 text-right font-medium">Sem.</th>
								<th className="w-16 text-right font-medium">Année</th>
								<th className="w-14 text-right font-medium">Durée</th>
								<th className="w-8" />
							</tr>
						</thead>
						<tbody>
							{fermetures.map((f) => {
								const s = semaineDuRang(rangIso(f.debut));
								return (
									<tr key={f.id} className="border-t">
										<td><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
										<td><ChampEnLigne libelle="Semaine" alignement="droite" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
										<td><ChampEnLigne libelle="Année" alignement="droite" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
										<td><ChampEnLigne libelle="Durée" alignement="droite" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
										<td>
											<Button size="icon-sm" variant="ghost" title="Supprimer cette fermeture"
												aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`} onClick={() => onSupprimer(f.id)}>
												<Trash2 />
											</Button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				) : (
					<p className="py-4 text-center text-sm italic text-muted-foreground">Aucune fermeture.</p>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={onAjouter}>Ajouter</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
