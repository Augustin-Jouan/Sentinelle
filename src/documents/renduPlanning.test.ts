import { describe, expect, it } from 'vitest';
import { PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { sourcePlanningPerrier } from '../../tests/fixtures/planningPerrier';
import { batirPlanning, batirVisa } from './batir';
import { rendreHtml } from './rendu';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const planning = batirPlanning(sourcePlanningPerrier(), PERRIER_PARAMETRES, MAINTENANT);
const visa = batirVisa({ version: 3, donnees: planning }, PERRIER_PARAMETRES, MAINTENANT);
/** Corps seulement : le base64 des polices peut contenir n'importe quelle sous-chaîne. */
const corps = async (d: Parameters<typeof rendreHtml>[0]) => (await rendreHtml(d)).split('</head>')[1];
const compte = (html: string, motif: RegExp) => html.match(motif)?.length ?? 0;

describe('rendu du planning prévisionnel', () => {
	it('titre, en-tête, colonnes, axe et note de l\'annexe C', async () => {
		const html = await corps(planning);
		expect(html).toContain('<article class="sheet sheet-doc">');
		expect(html).toContain('PLANNING PRÉVISIONNEL en date du 29.09.2026');
		expect(html).toContain('<dt>Coordination :</dt><dd>Augustin Jouan</dd>');
		expect(html).toContain('<dd>Le Haut Bois – 44110 LOUISFERT</dd>');
		expect(html).toContain('<th class="d-ent">ENTREPRISES</th><th class="d-lot">LOTS</th>');
		expect(html).toContain('>avr.-26</span>');
		expect(compte(html, /<span style="width:[^"]*">\d+<\/span>/g)).toBe(52);
		expect(html).toContain('Tout retard non signalé engage la responsabilit');
		expect(html).not.toContain('Téléphone');
	});

	it('une ligne par lot, 23 barres aux couleurs de la palette, fermetures sur chaque ligne', async () => {
		const html = await corps(planning);
		expect(compte(html, /<td class="d-ent">/g)).toBe(13);
		expect(compte(html, /class="d-bar"/g)).toBe(23);
		expect(compte(html, /class="d-ferm"/g)).toBe(26);
		expect(html).toContain('background:#7a4092;color:#ffffff');
		expect(html).toContain('<td class="d-ent">—</td><td class="d-lot">ENDUIT EXTÉRIEUR</td>');
	});

	it('un intitulé contenant du HTML est échappé', async () => {
		const source = sourcePlanningPerrier();
		source.lots[0].periodes[0].intitule = '<b>gras</b>';
		const html = await corps(batirPlanning(source, PERRIER_PARAMETRES, MAINTENANT));
		expect(html).toContain('&lt;b&gt;gras&lt;/b&gt;');
		expect(html).not.toContain('<b>gras</b>');
	});
});

describe('rendu de la feuille de visa', () => {
	it('titre, phrase, colonnes, une ligne à signer par lot, note de l\'annexe C', async () => {
		const html = await corps(visa);
		expect(html).toContain('<article class="sheet sheet-doc sheet-visa">');
		expect(html).toContain('VISA DU PLANNING');
		expect(html).toContain('Planning prévisionnel des travaux sur la période de la Semaine 15 de 2026 à la Semaine 9 de 2027 (version 3 du 29.09.2026)');
		expect(html).toContain('<th>Liste des entreprises</th><th>Lots</th><th>Signature</th><th>Date</th>');
		expect(compte(html, /<td class="sig"><\/td><td class="sig"><\/td>/g)).toBe(13);
		expect(html).toContain('avoir pris connaissance du planning prévisionnel et s');
	});
});
