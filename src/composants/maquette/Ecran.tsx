/** Un écran de la maquette : section.screen, sa barre de titre (.topbar) et son corps (.body-pad). */
export function Ecran({ titre, sousTitre, actions, contexte, children }: {
	titre: string;
	/** Sous le titre : le surtitre « 6 documents produits… » de l'écran Documents. */
	sousTitre?: React.ReactNode;
	actions?: React.ReactNode;
	/** Le bandeau .context du chantier (Marchés, Planning). */
	contexte?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="screen is-on">
			<div className="topbar">
				<div className="topbar-row">
					<div>
						<h1 className="page-title">{titre}</h1>
						{sousTitre}
					</div>
					{actions && <div className="topbar-actions">{actions}</div>}
				</div>
				{contexte}
			</div>
			<div className="body-pad">{children}</div>
		</section>
	);
}
