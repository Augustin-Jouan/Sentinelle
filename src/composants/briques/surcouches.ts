/*
 * Les surcouches se reconnaissent à des attributs, jamais à leurs classes :
 * data-surcouche="panneau" | "menu" | "confirmation" | "apercu", data-ouvert quand elle est ouverte,
 * data-verrou-defilement quand elle fige la page de derrière (base.css).
 */

/** Une confirmation ouverte garde Échap pour elle. */
export const CONFIRMATION_OUVERTE = '[data-surcouche="confirmation"][data-ouvert]';

export const PANNEAU_OUVERT = '[data-surcouche="panneau"][data-ouvert]';

/** Ce qui, ouvert au-dessus d'un aperçu, garde Échap pour soi. */
export const AU_DESSUS_DE_L_APERCU = [CONFIRMATION_OUVERTE, '[data-surcouche="menu"][data-ouvert]', PANNEAU_OUVERT].join(', ');
