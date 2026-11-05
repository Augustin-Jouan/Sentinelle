import { LOGO_SOCOREVE } from './logo';

/** Un certificat, un compte rendu ou un PV figé avant le logo paramétrable n'a pas cette clé : il avait imprimé le logo SOCOREVE. */
export const logoFige = (logo: string | null | undefined) => (logo === undefined ? LOGO_SOCOREVE : logo);

/** Chaque gabarit lui donne son cadre (styles.ts), où l'image tient sans se déformer, quelle que soit sa forme. */
export function LogoEntreprise({ src }: { src: string }) {
	// eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau
	return <img src={src} alt="Logo de l'entreprise" />;
}
