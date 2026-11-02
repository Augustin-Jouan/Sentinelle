/**
 * Un numéro ou un courriel qu'on touche pour appeler ou écrire : sur un chantier, c'est le geste le plus fréquent.
 * Sur ordinateur, le lien garde l'apparence du texte qu'il remplace (couleur héritée, sans soulignement) ; sur un
 * téléphone, il se signale (accent, soulignement) et prend 44 px de haut sous le doigt. Le clic ne remonte pas : une
 * ligne cliquable (une carte d'artisan) ne s'ouvre pas en même temps.
 */
const LIEN = 'text-current no-underline max-etroit:inline-flex max-etroit:min-h-11 max-etroit:items-center max-etroit:text-accent-2 max-etroit:underline max-etroit:underline-offset-2';

/** « 06-77-07-05-38 » → « tel:0677070538 » ; le « + » d'un indicatif est gardé. */
export const hrefTelephone = (numero: string) => `tel:${numero.replace(/[^\d+]/g, '')}`;

const arreter = (e: React.MouseEvent) => e.stopPropagation();

export function LienTelephone({ numero }: { numero: string }) {
	return <a href={hrefTelephone(numero)} className={LIEN} onClick={arreter}>{numero}</a>;
}

export function LienCourriel({ adresse }: { adresse: string }) {
	return <a href={`mailto:${adresse}`} className={LIEN} onClick={arreter}>{adresse}</a>;
}
