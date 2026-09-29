'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import { cn } from '@/lib/utils';

type Props = {
	valeur: string;
	enregistrer: (valeur: string) => Promise<Resultat<unknown>>;
	libelle: string;
	type?: 'text' | 'date' | 'email' | 'tel';
	multiligne?: boolean;
	className?: string;
	placeholder?: string;
	alignement?: 'gauche' | 'droite';
};

/**
 * Champ enregistré quand on le quitte, sans bouton. En cas d'échec il passe en rouge
 * et garde la saisie. Il se recale sur la valeur du serveur quand celle-ci change
 * (TTC reformaté, modification d'un collègue).
 */
export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', multiligne, className, placeholder, alignement = 'gauche' }: Props) {
	const [texte, setTexte] = useState(valeur);
	const [valeurRecue, setValeurRecue] = useState(valeur);
	const [enErreur, setEnErreur] = useState(false);
	const [enCours, demarrer] = useTransition();
	// Les écritures partent dans l'ordre (Next.js envoie les Server Actions d'un client une par une) ;
	// seule la réponse au dernier enregistrement compte : un échec tardif ne rougit pas une saisie plus récente.
	const dernierEnvoi = useRef(0);

	if (valeur !== valeurRecue) {
		setValeurRecue(valeur);
		setTexte(valeur);
		setEnErreur(false);
	}

	function quitter() {
		if (texte === valeur && !enErreur) return;
		const envoi = ++dernierEnvoi.current;
		demarrer(async () => {
			const r = await enregistrer(texte);
			if (envoi !== dernierEnvoi.current) return;
			if (r.ok) {
				setEnErreur(false);
			} else {
				setEnErreur(true);
				toast.error(r.erreur);
			}
		});
	}

	const classes = cn(
		'w-full rounded-sm border border-transparent bg-transparent px-1.5 py-0.5 hover:border-input focus:border-ring focus:bg-card focus:outline-none',
		alignement === 'droite' && 'text-right font-mono tabular-nums',
		enErreur && 'border-destructive bg-destructive-soft',
		enCours && 'opacity-70',
		className,
	);
	const communs = {
		'aria-label': libelle,
		'aria-invalid': enErreur,
		placeholder,
		value: texte,
		onBlur: quitter,
		className: classes,
	};
	return multiligne ? (
		<textarea {...communs} rows={3} onChange={(e) => setTexte(e.target.value)} />
	) : (
		<input
			{...communs}
			type={type}
			onChange={(e) => setTexte(e.target.value)}
			onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	);
}
