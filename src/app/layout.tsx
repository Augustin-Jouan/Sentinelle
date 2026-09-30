import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { SCRIPT_THEME } from '@/composants/maquette/theme';
import './globals.css';

export const metadata: Metadata = {
	title: 'Sentinelle Marchés',
	description: "Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu'il le faut.",
};

export default function LayoutRacine({ children }: { children: React.ReactNode }) {
	return (
		// data-theme est posé par SCRIPT_THEME avant l'hydratation : React ne doit pas s'en offusquer.
		<html lang="fr" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
			</head>
			<body>
				{children}
				<Toaster position="bottom-right" richColors />
			</body>
		</html>
	);
}
