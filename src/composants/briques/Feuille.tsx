import { cx } from './cx';

/**
 * Le fac-similé d'un document à côté d'un formulaire : du papier dans les deux thèmes, aux angles vifs,
 * qui montre où chaque champ s'imprime. Ses légendes (libellé, fichier, action) viennent dessous, dans `legende`.
 */
export function Feuille({ legende, children }: { legende?: React.ReactNode; children: React.ReactNode }) {
	return (
		<figure className="m-0 flex flex-col gap-3">
			<div className="border border-feuille-trait bg-feuille px-7 pt-5 pb-6 text-12 leading-[1.55] text-feuille-encre shadow-ombre">{children}</div>
			{legende && <figcaption className="flex flex-col gap-1.5 text-12 text-muted">{legende}</figcaption>}
		</figure>
	);
}

/**
 * Un formulaire et son fac-similé, moitié-moitié (Nouveau chantier, Paramètres) : les sections à gauche,
 * la feuille à droite, qui reste en vue au défilement ; sous 60 rem, la feuille passe dessous.
 * onFocus / onBlur suivent le champ actif de la colonne des sections, pour allumer son blanc.
 */
export function FormulaireEtFeuille({ feuille, onFocus, onBlur, children }: {
	feuille: React.ReactNode;
	onFocus?: React.FocusEventHandler<HTMLDivElement>;
	onBlur?: React.FocusEventHandler<HTMLDivElement>;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-2 items-start gap-x-10 gap-y-10 max-etroit:grid-cols-1">
			<div className="flex min-w-0 flex-col gap-7" onFocus={onFocus} onBlur={onBlur}>{children}</div>
			<div className="sticky top-22 min-w-0 max-etroit:static">{feuille}</div>
		</div>
	);
}

/** Un blanc du document (ex-.fill) ; actif, il prend le bleu des zones de saisie (ex-.zone), qui ne s'imprime pas. */
export function Blanc({ valeur, actif = false, vide }: {
	valeur: string;
	/** Le champ qui le remplit a le focus. */
	actif?: boolean;
	/** Ce qu'on lit tant qu'il est vide (« jour de l'édition ») ; sinon une ligne à remplir. */
	vide?: string;
}) {
	return (
		<span data-actif={actif || undefined}
			className={cx('inline-block border-b border-feuille-trait px-0.75 whitespace-pre-wrap transition-colors duration-120',
				'data-actif:border-feuille-zone-trait data-actif:bg-feuille-zone',
				// Vide, le blanc reste assez long pour se lire comme une ligne à remplir.
				valeur ? 'font-semibold' : 'min-w-32 italic text-feuille-gris')}>
			{valeur || vide || ' '}
		</span>
	);
}

/** Le passage coupé d'un extrait : « […] ». */
export function Coupure() {
	return <p aria-hidden="true" className="my-2.5 text-center text-feuille-gris">[…]</p>;
}
