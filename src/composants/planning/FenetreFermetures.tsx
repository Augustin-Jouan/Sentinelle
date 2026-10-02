'use client';

import type { Resultat } from '@/actions/executer';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import * as Icone from '@/composants/briques/icones';
import { Panneau } from '@/composants/briques/Panneau';
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
			pied={<button type="button" className="btn btn-ghost" onClick={onFermer}>Fermer</button>}>
			<p className="pal-note" style={{ margin: 0 }}>Les congés et fermetures barrent toute la hauteur du planning : ils valent pour tous les lots.</p>
			<div className="block">
				<div className="block-head"><span className="eyebrow">Fermetures</span><button type="button" className="btn btn-sm" onClick={onAjouter}>Ajouter</button></div>
				<div className="block-body" style={{ padding: 0 }}>
					{fermetures.length ? (
						<table className="plain plain-mini">
							<thead><tr><th>Libellé</th><th className="ta-r">Sem.</th><th className="ta-r">Année</th><th className="ta-r">Durée</th><th /></tr></thead>
							<tbody>
								{fermetures.map((f) => {
									const s = semaineDuRang(rangIso(f.debut));
									return (
										<tr key={f.id}>
											<td><ChampEnLigne libelle="Libellé" placeholder="Congés d'été" valeur={f.libelle} enregistrer={(v) => onModifier(f.id, 'libelle', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Semaine" valeur={String(s.semaine)} enregistrer={(v) => onModifier(f.id, 'semaine', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Année" valeur={String(s.annee)} enregistrer={(v) => onModifier(f.id, 'annee', v)} /></td>
											<td className="ta-r"><ChampEnLigne variante="montant-etroit" libelle="Durée" valeur={String(f.duree)} enregistrer={(v) => onModifier(f.id, 'duree', v)} /></td>
											<td className="ta-r cell-actions">
												<button type="button" className="btn btn-sm btn-danger btn-ico" onClick={() => onSupprimer(f.id)}
													title="Supprimer cette fermeture" aria-label={`Supprimer la fermeture ${f.libelle || 'sans libellé'}`}><Icone.Corbeille /></button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					) : <p className="vide-mini">Aucune fermeture.</p>}
				</div>
			</div>
		</Panneau>
	);
}
