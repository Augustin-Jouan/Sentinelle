'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { toast } from 'sonner';
import { bloquerCompteAction, changerRoleAction, creerCompteAction, modifierTelephoneAction, reinitialiserMotDePasseAction } from '@/actions/comptes';
import { ChampEnLigne } from './ChampEnLigne';
import { Bloc } from '@/composants/briques/Bloc';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, Erreur, GrilleChamps, Saisie } from '@/composants/briques/Champ';
import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { Panneau } from '@/composants/briques/Panneau';
import { Pastille } from '@/composants/briques/Pastille';
import { CadreTableau, Tableau } from '@/composants/briques/Tableau';
import { CHIFFRES } from '@/composants/briques/typo';
import type { CompteListe } from '@/donnees/comptes';

const OUVRIR_COMPTE = 'sentinelle:nouveau-compte';
const ROLES = [{ v: 'user', t: 'Utilisateur' }, { v: 'admin', t: 'Administrateur' }] as const;

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
		const saisie = { nom: String(f.get('nom')), email: String(f.get('email')), role };
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
			<CadreTableau>
				<Tableau variante="plain">
					<thead>
						<tr>
							<th>Nom</th><th>E-mail</th><th>Portable</th><th>Rôle</th><th>État</th><th data-droite />
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
									{c.bloque ? <Pastille ton="neutre">Bloqué</Pastille>
										: c.doitChangerMotDePasse ? <Pastille className="ml-1">Mot de passe provisoire</Pastille>
										: <Pastille>Actif</Pastille>}
								</td>
								<td data-droite data-actions>
									<Bouton taille="sm" desactive={enCours} onClick={() => reinitialiser(c)}>Réinitialiser le mot de passe</Bouton>
									{c.id !== moiId && (
										<>
											<Bouton taille="sm" desactive={enCours} onClick={() => agir(() => changerRoleAction(c.id, c.role === 'admin' ? 'user' : 'admin'), 'Rôle modifié.')}>
												{c.role === 'admin' ? 'Passer utilisateur' : 'Passer administrateur'}
											</Bouton>
											<Bouton taille="sm" variante={c.bloque ? 'normal' : 'danger'} desactive={enCours} onClick={() => agir(() => bloquerCompteAction(c.id, !c.bloque), c.bloque ? 'Compte débloqué.' : 'Compte bloqué.')}>
												{c.bloque ? 'Débloquer' : 'Bloquer'}
											</Bouton>
										</>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</Tableau>
			</CadreTableau>

			<Panneau ouvert={creation} surtitre="NOUVEAU COMPTE" titre="Créer un compte" onFermer={() => setCreation(false)}
				pied={<>
					<Bouton type="submit" form="f-compte" variante="primaire" desactive={enCours}>Créer le compte</Bouton>
					<Bouton variante="fantome" onClick={() => setCreation(false)}>Annuler</Bouton>
				</>}>
				<form id="f-compte" onSubmit={creer}>
					<GrilleChamps>
						<Champ libelle="Nom" pour="nom" erreur={erreurs.nom} pleineLargeur><Saisie id="nom" name="nom" required erreur={erreurs.nom} /></Champ>
						<Champ libelle="E-mail" pour="email" erreur={erreurs.email} pleineLargeur><Saisie id="email" name="email" type="email" required erreur={erreurs.email} /></Champ>
						<Champ libelle="Rôle" pleineLargeur><ChoixSegmente libelle="Rôle" options={ROLES} valeur={role} onChoisir={setRole} /></Champ>
						{erreurs.general && <Erreur alerte>{erreurs.general}</Erreur>}
					</GrilleChamps>
				</form>
			</Panneau>

			<Panneau ouvert={provisoire !== null} surtitre="MOT DE PASSE PROVISOIRE" titre={provisoire?.email ?? ''} libelle="Mot de passe provisoire" onFermer={() => {}} sansFermeture
				pied={<>
					<Bouton variante="primaire" onClick={() => { void navigator.clipboard.writeText(provisoire?.motDePasse ?? ''); toast('Copié.'); }}>Copier</Bouton>
					<Bouton variante="fantome" onClick={() => setProvisoire(null)}>Fermer</Bouton>
				</>}>
				<p>Transmettez-le à {provisoire?.email}. Il ne sera plus jamais affiché ; il devra être changé à la première connexion.</p>
				<Bloc><p data-testid="mot-de-passe-provisoire" className={cx(CHIFFRES, 'text-center text-18 tracking-[0.08em]')}>{provisoire?.motDePasse}</p></Bloc>
			</Panneau>
		</>
	);
}

/** « Nouveau compte » de la barre de titre : ouvre la fiche de création. */
export function BoutonNouveauCompte() {
	return (
		<Bouton variante="primaire" onClick={() => window.dispatchEvent(new Event(OUVRIR_COMPTE))}>
			<Icone.Plus />Nouveau compte
		</Bouton>
	);
}
