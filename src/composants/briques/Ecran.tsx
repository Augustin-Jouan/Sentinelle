import { Children } from 'react';
import { ActionsEcran } from './ActionsEcran';

/** Un écran : sa barre de titre et son corps (ex-section.screen, .topbar, .body-pad). */
export function Ecran({ titre, sousTitre, principale, actions, replier, contexte, children }: {
	titre: string;
	/** Sous le titre : le surtitre « 6 documents produits… » de l'écran Documents. */
	sousTitre?: React.ReactNode;
	/** L'action principale, avant les autres ; sur un téléphone, elle flotte en bas à droite (ActionsEcran). */
	principale?: React.ReactNode;
	actions?: React.ReactNode;
	/** Sur un téléphone, les actions autres que la principale se replient derrière « ⋯ ». */
	replier?: boolean;
	/** Le bandeau du chantier (Marchés, Planning). */
	contexte?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section>
			<div className="border-b border-rule bg-paper">
				<div className="flex flex-wrap items-end justify-between gap-6 px-6 pt-4 pb-3.5">
					<div>
						<h1 className="text-22">{titre}</h1>
						{sousTitre}
					</div>
					{actions || principale ? <ActionsEcran principale={principale} actions={actions} replier={replier} /> : null}
				</div>
				{contexte ? <div className="w-full">{contexte}</div> : null}
			</div>
			{/* L'action principale flotte sur un téléphone : le corps garde de quoi faire défiler sa dernière ligne au-dessus. */}
			<div className={principale ? 'p-6 max-etroit:pb-24' : 'p-6'}>{Children.toArray(children)}</div>
		</section>
	);
}
