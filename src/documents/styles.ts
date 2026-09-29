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

/* PDF : la page A4 (marges 10 mm) porte la feuille, sans cadre ni ombre. */
.mode-impression { margin: 0; background: #fff; }
.mode-impression .sheet { width: 100%; max-width: none; min-height: 0; border: 0; box-shadow: none; padding: 0; background: #fff; }
`;
