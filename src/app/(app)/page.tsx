import { redirect } from 'next/navigation';
import { exigerPage } from '@/auth/session';

export default async function Accueil() {
	await exigerPage();
	redirect('/chantiers');
}
