'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import { classesSaisie, type VarianteSaisie } from '@/composants/briques/Champ';
import { cx } from '@/composants/briques/cx';

type Props = {
	valeur: string;
	enregistrer: (valeur: string) => Promise<Resultat<unknown>>;
	libelle: string;
	type?: 'text' | 'date' | 'email' | 'tel';
	/** Un texte sur plusieurs lignes ; « ajuste » : un seul paragraphe dont la hauteur suit le texte (Entrée valide, pas de retour). */
	multiligne?: boolean | 'ajuste';
	/** Placement seulement. */
	className?: string;
	placeholder?: string;
	variante?: VarianteSaisie;
	/** Graisse 600 : le TTC du panneau, l'intitulé de la période visée. */
	gras?: boolean;
	/** Chiffres alignés : un code postal. */
	chiffres?: boolean;
	id?: string;
	/** À chaque frappe, avant l'enregistrement : un aperçu qui suit la saisie. */
	onSaisie?: (valeur: string) => void;
};

/**
 * Champ enregistré quand on le quitte, sans bouton. En cas d'échec il passe en rouge
 * et garde la saisie. Il se recale sur la valeur du serveur quand celle-ci change
 * (TTC reformaté, modification d'un collègue).
 */
export function ChampEnLigne({ valeur, enregistrer, libelle, type = 'text', multiligne, className, placeholder, variante = 'texte', gras, chiffres, id, onSaisie }: Props) {
	const [texte, setTexte] = useState(valeur);
	const [valeurRecue, setValeurRecue] = useState(valeur);
	const [enErreur, setEnErreur] = useState(false);
	const [enCours, demarrer] = useTransition();
	// Les écritures partent dans l'ordre (Next.js envoie les Server Actions d'un client une par une) ;
	// seule la réponse au dernier enregistrement compte : un échec tardif ne rougit pas une saisie plus récente.
	const dernierEnvoi = useRef(0);

	const saisir = (v: string) => { setTexte(v); onSaisie?.(v); };

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

	const classes = cx(classesSaisie(variante, { gras, chiffres }), className);
	const communs = {
		id,
		'aria-label': libelle,
		'aria-invalid': enErreur,
		'aria-busy': enCours || undefined,
		placeholder,
		value: texte,
		onBlur: quitter,
		className: classes,
	};
	if (multiligne === 'ajuste') {
		// field-sizing-content : la hauteur suit le texte ; sans lui (navigateur ancien), deux lignes.
		return (
			<textarea {...communs} rows={2} className={cx(classes, 'field-sizing-content resize-none')}
				onChange={(e) => saisir(e.target.value.replace(/\s*\n\s*/g, ' '))}
				onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
		);
	}
	return multiligne ? (
		<textarea {...communs} rows={3} onChange={(e) => saisir(e.target.value)} />
	) : (
		<input
			{...communs}
			type={type}
			onChange={(e) => saisir(e.target.value)}
			onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
		/>
	);
}
