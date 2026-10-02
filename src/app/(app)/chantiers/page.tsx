import { exigerPage } from '@/auth/session';
import { AccueilChantiers } from '@/composants/accueil/AccueilChantiers';
import { Bouton } from '@/composants/briques/Bouton';
import { Ecran } from '@/composants/briques/Ecran';
import * as Icone from '@/composants/briques/icones';
import { lireAccueil } from '@/donnees/accueil';

export default async function PageChantiers() {
	await exigerPage();
	return (
		<Ecran titre="Mes chantiers" actions={<Bouton variante="primaire" href="/chantiers/nouveau"><Icone.Plus />Nouveau chantier</Bouton>}>
			<AccueilChantiers cartes={await lireAccueil()} />
		</Ecran>
	);
}
