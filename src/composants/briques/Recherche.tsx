import { Loupe } from './icones';

/** La barre de recherche de la maquette (.search) : loupe et champ nu. */
export function Recherche({ placeholder, valeur, onChange, libelle, id }: { placeholder: string; valeur: string; onChange: (v: string) => void; libelle?: string; id?: string }) {
	return (
		<div className="search">
			<Loupe />
			<input id={id} type="search" placeholder={placeholder} aria-label={libelle ?? placeholder} value={valeur} onChange={(e) => onChange(e.target.value)} />
		</div>
	);
}
