'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import type { UtilisateurConnecte } from '@/auth/session';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { BarreOnglets, Onglet } from '@/composants/briques/Onglet';
import { Sigle, SigleDefs } from '@/composants/briques/Sigle';
import { basculerTheme } from '@/composants/briques/theme';
import type { VueNavigation } from '@/donnees/navigation';
import { MenuCompte } from './MenuCompte';
import { SelecteurChantier } from './SelecteurChantier';

const ONGLETS = [
	{ suffixe: 'marches', texte: 'Marchés', icone: <Icone.Marches />, compteur: 'lots' },
	{ suffixe: 'planning', texte: 'Planning', icone: <Icone.Planning />, compteur: 'periodes' },
	{ suffixe: 'documents', texte: 'Documents', icone: <Icone.Documents />, compteur: 'documents' },
] as const;

/** Une icône ronde de la barre (ex-.nav-ic) : l'accueil, le thème. */
const ICONE = 'inline-flex size-8 flex-none items-center justify-center rounded-full [&_svg]:size-4 [&_svg]:stroke-[1.5]';
const ICONE_AU_REPOS = 'text-muted hover:bg-idle-soft hover:text-ink';
const ICONE_ACTIVE = 'bg-accent-soft text-accent-2';

/** La barre de navigation (ex-header.nav). Les onglets n'existent que sur les trois écrans d'un chantier (majOnglets). */
export function BarreNavigation({ utilisateur, navigation, children }: { utilisateur: UtilisateurConnecte; navigation: VueNavigation; children: React.ReactNode }) {
	const chemin = usePathname();
	const { id } = useParams<{ id?: string }>();
	const courant = (id && navigation.chantiers.find((c) => c.id === id)) || null;
	const surChantier = courant !== null && ONGLETS.some((o) => chemin.startsWith(`/chantiers/${courant.id}/${o.suffixe}`));
	const accueil = chemin === '/chantiers';
	const artisans = chemin.startsWith('/artisans');

	return (
		<div className="flex min-h-screen min-w-0 flex-col">
			<SigleDefs />
			{/* Deux étages : au-dessus du filet ce qui vaut partout, en dessous ce qui appartient au chantier ouvert. */}
			{/* Couché (paysage:), le téléphone n'a pas la hauteur de garder l'en-tête collé : il part avec la page. */}
			<header className="sticky top-0 z-25 border-b border-rule bg-surface paysage:static">
				<div className="flex min-h-13 items-center gap-3.5 px-6 py-1.5 max-etroit:gap-2 max-etroit:px-3.5 max-etroit:py-2">
					<Link className="group inline-flex flex-none items-center justify-center rounded-sm px-1 py-0.5 hover:bg-idle-soft max-etroit:min-h-11 max-etroit:min-w-11" href="/chantiers"
						title="Sentinelle — revenir à l'accueil" aria-label="Sentinelle — revenir à l'accueil"><Sigle survol /></Link>
					{/* En étroit, le sigle suffit pour revenir à l'accueil : la maison laisse sa place au sélecteur. */}
					<Link className={cx(ICONE, accueil ? ICONE_ACTIVE : ICONE_AU_REPOS, 'max-etroit:hidden')} href="/chantiers" title="Tous les chantiers" aria-label="Tous les chantiers"><Icone.Maison /></Link>
					<SelecteurChantier chantiers={navigation.chantiers} courant={surChantier ? courant : null} />
					<div className="ml-auto flex items-center gap-0.75">
						<Link href="/artisans" className={cx('inline-flex items-center gap-1.75 rounded-full px-3 py-1.75 text-13 whitespace-nowrap transition-[background-color,color] duration-120',
							'[&_svg]:size-4 [&_svg]:flex-none [&_svg]:stroke-[1.5] [&_svg]:opacity-80 max-etroit:min-h-11 max-etroit:px-2.5',
							artisans ? 'bg-accent-soft font-semibold text-accent-2' : 'text-ink-2 hover:bg-idle-soft hover:text-ink')}>
							<Icone.Artisans /><span className="max-etroit:hidden">Artisans</span>
							<span className={cx('font-mono text-11', artisans ? 'text-accent-2 opacity-75' : 'text-faint')}>{navigation.artisans}</span>
						</Link>
						{/* En étroit, le thème passe dans le menu du compte : la barre garde ses cibles de 44 px. */}
						<button type="button" className={cx(ICONE, ICONE_AU_REPOS, 'cursor-pointer max-etroit:hidden')} onClick={basculerTheme} title="Basculer clair / sombre" aria-label="Basculer clair / sombre"><Icone.Soleil /></button>
						<MenuCompte utilisateur={utilisateur} />
					</div>
				</div>
				{surChantier && courant && (
					<BarreOnglets libelle="Écrans du chantier">
						{ONGLETS.map((o) => {
							const href = `/chantiers/${courant.id}/${o.suffixe}`;
							return <Onglet key={o.suffixe} href={href} actif={chemin.startsWith(href)} icone={o.icone} compteur={courant[o.compteur]}>{o.texte}</Onglet>;
						})}
					</BarreOnglets>
				)}
			</header>
			{children}
		</div>
	);
}
