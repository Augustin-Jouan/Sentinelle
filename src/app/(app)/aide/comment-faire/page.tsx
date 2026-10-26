import type { Metadata } from 'next';
import { exigerPage } from '@/auth/session';
import { Guide } from '@/composants/aide/Guide';

export const metadata: Metadata = { title: 'Aide — Comment faire' };

export default async function PageCommentFaire() {
	await exigerPage();
	return <Guide onglet="comment" />;
}
