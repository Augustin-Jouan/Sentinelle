'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { creerBrouillonAction } from '@/actions/comptesRendus';
import { Button, buttonVariants } from '@/components/ui/button';
import type { CarteComptesRendus as Carte } from '@/documents/etats';
import { numeroTexte } from '@/domaine/compteRendu';

/** Première carte « chantier entier » (spec § 7) : le dernier compte rendu, la suite, et de quoi en écrire un. */
export function CarteComptesRendus({ chantierId, carte }: { chantierId: string; carte: Carte }) {
	const router = useRouter();
	const [enCours, demarrer] = useTransition();
	const dernier = carte.liste[0];
	const suite = carte.brouillon ? `Brouillon n° ${numeroTexte(carte.brouillon.numero)} en cours`
		: carte.prochainRdv === null ? 'Le premier reprend les lots et les entreprises'
		: carte.prochainRdv ? `Prochain : ${carte.prochainRdv}`
		: 'Prochain rendez-vous non fixé';

	function nouveau() {
		demarrer(async () => {
			const r = await creerBrouillonAction(chantierId);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			router.push('?cr=brouillon', { scroll: false });
		});
	}

	return (
		<div data-serie="comptes-rendus" className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
			<div className="space-y-1">
				<p className="text-xs uppercase tracking-wide text-muted-foreground">Chantier entier</p>
				<h3 className="font-semibold">Comptes rendus de chantier</h3>
				<p className="text-xs text-muted-foreground">
					{dernier ? (
						<Link href={`?cr=${dernier.id}`} scroll={false} className="underline">{`n° ${numeroTexte(dernier.numero)} · ${dernier.date}`}</Link>
					) : 'Aucun compte rendu enregistré'}
				</p>
				<p data-testid="suite-comptes-rendus" className="text-xs text-muted-foreground">{suite}</p>
				{carte.liste.length > 0 && (
					<details className="text-xs">
						<summary className="cursor-pointer text-muted-foreground">
							{carte.liste.length} compte{carte.liste.length > 1 ? 's' : ''} rendu{carte.liste.length > 1 ? 's' : ''}
						</summary>
						<ul className="mt-1 space-y-0.5">
							{carte.liste.map((c) => (
								<li key={c.id}>
									<Link href={`?cr=${c.id}`} scroll={false} className="underline">{`n° ${numeroTexte(c.numero)}`}</Link>
									{` — ${c.date} — ${c.versions.length} version${c.versions.length > 1 ? 's' : ''}`}
									{c.versions[0] && <>{' · '}<a className="underline" href={`/api/documents/${c.versions[0].id}/pdf`}>PDF</a></>}
								</li>
							))}
						</ul>
					</details>
				)}
			</div>
			<div className="ml-auto flex gap-2">
				{dernier && (
					<Link href={`?corriger-cr=${dernier.id}`} scroll={false} className={buttonVariants({ variant: 'outline' })}>
						{`Corriger le n° ${numeroTexte(dernier.numero)}`}
					</Link>
				)}
				{carte.brouillon ? (
					<Link href="?cr=brouillon" scroll={false} className={buttonVariants()}>Reprendre le brouillon</Link>
				) : (
					<Button onClick={nouveau} disabled={enCours}>Nouveau compte rendu</Button>
				)}
			</div>
		</div>
	);
}
