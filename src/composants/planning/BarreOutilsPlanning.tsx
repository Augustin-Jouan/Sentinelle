'use client';

import { BarreOutils } from '@/composants/briques/BarreOutils';
import { Bouton } from '@/composants/briques/Bouton';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Surtitre } from '@/composants/briques/Surtitre';
import { CLE } from '@/composants/briques/typo';
import type { LotPlanning } from '@/domaine/planningVue';
import { DENSITES, LIBELLES_DENSITES, texteSelection, type Densite } from './geometrie';
import type { Outil } from './preferences';

type Props = {
	resume: string;
	nbSelection: number;
	onDeselectionner: () => void;
	lots: LotPlanning[];
	masques: string[];
	onBasculerLot: (lotId: string) => void;
	onToutAfficher: () => void;
	outil: Outil;
	onOutil: (outil: Outil) => void;
	densite: Densite;
	onDensite: (densite: Densite) => void;
	onAujourdhui: () => void;
};

/** Un bouton d'un groupe segmenté (ex-.zoom-b) : collé à son voisin, plein quand il est choisi. */
const segment = (choisi: boolean, icone = false) => cx(
	'-ml-px cursor-pointer rounded-xs border py-1.25 text-12 first-of-type:ml-0 max-etroit:min-h-11 max-etroit:flex-1',
	icone ? 'px-2 leading-[0] [&_svg]:size-3.75 [&_svg]:stroke-[1.4] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]' : 'px-2.5',
	choisi ? 'border-accent bg-accent font-medium text-on-accent' : 'border-rule-strong bg-raise text-muted hover:bg-idle-soft hover:text-ink');
/**
 * Au doigt seulement : un écran tactile sans aucun pointeur précis. Une tablette à laquelle on a branché une souris ou
 * un trackpad (any-pointer: fine) garde les outils de la souris.
 */
const SANS_SOURIS = 'pointer-coarse:not-any-pointer-fine:hidden';
const AU_DOIGT_SEUL = 'hidden pointer-coarse:not-any-pointer-fine:inline';
/** Un groupe de boutons sous son libellé (ex-.zoom) : l'outil, la densité. */
const Groupe = ({ libelle, auDoigt = true, className, children }: { libelle: string; auDoigt?: boolean; className?: string; children: React.ReactNode }) => (
	<div className={cx('inline-flex items-center gap-2', !auDoigt && SANS_SOURIS, className)} role="group" aria-label={libelle}><span className={CLE}>{libelle}</span>{children}</div>
);

export function BarreOutilsPlanning(p: Props) {
	const caches = p.lots.filter((l) => p.masques.includes(l.id)).length;
	const vus = p.lots.length - caches;
	const outil = (valeur: Outil, libelle: string, icone: React.ReactNode) => (
		<button type="button" className={segment(p.outil === valeur, true)} aria-pressed={p.outil === valeur}
			title={libelle} aria-label={libelle} onClick={() => p.onOutil(valeur)}>
			{icone}
		</button>
	);
	return (
		<BarreOutils etalee>
			<div className="flex min-w-0 flex-col gap-1">
				{/* Le résumé (« 23 périodes · semaine 15… ») cède sa place au Gantt sur un téléphone. */}
				<div className="contents max-etroit:hidden"><Surtitre id="g-resume">{p.resume}</Surtitre></div>
				<span aria-live="polite">
					{p.nbSelection > 1 ? (
						<span className="inline-flex flex-wrap items-center gap-2 rounded-sm bg-accent-soft py-1 pr-1.5 pl-2.5 text-13 whitespace-nowrap text-accent-2">
							<b>{texteSelection(p.nbSelection)}</b>
							<Bouton taille="sm" onClick={p.onDeselectionner}>Désélectionner</Bouton>
						</span>
					) : (
						<>
							{/* Au doigt, ni Maj ni flèches : la consigne dit ce qui marche. */}
							<span className={cx('text-12 whitespace-nowrap text-muted', SANS_SOURIS)}>{texteSelection(p.nbSelection)}</span>
							<span className={cx('text-12 text-muted', AU_DOIGT_SEUL)}>Touchez un lot ou une barre pour modifier ses périodes.</span>
						</>
					)}
				</span>
			</div>
			{/* En étroit : les lots affichés et « Aujourd'hui » sur une ligne, la densité sur la suivante. */}
			<div className="flex flex-wrap items-center gap-3 max-etroit:w-full max-etroit:gap-2">
				<MenuDeroulant id="lots-vus" k="Lots affichés" multi largeur="large" className="self-stretch max-etroit:flex-1"
					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
					options={[
						...(caches ? [{ v: '*', t: 'Tout afficher' }, { sep: true as const }] : []),
						...p.lots.map((l) => ({ v: l.id, t: l.designation || 'Lot sans désignation', meta: l.periodes.length ? `${l.periodes.length} pér.` : '—' })),
					]}
					onChoisir={(v) => (v === '*' ? p.onToutAfficher() : p.onBasculerLot(v))} />
				{/* Main et Cible pilotent la souris ; au doigt, le planning défile et un toucher ouvre le lot. */}
				<Groupe libelle="Outil" auDoigt={false}>
					{outil('main', 'Main — faire glisser le planning', <Icone.Main />)}
					{outil('cible', 'Cible — tracer une période', <Icone.Cible />)}
				</Groupe>
				<Bouton taille="sm" onClick={p.onAujourdhui}>Aujourd&apos;hui</Bouton>
				<Groupe libelle="Densité" className="max-etroit:basis-full">
					{(Object.keys(DENSITES) as Densite[]).map((d) => (
						<button key={d} type="button" className={segment(p.densite === d)} aria-pressed={p.densite === d} onClick={() => p.onDensite(d)}>
							{LIBELLES_DENSITES[d]}
						</button>
					))}
				</Groupe>
			</div>
		</BarreOutils>
	);
}
