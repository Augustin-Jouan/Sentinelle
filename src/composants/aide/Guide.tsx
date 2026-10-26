import Link from 'next/link';
import { lireBlocs, type Bloc, type Ligne } from '@/aide/blocs';
import DIMENSIONS from '@/aide/dimensions.json';
import { ecran, PARTIES_ECRANS, type IdEcran } from '@/aide/ecrans';
import { PARTIES_TACHES } from '@/aide/taches';
import { Ecran } from '@/composants/briques/Ecran';
import * as Icone from '@/composants/briques/icones';
import { BarreOnglets, Onglet } from '@/composants/briques/Onglet';
import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
import { SURTITRE } from '@/composants/briques/typo';

export type OngletAide = 'quoi' | 'comment';

const ONGLETS: { id: OngletAide; href: string; texte: string; icone: React.ReactNode }[] = [
	{ id: 'quoi', href: '/aide', texte: 'Écran par écran', icone: <Icone.Loupe /> },
	{ id: 'comment', href: '/aide/comment-faire', texte: 'Comment faire', icone: <Icone.Coche /> },
];

/** Le lien d'une ancre ou d'une page, souligné au survol. */
const LIEN = 'text-accent-2 underline-offset-2 hover:underline';
/** En deçà (en pixels d'affichage), une capture laisse la place à sa légende à côté d'elle. */
const ETROITE = 800;
/** Un titre de section qu'une ancre atteint sous la barre collée en haut. */
const ANCRE = 'scroll-mt-20';

/** Le guide d'utilisation : deux onglets, un sommaire à gauche, le contenu à droite. */
export function Guide({ onglet }: { onglet: OngletAide }) {
	const sommaire: EntreeSommaire[] = onglet === 'quoi'
		? PARTIES_ECRANS.map((p, i) => ({ id: `partie-${i + 1}`, titre: p.titre, liens: p.ecrans.map((e) => ({ id: e.id, titre: e.titre })) }))
		: PARTIES_TACHES.map((p, i) => ({ id: `partie-${i + 1}`, titre: p.titre, liens: p.taches.map((t) => ({ id: t.id, titre: t.titre })) }));
	return (
		<Ecran titre="Aide — guide d'utilisation" contexte={(
			<BarreOnglets libelle="Parties du guide">
				{ONGLETS.map((o) => <Onglet key={o.id} href={o.href} actif={o.id === onglet} icone={o.icone}>{o.texte}</Onglet>)}
			</BarreOnglets>
		)}>
			<div className="grid grid-cols-[15rem_minmax(0,1fr)] gap-10 max-etroit:grid-cols-1 max-etroit:gap-6">
				{/* Large : le sommaire suit la lecture. Étroit : replié au-dessus du contenu, pour ne pas le repousser. */}
				<nav aria-label="Sommaire" className="sticky top-20 max-h-[calc(100vh-6rem)] self-start overflow-y-auto max-etroit:hidden">
					<Sommaire parties={sommaire} />
				</nav>
				<details className="rounded-md border border-rule bg-raise px-3.5 py-2.5 etroit:hidden">
					<summary className={`${SURTITRE} cursor-pointer`}>Sommaire</summary>
					<nav aria-label="Sommaire" className="mt-3"><Sommaire parties={sommaire} /></nav>
				</details>
				<article className="flex min-w-0 flex-col gap-10">
					{onglet === 'quoi' ? <QuoiFaitQuoi /> : <CommentFaire />}
				</article>
			</div>
		</Ecran>
	);
}

type EntreeSommaire = { id: string; titre: string; liens: { id: string; titre: string }[] };

function Sommaire({ parties }: { parties: EntreeSommaire[] }) {
	return (
		<ol className="flex flex-col gap-3 text-13">
			{parties.map((p) => (
				<li key={p.id}>
					<a className="font-semibold text-ink no-underline hover:text-accent-2" href={`#${p.id}`}>{p.titre}</a>
					{p.liens.length > 0 && (
						<ol className="mt-1 flex flex-col gap-0.75 border-l border-rule pl-3">
							{p.liens.map((l) => <li key={l.id}><a className="text-muted no-underline hover:text-accent-2" href={`#${l.id}`}>{l.titre}</a></li>)}
						</ol>
					)}
				</li>
			))}
		</ol>
	);
}

function QuoiFaitQuoi() {
	return (
		<>
			<p className="text-14 text-ink-2">
				Chaque écran de Sentinelle, avec un numéro rouge sur chaque élément et, à côté ou juste dessous, ce qu&apos;il fait.
				Pour enchaîner les actions d&apos;une tâche (créer un chantier, générer un marché, faire un PV…),
				voir <Link className={LIEN} href="/aide/comment-faire">Comment faire</Link>, qui renvoie à ces mêmes numéros.
			</p>
			{PARTIES_ECRANS.map((partie, i) => (
				<section key={partie.titre} className="flex flex-col gap-8">
					<h2 id={`partie-${i + 1}`} className={`${ANCRE} border-b border-rule pb-1.5 text-22`}>{partie.titre}</h2>
					{partie.ecrans.map((e) => (
						<section key={e.id} className="flex flex-col gap-3">
							<h3 id={e.id} className={`${ANCRE} text-18 font-semibold`}>{e.titre}</h3>
							<p className="text-14 text-muted">{e.intro}</p>
							{/* Une capture étroite (un menu, un formulaire) a sa légende à côté ; les autres, dessous. */}
							<div className={DIMENSIONS[e.id].largeur <= ETROITE ? 'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-6 max-etroit:grid-cols-1' : 'flex flex-col gap-3'}>
								<Capture id={e.id} />
								<CadreTableau>
									<Tableau variante="mini">
										<thead><tr><th className="w-12">N°</th><th>Élément</th><th>À quoi il sert</th></tr></thead>
										<tbody>
											{e.reperes.map((r, n) => (
												<tr key={r.element}>
													<td><Numero n={n + 1} /></td>
													<td className="font-medium whitespace-nowrap max-etroit:whitespace-normal">{r.element}</td>
													<td className="text-ink-2">{r.role}</td>
												</tr>
											))}
										</tbody>
									</Tableau>
								</CadreTableau>
							</div>
						</section>
					))}
				</section>
			))}
		</>
	);
}

function CommentFaire() {
	return (
		<>
			<p className="text-14 text-ink-2">
				Les tâches courantes, pas à pas. Les numéros entourés — ①, ②, ③… — renvoient aux pastilles rouges de la capture
				qui précède ; chaque élément est expliqué dans <Link className={LIEN} href="/aide">Écran par écran</Link>.
			</p>
			{PARTIES_TACHES.map((partie, i) => (
				<section key={partie.titre} className="flex flex-col gap-8">
					<h2 id={`partie-${i + 1}`} className={`${ANCRE} border-b border-rule pb-1.5 text-22`}>{partie.titre}</h2>
					{partie.intro && <Blocs blocs={lireBlocs(partie.intro)} />}
					{partie.taches.map((t) => (
						<section key={t.id} className="flex flex-col gap-3">
							<h3 id={t.id} className={`${ANCRE} text-18 font-semibold`}>{t.titre}</h3>
							<Blocs blocs={lireBlocs(t.texte)} />
						</section>
					))}
				</section>
			))}
		</>
	);
}

function Blocs({ blocs }: { blocs: Bloc[] }) {
	return (
		<div className="flex flex-col gap-3 text-14 leading-relaxed">
			{blocs.map((b, i) => {
				switch (b.type) {
					case 'paragraphe': return <p key={i}><Texte ligne={b.ligne} /></p>;
					case 'etapes': return (
						<ol key={i} start={b.debut} className="flex list-decimal flex-col gap-1.5 pl-6 marker:font-mono marker:text-muted">
							{b.items.map((l, j) => <li key={j} className="pl-1"><Texte ligne={l} /></li>)}
						</ol>
					);
					case 'puces': return (
						<ul key={i} className="flex list-disc flex-col gap-1.5 pl-6 marker:text-muted">
							{b.items.map((l, j) => <li key={j} className="pl-1"><Texte ligne={l} /></li>)}
						</ul>
					);
					case 'capture': return <Capture key={i} id={b.ecran} legende />;
				}
			})}
		</div>
	);
}

function Texte({ ligne }: { ligne: Ligne }) {
	return ligne.map((m, i) => {
		const contenu = m.gras ? <strong className="font-semibold text-ink">{m.texte}</strong> : m.texte;
		if (!m.lien) return <span key={i}>{contenu}</span>;
		return m.lien.startsWith('#')
			? <a key={i} className={LIEN} href={m.lien}>{contenu}</a>
			: <Link key={i} className={LIEN} href={m.lien}>{contenu}</Link>;
	});
}

/** Le numéro d'une pastille, rouge comme sur la capture. */
function Numero({ n }: { n: number }) {
	return <span className="inline-grid size-5.5 place-items-center rounded-full bg-danger font-mono text-11 font-semibold text-paper">{n}</span>;
}

/**
 * La capture d'un écran, ses pastilles comprises, à sa taille réelle sans dépasser la colonne ; un clic l'ouvre
 * seule. Dans « Comment faire », un lien sous l'image mène aux légendes de ses numéros.
 * Une simple <img> : les captures sont derrière la connexion (proxy.ts), et l'optimiseur de next/image les
 * demanderait au serveur sans le cookie de session.
 */
function Capture({ id, legende = false }: { id: IdEcran; legende?: boolean }) {
	const { titre } = ecran(id);
	const src = `/guide/${id}.webp`;
	const { largeur, hauteur } = DIMENSIONS[id];
	return (
		<figure className="flex flex-col items-start gap-1.5">
			<a href={src} target="_blank" rel="noopener" title="Ouvrir la capture seule" className="max-w-full">
				{/* eslint-disable-next-line @next/next/no-img-element -- voir le commentaire du composant */}
				<img src={src} alt={`${titre}, repères numérotés`} width={largeur} height={hauteur} loading="lazy" decoding="async"
					className="h-auto max-w-full rounded-md border border-rule bg-raise shadow-ombre" />
			</a>
			{legende && (
				<figcaption className={SURTITRE}>
					{titre} — <Link className={`${LIEN} normal-case`} href={`/aide#${id}`}>la légende de chaque numéro</Link>
				</figcaption>
			)}
		</figure>
	);
}
