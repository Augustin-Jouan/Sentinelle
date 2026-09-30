'use client';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { LotPlanning } from '@/domaine/planningVue';

type Props = { lots: LotPlanning[]; masques: string[]; onBasculer: (lotId: string) => void; onToutAfficher: () => void };

/** Masquer n'est qu'un choix d'affichage : l'axe reste celui du chantier entier, l'impression garde tous les lots. */
export function MenuLotsAffiches({ lots, masques, onBasculer, onToutAfficher }: Props) {
	const caches = lots.filter((l) => masques.includes(l.id)).length;
	const vus = lots.length - caches;
	return (
		<Popover>
			<PopoverTrigger render={<Button size="sm" variant="outline" />}>
				{caches ? `${vus} lot${vus > 1 ? 's' : ''} sur ${lots.length}` : 'Tous les lots'}
			</PopoverTrigger>
			<PopoverContent align="end" className="planning w-80" data-bloque-clavier="">
				<p className="eyebrow">Lots affichés</p>
				{caches > 0 && <Button size="sm" variant="ghost" onClick={onToutAfficher}>Tout afficher</Button>}
				<ul className="max-h-80 space-y-1 overflow-y-auto">
					{lots.map((l) => (
						<li key={l.id}>
							<label className="flex items-center gap-2 text-sm">
								<input type="checkbox" checked={!masques.includes(l.id)} onChange={() => onBasculer(l.id)} />
								<span className="min-w-0 flex-1 truncate">{l.designation || 'Lot sans désignation'}</span>
								<span className="font-mono text-xs text-muted-foreground">{l.periodes.length ? `${l.periodes.length} pér.` : '—'}</span>
							</label>
						</li>
					))}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
