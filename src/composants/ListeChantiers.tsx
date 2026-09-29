'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ChantierListe } from '@/donnees/chantiers';
import { normaliser } from '@/domaine/recherche';

export function ListeChantiers({ chantiers }: { chantiers: ChantierListe[] }) {
	const [requete, setRequete] = useState('');
	const [masquerTermines, setMasquerTermines] = useState(true);
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	const vus = chantiers.filter((c) =>
		(!masquerTermines || !c.termine)
		&& mots.every((m) => normaliser(`${c.reference} ${c.maitreOuvrage} ${c.commune} ${c.chargeAffaire}`).includes(m)));
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<Input className="max-w-sm" placeholder="Rechercher un chantier…" aria-label="Rechercher un chantier" value={requete} onChange={(e) => setRequete(e.target.value)} />
				<label className="flex items-center gap-2 text-sm">
					<Switch checked={masquerTermines} onCheckedChange={setMasquerTermines} /> Masquer les terminés
				</label>
			</div>
			<table className="w-full rounded-xl border bg-card text-sm">
				<thead>
					<tr className="border-b text-left text-muted-foreground">
						<th className="p-3">Référence</th><th className="p-3">Client</th><th className="p-3">Commune</th>
						<th className="p-3">Chargé d&apos;affaire</th><th className="p-3 text-right">Total TTC engagé</th>
					</tr>
				</thead>
				<tbody>
					{vus.map((c) => (
						<tr key={c.id} className="border-b last:border-0 hover:bg-accent">
							<td className="p-3 font-medium"><Link href={`/chantiers/${c.id}/marches`}>{c.reference}</Link>{c.termine && <span className="ml-2 text-xs text-muted-foreground">terminé</span>}</td>
							<td className="p-3">{c.maitreOuvrage}</td>
							<td className="p-3">{c.commune}</td>
							<td className="p-3">{c.chargeAffaire}</td>
							<td className="p-3 text-right font-mono tabular-nums">{c.totalTtcTexte}</td>
						</tr>
					))}
					{!vus.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aucun chantier.</td></tr>}
				</tbody>
			</table>
		</div>
	);
}
