import { buttonVariants } from '@/components/ui/button';
import { ApercuDocument } from '@/composants/ApercuDocument';
import { BoutonMarchesManquants } from '@/composants/BoutonMarchesManquants';
import { TableauLots } from '@/composants/TableauLots';
import { construireDonneesMarche } from '@/documents/donnees';
import { TITRES_TYPES } from '@/documents/libelles';
import { lireVueMarches } from '@/donnees/marches';
import { LIBELLES_MANQUES } from '@/domaine/regles';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ apercu?: string }> };

export default async function PageMarches({ params, searchParams }: Props) {
	const { id } = await params;
	const { apercu } = await searchParams;
	const vue = await lireVueMarches(id);
	const lot = apercu ? vue.lots.find((l) => l.id === apercu) : undefined;
	const donnees = lot ? (await construireDonneesMarche(lot.id)).donnees : null;
	return (
		<section className="space-y-3">
			<h2 className="text-lg font-semibold">Marchés &amp; récapitulatif</h2>
			<TableauLots
				vue={vue}
				actions={(
					<>
						<BoutonMarchesManquants chantierId={id} />
						<a href={`/api/chantiers/${id}/recap-xlsx`} className={buttonVariants({ variant: 'outline' })}>Exporter le récap</a>
					</>
				)}
			/>
			{lot && donnees && (
				<ApercuDocument
					titre={TITRES_TYPES[donnees.type]}
					sousTitre={`Lot ${lot.numero ?? '—'} — ${lot.designation} — ${lot.entreprise ?? 'non attribué'}`}
					donnees={donnees}
					source={{ type: 'marche', lotId: lot.id }}
					manques={lot.manques.map((m) => LIBELLES_MANQUES[m])}
				/>
			)}
		</section>
	);
}
