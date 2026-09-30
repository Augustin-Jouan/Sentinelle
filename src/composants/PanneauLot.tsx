'use client';

import Decimal from 'decimal.js';
import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { ajouterAvenantAction, modifierAvenantAction, supprimerAvenantAction } from '@/actions/avenants';
import { changerNatureAction, modifierChampLotAction, supprimerLotAction } from '@/actions/lots';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { LotVue, VueMarches } from '@/donnees/marches';
import { confirmationSuppression, numeroAvenantTexte } from '@/domaine/avenants';
import { CERTIFICAT_IMPOSSIBLE } from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie, formatTauxSaisie, htEngage } from '@/domaine/montants';
import { formatDateCalendaire, LIBELLES_MANQUES } from '@/domaine/regles';
import { ChampEnLigne } from './ChampEnLigne';
import { MenuArtisan } from './MenuArtisan';

/** « + 850,00 € » ou « − 300,00 € » (spec § 5). */
function signe(v: string): string {
	const d = new Decimal(v);
	return `${d.isNegative() && !d.isZero() ? '−' : '+'} ${formatEuros(d.abs())}`;
}

type Avenant = LotVue['avenants'][number];

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
	const avecAvenants = lot.avenants.length > 0;

	function ajouterAvenant() {
		demarrer(async () => {
			const r = await ajouterAvenantAction(lot.id);
			if (r.ok) toast.success(r.donnees.message);
			else toast.error(r.erreur);
		});
	}

	function supprimerAvenant(a: Avenant) {
		const autres = lot.avenants.filter((x) => x.id !== a.id);
		if (!window.confirm(confirmationSuppression(a.numero, lot.htInitial, autres))) return;
		agir(() => supprimerAvenantAction(a.id));
	}

	return (
		<Sheet open onOpenChange={(ouvert) => { if (!ouvert) onFermer(); }}>
			<SheetContent className="w-[34rem] overflow-y-auto sm:max-w-[34rem]">
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
							<dt>{avecAvenants ? 'Montant initial HT' : 'Montant HT'}</dt>
							<dd><ChampEnLigne libelle="Montant HT du marché" alignement="droite" valeur={formatMontantSaisie(lot.htInitial)} enregistrer={champ('montantHt')} /></dd>
							<dt>T.V.A. (%)</dt>
							<dd><ChampEnLigne libelle="Taux de T.V.A." alignement="droite" valeur={formatTauxSaisie(lot.tauxTva)} enregistrer={champ('tauxTva')} /></dd>
							{avecAvenants && (
								<>
									<dt>Avenants</dt>
									<dd className="px-1.5 text-right font-mono tabular-nums" data-testid="somme-avenants">{signe(lot.sommeAvenants)}</dd>
								</>
							)}
							<dt className="font-semibold">{avecAvenants ? 'Montant actuel TTC' : 'Montant TTC'}</dt>
							<dd>
								<ChampEnLigne libelle="Montant TTC du marché" alignement="droite" className="font-semibold" valeur={formatMontantSaisie(lot.ttcEngage)} enregistrer={champ('montantTtc')} />
								{avecAvenants && <p className="px-1.5 text-right text-xs text-muted-foreground">avenants compris : le montant initial HT est recalculé</p>}
							</dd>
							<dt>Retenue de garantie (%)</dt>
							<dd className="flex items-center gap-2">
								<ChampEnLigne libelle="Taux de retenue de garantie" alignement="droite" valeur={formatTauxSaisie(lot.retenueGarantie)} enregistrer={champ('retenueGarantie')} />
								<span className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatEuros(htEngage(lot.htInitial, lot.sommeAvenants).times(lot.retenueGarantie).div(100))}</span>
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
								<Link href={`?apercu=${lot.id}`} scroll={false} className={buttonVariants()} onClick={onFermer}>Ouvrir le marché</Link>
							)}
							<Button variant="destructive" disabled={enCours} onClick={() => agir(() => supprimerLotAction(lot.id), onFermer)}>Supprimer le lot</Button>
						</div>
					</section>

					<section className="space-y-2">
						<div className="flex items-center justify-between">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Avenants</h3>
							<Button size="sm" variant="outline" disabled={enCours} onClick={ajouterAvenant}>Ajouter un avenant</Button>
						</div>
						{avecAvenants ? (
							<table className="w-full text-xs">
								<thead>
									<tr className="text-left text-muted-foreground">
										<th className="w-8 py-1">N°</th><th className="py-1">Devis</th>
										<th className="w-28 py-1 text-right">Montant HT</th><th className="w-32 py-1">Date</th><th />
									</tr>
								</thead>
								<tbody>
									{lot.avenants.map((a) => {
										const n = numeroAvenantTexte(a.numero);
										return (
											<tr key={a.id} data-avenant={n} className="border-t">
												<td className="py-1 font-mono">{n}</td>
												<td><ChampEnLigne libelle={`Devis de l'avenant n° ${n}`} placeholder="n° du devis" valeur={a.devis} enregistrer={modifierAvenantAction.bind(null, a.id, 'devis')} /></td>
												<td><ChampEnLigne libelle={`Montant HT de l'avenant n° ${n}`} alignement="droite" valeur={formatMontantSaisie(a.montantHt)} enregistrer={modifierAvenantAction.bind(null, a.id, 'montantHt')} /></td>
												<td><ChampEnLigne libelle={`Date de l'avenant n° ${n}`} type="date" valeur={a.date} enregistrer={modifierAvenantAction.bind(null, a.id, 'date')} /></td>
												<td className="whitespace-nowrap text-right">
													<Link href={`?avenant=${a.id}`} scroll={false} onClick={onFermer} aria-label={`Ouvrir la lettre de l'avenant n° ${n}`}
														className={buttonVariants({ size: 'sm', variant: 'ghost' })}>Ouvrir</Link>
													<Button size="sm" variant="ghost" disabled={enCours} aria-label={`Supprimer l'avenant n° ${n}`} onClick={() => supprimerAvenant(a)}>Supprimer</Button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						) : (
							<p className="text-xs text-muted-foreground">Aucun avenant. Le marché vaut son montant d&apos;origine.</p>
						)}
						<p className="text-xs text-muted-foreground">
							Un montant négatif est une moins-value. Le marché imprimé garde son montant d&apos;origine ; c&apos;est l&apos;avenant qui porte la différence.
						</p>
					</section>

					<section className="space-y-2">
						<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certificats de paiement</h3>
						{!lot.certificat.possible && <p className="text-xs text-muted-foreground">{CERTIFICAT_IMPOSSIBLE}</p>}
						<div className="flex flex-wrap gap-2">
							{lot.certificat.possible ? (
								<Link href={`?certificat=${lot.id}`} scroll={false} onClick={onFermer} className={buttonVariants({ variant: 'outline' })}>Certificat de paiement</Link>
							) : (
								<Button variant="outline" disabled>Certificat de paiement</Button>
							)}
							{lot.certificat.dernier && (
								<Link href={`?corriger=${lot.certificat.dernier.id}`} scroll={false} onClick={onFermer} className={buttonVariants({ variant: 'outline' })}>
									{`Corriger le certificat n° ${String(lot.certificat.dernier.numero).padStart(2, '0')}`}
								</Link>
							)}
						</div>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
