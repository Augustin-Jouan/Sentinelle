import Decimal from 'decimal.js';
import Link from 'next/link';
import { cx } from '@/composants/briques/cx';
import { Etiquette } from '@/composants/briques/Etiquette';
import { LienAction } from '@/composants/briques/LienAction';
import { Pastille } from '@/composants/briques/Pastille';
import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
import type { CaseAvenant, LigneDocuments, VueDocuments } from '@/documents/etats';
import type { ManqueAvenant } from '@/domaine/avenants';
import { formatEuros } from '@/domaine/montants';
import { dateDuJourTexte } from '@/domaine/regles';
import { ActionsLevee } from '../ActionsLevee';
import { BoutonMarchesManquants } from '../BoutonMarchesManquants';
import { CaseDocument } from './CaseDocument';

const deux = (n: number) => String(n).padStart(2, '0');
/** « 02.04 » : le jour et le mois de la dernière version (courtDate de la maquette). */
const court = (iso: string) => dateDuJourTexte(new Date(iso)).slice(0, 5);
/** « + 3 720 € », « − 280 € » (signe() de la maquette : sans les centimes nuls). */
const signe = (v: string) => {
	const d = new Decimal(v);
	return `${d.isNegative() ? '−' : '+'} ${formatEuros(d.abs()).replace(',00\u00a0€', '\u00a0€')}`;
};
const MANQUES_CASE: Record<ManqueAvenant, string> = { entreprise: "pas d'entreprise", montantAvenant: 'montant nul' };
const modifie = <Pastille className="ml-1">modifié</Pastille>;
/** Des cases côte à côte, qui passent à la ligne (ex-.dm-pile). */
const PILE = 'flex flex-wrap items-center gap-1';
/** Les actions secondaires sous une case : Corriger, Nouveau PV, Réserves levées (ex-.dm-sous). */
const SOUS = 'mt-0.75 flex gap-2';

function Fait({ href, titre, alerte, children, cas, etat }: { href: string; titre?: string; alerte?: boolean; children: React.ReactNode; cas: string; etat?: string }) {
	return <CaseDocument ton={alerte ? 'alerte' : 'fait'} href={href} titre={titre} cas={cas} etat={etat}>{children}</CaseDocument>;
}
function Manque({ href, titre, children, cas, etat }: { href?: string; titre?: string; children: React.ReactNode; cas: string; etat?: string }) {
	return <CaseDocument ton="manque" href={href} titre={titre} cas={cas} etat={href ? etat : undefined}>{children}</CaseDocument>;
}

function CaseMarche({ base, l }: { base: string; l: LigneDocuments }) {
	const ouvrir = `${base}/marches?apercu=${l.lotId}`;
	const d = l.marche.versions[0];
	if (!d) return <Manque cas="marche" href={ouvrir} titre="Ouvrir le marché de ce lot pour le produire">+ Générer</Manque>;
	return (
		<span className={PILE}>
			<Fait cas="marche" href={ouvrir} titre={l.marche.versions.length > 1 ? `${l.marche.versions.length} versions — la dernière s'ouvre` : undefined}>{`v${d.version} · ${court(d.creeLe)}`}</Fait>
			{l.marche.etat === 'modifie' && modifie}
		</span>
	);
}

function CaseAv({ base, a }: { base: string; a: CaseAvenant }) {
	const texte = `n° ${deux(a.numero)} · ${signe(a.montantHt)}`;
	const ouvrir = `${base}/marches?avenant=${a.avenantId}`;
	if (a.etat === 'a-produire') {
		return a.manques.length
			? <Manque cas="avenant">{`n° ${deux(a.numero)} · ${a.manques.map((m) => MANQUES_CASE[m]).join(', ')}`}</Manque>
			: <Manque cas="avenant" href={ouvrir} titre="Cet avenant n'a pas encore été enregistré dans les documents">{`${texte} à éditer`}</Manque>;
	}
	return <span className={PILE}><Fait cas="avenant" href={ouvrir}>{texte}</Fait>{a.etat === 'modifie' && modifie}</span>;
}

/** Le « + » d'un nouveau certificat (ex-.dm-ajout) : en ligne, la case suit la hauteur de son texte. */
const AJOUT = 'rounded-[6px] border border-dashed border-rule-strong text-14 leading-none text-ink-2 no-underline hover:border-accent hover:text-accent-2';

function CasesCertificats({ base, l }: { base: string; l: LigneDocuments }) {
	const visibles = l.certificats.slice(-2);
	return (
		<div className={PILE}>
			{l.certificats.length > 2 && <span className="text-11 text-muted">{l.certificats.length - 2} avant</span>}
			{visibles.map((c) => {
				const n = `n° ${deux(c.numero)}`;
				const d = c.versions[0];
				if (c.manuel || !d) return <CaseDocument key={c.acompteId} ton="hors" cas="certificat">{`${n} · hors appli`}</CaseDocument>;
				return (
					<span key={c.acompteId}>
						<Fait cas="certificat" href={`?version=${d.id}`} titre={`Certificat n° ${c.numero}`}>{c.versions.length > 1 ? `${n} · v${d.version}` : n}</Fait>
						{c.corrigeable && <span className={SOUS}><LienAction href={`${base}/marches?corriger=${c.acompteId}`}>Corriger</LienAction></span>}
					</span>
				);
			})}
			{l.certificatPossible
				? <Link className={cx(AJOUT, 'cursor-pointer')} href={`${base}/marches?certificat=${l.lotId}`} title="Nouveau certificat de paiement" aria-label={`Nouveau certificat de paiement pour ${l.entreprise}`}>+</Link>
				: <span className={cx(AJOUT, 'cursor-not-allowed opacity-40')} aria-disabled="true" title="Lot sans entreprise ou sans montant">+</span>}
		</div>
	);
}

function CaseReception({ l }: { l: LigneDocuments }) {
	const r = l.reception!;
	if (!r.derniere) return <Manque cas="reception" etat={r.etat} href={`?pv=${l.lotId}`}>{r.texte}</Manque>;
	return (
		<span>
			<Fait cas="reception" etat={r.etat} href={`?version=${r.derniere.id}`} alerte={r.alerte}>{r.texte}</Fait>
			<span className={SOUS}>
				<LienAction href={`?pv=${l.lotId}`} scroll={false}>Nouveau PV</LienAction>
				<ActionsLevee lotId={l.lotId} etat={r.etat} />
			</span>
		</span>
	);
}

export function TableauDocuments({ vue }: { vue: VueDocuments }) {
	const base = `/chantiers/${vue.chantierId}`;
	const attribues = vue.lots.filter((l) => l.entreprise).length;
	const sansMarche = vue.lots.filter((l) => l.entreprise && l.marche.etat === 'a-produire').length;
	return (
		<CadreTableau>
			<Tableau variante="dm">
				<thead><tr>
					<th scope="col" data-premiere>Lot et entreprise</th>
					<th scope="col">Marché{sansMarche > 0 && <> <BoutonMarchesManquants chantierId={vue.chantierId} forme="entete" texte={`Générer les ${sansMarche} manquants`} /></>}</th>
					<th scope="col">Avenants</th>
					<th scope="col">Certificats de paiement</th>
					<th scope="col">Réception{attribues > 1 && <> <LienAction className="ml-1.5" href="?pv=tous" scroll={false}>Tous les lots</LienAction></>}</th>
				</tr></thead>
				<tbody>
					{vue.lots.map((l) => {
						const st = l.nature === 'SOUS_TRAITANCE';
						const inactif = !l.entreprise;
						const lot = (
							<th scope="row" data-premiere>
								{/* La grille vit dans un bloc intérieur : posée sur la cellule, elle la sortait du tableau. */}
								<div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-1">
									<span className="row-[1/3] pt-0.5 font-mono text-11 text-muted">{l.numero || (st ? 'ST' : '—')}</span>
									<span className={cx('text-14 font-medium', inactif && 'text-muted')}>
										{l.designation || 'Lot sans désignation'}{st && <> <Etiquette ton="accent" taille="mini" className="ml-1 align-[1px]">Sous-traitance</Etiquette></>}
									</span>
									<span className="text-12 text-muted">{l.entreprise ?? <i>à attribuer</i>}</span>
								</div>
							</th>
						);
						if (inactif) {
							return <tr key={l.lotId} data-lot={l.lotTexte}>{lot}<td colSpan={4} className="text-12 italic text-muted">Attribuez une entreprise depuis l&apos;écran Marchés pour produire ses documents.</td></tr>;
						}
						return (
							<tr key={l.lotId} data-lot={l.lotTexte}>
								{lot}
								<td><CaseMarche base={base} l={l} /></td>
								<td><div className={PILE}>{l.avenants.length ? l.avenants.map((a) => <CaseAv key={a.avenantId} base={base} a={a} />) : <span className="text-faint" aria-label="aucun">—</span>}</div></td>
								<td><CasesCertificats base={base} l={l} /></td>
								<td><CaseReception l={l} /></td>
							</tr>
						);
					})}
					{!vue.lots.length && <tr><td colSpan={5} className="text-12 italic text-muted">Ce chantier n&apos;a pas encore de lot.</td></tr>}
				</tbody>
			</Tableau>
			<div className="flex flex-wrap justify-between gap-4 border-t border-rule bg-surface px-4 py-2.5 text-12 text-muted">
				<span>
					<CaseDocument ton="fait" taille="legende">fait</CaseDocument> s&apos;ouvre · <CaseDocument ton="manque" taille="legende">à produire</CaseDocument> se produit · <CaseDocument ton="alerte" taille="legende">réserves</CaseDocument> demande un suivi
				</span>
				<span>{attribues} entreprise{attribues > 1 ? 's' : ''} sur {vue.lots.length} lot{vue.lots.length > 1 ? 's' : ''}</span>
			</div>
		</CadreTableau>
	);
}

/** Ce que le tableau ne range pas : les comptes rendus enregistrés (« Autres documents » de la maquette). */
export function AutresDocuments({ vue }: { vue: VueDocuments }) {
	const liste = vue.comptesRendus.liste;
	if (!liste.length) return null;
	return (
		<CadreTableau>
			<div className="border-b border-rule bg-surface px-4 py-2.5 font-titre text-11 font-semibold tracking-capitales uppercase text-muted">Autres documents</div>
			{liste.map((c) => {
				const d = c.versions[0];
				return (
					<div key={c.id} className="flex justify-between border-b border-rule px-4 py-2 text-13 last:border-b-0">
						<Link className="font-medium text-accent-2 no-underline hover:underline" href={`?cr=${c.id}`} scroll={false}>{`Compte rendu n° ${deux(c.numero)}`}</Link>
						<span className="font-mono text-12 text-muted">
							{d ? `v${d.version} · ${c.date.replace(/\//g, '.')}` : c.date}
							{c.dernier && <> · <LienAction href={`?corriger-cr=${c.id}`} scroll={false}>{`Corriger le n° ${deux(c.numero)}`}</LienAction></>}
						</span>
					</div>
				);
			})}
		</CadreTableau>
	);
}
