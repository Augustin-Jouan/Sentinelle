import type { ChampArtisan } from '@/donnees/artisans';

export type FicheArtisan = Record<ChampArtisan, string>;
type Resultat<T = null> = { ok: true; donnees: T } | { ok: false; erreur: string };

const CHAMPS: ChampArtisan[] = ['nom', 'adresse', 'cp', 'commune', 'interlocuteur', 'telephone', 'email'];

/** Id déjà persisté : pas la fiche vide, pas un panneau fermé. */
export function idArtisanOuverte(ouverte: string | null): string | null {
	return ouverte && ouverte !== 'nouvelle' ? ouverte : null;
}

/**
 * Crée si besoin, puis enregistre les champs changés. En cas de refus d'un champ,
 * l'id créé est renvoyé pour que le prochain essai ne recrée pas l'entreprise.
 */
export async function enregistrerArtisan(p: {
	id: string | null;
	fiche: FicheArtisan;
	actuelle: FicheArtisan | null;
	creer: (nom: string) => Promise<Resultat<{ id: string }>>;
	modifier: (id: string, champ: ChampArtisan, valeur: string) => Promise<Resultat>;
}): Promise<{ id: string | null; erreur: { champ: ChampArtisan; message: string } | null }> {
	let id = p.id;
	if (!id) {
		const r = await p.creer(p.fiche.nom);
		if (!r.ok) return { id: null, erreur: { champ: 'nom', message: r.erreur } };
		id = r.donnees.id;
	}
	for (const champ of CHAMPS) {
		const avant = p.actuelle ? p.actuelle[champ] : (champ === 'nom' ? p.fiche.nom : '');
		if (p.fiche[champ] === avant) continue;
		const r = await p.modifier(id, champ, p.fiche[champ]);
		if (!r.ok) return { id, erreur: { champ, message: r.erreur } };
	}
	return { id, erreur: null };
}
