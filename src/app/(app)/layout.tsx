import { exigerPage } from '@/auth/session';
import { EnTeteApp } from '@/composants/EnTeteApp';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
	const utilisateur = await exigerPage();
	return (
		<div className="min-h-screen">
			<EnTeteApp utilisateur={utilisateur} />
			<main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
		</div>
	);
}
