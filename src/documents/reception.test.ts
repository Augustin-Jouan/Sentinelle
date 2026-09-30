import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PV_COMMUN, PV_SAISIES, PV_SOURCE } from '../../tests/fixtures/reception';
import { COORDONNEES_SOCOREVE } from '../../tests/fixtures/compteRendu';
import { empreinteDocument } from './batir';
import { Gabarit } from './gabarits/Gabarit';
import { ProcesVerbalReception } from './gabarits/ProcesVerbalReception';
import { batirReception, tauxCourt } from './reception';
import { donneesDocumentSchema } from './schemas';

describe('feuille du PV de réception', () => {
	const d = batirReception(PV_SOURCE, PV_SAISIES, PV_COMMUN);

	it('avec réserves : effet à la date de réception, une réserve par ligne, délai imprimé', () => {
		expect(d).toEqual({
			type: 'PV_RECEPTION',
			contenu: {
				enDateDu: '12/10/2026', maitreOuvrage: 'M. et Mme PERRIER', adresseTravaux: 'Le Haut Bois', cpCommune: '44110 – LOUISFERT',
				soussigne: 'M. et Mme PERRIER', representantDe: '', maitreOeuvre: 'Augustin Jouan',
				entreprise: 'CONSTRUCTIONS REBOURS', representant: 'Mikaël REBOURS', lot: '02 — GROS ŒUVRE',
				mission: 'complète', contrat: '03/04/2026', decision: 'AVEC_RESERVES', effet: '12/10/2026', motifs: '',
				reserves: ['Reprise des joints de la cuisine', 'Nettoyage du chantier'], delai: '30 jours', retenue: '5',
				dateReception: '2026-10-12',
			},
			societe: { lignes: ['71 rue du Général Patton - 44110 CHÂTEAUBRIANT', 'Tél. 02 40 81 40 26 – contact@socoreve-chateaubriant.com'] },
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('sans réserves : ni réserves ni délai, même s\'ils restent dans le brouillon ; date d\'effet saisie', () => {
		const c = batirReception(PV_SOURCE, { ...PV_SAISIES, decision: 'SANS_RESERVES', dateEffet: '2026-10-15' }, PV_COMMUN).contenu;
		expect([c.effet, c.reserves, c.delai, c.motifs]).toEqual(['15/10/2026', [], '', '']);
	});

	it('différée : motifs imprimés, aucune date d\'effet', () => {
		const c = batirReception(PV_SOURCE, { ...PV_SAISIES, decision: 'DIFFEREE', motifs: 'Enduits non secs' }, PV_COMMUN).contenu;
		expect([c.effet, c.motifs, c.reserves, c.delai]).toEqual(['', 'Enduits non secs', [], '']);
	});

	it('signataire saisi : « représentant de » ; sous-traitance : la désignation seule ; mission partielle', () => {
		const c = batirReception(
			{ ...PV_SOURCE, chantier: { ...PV_SOURCE.chantier, mission: 'PARTIELLE' }, lot: { ...PV_SOURCE.lot, numero: null, designation: 'ESCALIER' } },
			PV_SAISIES,
			{ ...PV_COMMUN, signataire: ' Jean PERRIER ', contrat: '' },
		).contenu;
		expect([c.soussigne, c.representantDe, c.lot, c.mission, c.contrat]).toEqual(['Jean PERRIER', 'M. et Mme PERRIER', 'ESCALIER', 'partielle', '']);
	});

	it('taux de la retenue : virgule décimale, sans zéro inutile', () => {
		expect(['5', '5.00', '2.50', '2.5', '0'].map(tauxCourt)).toEqual(['5', '5', '2,5', '2,5', '0']);
	});

	it("l'en-tête SOCOREVE n'entre pas dans l'empreinte", () => {
		const autre = batirReception({ ...PV_SOURCE, societe: { ...COORDONNEES_SOCOREVE, telephone: '02 00 00 00 00' } }, PV_SAISIES, PV_COMMUN);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
	});

	it('module pur : ni base, ni Node, ni batir.ts', () => {
		expect(readFileSync('src/documents/reception.ts', 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
	});
});

describe('gabarit du PV de réception', () => {
	const html = (saisies = PV_SAISIES) => renderToStaticMarkup(createElement(Gabarit, { donnees: batirReception(PV_SOURCE, saisies, PV_COMMUN), mode: 'impression' }));

	it('impression : toutes les phrases, quelle que soit la décision ; la case cochée porte le ✕', () => {
		for (const decision of ['SANS_RESERVES', 'AVEC_RESERVES', 'DIFFEREE'] as const) {
			const h = html({ ...PV_SAISIES, decision, motifs: 'Enduits non secs' });
			for (const phrase of [
				'PROCÈS-VERBAL DE RÉCEPTION<br/>DES TRAVAUX ENTREPRISE',
				'la réception est prononcée sans réserves, avec effet à la date du :',
				'la réception est prononcée avec réserves (réserves mentionnées ci-après), avec effet à la date du :',
				'la réception est différée pour les motifs suivants :',
				'NATURE DES RÉSERVES',
				'seront exécutés dans un délai de',
				'la retenue de garantie qui est de 5 % sera restituée',
				'Signature du maître d&#x27;œuvre',
				'CONSTAT DE LEVÉE DE RÉSERVES',
				'constatent qu&#x27;il a été valablement remédié aux malfaçons, omissions, imperfections concernées.',
			]) expect(h).toContain(phrase);
			expect(h.match(/✕/g)).toHaveLength(1);
			expect(h).not.toMatch(/<(input|textarea|button)/);
		}
		expect(html()).toContain('<div class="pv-reserves">Reprise des joints de la cuisine\nNettoyage du chantier</div>');
		expect(html()).toContain('au titre du contrat de maîtrise d&#x27;œuvre complète du <span class="pv-v">03/04/2026</span>');
	});

	it('édition : champs du lot et champs communs sur la feuille, décision par case', () => {
		const rien = () => undefined;
		const h = renderToStaticMarkup(createElement(ProcesVerbalReception, {
			donnees: batirReception(PV_SOURCE, PV_SAISIES, PV_COMMUN),
			mode: 'edition',
			edition: { saisies: PV_SAISIES, commun: PV_COMMUN, surChamp: rien, surCommun: rien, surDecision: rien },
		}));
		for (const libelle of [
			'Date de la réception', 'Signataire pour le maître d&#x27;ouvrage', 'Maître d&#x27;œuvre', 'Entreprise représentée par',
			'Date du contrat de maîtrise d&#x27;œuvre', 'Date d&#x27;effet', 'Nature des réserves', 'Délai pour lever les réserves',
			'Sans réserves', 'Avec réserves', 'Différée',
		]) expect(h).toContain(`aria-label="${libelle}"`);
		expect(h).toContain('aria-pressed="true" aria-label="Avec réserves"');
	});
});
