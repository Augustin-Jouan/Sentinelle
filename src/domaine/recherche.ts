/** Minuscules, sans accents, ligatures dépliées : « ŒUVRE » se trouve en tapant « oeuvre ». */
export function normaliser(s: string): string {
	return s
		.toLowerCase()
		.replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae')
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.trim();
}

/** Chaque mot de la requête doit apparaître dans « nom commune ». */
export function filtrerArtisans<T extends { nom: string; commune: string }>(artisans: T[], requete: string): T[] {
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	if (!mots.length) return artisans;
	return artisans.filter((a) => {
		const texte = normaliser(`${a.nom} ${a.commune}`);
		return mots.every((m) => texte.includes(m));
	});
}

/** Les entreprises actives, plus celle déjà attribuée même archivée. */
export function artisansProposables<T extends { id: string; actif: boolean }>(artisans: T[], idActuel: string | null): T[] {
	return artisans.filter((a) => a.actif || a.id === idActuel);
}
