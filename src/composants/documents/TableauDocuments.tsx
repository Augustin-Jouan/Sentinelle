import Decimal from 'decimal.js';
import Link from 'next/link';
import type { CaseAvenant, LigneDocuments, VueDocuments } from '@/documents/etats';
import type { ManqueAvenant } from '@/domaine/avenants';
import { formatEuros } from '@/domaine/montants';
import { dateDuJourTexte } from '@/domaine/regles';
import { ActionsLevee } from '../ActionsLevee';
import { BoutonMarchesManquants } from '../BoutonMarchesManquants';

const deux = (n: number) => String(n).padStart(2, '0');
/** « 02.04 » : le jour et le mois de la dernière version (courtDate de la maquette). */
const court = (iso: string) => dateDuJourTexte(new Date(iso)).slice(0, 5);
/** « + 3 720 € », « − 280 € » (signe() de la maquette : sans les centimes nuls). */
const signe = (v: string) => {
	const d = new Decimal(v);
	return `${d.isNegative() ? '−' : '+'} ${formatEuros(d.abs()).replace(',00\u00a0€', '\u00a0€')}`;
};
const MANQUES_CASE: Record<ManqueAvenant, string> = { entreprise: "pas d'entreprise", montantAvenant: 'montant nul' };
const modifie = <span className="pill pill-modif">modifié</span>;

function Fait({ href, titre, alerte, children, cas, etat }: { href: string; titre?: string; alerte?: boolean; children: React.ReactNode; cas: string; etat?: string }) {
	return <Link className={alerte ? 'dm-case est-alerte' : 'dm-case est-fait'} href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>;
}
function Manque({ href, titre, children, cas, etat }: { href?: string; titre?: string; children: React.ReactNode; cas: string; etat?: string }) {
	return href
		? <Link className="dm-case est-manque" href={href} scroll={false} title={titre} data-case={cas} data-etat={etat}>{children}</Link>
		: <span className="dm-case est-manque" title={titre} data-case={cas}>{children}</span>;
}

function CaseMarche({ base, l }: { base: string; l: LigneDocuments }) {
	const ouvrir = `${base}/marches?apercu=${l.lotId}`;
	const d = l.marche.versions[0];
	if (!d) return <Manque cas="marche" href={ouvrir} titre="Ouvrir le marché de ce lot pour le produire">+ Générer</Manque>;
	return (
		<span className="dm-pile">
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
	return <span className="dm-pile"><Fait cas="avenant" href={ouvrir}>{texte}</Fait>{a.etat === 'modifie' && modifie}</span>;
}

function CasesCertificats({ base, l }: { base: string; l: LigneDocuments }) {
	const visibles = l.certificats.slice(-2);
	return (
		<div className="dm-pile">
			{l.certificats.length > 2 && <span className="dm-plus">{l.certificats.length - 2} avant</span>}
			{visibles.map((c) => {
				const n = `n° ${deux(c.numero)}`;
				const d = c.versions[0];
				if (c.manuel || !d) return <span key={c.acompteId} className="dm-case est-hors" data-case="certificat">{`${n} · hors appli`}</span>;
				return (
					<span key={c.acompteId}>
						<Fait cas="certificat" href={`?version=${d.id}`} titre={`Certificat n° ${c.numero}`}>{c.versions.length > 1 ? `${n} · v${d.version}` : n}</Fait>
						{c.corrigeable && <span className="dm-sous"><Link className="dm-th-action" href={`${base}/marches?corriger=${c.acompteId}`}>Corriger</Link></span>}
					</span>
				);
			})}
			{l.certificatPossible
				? <Link className="dm-ajout" href={`${base}/marches?certificat=${l.lotId}`} title="Nouveau certificat de paiement" aria-label={`Nouveau certificat de paiement pour ${l.entreprise}`}>+</Link>
				: <span className="dm-ajout" aria-disabled="true" title="Lot sans entreprise ou sans montant">+</span>}
		</div>
	);
}

function CaseReception({ l }: { l: LigneDocuments }) {
	const r = l.reception!;
	if (!r.derniere) return <Manque cas="reception" etat={r.etat} href={`?pv=${l.lotId}`}>{r.texte}</Manque>;
	return (
		<span>
			<Fait cas="reception" etat={r.etat} href={`?version=${r.derniere.id}`} alerte={r.alerte}>{r.texte}</Fait>
			<span className="dm-sous">
				<Link className="dm-th-action" href={`?pv=${l.lotId}`} scroll={false}>Nouveau PV</Link>
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
		<div className="dm-cadre">
			<table className="dm">
				<thead><tr>
					<th scope="col" className="dm-lot">Lot et entreprise</th>
					<th scope="col">Marché{sansMarche > 0 && <> <BoutonMarchesManquants chantierId={vue.chantierId} forme="entete" texte={`Générer les ${sansMarche} manquants`} /></>}</th>
					<th scope="col">Avenants</th>
					<th scope="col">Certificats de paiement</th>
					<th scope="col">Réception{attribues > 1 && <> <Link className="dm-th-action" href="?pv=tous" scroll={false}>Tous les lots</Link></>}</th>
				</tr></thead>
				<tbody>
					{vue.lots.map((l) => {
						const st = l.nature === 'SOUS_TRAITANCE';
						const lot = (
							<th scope="row" className="dm-lot">
								<div className="dm-lot-in">
									<span className="dm-lot-n">{l.numero || (st ? 'ST' : '—')}</span>
									<span className="dm-lot-d">{l.designation || 'Lot sans désignation'}{st && <> <span className="nature-tag st">Sous-traitance</span></>}</span>
									<span className="dm-lot-e">{l.entreprise ?? <i>à attribuer</i>}</span>
								</div>
							</th>
						);
						if (!l.entreprise) {
							return <tr key={l.lotId} className="dm-inactif" data-lot={l.lotTexte}>{lot}<td colSpan={4} className="dm-note">Attribuez une entreprise depuis l&apos;écran Marchés pour produire ses documents.</td></tr>;
						}
						return (
							<tr key={l.lotId} data-lot={l.lotTexte}>
								{lot}
								<td><CaseMarche base={base} l={l} /></td>
								<td><div className="dm-pile">{l.avenants.length ? l.avenants.map((a) => <CaseAv key={a.avenantId} base={base} a={a} />) : <span className="dm-rien" aria-label="aucun">—</span>}</div></td>
								<td><CasesCertificats base={base} l={l} /></td>
								<td><CaseReception l={l} /></td>
							</tr>
						);
					})}
					{!vue.lots.length && <tr><td colSpan={5} className="dm-note">Ce chantier n&apos;a pas encore de lot.</td></tr>}
				</tbody>
			</table>
			<div className="dm-pied">
				<span className="dm-legende">
					<span className="dm-case est-fait">fait</span> s&apos;ouvre · <span className="dm-case est-manque">à produire</span> se produit · <span className="dm-case est-alerte">réserves</span> demande un suivi
				</span>
				<span>{attribues} entreprise{attribues > 1 ? 's' : ''} sur {vue.lots.length} lot{vue.lots.length > 1 ? 's' : ''}</span>
			</div>
		</div>
	);
}

/** Ce que le tableau ne range pas : les comptes rendus enregistrés (« Autres documents » de la maquette). */
export function AutresDocuments({ vue }: { vue: VueDocuments }) {
	const liste = vue.comptesRendus.liste;
	if (!liste.length) return null;
	return (
		<div className="dm-cadre">
			<div className="dm-autres-t">Autres documents</div>
			{liste.map((c) => {
				const d = c.versions[0];
				return (
					<div key={c.id} className="dm-autre">
						<Link className="doc-link" href={`?cr=${c.id}`} scroll={false}>{`Compte rendu n° ${deux(c.numero)}`}</Link>
						<span>
							{d ? `v${d.version} · ${c.date.replace(/\//g, '.')}` : c.date}
							{c.dernier && <> · <Link className="dm-th-action" href={`?corriger-cr=${c.id}`} scroll={false}>{`Corriger le n° ${deux(c.numero)}`}</Link></>}
						</span>
					</div>
				);
			})}
		</div>
	);
}
