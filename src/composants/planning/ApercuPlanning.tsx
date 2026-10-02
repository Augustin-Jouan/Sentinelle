'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { genererPlanningAction, genererVisaAction } from '@/actions/documents';
import { CadreApercu } from '@/composants/briques/CadreApercu';
import { telecharger } from '@/composants/telecharger';
import { Gabarit } from '@/documents/gabarits/Gabarit';
import { TITRES_TYPES } from '@/documents/libelles';
import type { DonneesPlanning, DonneesVisa } from '@/documents/schemas';
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
			telecharger(`/api/documents/${r.donnees.documentId}/pdf`);
			router.refresh();
		});
	}

	const planningDAbord = (
		<Link href="?apercu=planning" replace scroll={false} className={planning ? 'btn' : 'btn btn-primary'}>
			Générer le planning d&apos;abord
		</Link>
	);

	return (
		<CadreApercu libelle={titre} surtitre={titre} titre={reference} disposition="simple" onFermer={() => router.replace(chemin, { scroll: false })}
			notes={<>
				{erreur && <p role="note" className="gen-note est-info">{erreur}</p>}
				{planning?.modifie && <p role="note" className="gen-note est-info">Le planning a changé depuis la v{planning.version} : ce visa portera sur la v{planning.version}.</p>}
				{tropDeLots && <p role="note" className="gen-note">{TROP_DE_LOTS}</p>}
			</>}
			actions={<>
				<button type="button" className="btn btn-ghost" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</button>
				{mode === 'visa' && !planning && planningDAbord}
				{mode === 'visa' && planning?.modifie && (
					<>
						{planningDAbord}
						<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots}>
							{enCours ? 'Génération…' : `Générer le visa sur la v${planning.version}`}
						</button>
					</>
				)}
				{(mode === 'planning' || (planning && !planning.modifie)) && (
					<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || !donnees || tropDeLots} title={tropDeLots ? TROP_DE_LOTS : undefined}>
						{enCours ? 'Génération…' : 'Générer le PDF'}
					</button>
				)}
			</>}>
			{donnees && (
				<FeuilleUnique key={JSON.stringify(donnees)} onMesure={setMesure}>
					<Gabarit donnees={donnees} mode="lecture" />
				</FeuilleUnique>
			)}
		</CadreApercu>
	);
}
