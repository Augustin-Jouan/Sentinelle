import { couleurDe } from '@/domaine/couleurs';
import type { DonneesPlanning } from '../schemas';
import { EnTetePlanning } from './EnTetePlanning';

/**
 * Colonnes ENTREPRISES et LOTS, puis la piste qui prend toute la largeur restante. Barres et fermetures
 * sont placées en pourcentage de la piste : c'est de la mise en page, pas du contenu. Les numéros de
 * semaine trop serrés sont masqués par ajusterUneFeuille, jamais ici.
 */
export function PlanningPrevisionnel({ donnees }: { donnees: DonneesPlanning }) {
	const { contenu: c, cadre } = donnees;
	const nb = c.axe.semaines.length;
	const pct = (x: number) => `${(x * 100) / nb}%`;
	return (
		<article className="sheet sheet-doc">
			<EnTetePlanning entete={c.entete} cadre={cadre} />
			<p className="doc-titre">{`PLANNING PRÉVISIONNEL en date du ${cadre.dateGeneration}`}</p>
			<table className="d-gantt">
				<thead>
					<tr>
						<th className="d-ent">ENTREPRISES</th>
						<th className="d-lot">LOTS</th>
						<th className="d-piste">
							<div className="d-mois">
								{c.axe.mois.map((m, i) => <span key={i} style={{ width: pct(m.nbSemaines) }}>{m.libelle}</span>)}
							</div>
							<div className="d-sems">
								{c.axe.semaines.map((s, i) => <span key={i} style={{ width: pct(1) }}>{s.numero}</span>)}
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					{c.lignes.map((l, i) => {
						const couleur = couleurDe(l.couleur);
						return (
							<tr key={i}>
								<td className="d-ent">{l.entreprise}</td>
								<td className="d-lot">{l.lot}</td>
								<td className="d-piste">
									<div className="d-piste-in">
										{c.fermetures.map((f, j) => <div key={`f${j}`} className="d-ferm" style={{ left: pct(f.colonne), width: pct(f.duree) }} />)}
										{l.barres.map((b, j) => (
											<div key={j} className="d-bar" style={{ left: pct(b.colonne), width: pct(b.duree), background: couleur.fond, color: couleur.texte }}>
												{b.intitule}
											</div>
										))}
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<p className="doc-note">
				Les entreprises sont tenues d&apos;évacuer leurs déchets après chaque intervention. Tout retard non signalé engage la
				responsabilité de l&apos;entreprise dans les conditions prévues au marché.
			</p>
		</article>
	);
}
