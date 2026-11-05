import type { Cadre } from '../schemas';
import { LogoEntreprise } from './Logo';

export function EnTete({ entete }: { entete: Cadre['entete'] }) {
	const coordonnees = (
		<p className="firm">
			<b>{entete.raisonSociale}</b><br />
			{entete.libelleActivite}<br />
			{entete.adresseLigne}<br />
			{`Tél. ${entete.telephone}${entete.fax ? ` - Fax. ${entete.fax}` : ''}`}
		</p>
	);
	return entete.logo ? <div className="firm-logo"><LogoEntreprise src={entete.logo} />{coordonnees}</div> : coordonnees;
}
