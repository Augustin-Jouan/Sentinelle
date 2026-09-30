import type { TypeDocument } from '@/documents/libelles';

/* Rangement de « Tout télécharger » (spec § 8), pur. */

/** '' : à la racine de l'archive. */
export const DOSSIERS_ARCHIVE: Record<TypeDocument, string> = {
	MARCHE_GRE_A_GRE: '01 Marchés',
	MARCHE_SOUS_TRAITANCE: '01 Marchés',
	AVENANT: '02 Avenants',
	CERTIFICAT_PAIEMENT: '03 Certificats de paiement',
	COMPTE_RENDU: '04 Comptes rendus',
	PV_RECEPTION: '05 Réceptions',
	PLANNING: '06 Planning',
	VISA_PLANNING: '06 Planning',
	RECAPITULATIF: '',
};

/** La dernière version de chaque série. */
export function dernieresVersions<T extends { serie: string; version: number }>(docs: T[]): T[] {
	const dernieres = new Map<string, T>();
	for (const d of docs) {
		const connue = dernieres.get(d.serie);
		if (!connue || d.version > connue.version) dernieres.set(d.serie, d);
	}
	return [...dernieres.values()];
}

const joindre = (dossier: string, nom: string) => (dossier ? `${dossier}/${nom}` : nom);

function decouper(nom: string): [string, string] {
	const point = nom.lastIndexOf('.');
	return point > 0 ? [nom.slice(0, point), nom.slice(point)] : [nom, ''];
}

/** Chemins triés ; un nom déjà pris dans le même dossier prend « (2) », « (3) »… avant l'extension. */
export function cheminsArchive<T extends { dossier: string; nom: string }>(fichiers: T[]): (T & { chemin: string })[] {
	const pris = new Set<string>();
	return [...fichiers]
		.sort((a, b) => joindre(a.dossier, a.nom).localeCompare(joindre(b.dossier, b.nom), 'fr'))
		.map((f) => {
			const [base, extension] = decouper(f.nom);
			let chemin = joindre(f.dossier, f.nom);
			for (let i = 2; pris.has(chemin); i++) chemin = joindre(f.dossier, `${base} (${i})${extension}`);
			pris.add(chemin);
			return { ...f, chemin };
		});
}
