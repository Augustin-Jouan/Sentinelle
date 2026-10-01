import { exigerPage } from '@/auth/session';
import { Ecran } from '@/composants/maquette/Ecran';
import { BoutonAjouterEntreprise, ReferentielArtisans } from '@/composants/ReferentielArtisans';
import { listerArtisans } from '@/donnees/artisans';

export default async function PageArtisans({ searchParams }: { searchParams: Promise<{ fiche?: string }> }) {
	await exigerPage();
	const { fiche } = await searchParams;
	return (
		<Ecran titre="Artisans" actions={<BoutonAjouterEntreprise />}>
			<ReferentielArtisans artisans={await listerArtisans()} ficheInitiale={fiche ?? null} />
		</Ecran>
	);
}
