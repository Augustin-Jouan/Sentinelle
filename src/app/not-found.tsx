import { Bouton } from '@/composants/briques/Bouton';
import { EcranCentre } from '@/composants/briques/EcranCentre';

export default function PageIntrouvable() {
	return (
		<EcranCentre titre="Page introuvable" accroche="Ce chantier ou cette page n'existe pas.">
			<Bouton variante="primaire" taille="grand" href="/chantiers">Retour aux chantiers</Bouton>
		</EcranCentre>
	);
}
