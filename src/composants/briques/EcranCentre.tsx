import type { ComponentProps } from 'react';
import { Sigle, SigleDefs } from './Sigle';

/**
 * Un écran hors de l'application, centré (ex-.login) : connexion, mot de passe, erreur, page introuvable.
 * Le titre en grand, son accroche, puis le contenu (un FormulaireCentre ou un bouton) et un pied discret.
 */
export function EcranCentre({ titre, accroche, sigle = false, pied, children }: {
	titre: string;
	accroche: React.ReactNode;
	/** Le sigle devant le titre ; ses définitions viennent avec lui (l'écran est hors de la barre de navigation). */
	sigle?: boolean;
	pied?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<main className="grid min-h-screen grid-cols-1 place-items-center bg-paper px-5 py-8">
			{sigle && <SigleDefs />}
			<div className="flex w-[min(24rem,100%)] flex-col gap-5">
				<div className="flex flex-col gap-1.5">
					<h1 className="flex items-center gap-3 font-titre text-40 leading-none font-bold tracking-[-0.03em]">{sigle && <Sigle taille="grande" />}{titre}</h1>
					<p className="my-3.5 max-w-88 text-14 text-muted">{accroche}</p>
				</div>
				{children}
				{pied && <div className="my-2.75 font-mono text-11 text-faint">{pied}</div>}
			</div>
		</main>
	);
}

/** Le formulaire d'un écran centré, sous un filet (ex-.login-form). */
export function FormulaireCentre(props: Omit<ComponentProps<'form'>, 'className'>) {
	return <form {...props} className="flex flex-col gap-3 border-t border-rule pt-5" />;
}
