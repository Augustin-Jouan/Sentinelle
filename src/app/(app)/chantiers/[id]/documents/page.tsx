import { notFound } from 'next/navigation';
import { exigerPage } from '@/auth/session';
import { ApercuCompteRendu } from '@/composants/ApercuCompteRendu';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { ApercuReception } from '@/composants/ApercuReception';
import { CartesDocuments } from '@/composants/documents/CartesDocuments';
import { AutresDocuments, TableauDocuments } from '@/composants/documents/TableauDocuments';
import { Ecran } from '@/composants/maquette/Ecran';
import * as Icone from '@/composants/maquette/icones';
import { construireDonneesRecap } from '@/documents/donnees';
import { etatsDocumentsChantier, lireDocument, versionsDeLaSerie, type VueDocuments } from '@/documents/etats';
import { TITRES_TYPES, type TypeDocument } from '@/documents/libelles';
import { avenantDeLaSerie, SERIES } from '@/documents/series';
import { lireBrouillon, ouvrirCompteRendu } from '@/donnees/comptesRendus';
import { lirePlanning } from '@/donnees/planning';
import { lireReceptionsOuvertes } from '@/donnees/receptions';
import { etendueDuPlanning } from '@/domaine/planningVue';
import { dateDuJourTexte } from '@/domaine/regles';
import { dateParis, semaineDuRang, versIso } from '@/domaine/semaines';

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ apercu?: string; version?: string; cr?: string; 'corriger-cr'?: string; pv?: string }>;
};

/** « 6 documents produits · dernier le 18.06.2026 » (renderDocs de la maquette). */
function texteResume({ nombre, dernierLe }: VueDocuments['resume']): string {
	if (!nombre || !dernierLe) return 'Aucun document produit pour ce chantier.';
	return `${nombre} document${nombre > 1 ? 's' : ''} produit${nombre > 1 ? 's' : ''} · dernier le ${dateDuJourTexte(new Date(dernierLe))}`;
}

/** D'une version, le lien vers l'aperçu des données actuelles de sa série ; aucun pour un acte figé (certificat, compte rendu, PV). */
function retourActuel(chantierId: string, doc: { serie: string; type: TypeDocument; lotId: string | null }): string | undefined {
	const base = `/chantiers/${chantierId}`;
	if (doc.type === 'MARCHE_GRE_A_GRE' || doc.type === 'MARCHE_SOUS_TRAITANCE') return doc.lotId ? `${base}/marches?apercu=${doc.lotId}` : undefined;
	if (doc.type === 'AVENANT') { const a = avenantDeLaSerie(doc.serie); return a ? `${base}/marches?avenant=${a}` : undefined; }
	if (doc.type === 'RECAPITULATIF') return `${base}/documents?apercu=recap`;
	if (doc.type === 'PLANNING') return `${base}/planning?apercu=planning`;
	if (doc.type === 'VISA_PLANNING') return `${base}/planning?apercu=visa`;
	return undefined;
}

export default async function PageDocuments({ params, searchParams }: Props) {
	await exigerPage();
	const { id } = await params;
	const { apercu, version, cr, 'corriger-cr': corrigerCr, pv } = await searchParams;
	const vue = await etatsDocumentsChantier(id);
	if (!vue) notFound();
	const planning = await lirePlanning(id);
	const e = etendueDuPlanning(planning!, versIso(dateParis(new Date())));
	const etendue = { debut: semaineDuRang(e.debut), fin: semaineDuRang(e.fin) };
	let apercuDocument: React.ReactNode = null;
	if (apercu === 'recap') {
		const { donnees } = await construireDonneesRecap(id);
		apercuDocument = <ApercuDocument titre={TITRES_TYPES.RECAPITULATIF} sousTitre={vue.reference} donnees={donnees} source={{ type: 'recap', chantierId: id }}
			chantierId={id} versions={await versionsDeLaSerie(id, SERIES.RECAPITULATIF)} />;
	} else if (cr || corrigerCr) {
		// Lien périmé ou d'un autre chantier : rien ne s'ouvre.
		const ouvert = cr === 'brouillon' ? await lireBrouillon(id) : await ouvrirCompteRendu(corrigerCr ?? cr ?? '', id, corrigerCr ? 'correction' : 'lecture');
		if (ouvert) apercuDocument = <ApercuCompteRendu key={`${ouvert.id}:${ouvert.mode}`} ouvert={ouvert} reference={vue.reference} />;
	} else if (pv) {
		const ouvert = await lireReceptionsOuvertes(id, pv);
		if (ouvert) apercuDocument = <ApercuReception key={ouvert.cible} ouvert={ouvert} reference={vue.reference} />;
	} else if (version) {
		const doc = await lireDocument(version);
		if (doc && doc.chantierId === id) {
			apercuDocument = (
				<ApercuDocument titre={`${TITRES_TYPES[doc.donnees.type]} — version ${doc.version}`} sousTitre={doc.nomFichier}
					donnees={doc.donnees} source={{ type: 'version', documentId: doc.id }}
					chantierId={id} versions={await versionsDeLaSerie(id, doc.serie)} retourActuel={retourActuel(id, doc)} />
			);
		}
	}
	return (
		<Ecran
			titre="Documents du chantier"
			sousTitre={<span className="eyebrow" data-testid="resume-documents">{texteResume(vue.resume)}</span>}
			actions={vue.resume.nombre
				? <a className="btn" href={`/api/chantiers/${id}/archive`} download><Icone.Telecharger />Tout télécharger</a>
				: <button type="button" className="btn" disabled title="Aucun document à télécharger"><Icone.Telecharger />Tout télécharger</button>}
		>
			<div className="doc-sections">
				<CartesDocuments vue={vue} etendue={etendue} attribues={vue.lots.filter((l) => l.entreprise).length} />
				<TableauDocuments vue={vue} />
				<AutresDocuments vue={vue} />
			</div>
			{apercuDocument}
		</Ecran>
	);
}
