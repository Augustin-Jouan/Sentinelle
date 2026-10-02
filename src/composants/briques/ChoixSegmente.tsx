import type { KeyboardEvent } from 'react';
import { cx } from './cx';

/**
 * Un choix exclusif en segments (ex-.radio-row) : des boutons role="radio" sous le motif du groupe radio.
 * Un seul arrêt de tabulation (l'option cochée) ; les flèches, Début et Fin choisissent et déplacent le focus,
 * en bouclant. Rien n'est envoyé par un formulaire : le parent tient la valeur.
 */
export function ChoixSegmente<V extends string>({ libelle, options, valeur, onChoisir }: {
	/** Le nom du groupe (aria-label). */
	libelle: string;
	options: readonly { v: V; t: string }[];
	valeur: V;
	onChoisir: (v: V) => void;
}) {
	const auClavier = (e: KeyboardEvent<HTMLDivElement>) => {
		const n = options.length;
		const i = Math.max(0, options.findIndex((o) => o.v === valeur));
		const cible = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
		if (cible === undefined || n === 0) return;
		e.preventDefault();
		const j = (cible + n) % n;
		e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[j]?.focus();
		if (j !== i) onChoisir(options[j].v);
	};
	return (
		<div role="radiogroup" aria-label={libelle} className="flex gap-2" onKeyDown={auClavier}>
			{options.map((o) => {
				const choisi = o.v === valeur;
				return (
					<button key={o.v} type="button" role="radio" aria-checked={choisi} tabIndex={choisi ? 0 : -1}
						onClick={() => { if (!choisi) onChoisir(o.v); }}
						className={cx('flex-1 cursor-pointer rounded-sm border px-2.5 py-2 text-left text-13',
							choisi ? 'border-accent bg-accent-soft font-medium text-accent-2' : 'border-rule-strong bg-surface text-ink')}>
						{o.t}
					</button>
				);
			})}
		</div>
	);
}
