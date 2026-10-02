'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/auth/client';
import { Sigle, SigleDefs } from '@/composants/briques/Sigle';

export default function PageConnexion() {
	const router = useRouter();
	const [erreur, setErreur] = useState<string | null>(null);
	const [envoi, setEnvoi] = useState(false);

	async function soumettre(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setEnvoi(true);
		setErreur(null);
		const f = new FormData(e.currentTarget);
		const { data, error } = await authClient.signIn.email({
			email: String(f.get('email')),
			password: String(f.get('motDePasse')),
		});
		setEnvoi(false);
		if (error) {
			setErreur(error.status === 429
				? 'Trop de tentatives : patientez une minute.'
				: 'E-mail ou mot de passe incorrect, ou compte bloqué.');
			return;
		}
		// Le champ additionnel est renvoyé avec l'utilisateur : pas de passage par /chantiers avant la redirection.
		const provisoire = (data?.user as { doitChangerMotDePasse?: boolean } | undefined)?.doitChangerMotDePasse;
		router.replace(provisoire ? '/mot-de-passe' : '/chantiers');
		router.refresh();
	}

	return (
		<div className="screen is-on">
			<SigleDefs />
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark"><Sigle grand />Sentinelle</div>
						<p className="login-tag">Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</p>
					</div>
					<form className="login-form" onSubmit={soumettre}>
						<div className="field">
							<label htmlFor="email">Adresse e-mail</label>
							<input id="email" name="email" type="email" autoComplete="username" required />
						</div>
						<div className="field">
							<label htmlFor="motDePasse">Mot de passe</label>
							<input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
						</div>
						{erreur && <p role="alert" className="erreur">{erreur}</p>}
						<button className="btn btn-primary" type="submit" disabled={envoi} style={{ justifyContent: 'center', padding: '0.5625rem' }}>
							{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}
						</button>
					</form>
					<p className="login-foot">Accès réservé aux comptes SOCOREVE.</p>
				</div>
			</div>
		</div>
	);
}
