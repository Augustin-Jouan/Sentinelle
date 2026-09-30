import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { ApercuPlanning } from '@/composants/planning/ApercuPlanning';
import { Planning } from '@/composants/planning/Planning';
import { construireDonneesPlanning, construireDonneesVisa } from '@/documents/donnees';
import { etatSeriePlanning } from '@/documents/etats';
import { ErreurMetier } from '@/domaine/erreurs';
import { dateParis, versIso } from '@/domaine/semaines';
import { lireEnTeteChantier } from '@/donnees/chantiers';
import { lirePlanning } from '@/donnees/planning';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ apercu?: string }> };

/** La feuille construite à partir des données actuelles ; sans période, l'aperçu le dit au lieu de la montrer. */
async function apercuPlanning(chantierId: string, reference: string) {
	try {
		const { donnees } = await construireDonneesPlanning(chantierId);
		return <ApercuPlanning mode="planning" chantierId={chantierId} reference={reference} donnees={donnees} erreur={null} />;
	} catch (e) {
		if (!(e instanceof ErreurMetier)) throw e;
		return <ApercuPlanning mode="planning" chantierId={chantierId} reference={reference} donnees={null} erreur={e.message} />;
	}
}

/** Le visa porte sur la dernière version générée du planning ; l'aperçu dit si le planning a changé depuis. */
async function apercuVisa(chantierId: string, reference: string) {
	const serie = await etatSeriePlanning(chantierId);
	const derniere = serie.versions[0];
	if (!derniere) {
		return (
			<ApercuPlanning mode="visa" chantierId={chantierId} reference={reference} donnees={null} planning={null}
				erreur="Aucune version du planning : générez d'abord le planning." />
		);
	}
	const { donnees } = await construireDonneesVisa(chantierId);
	return (
		<ApercuPlanning mode="visa" chantierId={chantierId} reference={reference} donnees={donnees} erreur={null}
			planning={{ version: derniere.version, modifie: serie.etat === 'modifie' }} />
	);
}

export default async function PagePlanning({ params, searchParams }: Props) {
	await exigerPage();
	const { id } = await params;
	const { apercu } = await searchParams;
	const [planning, chantier] = await Promise.all([lirePlanning(id), lireEnTeteChantier(id)]);
	if (!planning || !chantier) notFound();
	const apercuOuvert = apercu === 'planning' ? await apercuPlanning(id, chantier.reference)
		: apercu === 'visa' ? await apercuVisa(id, chantier.reference)
			: null;
	return (
		<>
			{/* Le jour à Châteaubriant, calculé côté serveur : le repère « aujourd'hui » est le même au rendu et à l'hydratation. */}
			<Planning planningInitial={planning} aujourdhui={versIso(dateParis(new Date()))} />
			{apercuOuvert}
		</>
	);
}
