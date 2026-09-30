import { notFound } from 'next/navigation';
import { Planning } from '@/composants/planning/Planning';
import { dateParis, versIso } from '@/domaine/semaines';
import { lirePlanning } from '@/donnees/planning';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ apercu?: string }> };

export default async function PagePlanning({ params }: Props) {
	const { id } = await params;
	const planning = await lirePlanning(id);
	if (!planning) notFound();
	// Le jour à Châteaubriant, calculé côté serveur : le repère « aujourd'hui » est le même au rendu et à l'hydratation.
	return <Planning planningInitial={planning} aujourdhui={versIso(dateParis(new Date()))} />;
}
