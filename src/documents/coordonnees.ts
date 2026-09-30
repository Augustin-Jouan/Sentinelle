import type { LignesSociete } from './schemas';

/* Module pur : les feuilles du compte rendu et du PV se construisent aussi dans le navigateur. */

export type SourceCoordonnees = {
	adresse: string; cp: string; ville: string; telephone: string; email: string | null; siteWeb: string | null;
};

/** Maquette `renderCr` : adresse, « CP ville », téléphone, puis e-mail et site après une ligne vide. */
export function societeCompteRendu(p: SourceCoordonnees): LignesSociete {
	const email = p.email?.trim();
	const site = p.siteWeb?.trim();
	const fin = [email ? `Email : ${email}` : '', site ? `Site : ${site}` : ''].filter(Boolean);
	return { lignes: [p.adresse, `${p.cp} ${p.ville}`, `Tél. ${p.telephone}`, ...(fin.length ? ['', ...fin] : [])] };
}

/** Maquette `pagePv` : « adresse - CP VILLE », puis « Tél. … – e-mail ». */
export function societeReception(p: SourceCoordonnees): LignesSociete {
	const email = p.email?.trim();
	return {
		lignes: [`${p.adresse} - ${p.cp} ${p.ville.toLocaleUpperCase('fr-FR')}`, `Tél. ${p.telephone}${email ? ` – ${email}` : ''}`],
	};
}
