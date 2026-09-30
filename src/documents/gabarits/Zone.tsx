export type ModeGabarit = 'edition' | 'lecture' | 'impression';
export type CleZone = 'clauseParticuliere' | 'corpsEtat' | 'travaux';
export type Saisie = (cle: CleZone, texte: string) => void;

type Props = {
	cle: CleZone;
	valeur: string;
	mode: ModeGabarit;
	onSaisie?: Saisie;
	placeholder: string;
	classe?: string;
};

/**
 * Champ écrit directement sur la feuille. Sans hook ni contexte : le même composant
 * est rendu dans le navigateur (édition) et côté serveur (impression).
 * La feuille n'est jamais reconstruite pendant la frappe : le texte n'est lu qu'au blur.
 */
export function Zone({ cle, valeur, mode, onSaisie, placeholder, classe = '' }: Props) {
	const classes = `fill ${classe}`.trim();
	if (mode !== 'edition') return <span className={classes}>{valeur}</span>;
	return (
		<span
			className={`${classes} zone`}
			contentEditable="plaintext-only"
			suppressContentEditableWarning
			role="textbox"
			aria-label={placeholder}
			data-placeholder={placeholder}
			onBlur={(e) => {
				const texte = e.currentTarget.textContent ?? '';
				if (texte !== valeur) onSaisie?.(cle, texte);
			}}
		>
			{valeur}
		</span>
	);
}
