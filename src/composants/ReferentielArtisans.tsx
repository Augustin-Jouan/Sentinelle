'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { changerActiviteArtisanAction, creerArtisanAction, modifierChampArtisanAction } from '@/actions/artisans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ArtisanFiche, ChampArtisan } from '@/donnees/artisans';
import { filtrerArtisans } from '@/domaine/recherche';
import { ChampEnLigne } from './ChampEnLigne';

const COLONNES: { champ: ChampArtisan; titre: string }[] = [
	{ champ: 'nom', titre: 'Entreprise' },
	{ champ: 'adresse', titre: 'Adresse' },
	{ champ: 'cp', titre: 'CP' },
	{ champ: 'commune', titre: 'Commune' },
	{ champ: 'interlocuteur', titre: 'Interlocuteur' },
	{ champ: 'telephone', titre: 'Téléphone' },
	{ champ: 'email', titre: 'E-mail' },
];

export function ReferentielArtisans({ artisans }: { artisans: ArtisanFiche[] }) {
	const [requete, setRequete] = useState('');
	const [, demarrer] = useTransition();

	function ajouter(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formulaire = e.currentTarget;
		const nom = String(new FormData(formulaire).get('nom'));
		demarrer(async () => {
			const r = await creerArtisanAction(nom);
			if (r.ok) { formulaire.reset(); toast.success('Entreprise ajoutée.'); } else toast.error(r.erreur);
		});
	}

	function basculer(a: ArtisanFiche, actif: boolean) {
		demarrer(async () => {
			const r = await changerActiviteArtisanAction(a.id, actif);
			if (!r.ok) toast.error(r.erreur);
		});
	}

	const vus = filtrerArtisans(artisans, requete);
	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3">
				<Input className="max-w-sm" placeholder="Rechercher : nom, commune…" value={requete} onChange={(e) => setRequete(e.target.value)} aria-label="Rechercher une entreprise" />
				<form onSubmit={ajouter} className="ml-auto flex gap-2">
					<Input name="nom" placeholder="Nom de la nouvelle entreprise" aria-label="Nom de la nouvelle entreprise" required />
					<Button type="submit">Ajouter une entreprise</Button>
				</form>
			</div>
			<div className="overflow-x-auto rounded-xl border bg-card">
				<table className="w-full min-w-[60rem] text-sm">
					<thead>
						<tr className="border-b text-left text-muted-foreground">
							{COLONNES.map((c) => <th key={c.champ} className="p-2 font-medium">{c.titre}</th>)}
							<th className="p-2 font-medium">Actif</th>
						</tr>
					</thead>
					<tbody>
						{vus.map((a) => (
							<tr key={a.id} className={a.actif ? 'border-b last:border-0' : 'border-b opacity-60 last:border-0'}>
								{COLONNES.map((c) => (
									<td key={c.champ} className="p-1">
										<ChampEnLigne libelle={`${c.titre} de ${a.nom}`} valeur={a[c.champ]} enregistrer={modifierChampArtisanAction.bind(null, a.id, c.champ)} />
									</td>
								))}
								<td className="p-2">
									<Switch checked={a.actif} onCheckedChange={(v) => basculer(a, v)} aria-label={`${a.nom} actif`} />
									{a.nombreLots > 0 && <span className="ml-2 text-xs text-muted-foreground">{a.nombreLots} lot{a.nombreLots > 1 ? 's' : ''}</span>}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
