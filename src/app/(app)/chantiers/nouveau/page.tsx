import { exigerPage } from '@/auth/session';
import { FormulaireChantier } from '@/composants/FormulaireChantier';
import { listerChargesAffaire } from '@/donnees/chantiers';
import { lireParametres } from '@/donnees/parametres';

export default async function PageNouveauChantier() {
	const moi = await exigerPage();
	const [chargesAffaire, { raisonSociale, villeSignature }] = await Promise.all([listerChargesAffaire(), lireParametres()]);
	return <FormulaireChantier chargesAffaire={chargesAffaire} moi={{ id: moi.id, nom: moi.nom }} entete={{ raisonSociale, villeSignature }} />;
}
