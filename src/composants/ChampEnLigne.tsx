'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';

type Props = {
	valeur: string;
	enregistrer: (valeur: string) => Promise<Resultat<unknown>>;
	libelle: string;
	type?: 'text' | 'date' | 'email' | 'tel';
	multiligne?: boolean;
	className?: string;
	placeholder?: string;
	variante?: 'texte' | 'texte-mini' | 'montant' | 'montant-mini' | 'champ';
	id?: string;
};

const CLASSES = { texte: 'text-input', 'texte-mini': 'text-input mini', montant: 'money-input', 'montant-mini': 'money-input mini', champ: '' } as const;

/**
 * Champ enregistré quand on le quitte, sans bouton. En cas d'échec il passe en rouge
 * et garde la saisie. Il se recale sur la valeur du serveur quand celle-ci change
 * (TTC reformaté, modification d'un collègue).
 */
export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', multiligne, className, placeholder, variante = 'texte', id }: Props) {
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

	const classes = [CLASSES[variante], enErreur && 'est-erreur', enCours && 'est-en-cours', className].filter(Boolean).join(' ');
	const communs = {
		id,
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
