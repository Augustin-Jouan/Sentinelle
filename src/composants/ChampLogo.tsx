'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { modifierLogoAction } from '@/actions/parametres';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ } from '@/composants/briques/Champ';
import { ErreurMetier } from '@/domaine/erreurs';
import { preparerLogo } from './preparerLogo';

/** Le logo s'enregistre dès qu'on le choisit, comme les autres champs de la page dès qu'on les quitte. */
export function ChampLogo({ logo, onChange }: { logo: string | null; onChange: (logo: string | null) => void }) {
	const fichier = useRef<HTMLInputElement>(null);
	const [enCours, demarrer] = useTransition();

	const enregistrer = (preparer: () => Promise<string | null>, succes: string) => demarrer(async () => {
		try {
			const valeur = await preparer();
			const r = await modifierLogoAction(valeur);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			onChange(valeur);
			toast.success(succes);
		} catch (e) {
			toast.error(e instanceof ErreurMetier ? e.message : 'Erreur inattendue, réessayez.');
		}
	});

	function choisir(e: React.ChangeEvent<HTMLInputElement>) {
		const choisi = e.target.files?.[0];
		// Vidé : choisir à nouveau la même image relance l'enregistrement.
		e.target.value = '';
		if (choisi) enregistrer(() => preparerLogo(choisi), 'Logo enregistré.');
	}

	return (
		<Champ libelle="Logo" aide="PNG ou JPEG, 2 Mo au plus. Repris sur les prochains documents générés.">
			<div className="flex items-center gap-3">
				<div className="flex h-18 w-24 flex-none items-center justify-center rounded-sm border border-rule bg-feuille p-1.5 text-12 text-feuille-gris">
					{/* eslint-disable-next-line @next/next/no-img-element -- data URI, enregistrée en base */}
					{logo ? <img src={logo} alt="Logo de l'entreprise" className="max-h-full max-w-full object-contain" /> : 'Aucun logo'}
				</div>
				<input ref={fichier} type="file" accept="image/png,image/jpeg" aria-label="Choisir un logo" className="hidden" onChange={choisir} />
				<div className="flex gap-2">
					<Bouton enCours={enCours} onClick={() => fichier.current?.click()}>Choisir une image</Bouton>
					{logo && <Bouton variante="fantome" enCours={enCours} onClick={() => enregistrer(async () => null, 'Logo retiré.')}>Retirer</Bouton>}
				</div>
			</div>
		</Champ>
	);
}
