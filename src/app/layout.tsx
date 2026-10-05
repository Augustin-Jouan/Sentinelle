import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { InitTheme } from '@/composants/briques/InitTheme';
import { Toasts } from '@/composants/briques/Toasts';
import { CLE_THEME } from '@/composants/briques/theme';
import './globals.css';

export const metadata: Metadata = {
	title: 'Sentinelle Marchés',
	description: "Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu'il le faut.",
};

export default async function LayoutRacine({ children }: { children: React.ReactNode }) {
	const theme = (await cookies()).get(CLE_THEME)?.value;
	const dataTheme = theme === 'light' || theme === 'dark' ? theme : undefined;
	return (
		<html lang="fr" {...(dataTheme ? { 'data-theme': dataTheme } : {})} suppressHydrationWarning>
			<body>
				<InitTheme />
				{children}
				<Toasts />
			</body>
		</html>
	);
}
