import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { EnTeteChantier } from '@/composants/EnTeteChantier';
import { lireEnTeteChantier, listerChargesAffaire } from '@/donnees/chantiers';

export default async function LayoutChantier({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
	await exigerPage();
	const { id } = await params;
	const chantier = await lireEnTeteChantier(id);
	if (!chantier) notFound();
	return (
		<>
			<EnTeteChantier chantier={chantier} chargesAffaire={await listerChargesAffaire()} />
			{children}
		</>
	);
}
