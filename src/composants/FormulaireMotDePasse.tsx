'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { changerMotDePasseAction, deconnexionAction } from '@/actions/session';
import { Sigle, SigleDefs } from '@/composants/briques/Sigle';

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
		<div className="field">
			<label htmlFor={nom}>{libelle}</label>
			<input id={nom} name={nom} type="password" autoComplete={autoComplete} required aria-invalid={Boolean(erreurs[nom])} className={erreurs[nom] ? 'est-erreur' : undefined} />
			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
		</div>
	);

	return (
		<div className="screen is-on">
			<SigleDefs />
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark"><Sigle grand />Sentinelle</div>
						<p className="login-tag">Choisissez votre mot de passe. Le mot de passe provisoire ne sert qu&apos;une fois. 12 caractères au moins.</p>
					</div>
					<form className="login-form" onSubmit={soumettre}>
						{champ('ancien', 'Mot de passe actuel', 'current-password')}
						{champ('nouveau', 'Nouveau mot de passe', 'new-password')}
						{champ('confirmation', 'Confirmer le nouveau mot de passe', 'new-password')}
						{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
						<button className="btn btn-primary" type="submit" disabled={enCours} style={{ justifyContent: 'center', padding: '0.5625rem' }}>Enregistrer</button>
					</form>
					<form action={deconnexionAction} className="login-foot">
						<button type="submit" className="btn btn-ghost btn-sm">Se déconnecter</button>
					</form>
				</div>
			</div>
		</div>
	);
}
