import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { ApercuCertificat } from '@/composants/ApercuCertificat';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { BoutonMarchesManquants } from '@/composants/BoutonMarchesManquants';
import { BandeauChantier } from '@/composants/chantier/BandeauChantier';
import { Ecran } from '@/composants/maquette/Ecran';
import * as Icone from '@/composants/maquette/icones';
import { BoutonAjouterLot, TableauLots } from '@/composants/TableauLots';
import { construireDonneesAvenant, construireDonneesMarche } from '@/documents/donnees';
import { TITRES_TYPES } from '@/documents/libelles';
import { ouvrirCorrection, ouvrirNouveauCertificat } from '@/donnees/acomptes';
import { lireEnTeteChantier, listerChargesAffaire } from '@/donnees/chantiers';
import { lireVueMarches } from '@/donnees/marches';
import { LIBELLES_MANQUES_AVENANT, manquesAvenant, numeroAvenantTexte } from '@/domaine/avenants';
import { ErreurMetier } from '@/domaine/erreurs';
import { LIBELLES_MANQUES } from '@/domaine/regles';

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ apercu?: string; avenant?: string; certificat?: string; corriger?: string }>;
};

/** Un avenant ou un acompte supprimé entre-temps (ou un lien périmé) : rien ne s'ouvre. */
async function siPresent<T>(lire: () => Promise<T>): Promise<T | null> {
	try {
		return await lire();
	} catch (e) {
		if (e instanceof ErreurMetier) return null;
		throw e;
	}
}

async function apercuAvenant(chantierId: string, avenantId: string) {
	const a = await siPresent(() => construireDonneesAvenant(avenantId));
	if (!a || a.chantierId !== chantierId) return null;
	return (
		<ApercuDocument
			titre={`Avenant n° ${numeroAvenantTexte(a.avenant.numero)}`}
			sousTitre={`Lot ${a.lot.numero ?? '—'} — ${a.lot.designation} — ${a.lot.artisan?.nom ?? 'non attribué'}`}
			donnees={a.donnees}
			source={{ type: 'avenant', avenantId }}
			manques={manquesAvenant({ artisanId: a.lot.artisanId, montantHt: a.avenant.montantHt }).map((m) => LIBELLES_MANQUES_AVENANT[m])}
		/>
	);
}

async function apercuCertificat(chantierId: string, p: { certificat?: string; corriger?: string }) {
	const ouvert = await siPresent(() => (p.corriger ? ouvrirCorrection(p.corriger) : ouvrirNouveauCertificat(p.certificat ?? '')));
	if (!ouvert || ouvert.chantierId !== chantierId) return null;
	const l = ouvert.source.lot;
	return (
		<ApercuCertificat
			key={ouvert.acompteId ?? `nouveau:${ouvert.lotId}`}
			ouvert={ouvert}
			sousTitre={`Lot ${l.numero ?? '—'} — ${l.designation} — ${l.entreprise ?? 'non attribué'}`}
		/>
	);
}

export default async function PageMarches({ params, searchParams }: Props) {
	await exigerPage();
	const { id } = await params;
	const { apercu, avenant, certificat, corriger } = await searchParams;
	const [vue, chantier, chargesAffaire] = await Promise.all([lireVueMarches(id), lireEnTeteChantier(id), listerChargesAffaire()]);
	if (!vue || !chantier) notFound();
	const lot = apercu ? vue.lots.find((l) => l.id === apercu) : undefined;
	const donnees = lot ? (await construireDonneesMarche(lot.id)).donnees : null;
	const autreApercu = avenant ? await apercuAvenant(id, avenant)
		: certificat || corriger ? await apercuCertificat(id, { certificat, corriger })
			: null;
	return (
		<Ecran
			titre="Marchés & récapitulatif"
			actions={<>
				<BoutonAjouterLot chantierId={id} />
				<a className="btn" href={`/api/chantiers/${id}/recap-xlsx`}><Icone.Telecharger />Exporter le récap</a>
				<BoutonMarchesManquants chantierId={id} forme="barre" />
			</>}
			contexte={<BandeauChantier chantier={chantier} chargesAffaire={chargesAffaire} />}
		>
			<TableauLots vue={vue} />
			{lot && donnees && (
				<ApercuDocument titre={TITRES_TYPES[donnees.type]} sousTitre={`Lot ${lot.numero ?? '—'} — ${lot.designation} — ${lot.entreprise ?? 'non attribué'}`}
					donnees={donnees} source={{ type: 'marche', lotId: lot.id }} manques={lot.manques.map((m) => LIBELLES_MANQUES[m])} />
			)}
			{autreApercu}
		</Ecran>
	);
}
