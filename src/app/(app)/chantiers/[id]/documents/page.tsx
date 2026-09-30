import { ApercuCompteRendu } from '@/composants/ApercuCompteRendu';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { TableauDocuments } from '@/composants/TableauDocuments';
import { construireDonneesRecap } from '@/documents/donnees';
import { etatsDocumentsChantier, lireDocument, type VueDocuments } from '@/documents/etats';
import { TITRES_TYPES } from '@/documents/libelles';
import { lireBrouillon, ouvrirCompteRendu } from '@/donnees/comptesRendus';
import { dateDuJourTexte } from '@/domaine/regles';

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ apercu?: string; version?: string; cr?: string; 'corriger-cr'?: string }>;
};

/** « 23 documents · dernier le 06/10/2026 » (spec § 7). */
function texteResume({ nombre, dernierLe }: VueDocuments['resume']): string {
	if (!nombre || !dernierLe) return 'Aucun document produit pour ce chantier.';
	return `${nombre} document${nombre > 1 ? 's' : ''} · dernier le ${dateDuJourTexte(new Date(dernierLe)).replace(/\./g, '/')}`;
}

export default async function PageDocuments({ params, searchParams }: Props) {
	const { id } = await params;
	const { apercu, version, cr, 'corriger-cr': corrigerCr } = await searchParams;
	const vue = await etatsDocumentsChantier(id);
	let apercuDocument: React.ReactNode = null;
	if (apercu === 'recap') {
		const { donnees } = await construireDonneesRecap(id);
		apercuDocument = <ApercuDocument titre={TITRES_TYPES.RECAPITULATIF} sousTitre={vue.reference} donnees={donnees} source={{ type: 'recap', chantierId: id }} />;
	} else if (cr || corrigerCr) {
		// Lien périmé ou d'un autre chantier : rien ne s'ouvre.
		const ouvert = cr === 'brouillon' ? await lireBrouillon(id) : await ouvrirCompteRendu(corrigerCr ?? cr ?? '', id, corrigerCr ? 'correction' : 'lecture');
		if (ouvert) apercuDocument = <ApercuCompteRendu key={`${ouvert.id}:${ouvert.mode}`} ouvert={ouvert} reference={vue.reference} />;
	} else if (version) {
		const doc = await lireDocument(version);
		if (doc && doc.chantierId === id) {
			apercuDocument = (
				<ApercuDocument titre={`${TITRES_TYPES[doc.donnees.type]} — version ${doc.version}`} sousTitre={doc.nomFichier}
					donnees={doc.donnees} source={{ type: 'version', documentId: doc.id }} />
			);
		}
	}
	return (
		<section className="space-y-4">
			<div className="flex flex-wrap items-end gap-4">
				<div>
					<h2 className="text-lg font-semibold">Documents du chantier</h2>
					<p data-testid="resume-documents" className="text-sm text-muted-foreground">{texteResume(vue.resume)}</p>
				</div>
			</div>
			<TableauDocuments vue={vue} />
			{apercuDocument}
		</section>
	);
}
