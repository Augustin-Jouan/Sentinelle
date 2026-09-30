'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { UtilisateurConnecte } from '@/auth/session';
import * as Icone from '@/composants/maquette/icones';
import { Sigle, SigleDefs } from '@/composants/maquette/Sigle';
import { basculerTheme } from '@/composants/maquette/theme';
import type { VueNavigation } from '@/donnees/navigation';
import { MenuCompte } from './MenuCompte';
import { SelecteurChantier } from './SelecteurChantier';

const ONGLETS = [
	{ suffixe: 'marches', texte: 'Marchés', icone: <Icone.Marches />, compte: 'lots' },
	{ suffixe: 'planning', texte: 'Planning', icone: <Icone.Planning />, compte: 'periodes' },
	{ suffixe: 'documents', texte: 'Documents', icone: <Icone.Documents />, compte: 'documents' },
] as const;

/** header.nav de la maquette. Les onglets n'existent que sur les trois écrans d'un chantier (majOnglets). */
export function BarreNavigation({ utilisateur, navigation, children }: { utilisateur: UtilisateurConnecte; navigation: VueNavigation; children: React.ReactNode }) {
	const chemin = usePathname();
	const { id } = useParams<{ id?: string }>();
	const courant = (id && navigation.chantiers.find((c) => c.id === id)) || null;
	const surChantier = courant !== null && ONGLETS.some((o) => chemin.startsWith(`/chantiers/${courant.id}/${o.suffixe}`));
	const accueil = chemin === '/chantiers';

	return (
		<div className={surChantier ? 'app is-on' : 'app is-on sans-onglets'}>
			<SigleDefs />
			<div className="main">
				<header className="nav">
					<div className="nav-haut">
						<Link className="nav-marque" href="/chantiers" title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle /></Link>
						<Link className={accueil ? 'nav-ic is-on' : 'nav-ic'} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
						<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
						<div className="nav-fin">
							<Link className={chemin.startsWith('/artisans') ? 'nav-b is-on' : 'nav-b'} href="/artisans">
								<Icone.Artisans /><span className="nav-txt">Artisans</span><span className="count">{navigation.artisans}</span>
							</Link>
							<button type="button" className="nav-ic" onClick={basculerTheme} title="Basculer clair / sombre" aria-label="Basculer clair / sombre"><Icone.Soleil /></button>
							<MenuCompte utilisateur={utilisateur} />
						</div>
					</div>
					{courant && (
						<div className="nav-onglets">
							{ONGLETS.map((o) => {
								const href = `/chantiers/${courant.id}/${o.suffixe}`;
								return (
									<Link key={o.suffixe} href={href} className={chemin.startsWith(href) ? 'nav-o is-on' : 'nav-o'}>
										{o.icone}{o.texte}<span className="count">{courant[o.compte]}</span>
									</Link>
								);
							})}
						</div>
					)}
				</header>
				{children}
			</div>
		</div>
	);
}
