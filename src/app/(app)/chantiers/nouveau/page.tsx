import { exigerPage } from '@/auth/session';
import { FormulaireChantier } from '@/composants/FormulaireChantier';
import { listerChargesAffaire } from '@/donnees/chantiers';

export default async function PageNouveauChantier() {
	const moi = await exigerPage();
	return (
		<section className="screen is-on">
			<FormulaireChantier chargesAffaire={await listerChargesAffaire()} moi={{ id: moi.id, nom: moi.nom }} />
		</section>
	);
}
