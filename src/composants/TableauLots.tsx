'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterLotAction, modifierChampLotAction } from '@/actions/lots';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VueMarches } from '@/donnees/marches';
import { LIBELLES_TRI, lotsVisibles, type TriLots } from '@/domaine/lots';
import { formatMontantSaisie, formatTauxSaisie } from '@/domaine/montants';
import { ChampEnLigne } from './ChampEnLigne';
import { PanneauLot } from './PanneauLot';

export function TableauLots({ vue, actions }: { vue: VueMarches; actions?: React.ReactNode }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = useState<TriLots>('saisie');
	const [lotOuvert, setLotOuvert] = useState<string | null>(null);
	const [enCours, demarrer] = useTransition();
	const vus = lotsVisibles(vue.lots, requete, tri);
	const ouvert = vue.lots.find((l) => l.id === lotOuvert);
	const champ = (id: string, c: 'numero' | 'designation' | 'montantHt' | 'tauxTva' | 'montantTtc') => modifierChampLotAction.bind(null, id, c);
	const arreter = (e: React.MouseEvent) => e.stopPropagation();

	function ajouter() {
		demarrer(async () => {
			const r = await ajouterLotAction(vue.chantierId);
			if (r.ok) setLotOuvert(r.donnees.id);
			else toast.error(r.erreur);
		});
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-3">
				<Input className="max-w-xs" placeholder="Rechercher un lot…" aria-label="Rechercher un lot" value={requete} onChange={(e) => setRequete(e.target.value)} />
				<label className="flex items-center gap-2 text-sm">
					Trier par
					<select className="h-9 rounded-md border border-input bg-card px-2" value={tri} onChange={(e) => setTri(e.target.value as TriLots)}>
						{Object.entries(LIBELLES_TRI).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
					</select>
				</label>
				<div className="ml-auto flex gap-2">
					<Button variant="outline" onClick={ajouter} disabled={enCours}>Ajouter un lot</Button>
					{actions}
				</div>
			</div>
			{requete.trim() && (
				<p className="text-xs text-muted-foreground">{vus.length} lot{vus.length > 1 ? 's' : ''} sur {vue.lots.length} · les totaux portent sur le chantier entier</p>
			)}
			<div className="overflow-x-auto rounded-xl border bg-card">
				<table className="w-full min-w-[56rem] text-sm">
					<thead>
						<tr className="border-b text-left text-muted-foreground">
							<th className="w-20 p-2">N°</th><th className="p-2">Lot</th><th className="p-2">Entreprise</th>
							<th className="w-36 p-2 text-right">Montant HT</th><th className="w-24 p-2 text-right">TVA</th><th className="w-36 p-2 text-right">Montant TTC</th>
						</tr>
					</thead>
					<tbody>
						{vus.map((l) => (
							<tr key={l.id} data-lot={l.designation} className="cursor-pointer border-b last:border-0 hover:bg-accent/60" onClick={() => setLotOuvert(l.id)}>
								<td className="p-1" onClick={arreter}><ChampEnLigne libelle="Numéro du lot" placeholder="—" valeur={l.numero ?? ''} enregistrer={champ(l.id, 'numero')} /></td>
								<td className="p-1" onClick={arreter}>
									<ChampEnLigne libelle="Désignation du lot" valeur={l.designation} enregistrer={champ(l.id, 'designation')} />
									{l.nature === 'SOUS_TRAITANCE' && <span className="ml-1.5 rounded bg-secondary px-1.5 text-xs">Sous-traitance</span>}
								</td>
								<td className="p-2">
									{l.entreprise
										? <>{l.entreprise}{l.artisanArchive && ' (archivée)'}<small className="block text-muted-foreground">{l.commune}</small></>
										: <span className="italic text-muted-foreground">à attribuer</span>}
								</td>
								<td className="p-1" onClick={arreter}><ChampEnLigne libelle="Montant HT" alignement="droite" valeur={formatMontantSaisie(l.htInitial)} enregistrer={champ(l.id, 'montantHt')} /></td>
								<td className="p-1" onClick={arreter}><ChampEnLigne libelle="Taux de TVA" alignement="droite" valeur={formatTauxSaisie(l.tauxTva)} enregistrer={champ(l.id, 'tauxTva')} /></td>
								<td className="p-1" onClick={arreter}><ChampEnLigne libelle="Montant TTC" alignement="droite" valeur={formatMontantSaisie(l.ttcEngage)} enregistrer={champ(l.id, 'montantTtc')} /></td>
							</tr>
						))}
						{!vus.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">{requete ? `Aucun lot ne correspond à « ${requete} ».` : 'Aucun lot pour l\'instant.'}</td></tr>}
					</tbody>
					<tfoot>
						<tr className="border-t font-semibold">
							<td colSpan={3} className="p-2">Total marchés</td>
							<td className="p-2 text-right font-mono tabular-nums" data-testid="total-ht">{vue.totalHtTexte}</td>
							<td className="p-2 text-right font-mono text-xs tabular-nums text-muted-foreground">{vue.totalTvaTexte}</td>
							<td className="p-2 text-right font-mono tabular-nums" data-testid="total-ttc">{vue.totalTtcTexte}</td>
						</tr>
					</tfoot>
				</table>
			</div>
			{ouvert && <PanneauLot lot={ouvert} vue={vue} onFermer={() => setLotOuvert(null)} />}
		</div>
	);
}
