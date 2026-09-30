import type { DonneesVisa } from '../schemas';
import { EnTetePlanning } from './EnTetePlanning';

export function VisaPlanning({ donnees }: { donnees: DonneesVisa }) {
	const { contenu: c, cadre } = donnees;
	return (
		<article className="sheet sheet-doc sheet-visa">
			<EnTetePlanning entete={c.entete} cadre={cadre} />
			<p className="doc-titre">VISA DU PLANNING</p>
			<p className="doc-phrase">{c.phrase}</p>
			<table className="d-visa">
				<thead>
					<tr><th>Liste des entreprises</th><th>Lots</th><th>Signature</th><th>Date</th></tr>
				</thead>
				<tbody>
					{c.lignes.map((l, i) => (
						<tr key={i}>
							<td>{l.entreprise}</td>
							<td>{l.lot}</td>
							<td className="sig" />
							<td className="sig" />
						</tr>
					))}
				</tbody>
			</table>
			<p className="doc-note">
				Par sa signature, l&apos;entreprise reconnaît avoir pris connaissance du planning prévisionnel et s&apos;engage sur les
				périodes qui la concernent.
			</p>
		</article>
	);
}
