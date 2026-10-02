import { Loupe } from './icones';

/** La barre de recherche de la maquette (ex-.search) : loupe et champ nu. */
export function Recherche({ placeholder, valeur, onChange, libelle, id }: { placeholder: string; valeur: string; onChange: (v: string) => void; libelle?: string; id?: string }) {
	return (
		<div className="flex max-w-104 min-w-72 flex-1 items-center gap-2 rounded-xs border border-rule-strong bg-raise px-2.5 py-1.25 [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:stroke-muted">
			<Loupe />
			<input id={id} type="search" placeholder={placeholder} aria-label={libelle ?? placeholder} value={valeur} onChange={(e) => onChange(e.target.value)}
				className="w-full border-0 bg-transparent py-px outline-none" />
		</div>
	);
}
