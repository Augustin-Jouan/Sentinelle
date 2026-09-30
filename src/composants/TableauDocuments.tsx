import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import type { LigneDocuments, SerieDocuments, SerieVisa, VersionResume, VueDocuments } from '@/documents/etats';
import { LIBELLES_TYPES } from '@/documents/libelles';
import { dateDuJourTexte, LIBELLES_MANQUES } from '@/domaine/regles';
import { BoutonMarchesManquants } from './BoutonMarchesManquants';

const dateCourte = (iso: string) => dateDuJourTexte(new Date(iso));

function Historique({ versions }: { versions: VersionResume[] }) {
	if (!versions.length) return null;
	return (
		<details className="text-xs">
			<summary className="cursor-pointer text-muted-foreground">{versions.length} version{versions.length > 1 ? 's' : ''}</summary>
			<ul className="mt-1 space-y-0.5">
				{versions.map((v) => (
					<li key={v.id}>
						v{v.version} — {LIBELLES_TYPES[v.type]} — {dateCourte(v.creeLe)} — {v.auteur}{' · '}
						<a className="underline" href={`/api/documents/${v.id}/pdf`}>PDF</a>
					</li>
				))}
			</ul>
		</details>
	);
}

/** Planning prévisionnel : à produire, à jour ou modifié, comme le récapitulatif. */
function CartePlanning({ chantierId, serie }: { chantierId: string; serie: SerieDocuments }) {
	const derniere = serie.versions[0];
	return (
		<div data-serie="planning" className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">Chantier entier</p>
				<h3 className="font-semibold">Planning prévisionnel</h3>
				<p className="flex items-center gap-2 text-xs text-muted-foreground">
					{derniere ? `v${derniere.version} du ${dateCourte(derniere.creeLe)}` : 'Aucune version enregistrée'}
					{serie.etat === 'modifie' && <Badge variant="secondary">modifié</Badge>}
				</p>
				<Historique versions={serie.versions} />
			</div>
			<div className="ml-auto flex gap-2">
				{derniere && <Link href={`?version=${derniere.id}`} className={buttonVariants({ variant: 'outline' })}>Voir la v{derniere.version}</Link>}
				<Link href={`/chantiers/${chantierId}/planning?apercu=planning`} className={buttonVariants()}>Ouvrir le planning</Link>
			</div>
		</div>
	);
}

/** Visa : « périmé » quand une version du planning plus récente que la sienne existe. */
function CarteVisa({ chantierId, serie }: { chantierId: string; serie: SerieVisa }) {
	const derniere = serie.versions[0];
	return (
		<div data-serie="visa" className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">Chantier entier</p>
				<h3 className="font-semibold">Visa du planning</h3>
				<p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					{derniere ? (
						<>
							{`v${derniere.version} du ${dateCourte(derniere.creeLe)} — sur le planning v${serie.surVersion}`}
							{serie.etat === 'perime' && ` — v${serie.derniereVersionPlanning} disponible`}
						</>
					) : 'Aucune version enregistrée'}
					{serie.etat === 'perime' && <Badge variant="secondary">périmé</Badge>}
				</p>
				<Historique versions={serie.versions} />
			</div>
			<div className="ml-auto flex gap-2">
				{derniere && <Link href={`?version=${derniere.id}`} className={buttonVariants({ variant: 'outline' })}>Voir la v{derniere.version}</Link>}
				<Link href={`/chantiers/${chantierId}/planning?apercu=visa`} className={buttonVariants()}>Ouvrir la feuille de visa</Link>
			</div>
		</div>
	);
}

function CaseMarche({ chantierId, ligne }: { chantierId: string; ligne: LigneDocuments }) {
	const { marche, manques } = ligne;
	const derniere = marche.versions[0];
	const ouvrirEdition = `/chantiers/${chantierId}/marches?apercu=${ligne.lotId}`;
	if (marche.etat === 'a-produire') {
		return manques.length ? (
			<span className="inline-block rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground" title={manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}>
				à produire — {manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}
			</span>
		) : (
			<Link href={ouvrirEdition} className="inline-block rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent">à produire</Link>
		);
	}
	return (
		<span className="inline-flex items-center gap-2">
			<Link href={`?version=${derniere.id}`} className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
				v{derniere.version} · {dateCourte(derniere.creeLe)}
			</Link>
			{marche.etat === 'modifie' && (
				<>
					<Badge variant="secondary">modifié</Badge>
					<Link href={ouvrirEdition} className="text-xs underline">Régénérer</Link>
				</>
			)}
		</span>
	);
}

export function TableauDocuments({ vue }: { vue: VueDocuments }) {
	const recap = vue.recap;
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">Chantier entier</p>
					<h3 className="font-semibold">Récapitulatif des marchés</h3>
					<p className="text-xs text-muted-foreground">
						{recap.etat === 'a-produire' ? 'Aucune version enregistrée'
							: `v${recap.versions[0].version} du ${dateCourte(recap.versions[0].creeLe)}${recap.etat === 'modifie' ? ' — modifié depuis' : ''}`}
					</p>
					<Historique versions={recap.versions} />
				</div>
				<div className="ml-auto flex gap-2">
					<Link href="?apercu=recap" className={buttonVariants()}>Ouvrir le récapitulatif</Link>
					<a href={`/api/chantiers/${vue.chantierId}/recap-xlsx`} className={buttonVariants({ variant: 'outline' })}>Exporter le tableur</a>
					<BoutonMarchesManquants chantierId={vue.chantierId} />
				</div>
			</div>

			<CartePlanning chantierId={vue.chantierId} serie={vue.planning} />
			<CarteVisa chantierId={vue.chantierId} serie={vue.visa} />

			{vue.entreprises.map((groupe) => (
				<section key={groupe.entreprise ?? 'aucune'} className="rounded-xl border bg-card">
					<h3 className="border-b px-4 py-2 font-semibold">{groupe.entreprise ?? 'Lots à attribuer'}</h3>
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-muted-foreground"><th className="w-1/3 px-4 py-2">Lot</th><th className="px-4 py-2">Marché</th><th className="px-4 py-2">Historique</th></tr>
						</thead>
						<tbody>
							{groupe.lots.map((ligne) => (
								<tr key={ligne.lotId} data-lot={ligne.lotTexte} className="border-t">
									<td className="px-4 py-2">{ligne.lotTexte}</td>
									<td className="px-4 py-2"><CaseMarche chantierId={vue.chantierId} ligne={ligne} /></td>
									<td className="px-4 py-2"><Historique versions={ligne.marche.versions} /></td>
								</tr>
							))}
						</tbody>
					</table>
				</section>
			))}

			<p className="text-xs text-muted-foreground">
				Pointillé : à produire. Bleu : à jour, s&apos;ouvre en lecture seule. Pastille « modifié » : les données ont changé depuis la dernière version — régénérez-la.
				Pastille « périmé » : le visa fait signer une version du planning qui n&apos;est plus la dernière.
			</p>
		</div>
	);
}
