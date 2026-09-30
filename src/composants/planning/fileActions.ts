/** Enfile des travaux : le suivant ne part que quand le précédent est fini (succès ou échec). */
export function creerFileActions(): <T>(travail: () => Promise<T>) => Promise<T> {
	let chaine: Promise<unknown> = Promise.resolve();
	return function enFile<T>(travail: () => Promise<T>): Promise<T> {
		const exec = chaine.then(travail, travail);
		chaine = exec.then(() => undefined, () => undefined);
		return exec;
	};
}

/** Id local d'une barre pas encore créée : aucun geste ne doit la viser. */
export const ID_PERIODE_TEMPORAIRE = 'nouvelle-periode';
