import type { Cadre, EntetePlanning as Entete } from '../schemas';
import { EnTete } from './EnTete';

/** En-tête commun au planning et au visa : SOCOREVE à gauche, le chantier à droite (annexe C). */
export function EnTetePlanning({ entete, cadre }: { entete: Entete; cadre: Cadre }) {
	return (
		<div className="doc-entete">
			<EnTete entete={cadre.entete} />
			<dl className="doc-kv">
				<dt>Coordination :</dt><dd>{entete.coordination}</dd>
				<dt>Maître d&apos;ouvrage :</dt><dd>{entete.maitreOuvrage}</dd>
				<dt>Projet :</dt><dd>{entete.projet}</dd>
				<dt>Adresse du chantier :</dt><dd>{entete.adresseChantier}</dd>
			</dl>
		</div>
	);
}
