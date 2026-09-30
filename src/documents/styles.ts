/** CSS des feuilles, partagée par l'aperçu à l'écran et le PDF. Couleurs fixes : les feuilles imitent du papier. */
export const CSS_DOCUMENTS = `
.sheet {
	width: 52rem; max-width: 100%; min-height: 36.5rem; box-sizing: border-box;
	background: #fdfdfb; color: #16191b; border: 1px solid #b2bac1;
	box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06);
	padding: 1.75rem 2rem; font-family: 'Figtree', system-ui, sans-serif; font-size: 0.6875rem; line-height: 1.42;
	display: grid; grid-template-columns: 1fr 1fr; gap: 0 2rem;
}
.sheet .col-r { border-left: 1px solid #d8dad4; padding-left: 1.5rem; font-size: 0.625rem; color: #4a5052; }
.sheet h4 { font-family: 'Outfit', sans-serif; font-size: 1.0625rem; font-weight: 700; letter-spacing: .05em; text-align: center; margin: 1.25rem 0 1rem; }
.sheet .firm { font-size: 0.625rem; line-height: 1.4; }
.sheet .firm b { font-size: 0.75rem; letter-spacing: .02em; }
.sheet .ctr { text-align: center; font-style: italic; margin: .625rem 0; }
.sheet .ctr-b { text-align: center; margin: .375rem 0; }
.sheet .fine { font-size: 0.5625rem; color: #5a6062; line-height: 1.35; margin: .375rem 0; }
.sheet p { margin: .5rem 0; }
.sheet .lbl { color: #5a6062; }
.sheet hr { border: 0; border-top: 1px solid #d8dad4; margin: .75rem 0; }
.fill { display: inline-block; min-width: 4rem; padding: 0 .1875rem; border-bottom: 1px solid #b9beb8; font-weight: 600; white-space: pre-wrap; }
.fill.big { font-family: 'Spline Sans Mono', monospace; font-size: 0.9375rem; font-weight: 600; }
.fill.normal { font-weight: 400; }
.fill.bloc { display: block; }
.sign-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; margin-top: 1.5rem; text-align: center; font-size: 0.5625rem; color: #5a6062; }
.sign-row div { border-top: 1px solid #b9beb8; padding-top: .3125rem; }
.sign-row-2 { grid-template-columns: repeat(2, 1fr); }
.sign-row i { color: #7a8082; font-style: italic; }

.sheet-recap { width: 66rem; display: block; }
.sheet-recap h4 { text-align: left; margin: 0 0 .875rem; font-size: 1.125rem; }
.recap-entete { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); gap: .25rem 2rem; padding-bottom: .875rem; margin-bottom: .875rem; border-bottom: 1px solid #d8dad4; }
.recap-entete dl { display: grid; grid-template-columns: 8.5rem minmax(0,1fr); gap: .1875rem .625rem; margin: 0; }
.recap-entete dt { color: #5a6062; }
.recap-entete dd { margin: 0; font-weight: 600; }
.recap-lieu { text-align: right; font-style: italic; margin: 0 0 .75rem; color: #4a5052; }
.recap-vide { padding: 2rem; text-align: center; font-style: italic; color: #5a6062; }
table.recap { width: 100%; border-collapse: collapse; font-size: 0.625rem; }
table.recap th { text-align: left; padding: .25rem .375rem; border-bottom: 1px solid #16191b; font-family: 'Outfit', sans-serif; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
table.recap td { padding: .25rem .375rem; border-bottom: 1px solid #e2e4de; vertical-align: top; }
table.recap .r { text-align: right; white-space: nowrap; }
table.recap .mono { font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; }
table.recap tr.total td { border-top: 2px solid #16191b; border-bottom: 0; padding-top: .5rem; font-weight: 700; font-size: 0.75rem; }
table.recap tr.total .lbl-total { font-family: 'Outfit', sans-serif; letter-spacing: .06em; text-transform: uppercase; }

/* Écrire sur la feuille : teinté à l'écran, texte ordinaire à l'impression. */
.zone { min-width: 6rem; cursor: text; outline: none; background: #e8f0f8; box-shadow: inset 0 -1px 0 #1c4e80; border-bottom: 0; }
.zone:hover { background: #dce8f4; }
.zone:focus { background: #fff; box-shadow: 0 0 0 2px #1c4e80; }
.zone:empty::before { content: attr(data-placeholder); color: #5f7285; font-style: italic; font-weight: 400; }

/* Planning prévisionnel et feuille de visa : A4 paysage, toujours une seule page. */
.sheet-doc { width: 68rem; display: block; font-size: 0.6875rem; }
/* Même modèle de boîte à l'écran (Tailwind met border-box partout) et dans le PDF : les mesures concordent. */
.sheet-doc, .sheet-doc * { box-sizing: border-box; }
.doc-entete { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 1.5rem; padding-bottom: .75rem; border-bottom: 1px solid #b9beb8; }
.doc-entete .firm { margin: 0; }
.doc-kv { display: grid; grid-template-columns: 10rem minmax(0, 1fr); gap: .1875rem .625rem; margin: 0; }
.doc-kv dt { color: #5a6062; }
.doc-kv dd { margin: 0; font-weight: 600; }
.sheet .doc-titre { font-family: 'Outfit', sans-serif; font-size: .9375rem; font-weight: 700; letter-spacing: .05em; margin: .875rem 0 .625rem; }
.sheet .doc-phrase { margin: 0 0 .875rem; font-style: italic; color: #4a5052; }
.sheet .doc-note { margin: .875rem 0 0; font-size: .5625rem; color: #5a6062; line-height: 1.4; }
table.d-gantt, table.d-visa { width: 100%; border-collapse: collapse; font-size: .625rem; }
table.d-gantt th, table.d-visa th { text-align: left; padding: .1875rem .375rem; border-bottom: 1px solid #16191b; font-family: 'Outfit', sans-serif; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; vertical-align: bottom; }
table.d-gantt td, table.d-visa td { padding: 0; border-bottom: 1px solid #e2e4de; }
table.d-gantt .d-ent, table.d-gantt .d-lot { padding: .1875rem .375rem; white-space: nowrap; }
.d-ent { width: 9rem; }
.d-lot { width: 9rem; }
/* Sans marge intérieure, l'axe tombe exactement au-dessus des pistes. */
table.d-gantt th.d-piste { padding: 0; }
.d-piste { position: relative; padding: 0; }
.d-piste-in { position: relative; height: 1.125rem; }
.d-mois, .d-sems { display: flex; }
.d-mois span { flex: none; border-left: 1px solid #9aa19f; font-size: .5625rem; font-weight: 600; overflow: hidden; white-space: nowrap; padding-left: 1px; }
.d-sems span { flex: none; border-left: 1px solid #e2e4de; font-size: .5rem; text-align: center; overflow: visible; white-space: nowrap; color: #5a6062; font-family: 'Spline Sans Mono', monospace; }
.d-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 1px; font-size: .5rem; line-height: 1; display: flex; align-items: center; padding: 0 2px; overflow: hidden; white-space: nowrap; }
/* Congés : hachures sur toute la hauteur de chaque ligne. */
.d-ferm { position: absolute; top: 0; bottom: 0; background: repeating-linear-gradient(135deg, #b2bac1 0 2px, transparent 2px 7px); opacity: .5; }
table.d-visa td { padding: .3125rem .375rem; }
table.d-visa .sig { border-bottom: 1px solid #b9beb8; height: 1.75rem; width: 22%; }

/* Lettre d'avenant : A4 portrait (maquette buildDocAvenant). Double classe : « .sheet-doc » fixerait 68rem. */
.sheet-doc.sheet-avenant { width: 46rem; }
.av-lieu { text-align: right; margin: 0 0 1.25rem; }
.av-kv { margin: 0 0 .875rem; }
.av-objet { margin: 0 0 1rem; line-height: 1.6; }
.av-objet .fill { border-bottom: 0; padding: 0; font-style: italic; }
table.d-avenant { width: 100%; border-collapse: collapse; margin: 0 0 .5rem; }
table.d-avenant td { padding: .3125rem .375rem; }
table.d-avenant .r { text-align: right; white-space: nowrap; }
table.d-avenant .mono { font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; }
table.d-avenant tr.total td { border-top: 1px solid #16191b; font-weight: 600; }
table.d-avenant tr.apres td { border-top: 2px solid #16191b; font-weight: 600; font-size: .75rem; }
.av-sign { margin-top: 2.5rem; }

/* Certificat de paiement : A4 portrait (maquette renderCpSheet). Double classe : « .sheet-doc » fixerait 68rem. */
.sheet-doc.sheet-cp { width: 46rem; }
.cp-tete { display: flex; align-items: center; gap: 1.25rem; margin-bottom: .875rem; }
.cp-tete img { width: 5.5rem; height: auto; flex: none; }
.cp-adr { font-style: italic; font-size: .8125rem; line-height: 1.45; }
.cp-cadre { border: 1px solid #16191b; margin-bottom: .625rem; }
.cp-titre { text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1.0625rem; letter-spacing: .03em; padding: .375rem; border-bottom: 1px solid #16191b; }
.cp-kv { display: grid; grid-template-columns: 11rem minmax(0, 1fr); gap: .25rem .5rem; margin: 0; padding: .5rem .75rem .625rem; font-size: .75rem; }
.cp-kv dt { text-align: right; }
.cp-kv dd { margin: 0; font-weight: 700; }
.cp-montants { display: grid; grid-template-columns: 11rem 9rem; gap: .125rem 1.5rem; padding: .5rem .75rem .625rem; font-size: .75rem; }
.cp-montants .k { text-align: right; }
.cp-montants .v { text-align: right; font-weight: 700; font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; }
.cp-montants .av-titre { grid-column: 1 / -1; font-weight: 700; text-decoration: underline; margin-top: .375rem; }
.cp-bande { background: #bfc2c4; border: 1px solid #16191b; text-align: center; font-weight: 700; font-size: .8125rem; padding: .4375rem; margin: .625rem 0 .75rem; }
.cp-deux { display: grid; grid-template-columns: 13rem minmax(0, 1fr); gap: 1.5rem; align-items: start; }
table.cp-t { width: 100%; border-collapse: collapse; font-size: .6875rem; }
table.cp-t th, table.cp-t td { border: 1px solid #16191b; padding: .1875rem .375rem; }
table.cp-t th { font-weight: 400; text-align: center; }
table.cp-t td.m { text-align: right; font-family: 'Spline Sans Mono', monospace; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.cp-t td.cp-centre { text-align: center; }
table.cp-prec td:first-child { text-align: center; width: 4.75rem; white-space: nowrap; }
table.cp-titu td.k { text-align: right; border-left: 0; }
table.cp-titu td.m { width: 7.5rem; }
table.cp-titu tr.mandat td { background: #cfe2ee; font-weight: 700; }
table.cp-titu th.vide { border: 0; }
.cp-certif { display: flex; align-items: center; justify-content: flex-end; gap: .75rem; margin: 1.25rem 0 .75rem; font-size: .75rem; }
.cp-somme { background: #cfe2ee; font-weight: 700; font-family: 'Spline Sans Mono', monospace; font-size: .9375rem; padding: .3125rem 1.25rem; }
.cp-fait { margin: .5rem 0 0; font-size: .75rem; }
.cp-sign { margin: .25rem 0 0 1rem; font-size: .75rem; min-height: 5rem; }
/* Saisies de l'aperçu : jamais imprimées (le PDF est rendu en mode impression, sans champ). */
.cp-saisie { width: 100%; min-width: 0; font: inherit; text-align: right; border: 0; padding: 0 .25rem; }
.cp-saisie.cp-date { width: auto; text-align: left; background: #e8f0f8; box-shadow: inset 0 -1px 0 #1c4e80; }
.cp-caution { font: inherit; font-weight: 700; cursor: pointer; background: #e8f0f8; border: 0; box-shadow: inset 0 -1px 0 #1c4e80; padding: 0 .5rem; }
.cp-vide { color: #5f7285; font-style: italic; font-weight: 400; }
.cp-note { display: block; white-space: normal; font-family: 'Figtree', system-ui, sans-serif; font-size: .5625rem; line-height: 1.3; color: #5a6062; margin-top: .125rem; }

/* Compte rendu de chantier : A4 portrait, une ou plusieurs pages (maquette renderCr). Double classe : « .sheet-doc » fixerait 68rem ;
   « .sheet » devant les paragraphes : « .sheet p » l'emporterait. */
.sheet-doc.sheet-cr { width: 46rem; font-size: .6875rem; line-height: 1.4; }
.cr-tete { width: 100%; border-collapse: collapse; border: 1px solid #16191b; margin-bottom: .875rem; }
.cr-tete td { vertical-align: middle; padding: .375rem .625rem; }
.cr-logo { width: 6.5rem; border-right: 1px solid #16191b; text-align: center; }
.cr-logo img { width: 5.25rem; height: auto; display: block; margin: 0 auto; }
.cr-adr { font-weight: 700; font-size: .75rem; line-height: 1.35; }
.cr-titre { width: 9.5rem; border-left: 1px solid #16191b; text-align: center; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: .03em; line-height: 1.2; }
.sheet .cr-suivi { margin: 0 0 .25rem 2.5rem; font-weight: 700; }
.cr-bloc { border: 1px solid #16191b; padding: .3125rem .375rem .375rem; margin-bottom: .875rem; }
.sheet .cr-bloc p { margin: 0 0 .1875rem; }
.cr-retrait { display: block; padding-left: 11.5rem; }
.cr-ligne { display: grid; grid-template-columns: 1fr .8fr 1.5fr; gap: .5rem; margin: .125rem 0 .1875rem; }
.cr-rdv { text-align: right; color: #b3261e; white-space: nowrap; }
.sheet .cr-legende { text-align: center; font-size: .5625rem; border-top: 1px solid #16191b; padding-top: .125rem; margin: 0; }
.cr-rouge { color: #b3261e; }
table.cr-lots { width: 100%; border-collapse: collapse; border-top: 1px solid #16191b; table-layout: fixed; font-size: .625rem; }
table.cr-lots th { font-style: italic; text-decoration: underline; text-align: center; padding: .125rem .25rem; font-weight: 700; }
table.cr-lots th:first-child, table.cr-lots td:first-child { text-align: left; }
table.cr-lots td { text-align: center; padding: .0625rem .25rem; overflow-wrap: anywhere; }
table.cr-lots th:nth-child(1) { width: 30%; } table.cr-lots th:nth-child(2) { width: 26%; }
table.cr-lots th:nth-child(3) { width: 19%; } table.cr-lots th:nth-child(4) { width: 14%; }
table.cr-lots td:nth-child(4) { white-space: nowrap; }
table.cr-lots td.cr-c { color: #b3261e; font-weight: 700; }
.cr-souligne { text-decoration: underline; font-weight: 700; }
.cr-avancement { display: grid; grid-template-columns: 8rem minmax(0, 1fr); gap: .5rem; min-height: 2.5rem; }
.cr-avancement > div { font-weight: 700; white-space: pre-wrap; }
.cr-co-titre { text-decoration: underline; margin-top: .625rem; }
.cr-co-titre:first-of-type { margin-top: .25rem; }
.cr-co-suite { text-decoration: none; display: inline-block; }
.cr-co-ligne { padding-left: 1.5rem; white-space: pre-wrap; }
.sheet-cr mark { background: #fff200; color: inherit; font-weight: 700; padding: 0 1px; }
.cr-pied { display: grid; grid-template-columns: 1fr auto; gap: 1rem; padding: 0 1.75rem 0 45%; margin-top: -.625rem; }
.sheet .cr-nb { margin: .125rem 0 0; font-size: .625rem; }
/* Saisies de l'aperçu : jamais imprimées (le PDF est rendu en mode impression, sans champ). */
.sheet .cr-aide { margin: .25rem 0 .375rem; font-size: .625rem; font-style: italic; font-weight: 400; color: #5a6062; }
.cr-saisie { font: inherit; font-weight: 700; color: inherit; background: #e8f0f8; border: 0; box-shadow: inset 0 -1px 0 #1c4e80; padding: 0 .25rem; }
textarea.cr-saisie { display: block; width: 100%; min-height: 3rem; resize: vertical; field-sizing: content; white-space: pre-wrap; font-weight: 400; }
.cr-avancement textarea.cr-saisie { font-weight: 700; }
.cr-conv-bt { font: inherit; font-weight: 700; color: inherit; background: #e8f0f8; border: 0; border-radius: 3px; min-width: 1.5rem; cursor: pointer; }
.cr-conv-bt:hover { background: #dce8f4; }
.cr-conv-bt.est-c { color: #b3261e; }

/* PDF : la page A4 (marges 10 mm) porte la feuille, sans cadre ni ombre. */
.mode-impression { margin: 0; background: #fff; }
.mode-impression .sheet { width: 100%; max-width: none; min-height: 0; border: 0; box-shadow: none; padding: 0; background: #fff; }
`;
