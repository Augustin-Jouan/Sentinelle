import Link from 'next/link';
import { exigerPage } from '@/auth/session';
import { AccueilChantiers } from '@/composants/accueil/AccueilChantiers';
import { Ecran } from '@/composants/briques/Ecran';
import * as Icone from '@/composants/briques/icones';
import { lireAccueil } from '@/donnees/accueil';

export default async function PageChantiers() {
	await exigerPage();
	return (
		<Ecran titre="Mes chantiers" actions={<Link className="btn btn-primary" href="/chantiers/nouveau"><Icone.Plus />Nouveau chantier</Link>}>
			<AccueilChantiers cartes={await lireAccueil()} />
		</Ecran>
	);
}
