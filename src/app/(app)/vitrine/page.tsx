import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { Ecran } from '@/composants/briques/Ecran';
import { vitrineOuverte } from '@/composants/briques/vitrine/ouverte';
import { Vitrine } from '@/composants/briques/vitrine/Vitrine';

/** Toutes les briques, pour le développement et le banc visuel (jamais en production). */
export default async function PageVitrine() {
	await exigerPage();
	if (!vitrineOuverte(process.env)) notFound();
	return <Ecran titre="Vitrine"><Vitrine /></Ecran>;
}
