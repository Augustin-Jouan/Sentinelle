'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { changerMotDePasseAction } from '@/actions/session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormulaireMotDePasse() {
	const router = useRouter();
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();

	function soumettre(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		demarrer(async () => {
			const r = await changerMotDePasseAction(String(f.get('ancien')), String(f.get('nouveau')), String(f.get('confirmation')));
			if (r.ok) {
				router.replace('/chantiers');
				router.refresh();
			} else {
				setErreurs(r.champs ?? { general: r.erreur });
			}
		});
	}

	const champ = (nom: string, libelle: string, autoComplete: string) => (
		<div className="space-y-2">
			<Label htmlFor={nom}>{libelle}</Label>
			<Input id={nom} name={nom} type="password" autoComplete={autoComplete} required aria-invalid={Boolean(erreurs[nom])} />
			{erreurs[nom] && <p className="text-sm text-destructive">{erreurs[nom]}</p>}
		</div>
	);

	return (
		<form onSubmit={soumettre} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm">
			<div>
				<h1 className="text-2xl font-bold">Choisissez votre mot de passe</h1>
				<p className="text-sm text-muted-foreground">Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</p>
			</div>
			{champ('ancien', 'Mot de passe actuel', 'current-password')}
			{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
			{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
			{erreurs.general && <p role="alert" className="text-sm text-destructive">{erreurs.general}</p>}
			<Button type="submit" className="w-full" disabled={enCours}>Enregistrer</Button>
		</form>
	);
}
