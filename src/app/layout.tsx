import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
	title: 'Sentinelle Marchés',
	description: "Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu'il le faut.",
};

export default function LayoutRacine({ children }: { children: React.ReactNode }) {
	return (
		<html lang="fr">
			<body>
				{children}
				<Toaster position="bottom-right" richColors />
			</body>
		</html>
	);
}
