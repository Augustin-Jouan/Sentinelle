'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterLotAction, modifierChampLotAction } from '@/actions/lots';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { usePreference } from '@/composants/briques/preference';
import { Recherche } from '@/composants/briques/Recherche';
import type { VueMarches } from '@/donnees/marches';
import { lotsVisibles, TRIS_LOTS, type TriLots } from '@/domaine/lots';
import { formatMontantSaisie, formatTauxPoint } from '@/domaine/montants';
import { ChampEnLigne } from './ChampEnLigne';
import { PanneauLot } from './PanneauLot';

const estTri = (v: unknown): v is TriLots => TRIS_LOTS.some((t) => t.v === v);

const OUVRIR_LOT = 'sentinelle:ouvrir-lot';

/** « Ajouter un lot » de la barre de titre (rendue par la page) : crée le lot, puis demande au tableau d'ouvrir son panneau. */
export function BoutonAjouterLot({ chantierId }: { chantierId: string }) {
	const [enCours, demarrer] = useTransition();
	return (
		<button type="button" className="btn" disabled={enCours} onClick={() => demarrer(async () => {
			const r = await ajouterLotAction(chantierId);
			if (!r.ok) { toast.error(r.erreur); return; }
			window.dispatchEvent(new CustomEvent(OUVRIR_LOT, { detail: r.donnees.id }));
		})}>
			<Icone.Plus />Ajouter un lot
		</button>
	);
}

export function TableauLots({ vue }: { vue: VueMarches }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = usePreference<TriLots>('sentinelle-tri-lots', 'saisie', estTri);
	const [lotOuvert, setLotOuvert] = useState<string | null>(null);
	useEffect(() => {
		const ouvrir = (e: Event) => setLotOuvert((e as CustomEvent<string>).detail);
		window.addEventListener(OUVRIR_LOT, ouvrir);
		return () => window.removeEventListener(OUVRIR_LOT, ouvrir);
	}, []);
	const [, demarrer] = useTransition();
	const vus = lotsVisibles(vue.lots, requete, tri);
	const ouvert = vue.lots.find((l) => l.id === lotOuvert);
	const champ = (id: string, c: 'numero' | 'designation' | 'montantHt' | 'tauxTva' | 'montantTtc') => modifierChampLotAction.bind(null, id, c);
	const arreter = (e: React.MouseEvent) => e.stopPropagation();
	const q = requete.trim();

	function ajouter() {
		demarrer(async () => {
			const r = await ajouterLotAction(vue.chantierId);
			if (r.ok) setLotOuvert(r.donnees.id);
			else toast.error(r.erreur);
		});
	}

	return (
		<>
			<div className="toolbar">
				<Recherche placeholder="Rechercher un lot, une entreprise, un numéro…" libelle="Rechercher un lot" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="lot-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<span className="eyebrow">{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</span>
			</div>
			<div className="table-frame">
				<table className="lots">
					<thead>
						<tr><th>N°</th><th>Lot</th><th>Entreprise</th><th className="ta-r">Montant HT</th><th className="ta-r">TVA</th><th className="ta-r">Montant TTC</th></tr>
					</thead>
					<tbody>
						{vus.map((l) => {
							const nbAv = l.avenants.length;
							const classes = [!l.entreprise && 'is-unassigned', l.id === lotOuvert && 'is-open'].filter(Boolean).join(' ') || undefined;
							return (
								<tr key={l.id} data-lot={l.designation} className={classes} onClick={() => setLotOuvert(l.id)}>
									<td className="cell-num is-editable" onClick={arreter}>
										<ChampEnLigne variante="texte-mini" libelle="Numéro du lot" placeholder="—" valeur={l.numero ?? ''} enregistrer={champ(l.id, 'numero')} />
									</td>
									<td className="cell-lot is-editable" onClick={arreter}>
										<div className="lot-wrap">
											<ChampEnLigne className="min-w-0 flex-1" libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
											{l.nature === 'SOUS_TRAITANCE' && <span className="nature-tag st">Sous-traitance</span>}
											{nbAv > 0 && <span className="nature-tag av" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</span>}
										</div>
									</td>
									<td className="cell-ent">
										{l.entreprise
											? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}{l.commune && <small>{l.commune}</small>}</>
											: <span className="unset">à attribuer</span>}
									</td>
									<td className="ta-r cell-ht is-editable" onClick={arreter}>
										<ChampEnLigne variante="montant" libelle="Montant HT" valeur={formatMontantSaisie(l.htInitial)} enregistrer={champ(l.id, 'montantHt')} />
									</td>
									<td className="ta-r cell-tva is-editable" onClick={arreter}>
										<ChampEnLigne variante="montant-mini" libelle="Taux de TVA" valeur={formatTauxPoint(l.tauxTva)} enregistrer={champ(l.id, 'tauxTva')} />
									</td>
									<td className="ta-r cell-ht is-editable" onClick={arreter} title={nbAv ? 'Avenants compris — le montant initial HT est recalculé' : undefined}>
										<ChampEnLigne variante="montant" libelle="Montant TTC" valeur={formatMontantSaisie(l.ttcEngage)} enregistrer={champ(l.id, 'montantTtc')} />
									</td>
								</tr>
							);
						})}
						{!vus.length && (
							<tr className="empty-row">
								<td colSpan={6}>
									{q ? <>Aucun lot ne correspond à « {q} ». <button type="button" className="btn btn-sm" onClick={() => setRequete('')}>Effacer la recherche</button></>
										: <>Aucun lot pour l&apos;instant. <button type="button" className="btn btn-sm btn-primary" onClick={ajouter}>Ajouter le premier lot</button></>}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="totals">
				<div className="total-cell"><span className="total-k">Total marchés HT</span><span className="total-v num" data-testid="total-ht">{vue.totalHtTexte}</span></div>
				<div className="total-cell"><span className="total-k">TVA</span><span className="total-v num">{vue.totalTvaTexte}</span></div>
				<div className="total-cell"><span className="total-k">Total marchés TTC</span><span className="total-v grand num" data-testid="total-ttc">{vue.totalTtcTexte}</span></div>
			</div>
			{ouvert && <PanneauLot lot={ouvert} vue={vue} onFermer={() => setLotOuvert(null)} />}
		</>
	);
}
