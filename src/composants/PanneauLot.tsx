'use client';

import Decimal from 'decimal.js';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
import { attribuerArtisanAction, changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { Bloc } from '@/composants/briques/Bloc';
import { Bouton } from '@/composants/briques/Bouton';
import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
import { Cle, CleValeur, Valeur } from '@/composants/briques/CleValeur';
import { useConfirmation } from '@/composants/briques/Confirmation';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
import { Tableau } from '@/composants/briques/Tableau';
import { CHIFFRES } from '@/composants/briques/typo';
import { Vide } from '@/composants/briques/Vide';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie, formatTauxPoint, htEngage } from '@/domaine/montants';
import { artisansProposables } from '@/domaine/recherche';
import { LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';

type Avenant = LotVue['avenants'][number];
const NATURES = [{ v: 'GRE_A_GRE', t: 'Gré à gré' }, { v: 'SOUS_TRAITANCE', t: 'Sous-traitance' }] as const;
/** Le symbole ou le calcul qui suit un champ de la grille (ex-.unite, .calcule). */
const UNITE = 'ml-1.25 font-mono text-12 text-muted';
const CALCULE = 'ml-2.5 font-mono text-12 text-muted';
/** Une précision sous un champ (ex-.hint-inline). */
const Precision = ({ children }: { children: React.ReactNode }) => <div className="mt-0.75 text-11 text-faint">{children}</div>;
const dateFr = (iso: string) => iso.split('-').reverse().join('.');

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
				<Bouton variante="primaire" href={`?apercu=${lot.id}`} scroll={false} onClick={onFermer}><Icone.Doc />Ouvrir le marché</Bouton>
			) : (
				<Bouton onClick={() => toast(lot.artisanId
					? `Pour générer le marché : ${lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.`
					: "Attribuez d'abord une entreprise.")}>Ouvrir le marché</Bouton>
			)}
			{lot.artisanId && (lot.certificat.possible
				? <Bouton href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer}>Certificat de paiement</Bouton>
				: <Bouton onClick={() => toast(CERTIFICAT_IMPOSSIBLE)}>Certificat de paiement</Bouton>)}
			{lot.certificat.dernier && (
				<Bouton href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer}>
					{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
				</Bouton>
			)}
			{lot.artisanId && <Bouton href={`/chantiers/${vue.chantierId}/documents?pv=${lot.id}`} onClick={onFermer}>PV de réception</Bouton>}
			<Bouton variante="fantome" desactive={enCours} onClick={supprimerLot}>Supprimer le lot</Bouton>
		</>
	);

	return (
		<Panneau ouvert surtitre={lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'} titre={lot.designation || 'Désignation à saisir'}
			libelle={lot.designation || undefined} onFermer={onFermer} pied={pied}>
			<ChoixSegmente libelle="Nature du marché" options={NATURES} valeur={lot.nature} onChoisir={(n) => agir(() => changerNatureAction(lot.id, n))} />
			<p className="-mt-2 text-12 text-muted">Détermine le gabarit imprimé pour ce lot.</p>

			<Bloc titre="Entreprise" corps="colonne"
				action={artisan && <Bouton variante="fantome" taille="sm" href={`/artisans?fiche=${artisan.id}`}>Voir la fiche</Bouton>}>
				<MenuDeroulant id="dd-ent" k="Attribuée à" valeur={lot.artisanId ?? ''} recherche="Nom, commune…" largeur="pleine" desactive={enCours}
					options={options} onChoisir={(v) => agir(() => attribuerArtisanAction(lot.id, v || null))} />
				{artisan && (
					<>
						<CleValeur>
							<Cle>Adresse</Cle><Valeur>{artisan.adresse || '—'}</Valeur>
							<Cle>Commune</Cle><Valeur>{artisan.cp} {artisan.commune || '—'}</Valeur>
							<Cle>Interlocuteur</Cle><Valeur>{artisan.interlocuteur || <span className="text-faint">non renseigné</span>}</Valeur>
							<Cle>Téléphone</Cle><Valeur chiffres>{artisan.telephone || <span className="text-faint">—</span>}</Valeur>
						</CleValeur>
						<p className="text-12 text-muted">Ces lignes sont lues dans le référentiel au moment de l&apos;impression. Elles ne sont pas recopiées dans le marché.</p>
					</>
				)}
			</Bloc>

			<Bloc titre="Marché">
				<CleValeur>
					<Cle><label htmlFor="pl-ht">{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</label></Cle>
					<Valeur><ChampEnLigne id="pl-ht" variante="kv" libelle="Montant HT du marché" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></Valeur>
					{avecAvenants && (
						<><Cle>Avenants</Cle><Valeur chiffres moins={somme.isNegative()} data-testid="somme-avenants">{somme.isNegative() ? '−' : '+'} {formatEuros(somme.abs())}</Valeur></>
					)}
					<Cle><label htmlFor="pl-tva">T.V.A.</label></Cle>
					<Valeur><ChampEnLigne id="pl-tva" variante="kv-etroit" libelle="Taux de T.V.A." valeur={formatTauxPoint(lot.tauxTva)} enregistrer={champ('tauxTva')} /><span className={UNITE}>%</span></Valeur>
					<Cle><label htmlFor="pl-ttc">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</label></Cle>
					<Valeur>
						<ChampEnLigne id="pl-ttc" variante="kv" gras libelle="Montant TTC du marché" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
						{avecAvenants && <Precision>avenants compris : le montant initial HT est recalculé</Precision>}
					</Valeur>
					<Cle><label htmlFor="pl-rg">Retenue de garantie</label></Cle>
					<Valeur>
						<ChampEnLigne id="pl-rg" variante="kv-etroit" libelle="Taux de retenue de garantie" valeur={formatTauxPoint(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
						<span className={UNITE}>%</span>
						<span className={CALCULE}>{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
					</Valeur>
					<Cle>Exemplaires</Cle>
					<Valeur>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</Valeur>
					<Cle>Signé le</Cle>
					<Valeur>
						<ChampEnLigne variante="date" type="date" libelle="Date de signature de ce marché" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
						{!lot.dateSignature && <Precision>à défaut, {vue.dateSignatureChantier ? dateFr(vue.dateSignatureChantier) : 'non fixée'} — la date du chantier</Precision>}
					</Valeur>
				</CleValeur>
			</Bloc>

			<Bloc titre="Avenants" corps="nu"
				action={<Bouton taille="sm" desactive={enCours} aria-label="Ajouter un avenant" onClick={() => demarrer(async () => {
					const r = await ajouterAvenantAction(lot.id);
					if (r.ok) toast(r.donnees.message);
					else toast.error(r.erreur);
				})}>Ajouter</Bouton>}>
				{avecAvenants ? (
					<>
						<Tableau variante="mini">
							<thead><tr><th>N°</th><th>Devis</th><th data-droite>Montant HT</th><th>Date</th><th /></tr></thead>
							<tbody>
								{lot.avenants.map((a) => {
									const n = numeroAvenantTexte(a.numero);
									return (
										<tr key={a.id} data-avenant={n}>
											<td className={cx(CHIFFRES, 'text-muted')}>{n}</td>
											<td><ChampEnLigne variante="texte-mini" libelle={`Devis de l'avenant n° ${n}`} placeholder="n° devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
											<td data-droite><ChampEnLigne variante="montant" libelle={`Montant HT de l'avenant n° ${n}`} valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
											<td><ChampEnLigne variante="date" type="date" libelle={`Date de l'avenant n° ${n}`} valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
											<td data-droite data-actions>
												<Bouton taille="sm" seulIcone href={`?avenant=${a.id}`} scroll={false} onClick={onFermer}
													title={`Ouvrir l'avenant n° ${n}`} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}><Icone.Doc /></Bouton>
												<Bouton taille="sm" variante="danger" seulIcone desactive={enCours} onClick={() => supprimerAvenant(a)}
													title="Supprimer cet avenant" aria-label={`Supprimer l'avenant n° ${n}`}><Icone.Corbeille /></Bouton>
											</td>
										</tr>
									);
								})}
							</tbody>
						</Tableau>
						<p className="border-t border-rule px-3.5 pt-2.5 pb-3 text-11 leading-[1.45] text-muted">
							Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine&nbsp;; c&apos;est l&apos;avenant qui porte la différence.
						</p>
					</>
				) : (
					<Vide variante="mini">Aucun avenant. Le marché vaut son montant d&apos;origine.</Vide>
				)}
			</Bloc>
		</Panneau>
	);
}
