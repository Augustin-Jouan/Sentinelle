'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterLotAction, modifierChampLotAction } from '@/actions/lots';
import { BarreOutils } from '@/composants/briques/BarreOutils';
import { Bouton } from '@/composants/briques/Bouton';
import { cx } from '@/composants/briques/cx';
import { Etiquette } from '@/composants/briques/Etiquette';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { usePreference } from '@/composants/briques/preference';
import { Recherche } from '@/composants/briques/Recherche';
import { Surtitre } from '@/composants/briques/Surtitre';
import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
import { CHIFFRES, CLE } from '@/composants/briques/typo';
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
		<Bouton enCours={enCours} onClick={() => demarrer(async () => {
			const r = await ajouterLotAction(chantierId);
			if (!r.ok) { toast.error(r.erreur); return; }
			window.dispatchEvent(new CustomEvent(OUVRIR_LOT, { detail: r.donnees.id }));
		})}>
			<Icone.Plus />Ajouter un lot
		</Bouton>
	);
}

/** Une case de la barre des totaux (ex-.total-cell) ; la dernière, le TTC, en grand sur fond d'encre. */
function Total({ cle, valeur, grand = false, testid }: { cle: string; valeur: string; grand?: boolean; testid?: string }) {
	return (
		<div className={cx('flex-none px-4.5 pt-2.5 pb-2.75', grand ? 'ml-auto bg-ink text-paper' : 'border-r border-rule')}>
			<div className={CLE}>{cle}</div>
			<span data-testid={testid} className={cx(CHIFFRES, 'whitespace-nowrap', grand ? 'text-18 font-semibold' : 'text-15 font-medium')}>{valeur}</span>
		</div>
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
			<BarreOutils>
				<Recherche placeholder="Rechercher un lot, une entreprise, un numéro…" libelle="Rechercher un lot" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="lot-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_LOTS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<Surtitre>{q ? `${vus.length} lot${vus.length > 1 ? 's' : ''} sur ${vue.lots.length} · les totaux portent sur le chantier entier` : ''}</Surtitre>
			</BarreOutils>
			<CadreTableau>
				<Tableau variante="lots">
					<thead>
						<tr><th>N°</th><th>Lot</th><th>Entreprise</th><th data-droite>Montant HT</th><th data-droite>TVA</th><th data-droite>Montant TTC</th></tr>
					</thead>
					<tbody>
						{vus.map((l) => {
							const nbAv = l.avenants.length;
							return (
								<tr key={l.id} data-lot={l.designation} data-inactif={l.entreprise ? undefined : ''} data-ouvert={l.id === lotOuvert ? '' : undefined}
									onClick={() => setLotOuvert(l.id)}>
									<td data-saisie className="w-18 font-mono text-12 text-muted" onClick={arreter}>
										<ChampEnLigne variante="texte-mini" libelle="Numéro du lot" placeholder="—" valeur={l.numero ?? ''} enregistrer={champ(l.id, 'numero')} />
									</td>
									<td data-saisie className="min-w-64 font-medium whitespace-nowrap" onClick={arreter}>
										{/* Le champ et ses étiquettes partagent un conteneur : la cellule reste une vraie cellule. */}
										<div className="flex items-center">
											<ChampEnLigne className="min-w-0 flex-1" libelle="Désignation du lot" placeholder="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
											{l.nature === 'SOUS_TRAITANCE' && <Etiquette ton="accent" className="mr-3 flex-none">Sous-traitance</Etiquette>}
											{nbAv > 0 && <Etiquette className="mr-3 flex-none" title={`${nbAv} avenant(s) — le montant affiché les comprend`}>{nbAv} avenant{nbAv > 1 ? 's' : ''}</Etiquette>}
										</div>
									</td>
									<td className="whitespace-nowrap">
										{l.entreprise
											? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}{l.commune && <div className="text-11 text-muted">{l.commune}</div>}</>
											: <span className="text-faint italic">à attribuer</span>}
									</td>
									<td data-droite data-saisie className="w-42" onClick={arreter}>
										<ChampEnLigne variante="montant" libelle="Montant HT" valeur={formatMontantSaisie(l.htInitial)} enregistrer={champ(l.id, 'montantHt')} />
									</td>
									<td data-droite data-saisie className="w-26" onClick={arreter}>
										<ChampEnLigne variante="montant-mini" libelle="Taux de TVA" valeur={formatTauxPoint(l.tauxTva)} enregistrer={champ(l.id, 'tauxTva')} />
									</td>
									<td data-droite data-saisie className="w-42" onClick={arreter} title={nbAv ? 'Avenants compris — le montant initial HT est recalculé' : undefined}>
										<ChampEnLigne variante="montant" libelle="Montant TTC" valeur={formatMontantSaisie(l.ttcEngage)} enregistrer={champ(l.id, 'montantTtc')} />
									</td>
								</tr>
							);
						})}
						{!vus.length && (
							<tr>
								<td data-vide colSpan={6}>
									{q ? <>Aucun lot ne correspond à « {q} ». <Bouton taille="sm" className="ml-3" onClick={() => setRequete('')}>Effacer la recherche</Bouton></>
										: <>Aucun lot pour l&apos;instant. <Bouton taille="sm" variante="primaire" className="ml-3" onClick={ajouter}>Ajouter le premier lot</Bouton></>}
								</td>
							</tr>
						)}
					</tbody>
				</Tableau>
			</CadreTableau>
			{/* Les totaux restent collés en bas de la fenêtre pendant que le tableau défile. */}
			<div className="sticky bottom-0 z-15 mt-3 flex items-stretch overflow-hidden rounded-md border border-rule-strong bg-surface shadow-ombre">
				<Total cle="Total marchés HT" valeur={vue.totalHtTexte} testid="total-ht" />
				<Total cle="TVA" valeur={vue.totalTvaTexte} />
				<Total cle="Total marchés TTC" valeur={vue.totalTtcTexte} testid="total-ttc" grand />
			</div>
			{ouvert && <PanneauLot lot={ouvert} vue={vue} onFermer={() => setLotOuvert(null)} />}
		</>
	);
}
