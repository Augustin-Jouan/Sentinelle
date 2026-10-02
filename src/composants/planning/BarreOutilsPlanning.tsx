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
	'-ml-px cursor-pointer rounded-xs border py-1.25 text-12 first-of-type:ml-0',
	icone ? 'px-2 leading-[0] [&_svg]:size-3.75 [&_svg]:stroke-[1.4] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]' : 'px-2.5',
	choisi ? 'border-accent bg-accent font-medium text-on-accent' : 'border-rule-strong bg-raise text-muted hover:bg-idle-soft hover:text-ink');
/** Un groupe de boutons sous son libellé (ex-.zoom) : l'outil, la densité. */
const Groupe = ({ libelle, children }: { libelle: string; children: React.ReactNode }) => (
	<div className="inline-flex items-center gap-2" role="group" aria-label={libelle}><span className={CLE}>{libelle}</span>{children}</div>
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
				<Surtitre id="g-resume">{p.resume}</Surtitre>
				<span aria-live="polite">
					{p.nbSelection > 1 ? (
						<span className="inline-flex flex-wrap items-center gap-2 rounded-sm bg-accent-soft py-1 pr-1.5 pl-2.5 text-13 whitespace-nowrap text-accent-2">
							<b>{texteSelection(p.nbSelection)}</b>
							<Bouton taille="sm" onClick={p.onDeselectionner}>Désélectionner</Bouton>
						</span>
					) : (
						<span className="text-12 whitespace-nowrap text-muted">{texteSelection(p.nbSelection)}</span>
					)}
				</span>
			</div>
			<div className="flex items-center gap-3">
				<MenuDeroulant id="lots-vus" k="Lots affichés" multi largeur="large" className="self-stretch"
					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
					options={[
						...(caches ? [{ v: '*', t: 'Tout afficher' }, { sep: true as const }] : []),
						...p.lots.map((l) => ({ v: l.id, t: l.designation || 'Lot sans désignation', meta: l.periodes.length ? `${l.periodes.length} pér.` : '—' })),
					]}
					onChoisir={(v) => (v === '*' ? p.onToutAfficher() : p.onBasculerLot(v))} />
				<Groupe libelle="Outil">
					{outil('main', 'Main — faire glisser le planning', <Icone.Main />)}
					{outil('cible', 'Cible — tracer une période', <Icone.Cible />)}
				</Groupe>
				<Bouton taille="sm" onClick={p.onAujourdhui}>Aujourd&apos;hui</Bouton>
				<Groupe libelle="Densité">
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
