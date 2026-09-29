'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { formatEuros, formatMontantSaisie, formatTauxSaisie, htEngage } from '@/domaine/montants';
import { formatDateCalendaire, LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';
import { MenuArtisan } from './MenuArtisan';

export function PanneauLot({ lot, vue, onFermer }: { lot: LotVue; vue: VueMarches; onFermer: () => void }) {
	const [enCours, demarrer] = useTransition();
	const artisan = vue.artisans.find((a) => a.id === lot.artisanId);
	const champ = (c: 'montantHt' | 'tauxTva' | 'montantTtc' | 'retenueGarantie' | 'dateSignature') => modifierChampLotAction.bind(null, lot.id, c);
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, apres?: () => void) => demarrer(async () => {
		const r = await fn();
		if (r.ok) apres?.();
		else toast.error(r.erreur);
	});
	const dateChantier = vue.dateSignatureChantier ? formatDateCalendaire(new Date(`${vue.dateSignatureChantier}T00:00:00Z`)) : 'non fixée';

	return (
		<Sheet open onOpenChange={(ouvert) => { if (!ouvert) onFermer(); }}>
			<SheetContent className="w-[26rem] overflow-y-auto sm:max-w-[26rem]">
				<SheetHeader>
					<SheetDescription>{lot.numero ? `LOT ${lot.numero}` : 'LOT NON NUMÉROTÉ'}</SheetDescription>
					<SheetTitle>{lot.designation}</SheetTitle>
				</SheetHeader>
				<div className="space-y-6 p-4 text-sm">
					<div className="flex gap-2" role="radiogroup" aria-label="Nature du marché">
						{(['GRE_A_GRE', 'SOUS_TRAITANCE'] as const).map((n) => (
							<Button key={n} size="sm" role="radio" aria-checked={lot.nature === n} variant={lot.nature === n ? 'default' : 'outline'}
								disabled={enCours} onClick={() => lot.nature !== n && agir(() => changerNatureAction(lot.id, n))}>
								{n === 'GRE_A_GRE' ? 'Gré à gré' : 'Sous-traitance'}
							</Button>
						))}
					</div>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entreprise</h3>
						<MenuArtisan lotId={lot.id} artisanId={lot.artisanId} artisans={vue.artisans} />
						{artisan && (
							<dl className="grid grid-cols-[7rem_1fr] gap-1 text-xs">
								<dt className="text-muted-foreground">Adresse</dt><dd>{artisan.adresseComplete || '—'}</dd>
								<dt className="text-muted-foreground">Interlocuteur</dt><dd>{artisan.interlocuteur || '—'}</dd>
								<dt className="text-muted-foreground">Téléphone</dt><dd className="font-mono">{artisan.telephone || '—'}</dd>
							</dl>
						)}
					</section>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marché</h3>
						<dl className="grid grid-cols-[9rem_1fr] items-center gap-x-3 gap-y-1">
							<dt>Montant HT</dt>
							<dd><ChampEnLigne libelle="Montant HT du marché" alignement="droite" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
							<dt>T.V.A. (%)</dt>
							<dd><ChampEnLigne libelle="Taux de T.V.A." alignement="droite" valeur={formatTauxSaisie(lot.tauxTva)} enregistrer={champ('tauxTva')} /></dd>
							<dt className="font-semibold">Montant TTC</dt>
							<dd><ChampEnLigne libelle="Montant TTC du marché" alignement="droite" className="font-semibold" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} /></dd>
							<dt>Retenue de garantie (%)</dt>
							<dd className="flex items-center gap-2">
								<ChampEnLigne libelle="Taux de retenue de garantie" alignement="droite" valeur={formatTauxSaisie(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
								<span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatEuros(htEngage(lot.htInitial).times(lot.retenueGarantie).div(100))}</span>
							</dd>
							<dt>Exemplaires</dt>
							<dd>{lot.exemplaires} — {lot.nature === 'SOUS_TRAITANCE' ? 'entreprise, SOCOREVE' : "entreprise, SOCOREVE, maître d'ouvrage"}</dd>
							<dt>Signé le</dt>
							<dd>
								<ChampEnLigne libelle="Date de signature de ce marché" type="date" valeur={lot.dateSignature} enregistrer={champ('dateSignature')} />
								{!lot.dateSignature && <p className="px-1.5 text-xs text-muted-foreground">à défaut, {dateChantier} — la date du chantier</p>}
							</dd>
						</dl>
					</section>

					<section className="space-y-2">
						{lot.manques.length > 0 && (
							<p className="text-xs text-muted-foreground">Pour générer le marché : {lot.manques.map((m) => LIBELLES_MANQUES[m]).join(', ')}.</p>
						)}
						<div className="flex gap-2">
							{lot.manques.length > 0 ? (
								<Button disabled>Ouvrir le marché</Button>
							) : (
								<Link href={`?apercu=${lot.id}`} scroll={false} className={buttonVariants()}>Ouvrir le marché</Link>
							)}
							<Button variant="destructive" disabled={enCours} onClick={() => agir(() => supprimerLotAction(lot.id), onFermer)}>Supprimer le lot</Button>
						</div>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
