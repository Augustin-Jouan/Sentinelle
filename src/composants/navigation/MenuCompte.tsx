'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { deconnexionAction } from '@/actions/session';
import type { UtilisateurConnecte } from '@/auth/session';

/** « Augustin Jouan » → « AJ » (initiales() de la maquette). */
export function initiales(nom: string): string {
	const mots = nom.trim().split(/\s+/).filter(Boolean);
	if (!mots.length) return '—';
	return (mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2)).toUpperCase();
}

export function MenuCompte({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
	const [ouvert, setOuvert] = useState(false);
	const racine = useRef<HTMLDivElement>(null);
	const role = utilisateur.role === 'admin' ? 'Administrateur' : "Maître d'œuvre";

	useEffect(() => {
		if (!ouvert) return;
		const dehors = (e: MouseEvent) => { if (!racine.current?.contains(e.target as Node)) setOuvert(false); };
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
		document.addEventListener('click', dehors);
		document.addEventListener('keydown', touche);
		return () => { document.removeEventListener('click', dehors); document.removeEventListener('keydown', touche); };
	}, [ouvert]);

	const fermer = () => setOuvert(false);
	return (
		<div ref={racine} className={ouvert ? 'compte is-open' : 'compte'}>
			<button type="button" className="avatar" aria-haspopup="menu" aria-expanded={ouvert} title={`${utilisateur.nom} — ${role}`}
				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
				{initiales(utilisateur.nom)}
			</button>
			<div className="compte-menu" role="menu">
				<div className="compte-id">
					<span className="compte-nom">{utilisateur.nom}</span>
					<span className="compte-role">{role}</span>
					<span className="compte-mail">{utilisateur.email}</span>
				</div>
				<hr className="picker-sep" />
				<Link className="compte-item" role="menuitem" href="/mot-de-passe" onClick={fermer}>Changer mon mot de passe</Link>
				{utilisateur.role === 'admin' && (
					<>
						<Link className="compte-item" role="menuitem" href="/parametres" onClick={fermer}>Paramètres</Link>
						<Link className="compte-item" role="menuitem" href="/admin/comptes" onClick={fermer}>Comptes</Link>
					</>
				)}
				<form action={deconnexionAction}>
					<button type="submit" className="compte-item" role="menuitem">Se déconnecter</button>
				</form>
			</div>
		</div>
	);
}
