'use client';

import type { Resultat } from '@/actions/executer';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { Bloc } from '@/composants/briques/Bloc';
import { Bouton } from '@/composants/briques/Bouton';
import * as Icone from '@/composants/briques/icones';
import { Panneau } from '@/composants/briques/Panneau';
import { Tableau } from '@/composants/briques/Tableau';
import { Vide } from '@/composants/briques/Vide';
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
		<Panneau ouvert={ouverte} surtitre="CHANTIER" titre="Périodes de fermeture" onFermer={onFermer}
			pied={<Bouton variante="fantome" onClick={onFermer}>Fermer</Bouton>}>
			<p className="text-12 text-muted">Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</p>
			<Bloc titre="Fermetures" corps="nu" action={<Bouton taille="sm" onClick={onAjouter}>Ajouter</Bouton>}>
					{fermetures.length ? (
						<Tableau variante="mini" cartes>
							<thead><tr role="row"><th role="columnheader">Libellé</th><th role="columnheader" data-droite>Sem.</th><th role="columnheader" data-droite>Année</th><th role="columnheader" data-droite>Durée</th><th role="columnheader" /></tr></thead>
							<tbody>
								{fermetures.map((f) => {
									const s = semaineDuRang(rangIso(f.debut));
									return (
										<tr role="row" key={f.id}>
											<td role="cell" className="max-etroit:basis-full"><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
											<td role="cell" data-droite data-cle="Semaine" className="max-etroit:flex-1"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
											<td role="cell" data-droite data-cle="Année" className="max-etroit:flex-1"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
											<td role="cell" data-droite data-cle="Durée" className="max-etroit:flex-1"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
											{/* Sans data-actions : en carte, la corbeille reste au bout du rang des chiffres. */}
											<td role="cell" data-droite className="max-etroit:self-end">
												<Bouton taille="sm" variante="danger" seulIcone onClick={() => onSupprimer(f.id)}
													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></Bouton>
											</td>
										</tr>
									);
								})}
							</tbody>
						</Tableau>
					) : <Vide variante="mini">Aucune fermeture.</Vide>}
			</Bloc>
		</Panneau>
	);
}
