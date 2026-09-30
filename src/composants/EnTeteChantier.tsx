'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, modifierChampChantierAction } from '@/actions/chantiers';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { ChampChantier, EnTeteChantierVue } from '@/donnees/chantiers';
import { cn } from '@/lib/utils';
import { ChampEnLigne } from './ChampEnLigne';

const CHAMPS: { champ: ChampChantier; libelle: string; type?: 'date' }[] = [
	{ champ: 'reference', libelle: 'Référence dossier' },
	{ champ: 'maitreOuvrage', libelle: 'Client' },
	{ champ: 'adresseClient', libelle: 'Adresse actuelle du client' },
	{ champ: 'natureTravaux', libelle: 'Nature des travaux' },
	{ champ: 'adresse', libelle: 'Adresse du chantier' },
	{ champ: 'cp', libelle: 'Code postal' },
	{ champ: 'commune', libelle: 'Commune' },
	{ champ: 'dateSignaturePrevue', libelle: 'Signature prévue le', type: 'date' },
];

export function EnTeteChantier({ chantier, chargesAffaire }: { chantier: EnTeteChantierVue; chargesAffaire: { id: string; nom: string }[] }) {
	const chemin = usePathname();
	const [, demarrer] = useTransition();
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>) => demarrer(async () => {
		const r = await fn();
		if (!r.ok) toast.error(r.erreur);
	});
	const onglet = (suffixe: string, texte: string) => {
		const href = `/chantiers/${chantier.id}/${suffixe}`;
		return (
			<Link href={href} className={cn('border-b-2 px-1 pb-2 text-sm', chemin.startsWith(href) ? 'border-primary font-semibold' : 'border-transparent text-muted-foreground')}>
				{texte}
			</Link>
		);
	};
	return (
		<header className="mb-6 space-y-4">
			<div className="flex flex-wrap items-start gap-4">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{chantier.reference}</p>
					<h1 className="text-2xl font-bold">{chantier.maitreOuvrage}</h1>
					<p className="text-sm text-muted-foreground">
						{[chantier.adresse, [chantier.cp, chantier.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
						{' · '}Mission {chantier.mission === 'COMPLETE' ? 'complète' : 'partielle'}
					</p>
				</div>
				<div className="ml-auto flex gap-2">
					<Sheet>
						<SheetTrigger render={<Button variant="outline" />}>Modifier l&apos;en-tête</SheetTrigger>
						<SheetContent className="overflow-y-auto">
							<SheetHeader><SheetTitle>En-tête du chantier</SheetTitle></SheetHeader>
							<div className="space-y-3 p-4">
								{CHAMPS.map((c) => (
									<label key={c.champ} className="block space-y-1 text-sm">
										<span className="text-muted-foreground">{c.libelle}</span>
										<ChampEnLigne libelle={c.libelle} type={c.type} valeur={chantier[c.champ] as string} enregistrer={modifierChampChantierAction.bind(null, chantier.id, c.champ)} />
									</label>
								))}
								<label className="block space-y-1 text-sm">
									<span className="text-muted-foreground">Mission</span>
									<select className="h-9 w-full rounded-md border border-input bg-card px-2" value={chantier.mission}
										onChange={(e) => agir(() => modifierChampChantierAction(chantier.id, 'mission', e.target.value))}>
										<option value="COMPLETE">Complète</option><option value="PARTIELLE">Partielle</option>
									</select>
								</label>
								<label className="block space-y-1 text-sm">
									<span className="text-muted-foreground">Chargé d&apos;affaire</span>
									<select className="h-9 w-full rounded-md border border-input bg-card px-2" value={chantier.chargeAffaireId}
										onChange={(e) => agir(() => modifierChampChantierAction(chantier.id, 'chargeAffaireId', e.target.value))}>
										{chargesAffaire.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
									</select>
								</label>
							</div>
						</SheetContent>
					</Sheet>
					<Button variant={chantier.termine ? 'outline' : 'secondary'} onClick={() => agir(() => marquerTermineAction(chantier.id, !chantier.termine))}>
						{chantier.termine ? 'Rouvrir le chantier' : 'Marquer terminé'}
					</Button>
				</div>
			</div>
			<nav className="flex gap-6 border-b">
				{onglet('marches', 'Marchés')}
				{onglet('documents', 'Documents')}
			</nav>
		</header>
	);
}
