'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { attribuerArtisanAction } from '@/actions/lots';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ArtisanOption } from '@/donnees/marches';
import { artisansProposables, filtrerArtisans } from '@/domaine/recherche';

/** Recherche sans accents sur le nom et la commune ; Entrée choisit le premier résultat (cmdk le présélectionne). */
export function MenuArtisan({ lotId, artisanId, artisans }: { lotId: string; artisanId: string | null; artisans: ArtisanOption[] }) {
	const [ouvert, setOuvert] = useState(false);
	const [requete, setRequete] = useState('');
	const [enCours, demarrer] = useTransition();
	const actuel = artisans.find((a) => a.id === artisanId);
	const proposes = filtrerArtisans(artisansProposables(artisans, artisanId), requete);

	function choisir(id: string | null) {
		setOuvert(false);
		setRequete('');
		demarrer(async () => {
			const r = await attribuerArtisanAction(lotId, id);
			if (!r.ok) toast.error(r.erreur);
		});
	}

	return (
		<Popover open={ouvert} onOpenChange={setOuvert}>
			<PopoverTrigger
				render={
					<Button variant="outline" className="w-full justify-between" disabled={enCours} aria-label="Attribuée à" />
				}
			>
				{actuel ? `${actuel.nom}${actuel.actif ? '' : ' (archivée)'}` : '— non attribué —'}
			</PopoverTrigger>
			<PopoverContent className="w-[22rem] p-0" align="start">
				<Command shouldFilter={false}>
					<CommandInput placeholder="Nom, commune…" value={requete} onValueChange={setRequete} />
					<CommandList>
						<CommandEmpty>Aucune entreprise ne correspond.</CommandEmpty>
						<CommandGroup>
							{proposes.map((a) => (
								<CommandItem key={a.id} value={a.id} onSelect={() => choisir(a.id)}>
									<span className="font-medium">{a.nom}{a.actif ? '' : ' (archivée)'}</span>
									<span className="ml-auto text-xs text-muted-foreground">{a.commune}</span>
								</CommandItem>
							))}
							{!requete && <CommandItem value="aucun" onSelect={() => choisir(null)}>— non attribué —</CommandItem>}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
