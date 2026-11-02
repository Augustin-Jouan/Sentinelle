'use client';

import { useEffect, useRef } from 'react';
import { classesBouton } from './Bouton';
import { useEtroit } from './etroit';

/**
 * Le fac-similé d'un formulaire (Nouveau chantier, Paramètres). Sur ordinateur, il est toujours ouvert à côté des champs
 * et rien ne le signale. Sur un téléphone, il passe sous le formulaire et s'y replie : il allongeait la page de
 * plusieurs écrans pour un aperçu peu utile au doigt ; « Voir l'extrait imprimé » l'ouvre.
 */
export function FeuilleRepliable({ children }: { children: React.ReactNode }) {
	const etroit = useEtroit();
	const repli = useRef<HTMLDetailsElement>(null);
	// Ouvert au rendu serveur (ordinateur) ; replié dès qu'on sait l'écran étroit, rouvert s'il s'élargit.
	useEffect(() => { if (repli.current) repli.current.open = !etroit; }, [etroit]);
	return (
		<details ref={repli} open className="group">
			<summary className="hidden cursor-pointer list-none max-etroit:block [&::-webkit-details-marker]:hidden">
				<span className={classesBouton({})}>
					<span className="group-open:hidden">Voir l&apos;extrait imprimé</span>
					<span className="hidden group-open:inline">Masquer l&apos;extrait imprimé</span>
				</span>
			</summary>
			<div className="max-etroit:mt-3">{children}</div>
		</details>
	);
}
