'use client';

import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
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

export function BarreOutilsPlanning(p: Props) {
	const caches = p.lots.filter((l) => p.masques.includes(l.id)).length;
	const vus = p.lots.length - caches;
	const outil = (valeur: Outil, libelle: string, icone: React.ReactNode) => (
		<button type="button" className={p.outil === valeur ? 'zoom-b zoom-ic is-on' : 'zoom-b zoom-ic'} aria-pressed={p.outil === valeur}
			title={libelle} aria-label={libelle} onClick={() => p.onOutil(valeur)}>
			{icone}
		</button>
	);
	return (
		<div className="toolbar g-toolbar">
			<div className="g-tete-g">
				<span className="eyebrow" id="g-resume">{p.resume}</span>
				<span aria-live="polite">
					{p.nbSelection > 1 ? (
						<span className="g-sel">
							<b>{texteSelection(p.nbSelection)}</b>
							<button type="button" className="btn btn-sm" onClick={p.onDeselectionner}>Désélectionner</button>
						</span>
					) : (
						<span className="g-sel-aide">{texteSelection(p.nbSelection)}</span>
					)}
				</span>
			</div>
			<div className="g-outils">
				<MenuDeroulant id="lots-vus" k="Lots affichés" multi largeur="large" className="self-stretch"
					valeurs={p.lots.filter((l) => !p.masques.includes(l.id)).map((l) => l.id)}
					libelle={caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${p.lots.length}` : 'Tous les lots'}
					options={[
						...(caches ? [{ v: '*', t: 'Tout afficher' }, { sep: true as const }] : []),
						...p.lots.map((l) => ({ v: l.id, t: l.designation || 'Lot sans désignation', meta: l.periodes.length ? `${l.periodes.length} pér.` : '—' })),
					]}
					onChoisir={(v) => (v === '*' ? p.onToutAfficher() : p.onBasculerLot(v))} />
				<div className="zoom" role="group" aria-label="Outil">
					<span className="zoom-lbl">Outil</span>
					{outil('main', 'Main — faire glisser le planning', <Icone.Main />)}
					{outil('cible', 'Cible — tracer une période', <Icone.Cible />)}
				</div>
				<button type="button" className="btn btn-sm" onClick={p.onAujourdhui}>Aujourd&apos;hui</button>
				<div className="zoom" role="group" aria-label="Densité">
					<span className="zoom-lbl">Densité</span>
					{(Object.keys(DENSITES) as Densite[]).map((d) => (
						<button key={d} type="button" className={p.densite === d ? 'zoom-b is-on' : 'zoom-b'} aria-pressed={p.densite === d} onClick={() => p.onDensite(d)}>
							{LIBELLES_DENSITES[d]}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
