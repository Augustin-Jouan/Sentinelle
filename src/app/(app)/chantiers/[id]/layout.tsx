import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { MemoriserChantierOuvert } from '@/composants/navigation/chantierOuvert';
import { lireEnTeteChantier } from '@/donnees/chantiers';

export default async function LayoutChantier({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
	await exigerPage();
	const { id } = await params;
	if (!(await lireEnTeteChantier(id))) notFound();
	return (
		<>
			<MemoriserChantierOuvert id={id} />
			{children}
		</>
	);
}
