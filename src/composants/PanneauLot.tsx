'use client';

import Decimal from 'decimal.js';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
import { attribuerArtisanAction, changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { useConfirmation } from '@/composants/briques/Confirmation';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie, formatTauxPoint, htEngage } from '@/domaine/montants';
import { artisansProposables } from '@/domaine/recherche';
import { LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';

type Avenant = LotVue['avenants'][number];
const NATURES = [['GRE_A_GRE', 'Gré à gré'], ['SOUS_TRAITANCE', 'Sous-traitance']] as const;
const dateFr = (iso: string) => iso.split('-').reverse().join('.');
const note = { margin: 0, fontSize: '0.75rem', color: 'var(--muted)' } as const;

export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarches; onFermer: () => void }) {
	const [enCours, demarrer] = useTransition();
	const confirmer = useConfirmation();
	const artisan = vue.artisans.find((a) => a.id === lot.artisanId);
	const champ = (c: 'montantHt' | 'tauxTva' | 'montantTtc' | 'retenueGarantie' | 'dateSignature') => modifierChampLotAction.bind(null, lot.id, c);
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, apres?: () => void) => demarrer(async () => {
		const r = await fn();
		if (r.ok) apres?.();
		else toast.error(r.erreur);
	});
	const avecAvenants = lot.avenants.length > 0;
	const somme = new Decimal(lot.sommeAvenants);

	const options = [
		{ v: '', t: '— non attribué —' }, { sep: true as const },
		...artisansProposables(vue.artisans, lot.artisanId).map((a) => ({ v: a.id, t: `${a.nom}${a.actif ? '' : ' (archivée)'}`, meta: a.commune })),
	];

	async function supprimerAvenant(a: Avenant) {
		const autres = lot.avenants.filter((x) => x.id !== a.id);
		if (!(await confirmer({ texte: confirmationSuppression(a.numero, lot.htInitial, autres), libelle: 'Supprimer', dangereux: true }))) return;
		agir(() => supprimerAvenantAction(a.id));
	}

	async function supprimerLot() {
		const oui = await confirmer({
			texte: <>Supprimer le lot <b>{lot.numero || lot.designation}</b>&nbsp;? Ses périodes du planning partiront avec lui.</>,
			libelle: 'Supprimer', dangereux: true,
		});
		if (oui) agir(() => supprimerLotAction(lot.id), () => { onFermer(); toast('Lot supprimé.'); });
	}

	const pied = (
		<>
			{lot.manques.length === 0 ? (
				<Link className="btn btn-primary" href={`?apercu=${lot.id}`} scroll={false} onClick={onFermer}><Icone.Doc />Ouvrir le marché</Link>
			) : (
				<button type="button" className="btn" onClick={() => toast(lot.artisanId
					? `Pour générer le marché : ${lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.`
					: "Attribuez d'abord une entreprise.")}>Ouvrir le marché</button>
			)}
			{lot.artisanId && (lot.certificat.possible
				? <Link className="btn" href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer}>Certificat de paiement</Link>
				: <button type="button" className="btn" onClick={() => toast(CERTIFICAT_IMPOSSIBLE)}>Certificat de paiement</button>)}
			{lot.certificat.dernier && (
				<Link className="btn" href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer}>
					{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
				</Link>
			)}
			{lot.artisanId && <Link className="btn" href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer}>PV de réception</Link>}
			<button type="button" className="btn btn-ghost" disabled={enCours} onClick={supprimerLot}>Supprimer le lot</button>
		</>
	);

	return (
		<Panneau ouvert surtitre={lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'} titre={lot.designation || 'Désignation à saisir'}
			libelle={lot.designation || undefined} onFermer={onFermer} pied={pied}>
			<div className="radio-row" role="radiogroup" aria-label="Nature du marché">
				{NATURES.map(([n, t]) => (
					<label key={n} role="radio" aria-checked={lot.nature === n} tabIndex={0} className={lot.nature === n ? 'is-on' : undefined}
						onClick={() => lot.nature !== n && agir(() => changerNatureAction(lot.id, n))}
						onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && lot.nature !== n) { e.preventDefault(); agir(() => changerNatureAction(lot.id, n)); } }}>
						{t}
					</label>
				))}
			</div>
			<p style={{ margin: '-0.5rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>Détermine le gabarit imprimé pour ce lot.</p>

			<div className="block">
				<div className="block-head">
					<span className="eyebrow">Entreprise</span>
					{artisan && <Link className="btn btn-ghost btn-sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Link>}
				</div>
				<div className="block-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
					<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" classe="dd-plein" desactive={enCours}
						options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
					{artisan && (
						<>
							<dl className="kv">
								<dt>Adresse</dt><dd>{artisan.adresse || '—'}</dd>
								<dt>Commune</dt><dd>{artisan.cp} {artisan.commune || '—'}</dd>
								<dt>Interlocuteur</dt><dd>{artisan.interlocuteur || <span className="dash">non renseigné</span>}</dd>
								<dt>Téléphone</dt><dd className="num">{artisan.telephone || <span className="dash">—</span>}</dd>
							</dl>
							<p style={note}>Ces lignes sont lues dans le référentiel au moment de l&apos;impression. Elles ne sont pas recopiées dans le marché.</p>
						</>
					)}
				</div>
			</div>

			<div className="block">
				<div className="block-head"><span className="eyebrow">Marché</span></div>
				<div className="block-body">
					<dl className="kv">
						<dt><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></dt>
						<dd><ChampEnLigne id="pl-ht" variante="kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
						{avecAvenants && (
							<><dt>Avenants</dt><dd className={somme.isNegative() ? 'num moins' : 'num'} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</dd></>
						)}
						<dt><label htmlFor="pl-tva">T.V.A.</label></dt>
						<dd><ChampEnLigne id="pl-tva" variante="kv-etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className="unite">%</span></dd>
						<dt><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></dt>
						<dd>
							<ChampEnLigne id="pl-ttc" variante="kv" gras libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
							{avecAvenants && <span className="hint-inline">avenants compris : le montant initial HT est recalculé</span>}
						</dd>
						<dt><label htmlFor="pl-rg">Retenue de garantie</label></dt>
						<dd>
							<ChampEnLigne id="pl-rg" variante="kv-etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
							<span className="unite">%</span>
							<span className="calcule">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
						</dd>
						<dt>Exemplaires</dt>
						<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
						<dt>Signé le</dt>
						<dd>
							<ChampEnLigne variante="date" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
							{!lot.dateSignature && <span className="hint-inline">à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</span>}
						</dd>
					</dl>
				</div>
			</div>

			<div className="block">
				<div className="block-head">
					<span className="eyebrow">Avenants</span>
					<button type="button" className="btn btn-sm" disabled={enCours} aria-label="Ajouter un avenant" onClick={() => demarrer(async () => {
						const r = await ajouterAvenantAction(lot.id);
						if (r.ok) toast(r.donnees.message);
						else toast.error(r.erreur);
					})}>Ajouter</button>
				</div>
				<div className="block-body" style={{ padding: 0 }}>
					{avecAvenants ? (
						<>
							<table className="plain plain-mini">
								<thead><tr><th>N°</th><th>Devis</th><th className="ta-r">Montant HT</th><th>Date</th><th /></tr></thead>
								<tbody>
									{lot.avenants.map((a) => {
										const n = numeroAvenantTexte(a.numero);
										return (
											<tr key={a.id} data-avenant={n}>
												<td className="num" style={{ color: 'var(--muted)' }}>{n}</td>
												<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
												<td className="ta-r is-editable"><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
												<td><ChampEnLigne variante="date" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
												<td className="ta-r cell-actions nowrap">
													<Link className="btn btn-sm btn-ico" href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
														title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Link>
													<button type="button" className="btn btn-sm btn-danger btn-ico" disabled={enCours} onClick={() => supprimerAvenant(a)}
														title="Supprimer cet avenant" aria-label={`Supprimer l'avenant n° ${n}`}><Icone.Corbeille /></button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
							<p className="av-note">Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine&nbsp;; c&apos;est l&apos;avenant qui porte la différence.</p>
						</>
					) : (
						<p className="vide-mini">Aucun avenant. Le marché vaut son montant d&apos;origine.</p>
					)}
				</div>
			</div>
		</Panneau>
	);
}
