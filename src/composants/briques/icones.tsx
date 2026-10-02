/* Les icônes de la maquette (docs/maquette/sentinelle-marches.html), tracé pour tracé. Trait de 1,6 en couleur courante ; un contexte peut le régler ([&_svg]:stroke-[1.5]). */
const svg = (d: React.ReactNode) => function Icone() {
	return <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">{d}</svg>;
};

export const Maison = svg(<path d="M2 13V6l6-4 6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z" />);                                   // l. 2134
export const Artisans = svg(<><circle cx="6" cy="5.5" r="2.5" /><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M11 3.2a2.5 2.5 0 0 1 0 4.6" /></>); // l. 2149
export const Soleil = svg(<><circle cx="8" cy="8" r="3.25" /><path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.9 3.1l-1 1M4.1 11.9l-1 1M12.9 12.9l-1-1M4.1 4.1l-1-1" /></>); // l. 2153
export const Marches = svg(<><path d="M2.5 2.5h11v11h-11z" /><path d="M2.5 6h11M6 6v7.5" /></>);                           // l. 2174
export const Planning = svg(<><path d="M2 4.5h12M2 8h12M2 11.5h12" /><path d="M4 3v3M9 6.5v3M6 10v3" /></>);            // l. 2178
export const Documents = svg(<><path d="M4 1.5h5l3 3v10H4z" /><path d="M9 1.5v3h3" /></>);                               // l. 2182
export const Doc = Documents;
export const Plus = svg(<path d="M8 3v10M3 8h10" />);                                                                       // l. 2198
export const Telecharger = svg(<path d="M8 2v8M5 7l3 3 3-3M2.5 13.5h11" />);                                               // l. 2345
export const Imprimer = svg(<><path d="M4.5 6V2h7v4" /><path d="M4.5 11.5h-2v-4h11v4h-2" /><path d="M4.5 9.5h7v5h-7z" /></>); // l. 2405
export const Calendrier = svg(<><path d="M2.5 3.5h11v10h-11z" /><path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" /></>);        // l. 2397
export const Visa = svg(<path d="M2 12c2-1 3-6 5-6s1 5 3 5 2-3 4-3" />);                                                   // l. 2401
export const Coche = svg(<path d="m3.5 8.5 3 3 6-6.5" />);                                                                  // l. 3536
export const Rouvrir = svg(<><path d="M13.5 8a5.5 5.5 0 1 1-1.9-4.2" /><path d="M13.5 2v3h-3" /></>);                     // l. 3535
export const Corbeille = svg(<path d="M2.8 4.3h10.4M6.4 4.3V2.8h3.2v1.5M4.2 4.3l.6 8.9h6.4l.6-8.9" />);                    // l. 3539
export const Loupe = svg(<><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" /></>);                              // l. 2208
export const Crayon = svg(<path d="M11.2 2.3a1.3 1.3 0 0 1 1.8 1.8L5.6 11.5l-2.4.6.6-2.4z" />);                            // l. 4835
export const Reactiver = svg(<><path d="M2.5 8a5.5 5.5 0 1 0 1.9-4.2" /><path d="M2.5 2v3h3" /></>);                       // l. 4840
export const Main = svg(<><path d="M5 7.5V3.2a1.1 1.1 0 0 1 2.2 0v3.6" /><path d="M7.2 6.8V2.6a1.1 1.1 0 0 1 2.2 0v4.2" /><path d="M9.4 7V4.1a1.1 1.1 0 0 1 2.2 0v4.6" /><path d="M11.6 8.7V6.9a1.1 1.1 0 0 1 2.2 0v3.2c0 2.4-1.8 4.4-4.2 4.4H8.2c-1 0-1.8-.4-2.4-1.1L2.6 9.9a1.1 1.1 0 0 1 1.6-1.5L5 9.2" /></>); // l. 2424
export const Cible = svg(<><circle cx="8" cy="8" r="5" /><circle cx="8" cy="8" r="1.4" /><path d="M8 .8v2.4M8 12.8v2.4M.8 8h2.4M12.8 8h2.4" /></>); // l. 2428
export const Chevron = svg(<path d="m4 6 4 4 4-4" />);                                                                      // l. 2142
