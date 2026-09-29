'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { bloquerCompteAction, changerRoleAction, creerCompteAction, reinitialiserMotDePasseAction } from '@/actions/comptes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CompteListe } from '@/donnees/comptes';

export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moiId: string }) {
	const [provisoire, setProvisoire] = useState<{ email: string; motDePasse: string } | null>(null);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();

	function creer(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formulaire = e.currentTarget;
		const f = new FormData(formulaire);
		const saisie = { nom: String(f.get('nom')), email: String(f.get('email')), role: String(f.get('role')) };
		demarrer(async () => {
			const r = await creerCompteAction(saisie);
			if (r.ok) {
				setErreurs({});
				formulaire.reset();
				setProvisoire({ email: saisie.email.trim().toLowerCase(), motDePasse: r.donnees.motDePasse });
			} else {
				setErreurs(r.champs ?? { general: r.erreur });
			}
		});
	}

	function agir(action: () => Promise<{ ok: boolean; erreur?: string }>, succes: string) {
		demarrer(async () => {
			const r = await action();
			if (r.ok) toast.success(succes);
			else toast.error(r.erreur);
		});
	}

	function reinitialiser(c: CompteListe) {
		demarrer(async () => {
			const r = await reinitialiserMotDePasseAction(c.id);
			if (r.ok) setProvisoire({ email: c.email, motDePasse: r.donnees.motDePasse });
			else toast.error(r.erreur);
		});
	}

	return (
		<div className="space-y-6">
			<form onSubmit={creer} className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
				<div className="space-y-1">
					<Label htmlFor="nom">Nom</Label>
					<Input id="nom" name="nom" required aria-invalid={Boolean(erreurs.nom)} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="email">E-mail</Label>
					<Input id="email" name="email" type="email" required aria-invalid={Boolean(erreurs.email)} />
				</div>
				<div className="space-y-1">
					<Label htmlFor="role">Rôle</Label>
					<select id="role" name="role" defaultValue="user" className="h-9 rounded-md border border-input bg-card px-2 text-sm">
						<option value="user">Utilisateur</option>
						<option value="admin">Administrateur</option>
					</select>
				</div>
				<Button type="submit" disabled={enCours}>Créer le compte</Button>
				{Object.values(erreurs).length > 0 && <p className="w-full text-sm text-destructive">{Object.values(erreurs)[0]}</p>}
			</form>

			<table className="w-full rounded-xl border bg-card text-sm">
				<thead>
					<tr className="border-b text-left text-muted-foreground">
						<th className="p-3">Nom</th><th className="p-3">E-mail</th><th className="p-3">Rôle</th><th className="p-3">État</th><th className="p-3" />
					</tr>
				</thead>
				<tbody>
					{comptes.map((c) => (
						<tr key={c.id} className="border-b last:border-0">
							<td className="p-3 font-medium">{c.nom}</td>
							<td className="p-3">{c.email}</td>
							<td className="p-3">{c.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</td>
							<td className="p-3">
								{c.bloque ? <Badge variant="destructive">Bloqué</Badge>
									: c.doitChangerMotDePasse ? <Badge variant="secondary">Mot de passe provisoire</Badge>
									: <Badge variant="outline">Actif</Badge>}
							</td>
							<td className="space-x-2 p-3 text-right">
								<Button size="sm" variant="outline" onClick={() => reinitialiser(c)}>Réinitialiser le mot de passe</Button>
								{c.id !== moiId && (
									<>
										<Button size="sm" variant="outline" onClick={() => agir(() => changerRoleAction(c.id, c.role === 'admin' ? 'user' : 'admin'), 'Rôle modifié.')}>
											{c.role === 'admin' ? 'Passer utilisateur' : 'Passer administrateur'}
										</Button>
										<Button size="sm" variant={c.bloque ? 'outline' : 'destructive'} onClick={() => agir(() => bloquerCompteAction(c.id, !c.bloque), c.bloque ? 'Compte débloqué.' : 'Compte bloqué.')}>
											{c.bloque ? 'Débloquer' : 'Bloquer'}
										</Button>
									</>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			<Dialog open={provisoire !== null} onOpenChange={(ouvert) => { if (!ouvert) setProvisoire(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Mot de passe provisoire</DialogTitle>
						<DialogDescription>
							Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.
						</DialogDescription>
					</DialogHeader>
					<p data-testid="mot-de-passe-provisoire" className="rounded-md bg-muted p-3 text-center font-mono text-lg tracking-wider">{provisoire?.motDePasse}</p>
					<DialogFooter>
						<Button onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast.success('Copié.'); }}>Copier</Button>
						<Button variant="outline" onClick={() => setProvisoire(null)}>Fermer</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
