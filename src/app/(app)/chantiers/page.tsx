import Link from 'next/link';
import { exigerPage } from '@/auth/session';
import { buttonVariants } from '@/components/ui/button';
import { ListeChantiers } from '@/composants/ListeChantiers';
import { listerChantiers } from '@/donnees/chantiers';

export default async function PageChantiers() {
	await exigerPage();
	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Mes chantiers</h1>
				<Link href="/chantiers/nouveau" className={buttonVariants()}>Nouveau chantier</Link>
			</div>
			<ListeChantiers chantiers={await listerChantiers()} />
		</section>
	);
}
