'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { genererPlanningAction, genererVisaAction } from '@/actions/documents';
import { Button, buttonVariants } from '@/components/ui/button';
import { Gabarit } from '@/documents/gabarits/Gabarit';
import { TITRES_TYPES } from '@/documents/libelles';
import type { DonneesPlanning, DonneesVisa } from '@/documents/schemas';
import { CSS_DOCUMENTS } from '@/documents/styles';
import { ECHELLE_MIN, TROP_DE_LOTS } from '@/documents/uneFeuille';
import { FeuilleUnique, type Mesure } from './FeuilleUnique';

/** Visa : la dernière version générée du planning, et si le planning a changé depuis (null : aucune version). */
export type PlanningDuVisa = { version: number; modifie: boolean } | null;

type Props = { chantierId: string; reference: string; erreur: string | null } & (
	| { mode: 'planning'; donnees: DonneesPlanning | null }
	| { mode: 'visa'; donnees: DonneesVisa | null; planning: PlanningDuVisa }
);

/** Aperçu plein écran, comme celui des documents du Socle, avec la feuille unique et les règles du visa (spec § 7). */
export function ApercuPlanning(props: Props) {
	const { chantierId, reference, erreur, mode, donnees } = props;
	const router = useRouter();
	const chemin = usePathname();
	const [mesure, setMesure] = useState<Mesure | null>(null);
	const [enCours, demarrer] = useTransition();
	const titre = TITRES_TYPES[mode === 'planning' ? 'PLANNING' : 'VISA_PLANNING'];
	const planning = props.mode === 'visa' ? props.planning : null;
	const tropDeLots = mesure !== null && mesure.echelle < ECHELLE_MIN;

	// La page de derrière ne défile plus ; Échap ferme (les raccourcis du Gantt se taisent : data-bloque-clavier).
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') router.replace(chemin, { scroll: false }); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, [router, chemin]);

	function generer() {
		demarrer(async () => {
			const r = mode === 'planning' ? await genererPlanningAction(chantierId) : await genererVisaAction(chantierId);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			window.location.assign(`/api/documents/${r.donnees.documentId}/pdf`);
			router.refresh();
		});
	}

	const planningDAbord = (
		<Link href="?apercu=planning" replace scroll={false} className={buttonVariants({ variant: planning ? 'outline' : 'default' })}>
			Générer le planning d&apos;abord
		</Link>
	);

	return (
		<div role="dialog" aria-label={titre} data-bloque-clavier="" className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
					<p className="font-semibold">{reference}</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					{mode === 'visa' && !planning && planningDAbord}
					{mode === 'visa' && planning?.modifie && (
						<>
							{planningDAbord}
							<Button onClick={generer} disabled={enCours || !donnees || tropDeLots}>
								{enCours ? 'Génération…' : `Générer le visa sur la v${planning.version}`}
							</Button>
						</>
					)}
					{(mode === 'planning' || (planning && !planning.modifie)) && (
						<Button onClick={generer} disabled={enCours || !donnees || tropDeLots} title={tropDeLots ? TROP_DE_LOTS : undefined}>
							{enCours ? 'Génération…' : 'Générer le PDF'}
						</Button>
					)}
					<Button variant="outline" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</Button>
				</div>
			</header>
			{erreur && <p role="note" className="border-b bg-accent px-6 py-2 text-sm">{erreur}</p>}
			{planning?.modifie && (
				<p role="note" className="border-b bg-accent px-6 py-2 text-sm">
					Le planning a changé depuis la v{planning.version} : ce visa portera sur la v{planning.version}.
				</p>
			)}
			{tropDeLots && <p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{TROP_DE_LOTS}</p>}
			<div className="flex flex-1 items-start justify-center overflow-auto overscroll-contain p-7">
				{donnees && (
					<FeuilleUnique key={JSON.stringify(donnees)} onMesure={setMesure}>
						<Gabarit donnees={donnees} mode="lecture" />
					</FeuilleUnique>
				)}
			</div>
		</div>
	);
}
