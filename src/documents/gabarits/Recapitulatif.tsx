import type { DonneesRecap } from '../schemas';

export function Recapitulatif({ donnees }: { donnees: DonneesRecap }) {
	const { contenu: c, cadre } = donnees;
	return (
		<article className="sheet sheet-recap">
			<h4>RÉCAPITULATIF DES MARCHÉS</h4>
			<div className="recap-entete">
				<dl>
					<dt>Mr / Mme :</dt><dd>{c.maitreOuvrage}</dd>
					<dt>Construction :</dt><dd>{c.natureTravaux}</dd>
					<dt>Adresse :</dt><dd>{c.adresseChantier}</dd>
					<dt>Code postal :</dt><dd>{c.cpCommune}</dd>
				</dl>
				<dl>
					<dt>Adresse postale actuelle du maître d&apos;ouvrage :</dt><dd>{c.adresseClient}</dd>
					<dt>Mission :</dt><dd>{c.mission}</dd>
					<dt>Chargé d&apos;affaire :</dt><dd>{c.chargeAffaire}</dd>
				</dl>
			</div>
			<p className="recap-lieu">{`${cadre.villeSignature} le ${c.dateSignature ?? cadre.dateGeneration}`}</p>
			{c.lignes.length ? (
				<table className="recap">
					<thead>
						<tr>
							<th>N°</th><th>Lot</th><th>Entreprise</th><th className="r">Montant TTC</th><th className="r">TVA</th>
							<th>Adresse de l&apos;artisan</th><th>Code postal</th><th>Commune</th><th>Interlocuteur</th><th>Téléphone</th>
						</tr>
					</thead>
					<tbody>
						{c.lignes.map((l, i) => (
							<tr key={i}>
								<td className="mono">{l.numero}</td>
								<td>{l.designation}</td>
								<td>{l.entreprise ?? <i>à attribuer</i>}</td>
								<td className="r mono">{l.montantTtcTexte}</td>
								<td className="r mono">{l.tvaTexte}</td>
								<td>{l.adresse}</td>
								<td className="mono">{l.cp}</td>
								<td>{l.commune}</td>
								<td>{l.interlocuteur}</td>
								<td className="mono">{l.telephone}</td>
							</tr>
						))}
						<tr className="total">
							<td colSpan={3} className="lbl-total">{c.totalLibelle}</td>
							<td className="r mono">{c.totalTtcTexte}</td>
							<td colSpan={6} />
						</tr>
					</tbody>
				</table>
			) : (
				<p className="recap-vide">Aucun lot à récapituler.</p>
			)}
		</article>
	);
}
