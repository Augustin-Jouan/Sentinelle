import { readFileSync } from 'node:fs';
import Decimal from 'decimal.js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { formatEuros } from '@/domaine/montants';
import { empreinteDocument } from './batir';
import { batirCertificat, batirSociete, type SourceCertificat } from './certificat';
import { CertificatPaiement } from './gabarits/CertificatPaiement';
import { Gabarit } from './gabarits/Gabarit';
import { donneesDocumentSchema } from './schemas';

const e = formatEuros;
const SOCIETE = {
	adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26',
	email: 'contact@socoreve-chateaubriant.com', rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503',
	villeSignature: 'Châteaubriant',
};
// Spec, annexe A : CARRELAGE — FAÏENCE (MD CARRELAGE), certificat n° 03.
const CARRELAGE: SourceCertificat = {
	numero: 3,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lot: { numero: '10', designation: 'CARRELAGE — FAÏENCE', entreprise: 'MD CARRELAGE', htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false },
	avenants: [{ numero: 1, montantHt: '850' }],
	precedents: [{ id: 'm1', numero: 1, montantHt: '3000', manuel: true }, { id: 'm2', numero: 2, montantHt: '4200', manuel: true }],
	societe: SOCIETE,
};
const SAISIE = { cumul: new Decimal('9850'), mois: '2026-07', date: '2026-09-30' };
const vides = (n: number, depuis: number) => Array.from({ length: n }, (_, i) => ({ numero: String(depuis + i), montant: '' }));

describe('certificat de paiement (annexe A)', () => {
	const d = batirCertificat(CARRELAGE, SAISIE);

	it('sans caution : la feuille complète', () => {
		expect(d).toEqual({
			type: 'CERTIFICAT_PAIEMENT',
			contenu: {
				numero: '03',
				maitreOuvrage: 'M. et Mme PERRIER',
				objet: "Construction d'une maison individuelle — 142 m² + garage",
				adresseChantier: 'Le Haut Bois – 44110 – LOUISFERT',
				lotNumero: '10', lot: 'CARRELAGE — FAÏENCE', titulaire: 'MD CARRELAGE',
				marcheHt: e('12600'),
				avenants: [
					{ libelle: 'Avenant 1 HT :', montant: e('850') },
					{ libelle: 'Avenant 2 HT :', montant: '' },
					{ libelle: 'Avenant 3 HT :', montant: '' },
					{ libelle: 'Avenant 4 HT :', montant: '' },
				],
				totalHt: e('13450'), totalTva: e('2690'), totalTtc: e('16140'),
				mois: 'Juillet 2026',
				precedents: [{ numero: '1', montant: e('3000') }, { numero: '2', montant: e('4200') }, ...vides(6, 3)],
				precedentsHt: e('7200'), precedentsTva: e('1440'), precedentsTtc: e('8640'),
				realise: e('9850'), presentHt: e('2650'), presentTva: e('530'), presentTtc: e('3180'),
				mandate: e('3021'), caution: 'NON', retenue: e('159'),
				faitLe: '30/09/2026',
				valeurs: {
					htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false,
					avenants: [{ numero: 1, montantHt: '850' }],
					precedents: [{ numero: 1, montantHt: '3000', manuel: true }, { numero: 2, montantHt: '4200', manuel: true }],
					cumul: '9850.00', mois: '2026-07', date: '2026-09-30',
				},
			},
			societe: {
				adresseLigne: '71 rue du Général Patton - 44110 CHÂTEAUBRIANT',
				contactLigne: 'Tél. : 02 40 81 40 26 - contact@socoreve-chateaubriant.com',
				rcsLigne: 'RCS : 328999503 – APE 4120A',
				tvaLigne: 'N° TVA Intra. : FR47328999503',
				villeSignature: 'Châteaubriant',
			},
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('avec caution : pas de retenue', () => {
		const c = batirCertificat({ ...CARRELAGE, lot: { ...CARRELAGE.lot, caution: true } }, SAISIE).contenu;
		expect([c.caution, c.retenue, c.mandate]).toEqual(['OUI', e('0'), e('3180')]);
	});

	it('sans cumul (aperçu) : les lignes qui en dépendent restent vides', () => {
		const c = batirCertificat(CARRELAGE, { ...SAISIE, cumul: null }).contenu;
		expect([c.realise, c.presentHt, c.presentTva, c.presentTtc, c.mandate, c.retenue, c.valeurs.cumul]).toEqual(['', '', '', '', '', '', null]);
		expect(c.totalTtc).toBe(e('16140'));
	});

	it('au-delà de 4 avenants et 8 acomptes : seulement les lignes réelles ; l\'aperçu ajoute une ligne de saisie', () => {
		const long: SourceCertificat = {
			...CARRELAGE,
			numero: 25,
			avenants: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, montantHt: '100' })),
			precedents: Array.from({ length: 24 }, (_, i) => ({ id: `a${i}`, numero: i + 1, montantHt: '300', manuel: false })),
		};
		const c = batirCertificat(long, { ...SAISIE, cumul: new Decimal('8000') }).contenu;
		expect([c.avenants.length, c.precedents.length]).toEqual([10, 24]);
		expect(batirCertificat(long, SAISIE, { ligneAjout: true }).contenu.precedents).toHaveLength(25);
		expect(batirCertificat(CARRELAGE, SAISIE, { ligneAjout: true }).contenu.precedents).toHaveLength(8);
	});

	it('les avenants gardent leur numéro, trous compris', () => {
		const c = batirCertificat({ ...CARRELAGE, avenants: [{ numero: 1, montantHt: '850' }, { numero: 3, montantHt: '-300' }] }, SAISIE).contenu;
		expect(c.avenants.map((a) => a.libelle)).toEqual(['Avenant 1 HT :', 'Avenant 3 HT :', 'Avenant 4 HT :', 'Avenant 5 HT :']);
		expect(c.avenants[1].montant).toBe(e('-300'));
	});

	it('l\'en-tête SOCOREVE n\'entre pas dans l\'empreinte ; sans e-mail, pas de tiret', () => {
		const autre = batirCertificat({ ...CARRELAGE, societe: { ...SOCIETE, email: 'compta@exemple.fr' } }, SAISIE);
		expect(empreinteDocument(autre)).toBe(empreinteDocument(d));
		expect(batirSociete({ ...SOCIETE, email: null }).contactLigne).toBe('Tél. : 02 40 81 40 26');
	});

	it('module pur : ni base, ni Node, ni batir.ts (il tourne dans le navigateur)', () => {
		expect(readFileSync('src/documents/certificat.ts', 'utf8')).not.toMatch(/from '(node:|@\/donnees|@\/generated|\.\/batir|@\/domaine\/empreinte)/);
	});
});

describe('gabarit du certificat', () => {
	it('impression : logo en data URI, textes de la feuille, aucune saisie', () => {
		const html = renderToStaticMarkup(createElement(Gabarit, { donnees: batirCertificat(CARRELAGE, SAISIE), mode: 'impression' }));
		expect(html).toContain('src="data:image/jpeg;base64,');
		expect(html).toContain('CERTIFICAT DE PAIEMENT N° 03');
		expect(html).toContain('mois de Juillet 2026');
		expect(html).toContain('RCS : 328999503 – APE 4120A');
		expect(html).toContain('Fait à Châteaubriant le : 30/09/2026');
		expect(html).toContain(e('3021'));
		expect(html).not.toContain('<input');
	});

	it('édition : cumul, mois, date, caution et acomptes antérieurs se saisissent sur la feuille', () => {
		const rien = () => undefined;
		const html = renderToStaticMarkup(createElement(CertificatPaiement, {
			donnees: batirCertificat(CARRELAGE, { ...SAISIE, cumul: null }, { ligneAjout: true }),
			mode: 'edition',
			edition: {
				cumul: '', mois: '2026-07', date: '2026-09-30',
				acomptes: [{ id: 'm1', saisie: '3 000,00' }, { id: 'm2', saisie: '4 200,00' }],
				surCumul: rien, surMois: rien, surDate: rien, surCaution: rien, surAcompte: rien,
			},
		}));
		for (const libelle of ['Montant des travaux réalisés HT (cumul)', 'Mois de l&#x27;acompte', 'Fait le', 'Acompte 1 HT', 'Ajouter un acompte antérieur']) {
			expect(html).toContain(`aria-label="${libelle}"`);
		}
		expect(html).toContain('Caution bancaire : non');
		expect(html).toContain('Enregistré sur le lot, vaut pour les certificats suivants.');
		expect(html).toContain('à calculer');
	});
});
