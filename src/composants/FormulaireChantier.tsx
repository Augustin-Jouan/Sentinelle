'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type FormEvent } from 'react';
import { creerChantierAction } from '@/actions/chantiers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Props = { chargesAffaire: { id: string; nom: string }[]; moiId: string };

export function FormulaireChantier({ chargesAffaire, moiId }: Props) {
	const router = useRouter();
	const [surPlace, setSurPlace] = useState(false);
	const [lotsDeBase, setLotsDeBase] = useState(true);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();

	function soumettre(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const t = (nom: string) => String(f.get(nom) ?? '');
		demarrer(async () => {
			const r = await creerChantierAction({
				reference: t('reference'), maitreOuvrage: t('maitreOuvrage'), adresseClient: t('adresseClient'),
				natureTravaux: t('natureTravaux'), adresse: t('adresse'), cp: t('cp'), commune: t('commune'),
				clientHabiteSurPlace: surPlace, mission: t('mission') === 'PARTIELLE' ? 'PARTIELLE' : 'COMPLETE',
				dateSignaturePrevue: t('dateSignaturePrevue'), chargeAffaireId: t('chargeAffaireId'), partirDesLotsDeBase: lotsDeBase,
			});
			if (r.ok) router.push(`/chantiers/${r.donnees.id}/marches`);
			else setErreurs(r.champs ?? { general: r.erreur });
		});
	}

	const champ = (nom: string, libelle: string, aide?: string, props: React.ComponentProps<typeof Input> = {}) => (
		<div className="space-y-1">
			<Label htmlFor={nom}>{libelle}</Label>
			<Input id={nom} name={nom} aria-invalid={Boolean(erreurs[nom])} {...props} />
			{aide && <p className="text-xs text-muted-foreground">{aide}</p>}
			{erreurs[nom] && <p className="text-sm text-destructive">{erreurs[nom]}</p>}
		</div>
	);

	return (
		<form onSubmit={soumettre} className="max-w-3xl space-y-8 rounded-xl border bg-card p-6">
			<fieldset className="space-y-3">
				<legend className="font-titre text-lg font-semibold">Client</legend>
				{champ('maitreOuvrage', 'Nom du client', 'Imprimé sous la mention « Maître d\'Ouvrage » dans les marchés.', { required: true })}
				<div className="flex items-center gap-2 text-sm">
					<Switch checked={surPlace} onCheckedChange={setSurPlace} aria-label="Client déjà sur place" />
					<button type="button" className="text-left" onClick={() => setSurPlace((v) => !v)}>
						Le client habite déjà à l&apos;adresse du chantier
					</button>
				</div>
				{!surPlace && champ('adresseClient', 'Adresse actuelle du client', 'Là où lui écrire aujourd\'hui — pas le chantier. Imprimée sous « Demeurant ».')}
			</fieldset>
			<fieldset className="space-y-3">
				<legend className="font-titre text-lg font-semibold">Chantier</legend>
				{champ('natureTravaux', 'Nature des travaux')}
				{champ('adresse', 'Adresse du chantier', 'Imprimée sous « Située » sur les marchés.')}
				<div className="grid grid-cols-[8rem_1fr] gap-3">{champ('cp', 'Code postal')}{champ('commune', 'Commune')}</div>
			</fieldset>
			<fieldset className="space-y-3">
				<legend className="font-titre text-lg font-semibold">Mission</legend>
				<div className="flex gap-4 text-sm">
					<label className="flex items-center gap-2"><input type="radio" name="mission" value="COMPLETE" defaultChecked /> Complète</label>
					<label className="flex items-center gap-2"><input type="radio" name="mission" value="PARTIELLE" /> Partielle</label>
				</div>
				{champ('dateSignaturePrevue', 'Signature des marchés prévue le', undefined, { type: 'date' })}
				<div className="space-y-1">
					<Label htmlFor="chargeAffaireId">Chargé d&apos;affaire</Label>
					<select id="chargeAffaireId" name="chargeAffaireId" defaultValue={moiId} className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm">
						{chargesAffaire.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
					</select>
				</div>
				{champ('reference', 'Référence dossier', 'Unique ; elle nomme les fichiers (ex. « PERRIER — Louisfert »).', { required: true })}
			</fieldset>
			<fieldset className="space-y-2">
				<legend className="font-titre text-lg font-semibold">Lots</legend>
				<label className="flex items-center gap-2 text-sm">
					<Switch checked={lotsDeBase} onCheckedChange={setLotsDeBase} /> Partir des 13 lots de base
				</label>
				<p className="text-xs text-muted-foreground">Terrassement, gros œuvre, charpente… jusqu&apos;à l&apos;escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.</p>
			</fieldset>
			{erreurs.general && <p role="alert" className="text-sm text-destructive">{erreurs.general}</p>}
			<div className="flex gap-3">
				<Button type="submit" disabled={enCours}>Créer le chantier</Button>
				<Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
			</div>
		</form>
	);
}
