'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/auth/client';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, Erreur, Saisie } from '@/composants/briques/Champ';
import { EcranCentre, FormulaireCentre } from '@/composants/briques/EcranCentre';

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
		<EcranCentre sigle titre="Sentinelle" accroche={<>Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.</>}
			pied="Accès réservé aux comptes SOCOREVE.">
			<FormulaireCentre onSubmit={soumettre}>
				<Champ libelle="Adresse e-mail" pour="email"><Saisie id="email" name="email" type="email" autoComplete="username" required /></Champ>
				<Champ libelle="Mot de passe" pour="motDePasse"><Saisie id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required /></Champ>
				{erreur && <Erreur alerte>{erreur}</Erreur>}
				<Bouton variante="primaire" taille="grand" type="submit" enCours={envoi}>{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}</Bouton>
			</FormulaireCentre>
		</EcranCentre>
	);
}
