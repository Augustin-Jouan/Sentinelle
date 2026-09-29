import { exigerPage } from '@/auth/session';
import { ReferentielArtisans } from '@/composants/ReferentielArtisans';
import { listerArtisans } from '@/donnees/artisans';

export default async function PageArtisans() {
	await exigerPage();
	return (
		<section className="space-y-4">
			<div>
				<h1 className="text-2xl font-bold">Artisans</h1>
				<p className="text-sm text-muted-foreground">Une entreprise désactivée n&apos;est plus proposée à l&apos;attribution ; les lots qui l&apos;ont déjà la gardent.</p>
			</div>
			<ReferentielArtisans artisans={await listerArtisans()} />
		</section>
	);
}
