import { exigerPage } from '@/auth/session';
import { GestionComptes } from '@/composants/GestionComptes';
import { listerComptes } from '@/donnees/comptes';

export default async function PageComptes() {
	const moi = await exigerPage({ admin: true });
	return (
		<section className="space-y-6">
			<h1 className="text-2xl font-bold">Comptes</h1>
			<GestionComptes comptes={await listerComptes()} moiId={moi.id} />
		</section>
	);
}
