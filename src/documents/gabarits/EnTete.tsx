import type { Cadre } from '../schemas';

export function EnTete({ entete }: { entete: Cadre['entete'] }) {
	return (
		<p className="firm">
			<b>{entete.raisonSociale}</b><br />
			{entete.libelleActivite}<br />
			{entete.adresseLigne}<br />
			{`Tél. ${entete.telephone}${entete.fax ? ` - Fax. ${entete.fax}` : ''}`}
		</p>
	);
}
