import { redirect } from 'next/navigation';
import { exigerPage } from '@/auth/session';

export default async function PageChantier({ params }: { params: Promise<{ id: string }> }) {
	await exigerPage();
	redirect(`/chantiers/${(await params).id}/marches`);
}
