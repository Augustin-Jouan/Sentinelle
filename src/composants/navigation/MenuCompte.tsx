'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { deconnexionAction } from '@/actions/session';
import type { UtilisateurConnecte } from '@/auth/session';
import { cx } from '@/composants/briques/cx';
import { MENU } from '@/composants/briques/MenuDeroulant';

/** « Augustin Jouan » → « AJ » (initiales() de la maquette). */
export function initiales(nom: string): string {
	const mots = nom.trim().split(/\s+/).filter(Boolean);
	if (!mots.length) return '—';
	return (mots.length > 1 ? mots[0][0] + mots[1][0] : mots[0].slice(0, 2)).toUpperCase();
}

/** Une entrée du menu ; le lien la pose en bloc (flow-root), le bouton de déconnexion garde son flux. */
const ITEM = 'w-full cursor-pointer rounded-[4px] px-2.25 py-1.75 text-left text-13 text-ink-2 no-underline hover:bg-idle-soft hover:text-ink';

/** Le compte (ex-.compte) : ce qui n'a pas sa place dans la navigation. */
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
		<div ref={racine} className="relative ml-1 flex-none">
			<button type="button" aria-label="Mon compte" aria-haspopup="menu" aria-expanded={ouvert} title={`${utilisateur.nom} — ${role}`}
				className="grid size-7.5 cursor-pointer place-items-center rounded-full bg-accent-soft font-titre text-11 font-semibold tracking-[0.02em] text-accent-2 hover:bg-accent hover:text-on-accent"
				onClick={(e) => { e.stopPropagation(); setOuvert((o) => !o); }}>
				{initiales(utilisateur.nom)}
			</button>
			<div role="menu" className={cx('absolute top-[calc(100%+0.375rem)] right-0 z-30 w-56 rounded-sm border border-rule-strong bg-raise p-0.75 shadow-ombre-h', !ouvert && 'hidden')}>
				<div className="px-2.25 pt-2 pb-1.75">
					<div className="text-13 font-medium">{utilisateur.nom}</div>
					<div className="text-11 text-faint">{role}</div>
					<div className="mt-0.75 font-mono text-10 text-faint">{utilisateur.email}</div>
				</div>
				<hr className={MENU.separateur} />
				<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/mot-de-passe" onClick={fermer}>Changer mon mot de passe</Link>
				{utilisateur.role === 'admin' && (
					<>
						<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/parametres" onClick={fermer}>Paramètres</Link>
						<Link className={cx(ITEM, 'flow-root')} role="menuitem" href="/admin/comptes" onClick={fermer}>Comptes</Link>
					</>
				)}
				<form action={deconnexionAction}>
					<button type="submit" className={ITEM} role="menuitem">Se déconnecter</button>
				</form>
			</div>
		</div>
	);
}
