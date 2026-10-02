/** Un écran : sa barre de titre et son corps (ex-section.screen, .topbar, .body-pad). */
export function Ecran({ titre, sousTitre, actions, contexte, children }: {
	titre: string;
	/** Sous le titre : le surtitre « 6 documents produits… » de l'écran Documents. */
	sousTitre?: React.ReactNode;
	actions?: React.ReactNode;
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
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</div>
				{contexte}
			</div>
			<div className="p-6">{children}</div>
		</section>
	);
}
