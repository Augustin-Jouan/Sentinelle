'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import { annulerLeveeAction, leverReservesAction } from '@/actions/receptions';
import { Button } from '@/components/ui/button';
import type { EtatReception } from '@/domaine/reception';

/** Aujourd'hui à Châteaubriant, AAAA-MM-JJ (le format suédois est l'ISO). */
const aujourdhui = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

/** Sous la case Réception : lever les réserves du dernier PV (une date, pas de document), ou annuler la levée. */
export function ActionsLevee({ lotId, etat }: { lotId: string; etat: EtatReception }) {
	const router = useRouter();
	const [ouvert, setOuvert] = useState(false);
	const [enCours, demarrer] = useTransition();

	function envoyer(envoi: () => Promise<Resultat>) {
		demarrer(async () => {
			const r = await envoi();
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			setOuvert(false);
			router.refresh();
		});
	}

	if (etat === 'levee') {
		return <Button size="xs" variant="ghost" disabled={enCours} onClick={() => envoyer(() => annulerLeveeAction(lotId))}>Annuler la levée</Button>;
	}
	if (etat !== 'avec-reserves') return null;
	if (!ouvert) return <Button size="xs" variant="ghost" onClick={() => setOuvert(true)}>Réserves levées…</Button>;
	return (
		<form className="inline-flex items-center gap-1" onSubmit={(e) => {
			e.preventDefault();
			const date = String(new FormData(e.currentTarget).get('date') ?? '');
			envoyer(() => leverReservesAction(lotId, date));
		}}>
			<input type="date" name="date" aria-label="Date de levée des réserves" defaultValue={aujourdhui()} className="rounded border px-1 text-xs" />
			<Button size="xs" type="submit" disabled={enCours}>Enregistrer la levée</Button>
		</form>
	);
}
