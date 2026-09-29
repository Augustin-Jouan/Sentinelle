import { exigerPage } from '@/auth/session';
import { FormulaireChantier } from '@/composants/FormulaireChantier';
import { listerChargesAffaire } from '@/donnees/chantiers';

export default async function PageNouveauChantier() {
	const moi = await exigerPage();
	return (
		<section className="space-y-4">
			<h1 className="text-2xl font-bold">Nouveau chantier</h1>
			<FormulaireChantier chargesAffaire={await listerChargesAffaire()} moiId={moi.id} />
		</section>
	);
}
