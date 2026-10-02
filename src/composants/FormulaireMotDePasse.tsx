'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { changerMotDePasseAction, deconnexionAction } from '@/actions/session';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, Erreur, Saisie } from '@/composants/briques/Champ';
import { EcranCentre, FormulaireCentre } from '@/composants/briques/EcranCentre';

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
		<Champ libelle={libelle} pour={nom} erreur={erreurs[nom]}>
			<Saisie id={nom} name={nom} type="password" autoComplete={autoComplete} required erreur={erreurs[nom]} />
		</Champ>
	);

	return (
		<EcranCentre sigle titre="Sentinelle" accroche={<>Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</>}
			pied={<form action={deconnexionAction}><Bouton variante="fantome" taille="sm" type="submit">Se déconnecter</Bouton></form>}>
			<FormulaireCentre onSubmit={soumettre}>
				{champ('ancien', 'Mot de passe actuel', 'current-password')}
				{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
				{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
				{erreurs.general && <Erreur alerte>{erreurs.general}</Erreur>}
				<Bouton variante="primaire" taille="grand" type="submit" enCours={enCours}>Enregistrer</Bouton>
			</FormulaireCentre>
		</EcranCentre>
	);
}
