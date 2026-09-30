'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/auth/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
		<main className="grid min-h-screen place-items-center px-4">
			<form onSubmit={soumettre} className="w-full max-w-sm space-y-5 rounded-xl border bg-card p-8 shadow-sm">
				<div>
					<h1 className="text-2xl font-bold">Sentinelle</h1>
					<p className="text-sm text-muted-foreground">
						Les marchés de vos chantiers, saisis une fois et imprimés autant de fois qu&apos;il le faut.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Adresse e-mail</Label>
					<Input id="email" name="email" type="email" autoComplete="username" required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="motDePasse">Mot de passe</Label>
					<Input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
				</div>
				{erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
				<Button type="submit" className="w-full" disabled={envoi}>
					{envoi ? 'Connexion…' : 'Ouvrir mes chantiers'}
				</Button>
			</form>
		</main>
	);
}
