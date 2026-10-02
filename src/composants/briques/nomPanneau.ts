/** Nom du dialogue : une chaîne vide n'est pas un nom (contrairement à `??`). */
export function nomAccessible(libelle: string | undefined, titre: string): string {
	return libelle || titre;
}
