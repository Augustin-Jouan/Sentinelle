'use client';

import { Crosshair, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LotPlanning } from '@/domaine/planningVue';
import { cn } from '@/lib/utils';
import { DENSITES, LIBELLES_DENSITES, texteSelection, type Densite } from './geometrie';
import { MenuLotsAffiches } from './MenuLotsAffiches';
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
	const outil = (valeur: Outil, libelle: string, icone: React.ReactNode) => (
		<button type="button" className={cn('zoom-b zoom-ic', p.outil === valeur && 'is-on')} aria-pressed={p.outil === valeur}
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
							<Button size="sm" variant="outline" onClick={p.onDeselectionner}>Désélectionner</Button>
						</span>
					) : (
						<span className="g-sel-aide">{texteSelection(p.nbSelection)}</span>
					)}
				</span>
			</div>
			<div className="g-outils">
				<MenuLotsAffiches lots={p.lots} masques={p.masques} onBasculer={p.onBasculerLot} onToutAfficher={p.onToutAfficher} />
				<div className="zoom" role="group" aria-label="Outil">
					<span className="zoom-lbl">Outil</span>
					{outil('main', 'Main — faire glisser le planning', <Hand />)}
					{outil('cible', 'Cible — tracer une période', <Crosshair />)}
				</div>
				<Button size="sm" variant="outline" onClick={p.onAujourdhui}>Aujourd&apos;hui</Button>
				<div className="zoom" role="group" aria-label="Densité">
					<span className="zoom-lbl">Densité</span>
					{(Object.keys(DENSITES) as Densite[]).map((d) => (
						<button key={d} type="button" className={cn('zoom-b', p.densite === d && 'is-on')} aria-pressed={p.densite === d} onClick={() => p.onDensite(d)}>
							{LIBELLES_DENSITES[d]}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
