import { cx } from './cx';

/**
 * Un choix exclusif en segments (ex-.radio-row) : des boutons role="radio", atteignables au clavier,
 * Espace ou Entrée choisit. Rien n'est envoyé par un formulaire : le parent tient la valeur.
 */
export function ChoixSegmente<V extends string>({ libelle, options, valeur, onChoisir }: {
	/** Le nom du groupe (aria-label). */
	libelle: string;
	options: readonly { v: V; t: string }[];
	valeur: V;
	onChoisir: (v: V) => void;
}) {
	return (
		<div role="radiogroup" aria-label={libelle} className="flex gap-2">
			{options.map((o) => {
				const choisi = o.v === valeur;
				return (
					<button key={o.v} type="button" role="radio" aria-checked={choisi} onClick={() => { if (!choisi) onChoisir(o.v); }}
						className={cx('flex-1 cursor-pointer rounded-sm border px-2.5 py-2 text-left text-13',
							choisi ? 'border-accent bg-accent-soft font-medium text-accent-2' : 'border-rule-strong bg-surface text-ink')}>
						{o.t}
					</button>
				);
			})}
		</div>
	);
}
