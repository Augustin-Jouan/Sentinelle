import { exigerPage } from '@/auth/session';
import { ConfirmationFournisseur } from '@/composants/briques/Confirmation';
import { BarreNavigation } from '@/composants/navigation/BarreNavigation';
import { lireNavigation } from '@/donnees/navigation';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
	const utilisateur = await exigerPage();
	return (
		<ConfirmationFournisseur>
			<BarreNavigation utilisateur={utilisateur} navigation={await lireNavigation()}>{children}</BarreNavigation>
		</ConfirmationFournisseur>
	);
}
