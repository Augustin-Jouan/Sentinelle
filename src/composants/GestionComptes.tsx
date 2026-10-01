'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { bloquerCompteAction, changerRoleAction, creerCompteAction, modifierTelephoneAction, reinitialiserMotDePasseAction } from '@/actions/comptes';
import { ChampEnLigne } from './ChampEnLigne';
import * as Icone from '@/composants/maquette/icones';
import { Panneau } from '@/composants/maquette/Panneau';
import type { CompteListe } from '@/donnees/comptes';

const OUVRIR_COMPTE = 'sentinelle:nouveau-compte';

export function GestionComptes({ comptes, moiId }: { comptes: CompteListe[]; moiId: string }) {
	const [provisoire, setProvisoire] = useState<{ email: string; motDePasse: string } | null>(null);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();
	const [creation, setCreation] = useState(false);
	const [role, setRole] = useState<'user' | 'admin'>('user');

	useEffect(() => {
		const ouvrir = () => setCreation(true);
		window.addEventListener(OUVRIR_COMPTE, ouvrir);
		return () => window.removeEventListener(OUVRIR_COMPTE, ouvrir);
	}, []);

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
				setRole('user');
				setCreation(false);
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
		<>
			<div className="table-frame">
				<table className="plain">
					<thead>
						<tr>
							<th>Nom</th><th>E-mail</th><th>Portable</th><th>Rôle</th><th>État</th><th className="ta-r" />
						</tr>
					</thead>
					<tbody>
						{comptes.map((c) => (
							<tr key={c.id}>
								<td>{c.nom}</td>
								<td>{c.email}</td>
								<td>
									<ChampEnLigne variante="texte" libelle={`Portable de ${c.nom}`} type="tel" placeholder="06 …" valeur={c.telephone}
										enregistrer={modifierTelephoneAction.bind(null, c.id)} />
								</td>
								<td>{c.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</td>
								<td>
									{c.bloque ? <span className="pill pill-fini">Bloqué</span>
										: c.doitChangerMotDePasse ? <span className="pill pill-modif">Mot de passe provisoire</span>
										: <span className="pill pill-actif">Actif</span>}
								</td>
								<td className="ta-r nowrap cell-actions">
									<button type="button" className="btn btn-sm" disabled={enCours} onClick={() => reinitialiser(c)}>Réinitialiser le mot de passe</button>
									{c.id !== moiId && (
										<>
											<button type="button" className="btn btn-sm" disabled={enCours} onClick={() => agir(() => changerRoleAction(c.id, c.role === 'admin' ? 'user' : 'admin'), 'Rôle modifié.')}>
												{c.role === 'admin' ? 'Passer utilisateur' : 'Passer administrateur'}
											</button>
											<button type="button" className={c.bloque ? 'btn btn-sm' : 'btn btn-sm btn-danger'} disabled={enCours} onClick={() => agir(() => bloquerCompteAction(c.id, !c.bloque), c.bloque ? 'Compte débloqué.' : 'Compte bloqué.')}>
												{c.bloque ? 'Débloquer' : 'Bloquer'}
											</button>
										</>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Panneau ouvert={creation} surtitre="NOUVEAU COMPTE" titre="Créer un compte" onFermer={() => setCreation(false)}
				pied={<>
					<button type="submit" form="f-compte" className="btn btn-primary" disabled={enCours}>Créer le compte</button>
					<button type="button" className="btn btn-ghost" onClick={() => setCreation(false)}>Annuler</button>
				</>}>
				<form id="f-compte" onSubmit={creer} className="grid-2">
					<div className="field span"><label htmlFor="nom">Nom</label><input id="nom" name="nom" required className={erreurs.nom ? 'est-erreur' : undefined} />{erreurs.nom && <span className="erreur">{erreurs.nom}</span>}</div>
					<div className="field span"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required className={erreurs.email ? 'est-erreur' : undefined} />{erreurs.email && <span className="erreur">{erreurs.email}</span>}</div>
					<div className="field span">
						<label>Rôle</label>
						<div className="radio-row" role="radiogroup" aria-label="Rôle">
							{(['user', 'admin'] as const).map((r) => (
								<label key={r} className={role === r ? 'is-on' : undefined}><input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} /> {r === 'admin' ? 'Administrateur' : 'Utilisateur'}</label>
							))}
						</div>
					</div>
					{erreurs.general && <p role="alert" className="erreur">{erreurs.general}</p>}
				</form>
			</Panneau>

			<Panneau ouvert={provisoire !== null} surtitre="MOT DE PASSE PROVISOIRE" titre={provisoire?.email ?? ''} libelle="Mot de passe provisoire" onFermer={() => {}} sansFermeture
				pied={<>
					<button type="button" className="btn btn-primary" onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast('Copié.'); }}>Copier</button>
					<button type="button" className="btn btn-ghost" onClick={() => setProvisoire(null)}>Fermer</button>
				</>}>
				<p className="hint" style={{ margin: 0 }}>Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.</p>
				<div className="block"><div className="block-body num" data-testid="mot-de-passe-provisoire" style={{ fontSize: '1.125rem', letterSpacing: '0.08em', textAlign: 'center' }}>{provisoire?.motDePasse}</div></div>
			</Panneau>
		</>
	);
}

/** « Nouveau compte » de la barre de titre : ouvre la fiche de création. */
export function BoutonNouveauCompte() {
	return (
		<button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event(OUVRIR_COMPTE))}>
			<Icone.Plus />Nouveau compte
		</button>
	);
}
