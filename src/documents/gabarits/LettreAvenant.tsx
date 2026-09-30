import type { DonneesAvenant } from '../schemas';
import { EnTetePlanning } from './EnTetePlanning';
import { Zone, type ModeGabarit, type Saisie } from './Zone';

/** Fac-similé de « 4- AVENANT.doc » (maquette `buildDocAvenant`), A4 portrait. */
export function LettreAvenant({ donnees, mode, onSaisie }: { donnees: DonneesAvenant; mode: ModeGabarit; onSaisie?: Saisie }) {
	const { contenu: c, cadre } = donnees;
	const m = c.montants;
	return (
		<article className="sheet sheet-doc sheet-avenant">
			<EnTetePlanning entete={c.entete} cadre={cadre} />
			<p className="av-lieu">{c.lieuDate}</p>
			<p className="doc-titre">{`AVENANT N° ${c.numero}`}</p>
			<p className="doc-phrase">aux marchés travaux de l&apos;entreprise <b>{c.entreprise}</b></p>
			<dl className="doc-kv av-kv">
				<dt>Réf/adresse chantier :</dt><dd>{c.entete.adresseChantier}</dd>
			</dl>
			<p className="av-objet">
				Travaux en <b>{c.sens}</b>{', concernant le lot :'}<br />
				<b>{c.lot}</b>
				{(mode === 'edition' || c.objet) && (
					<>
						<br />
						<Zone cle="objet" valeur={c.objet} mode={mode} onSaisie={onSaisie} placeholder="Objet de l'avenant" classe="normal bloc" />
					</>
				)}
			</p>
			<table className="d-avenant">
				<tbody>
					<tr><td>Montant du marché initial :</td><td className="r mono">{`${m.marcheInitial} TTC`}</td></tr>
					<tr>
						<td>{`Montant du devis complémentaire${m.devis.numero ? ` n° ${m.devis.numero}` : ''} :`}</td>
						<td className="r mono">{`${m.devis.montant} TTC`}</td>
					</tr>
					<tr className="total"><td>{`Soit une ${c.sens} de :`}</td><td className="r mono">{`${m.difference} TTC`}</td></tr>
					<tr className="apres"><td>Nouveau montant du marché :</td><td className="r mono">{`${m.nouveauMontant} TTC`}</td></tr>
				</tbody>
			</table>
			<div className="sign-row sign-row-2 av-sign">
				<div>Le Maître de l&apos;Ouvrage<br /><i>(signature précédée de la mention « Bon pour accord »)</i></div>
				<div>Le Maître d&apos;Œuvre<br /><i>(cachet &amp; signature)</i></div>
			</div>
		</article>
	);
}
