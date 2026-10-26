import type { Metadata } from 'next';
import { exigerPage } from '@/auth/session';
import { Guide } from '@/composants/aide/Guide';

export const metadata: Metadata = { title: 'Aide — Écran par écran' };

export default async function PageAide() {
	await exigerPage();
	return <Guide onglet="quoi" />;
}
