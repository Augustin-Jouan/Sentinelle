import { ApercuDocument } from '@/composants/ApercuDocument';
import { TableauDocuments } from '@/composants/TableauDocuments';
import { construireDonneesRecap } from '@/documents/donnees';
import { etatsDocumentsChantier, lireDocument } from '@/documents/etats';
import { TITRES_TYPES } from '@/documents/libelles';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ apercu?: string; version?: string }> };

export default async function PageDocuments({ params, searchParams }: Props) {
	const { id } = await params;
	const { apercu, version } = await searchParams;
	const vue = await etatsDocumentsChantier(id);
	let apercuDocument: React.ReactNode = null;
	if (apercu === 'recap') {
		const { donnees } = await construireDonneesRecap(id);
		apercuDocument = <ApercuDocument titre={TITRES_TYPES.RECAPITULATIF} sousTitre={vue.reference} donnees={donnees} source={{ type: 'recap', chantierId: id }} />;
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
			<h2 className="text-lg font-semibold">Documents du chantier</h2>
			<TableauDocuments vue={vue} />
			{apercuDocument}
		</section>
	);
}
