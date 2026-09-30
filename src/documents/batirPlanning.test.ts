import { describe, expect, it } from 'vitest';
import { PERRIER_CHANTIER, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { sourcePlanningPerrier } from '../../tests/fixtures/planningPerrier';
import { batirPlanning, batirVisa, empreinteDocument } from './batir';
import { donneesDocumentSchema } from './schemas';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const suite = (de: number, a: number, annee: number) => Array.from({ length: a - de + 1 }, (_, i) => ({ numero: de + i, annee }));
const b = (colonne: number, duree: number, intitule: string) => ({ colonne, duree, intitule });

const ENTETE = {
	coordination: 'Augustin Jouan',
	maitreOuvrage: 'M. et Mme PERRIER',
	projet: "Construction d'une maison individuelle — 142 m² + garage",
	adresseChantier: 'Le Haut Bois – 44110 LOUISFERT',
};

describe('planning prévisionnel (PERRIER)', () => {
	const d = batirPlanning(sourcePlanningPerrier(), PERRIER_PARAMETRES, MAINTENANT);

	it('est égal à la référence', () => {
		expect(d.type).toBe('PLANNING');
		expect(d.cadre.dateGeneration).toBe('29.09.2026');
		expect(d.contenu).toEqual({
			entete: ENTETE,
			axe: {
				premierLundi: '2026-04-06',
				semaines: [...suite(15, 53, 2026), ...suite(1, 13, 2027)],
				mois: [
					{ libelle: 'avr.-26', nbSemaines: 4 }, { libelle: 'mai-26', nbSemaines: 4 }, { libelle: 'juin-26', nbSemaines: 5 },
					{ libelle: 'juil.-26', nbSemaines: 4 }, { libelle: 'août-26', nbSemaines: 5 }, { libelle: 'sept.-26', nbSemaines: 4 },
					{ libelle: 'oct.-26', nbSemaines: 4 }, { libelle: 'nov.-26', nbSemaines: 5 }, { libelle: 'déc.-26', nbSemaines: 4 },
					{ libelle: 'janv.-27', nbSemaines: 4 }, { libelle: 'févr.-27', nbSemaines: 4 }, { libelle: 'mars-27', nbSemaines: 5 },
				],
			},
			fermetures: [{ colonne: 16, duree: 2 }, { colonne: 37, duree: 2 }],
			lignes: [
				{ entreprise: 'GILLOT TP', lot: 'TERRASSEMENT — V.R.D.', couleur: 'noir', barres: [b(0, 1, 'Accès et plateforme'), b(27, 2, 'Terrassements finaux')] },
				{ entreprise: 'CONSTRUCTIONS REBOURS', lot: 'GROS ŒUVRE', couleur: 'noir', barres: [
					b(1, 3, 'Fondations et soubassements'), b(5, 4, 'Élévation RDC'), b(10, 2, 'Plancher intermédiaire'),
					b(13, 3, 'Élévation étage'), b(23, 1, 'Appuis et seuils'),
				] },
				{ entreprise: 'CHARPENTE ET CONSTRUCTIONS BOIS', lot: 'CHARPENTE', couleur: 'vert-clair', barres: [b(18, 2, 'Montage charpente')] },
				{ entreprise: 'AM COUVERTURE', lot: 'COUVERTURE', couleur: 'bleu-fonce', barres: [b(21, 2, 'Couverture et gouttières')] },
				{ entreprise: 'ISSÉ MENUISERIE', lot: 'MENUISERIES EXTÉRIEURES', couleur: 'vert-fonce', barres: [b(23, 2, 'Pose des menuiseries'), b(46, 1, 'Réglages de fin de chantier')] },
				{ entreprise: 'PLÂTRERIE DELAUNAY', lot: 'PLÂTRERIE — ISOLATION', couleur: 'jaune', barres: [b(28, 2, 'Isolation périphérique'), b(31, 3, 'Plafonds et cloisons')] },
				{ entreprise: 'MENUISERIES DU DON', lot: 'MENUISERIES INTÉRIEURES', couleur: 'vert-fonce', barres: [b(43, 2, 'Pose des portes')] },
				{ entreprise: 'MATELEC', lot: 'ÉLECTRICITÉ', couleur: 'rouge', barres: [b(25, 1, 'Passage des réseaux'), b(34, 2, 'Appareillage')] },
				{ entreprise: 'CMP PLUMEJEAU', lot: 'PLOMBERIE — CHAUFFAGE — V.M.C.', couleur: 'rouge', barres: [b(25, 1, 'Réseaux avant doublage'), b(33, 2, 'Pose des appareils')] },
				{ entreprise: 'MD CARRELAGE', lot: 'CARRELAGE — FAÏENCE', couleur: 'violet', barres: [b(35, 1, 'Chape'), b(40, 3, 'Carrelage et faïence')] },
				{ entreprise: "LA DÉCO'TECH", lot: 'PEINTURE', couleur: 'bleu-clair', barres: [b(45, 3, 'Peintures')] },
				{ entreprise: 'PASSION BOIS', lot: 'ESCALIER', couleur: 'vert-fonce', barres: [b(41, 1, 'Fourniture et pose')] },
				{ entreprise: '—', lot: 'ENDUIT EXTÉRIEUR', couleur: 'orange', barres: [b(26, 2, 'Dégrossi des façades')] },
			],
			periodeTravaux: { debut: { semaine: 15, annee: 2026 }, fin: { semaine: 9, annee: 2027 } },
		});
	});

	it('respecte son schéma', () => {
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('l\'empreinte ne dépend ni du jour ni des Paramètres, mais suit les périodes', () => {
		const autreJour = batirPlanning(sourcePlanningPerrier(), { ...PERRIER_PARAMETRES, telephone: '02 99 99 99 99' }, new Date('2026-12-01T08:00:00Z'));
		expect(empreinteDocument(autreJour)).toBe(empreinteDocument(d));
		const source = sourcePlanningPerrier();
		source.lots[10].periodes[0].duree = 4;
		expect(empreinteDocument(batirPlanning(source, PERRIER_PARAMETRES, MAINTENANT))).not.toBe(empreinteDocument(d));
	});

	it('un lot sans période garde sa ligne, vide ; une désignation vide s\'imprime « — »', () => {
		const source = sourcePlanningPerrier();
		source.lots[11].periodes = [];
		source.lots[12].designation = '';
		const lignes = batirPlanning(source, PERRIER_PARAMETRES, MAINTENANT).contenu.lignes;
		expect(lignes[11]).toEqual({ entreprise: 'PASSION BOIS', lot: 'ESCALIER', couleur: 'vert-fonce', barres: [] });
		expect(lignes[12].lot).toBe('—');
	});

	it('un chantier aux champs vides : « — » dans l\'en-tête', () => {
		const source = { ...sourcePlanningPerrier(), chantier: { ...PERRIER_CHANTIER, chargeAffaire: '', maitreOuvrage: '', natureTravaux: '', adresse: '', cp: '', commune: '' } };
		expect(batirPlanning(source, PERRIER_PARAMETRES, MAINTENANT).contenu.entete)
			.toEqual({ coordination: '—', maitreOuvrage: '—', projet: '—', adresseChantier: '—' });
	});

	it('sans période, rien à imprimer, même avec des fermetures', () => {
		const source = sourcePlanningPerrier();
		for (const l of source.lots) l.periodes = [];
		expect(() => batirPlanning(source, PERRIER_PARAMETRES, MAINTENANT)).toThrow('Aucune période : rien à imprimer.');
	});
});

describe('feuille de visa', () => {
	const planning = batirPlanning(sourcePlanningPerrier(), PERRIER_PARAMETRES, MAINTENANT);
	const v = batirVisa({ version: 3, donnees: planning }, PERRIER_PARAMETRES, new Date('2026-10-02T08:00:00Z'));

	it('reprend le planning source : en-tête, période des travaux, lignes, version et date', () => {
		expect(v.type).toBe('VISA_PLANNING');
		expect(v.cadre.dateGeneration).toBe('02.10.2026');
		expect(v.contenu).toEqual({
			entete: ENTETE,
			planning: { version: 3, date: '29.09.2026' },
			periodeTravaux: { debut: { semaine: 15, annee: 2026 }, fin: { semaine: 9, annee: 2027 } },
			phrase: 'Planning prévisionnel des travaux sur la période de la Semaine 15 de 2026 à la Semaine 9 de 2027 (version 3 du 29.09.2026)',
			lignes: planning.contenu.lignes.map(({ entreprise, lot }) => ({ entreprise, lot })),
		});
		expect(v.contenu.lignes).toHaveLength(13);
		expect(v.contenu.lignes[12]).toEqual({ entreprise: '—', lot: 'ENDUIT EXTÉRIEUR' });
		expect(donneesDocumentSchema.parse(v)).toEqual(v);
	});

	it('une autre version du planning change l\'empreinte du visa', () => {
		const v4 = batirVisa({ version: 4, donnees: planning }, PERRIER_PARAMETRES, MAINTENANT);
		expect(empreinteDocument(v4)).not.toBe(empreinteDocument(v));
	});
});
