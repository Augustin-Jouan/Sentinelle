import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { COORDONNEES_SOCOREVE, CR_SAISIES, CR_SOURCE } from '../../tests/fixtures/compteRendu';
import { empreinteDocument } from './batir';
import { batirCompteRendu } from './compteRendu';
import { societeCompteRendu } from './coordonnees';
import { CompteRendu } from './gabarits/CompteRendu';
import { Gabarit } from './gabarits/Gabarit';
import { donneesDocumentSchema } from './schemas';

describe('feuille du compte rendu', () => {
	const d = batirCompteRendu(CR_SOURCE, CR_SAISIES);

	it('tout vient du chantier, des lots et des saisies', () => {
		expect(d).toEqual({
			type: 'COMPTE_RENDU',
			contenu: {
				numero: '04',
				redacteur: 'Augustin Jouan',
				portable: '06 12 34 56 78',
				referenceChantier: "CONSTRUCTION D'UNE MAISON INDIVIDUELLE — 142 m² + GARAGE",
				adresseChantier: 'Le Haut Bois – 44110 – LOUISFERT',
				maitreOuvrage: 'M. et Mme PERRIER',
				date: '06/10/2026',
				prochainRdv: 'mardi 13/10/2026 à 14h00',
				lots: [
					{ lotId: 'l2', lot: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38', convocation: 'C' },
					{ lotId: 'l12', lot: 'ENDUIT EXTÉRIEUR', entreprise: '—', interlocuteur: '—', telephone: '—', convocation: 'D' },
				],
				avancement: [[{ texte: 'Fondations ', surligne: false }, { texte: 'coulées', surligne: true }]],
				coordination: [{ titre: 'GROS ŒUVRE', suite: [{ texte: 'reprise', surligne: true }, { texte: ' du mur', surligne: false }], lignes: [] }],
			},
			societe: {
				lignes: ['71 rue du Général Patton', '44110 Châteaubriant', 'Tél. 02 40 81 40 26', '', 'Email : contact@socoreve-chateaubriant.com', 'Site : socoreve-chateaubriant.com'],
			},
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it("sans rendez-vous ni portable : rien d'imprimé à leur place", () => {
		const c = batirCompteRendu(CR_SOURCE, { ...CR_SAISIES, rdvDate: '', rdvHeure: '', portable: '  ' }).contenu;
		expect([c.prochainRdv, c.portable]).toEqual(['', '']);
	});

	it("l'en-tête SOCOREVE n'entre pas dans l'empreinte ; sans e-mail ni site, pas de ligne vide", () => {
		const autre = batirCompteRendu({ ...CR_SOURCE, societe: { ...COORDONNEES_SOCOREVE, email: 'compta@exemple.fr' } }, CR_SAISIES);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
		expect(societeCompteRendu({ ...COORDONNEES_SOCOREVE, email: null, siteWeb: '  ' }).lignes)
			.toEqual(['71 rue du Général Patton', '44110 Châteaubriant', 'Tél. 02 40 81 40 26']);
	});

	it('modules purs : ni base, ni Node, ni batir.ts (ils tournent dans le navigateur)', () => {
		for (const f of ['src/documents/compteRendu.ts', 'src/documents/coordonnees.ts']) {
			expect(readFileSync(f, 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
		}
	});
});

describe('gabarit du compte rendu', () => {
	it('impression : logo, en-tête, légende, convocation C en rouge, surlignage, aucune saisie', () => {
		const html = renderToStaticMarkup(createElement(Gabarit, { donnees: batirCompteRendu(CR_SOURCE, CR_SAISIES), mode: 'impression' }));
		expect(html).toContain('src="data:image/jpeg;base64,');
		expect(html).toContain('COMPTE<br/>RENDU DE<br/>CHANTIER');
		expect(html).toContain('Suivi des travaux effectué par Augustin Jouan — Portable : 06 12 34 56 78');
		expect(html).toContain('<b>PROCHAIN RDV :</b> mardi 13/10/2026 à 14h00');
		expect(html).toContain('Légende : P = Présent / A = Absent / E = Excusé / <span class="cr-rouge">C = Convoqué au prochain RDV</span> / D = Diffusion');
		expect(html).toContain('<td class="cr-c">C</td>');
		expect(html).toContain('<mark>reprise</mark>');
		expect(html).toContain('SALUTATIONS');
		expect(html).not.toContain('ENDUIT EXTÉRIEUR :');
		expect(html).not.toMatch(/<(input|textarea|button)/);
	});

	it('édition : les champs se saisissent sur la feuille, la lettre de convocation est un bouton', () => {
		const rien = () => undefined;
		const html = renderToStaticMarkup(createElement(CompteRendu, {
			donnees: batirCompteRendu(CR_SOURCE, CR_SAISIES),
			mode: 'edition',
			edition: { saisies: CR_SAISIES, generation: 0, surChamp: rien, surConvocation: rien },
		}));
		for (const libelle of ['Rédacteur', 'Portable', 'Date du compte rendu', 'Date du prochain rendez-vous', 'Heure du prochain rendez-vous', 'Avancement', 'Coordination', 'Convocation GROS ŒUVRE : C']) {
			expect(html).toContain(`aria-label="${libelle}"`);
		}
		// À l'écran, on relit ce qu'on a tapé : les ** restent visibles.
		expect(html).toContain('**reprise**');
	});
});
