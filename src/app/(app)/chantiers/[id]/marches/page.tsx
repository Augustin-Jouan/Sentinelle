import { TableauLots } from '@/composants/TableauLots';
import { lireVueMarches } from '@/donnees/marches';

export default async function PageMarches({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">Marchés &amp; récapitulatif</h2>
			<TableauLots vue={await lireVueMarches(id)} />
		</section>
	);
}
