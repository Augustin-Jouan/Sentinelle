import { exigerPage } from '@/auth/session';
import { BoutonNouveauCompte, GestionComptes } from '@/composants/GestionComptes';
import { Ecran } from '@/composants/briques/Ecran';
import { listerComptes } from '@/donnees/comptes';

export default async function PageComptes() {
	const moi = await exigerPage({ admin: true });
	return (
		<Ecran titre="Comptes" actions={<BoutonNouveauCompte />}>
			<GestionComptes comptes={await listerComptes()} moiId={moi.id} />
		</Ecran>
	);
}
