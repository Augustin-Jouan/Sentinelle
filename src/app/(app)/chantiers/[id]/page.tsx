import { redirect } from 'next/navigation';

export default async function PageChantier({ params }: { params: Promise<{ id: string }> }) {
	redirect(`/chantiers/${(await params).id}/marches`);
}
