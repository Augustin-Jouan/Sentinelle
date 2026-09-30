import { describe, expect, it } from 'vitest';
import { CLAUSE_LOT_02, PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES, TRAVAUX_ESCALIER } from '../../tests/fixtures/perrier';
import { formatEuros } from '@/domaine/montants';
import { batirMarche, batirRecap, empreinteDocument } from './batir';
import { donneesDocumentSchema } from './schemas';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const lot = (designation: string) => PERRIER_LOTS.find((l) => l.designation === designation)!;
const EUR = (s: string) => `${s} €`;

const CADRE_ATTENDU = {
	entete: {
		raisonSociale: 'S.A.S SOCOREVE',
		libelleActivite: 'Société Construction Rénovation Vente',
		adresseLigne: '71 rue du Général Patton - 44110 – Châteaubriant',
		telephone: '02 40 81 40 26',
		fax: null,
	},
	villeSignature: 'Châteaubriant',
	dateGeneration: '29.09.2026',
};

describe('marché de gré à gré (PERRIER, lot 02)', () => {
	const d = batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT);

	it('est égal à la référence', () => {
		expect(d).toEqual({
			type: 'MARCHE_GRE_A_GRE',
			contenu: {
				maitreOuvrage: 'M. et Mme PERRIER',
				adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
				entreprise: 'CONSTRUCTIONS REBOURS',
				adresseEntreprise: 'Z.I. du Pigeon Blanc, 35640 MARTIGNÉ-FERCHAUD',
				natureTravaux: "Construction d'une maison individuelle — 142 m² + garage",
				adresseChantier: 'Le Haut Bois, 44110 LOUISFERT',
				lotTexte: '02 — GROS ŒUVRE',
				montantTtcTexte: EUR('115 500,00'),
				tvaTexte: '20,00 %',
				destinataireFactures: 'à SOCOREVE',
				retenueTexte: '5',
				complementRetenueTexte: '95',
				exemplairesTexte: 'triple',
				clauseParticuliere: CLAUSE_LOT_02,
				dateSignature: '03.04.2026',
			},
			cadre: CADRE_ATTENDU,
		});
	});

	it('respecte son schéma', () => {
		expect(donneesDocumentSchema.safeParse(d).success).toBe(true);
	});

	it('mission partielle : factures au maître d\'ouvrage', () => {
		const p = batirMarche({ ...PERRIER_CHANTIER, mission: 'PARTIELLE' }, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT);
		expect(p.type === 'MARCHE_GRE_A_GRE' && p.contenu.destinataireFactures).toBe("au Maître d'Ouvrage");
	});

	it('sans aucune date : dateSignature nulle, le cadre porte la date du jour', () => {
		const p = batirMarche({ ...PERRIER_CHANTIER, dateSignaturePrevue: null }, lot('CHARPENTE'), PERRIER_PARAMETRES, MAINTENANT);
		expect(p.contenu.dateSignature).toBeNull();
		expect(p.cadre.dateGeneration).toBe('29.09.2026');
	});
});

describe('marché de sous-traitance (PERRIER, escalier)', () => {
	it('est égal à la référence', () => {
		expect(batirMarche(PERRIER_CHANTIER, lot('ESCALIER'), PERRIER_PARAMETRES, MAINTENANT)).toEqual({
			type: 'MARCHE_SOUS_TRAITANCE',
			contenu: {
				maitreOuvrage: 'M. et Mme PERRIER',
				entreprise: 'PASSION BOIS',
				adresseEntreprise: "65 rue d'Ancenis, 44110 CHÂTEAUBRIANT",
				corpsEtat: 'escalier',
				travaux: TRAVAUX_ESCALIER,
				natureTravaux: "Construction d'une maison individuelle — 142 m² + garage",
				adresseChantier: 'Le Haut Bois, 44110 LOUISFERT',
				montantTtcTexte: EUR('8 160,00'),
				tvaTexte: '20 %',
				retenueTexte: '5',
				dateSignature: '03.04.2026',
			},
			cadre: CADRE_ATTENDU,
		});
	});
});

describe('récapitulatif PERRIER', () => {
	const d = batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES, MAINTENANT);

	it('en-tête et totaux', () => {
		expect(d.type).toBe('RECAPITULATIF');
		expect(d.contenu).toMatchObject({
			maitreOuvrage: 'M. et Mme PERRIER',
			natureTravaux: "Construction d'une maison individuelle — 142 m² + garage",
			adresseChantier: 'Le Haut Bois',
			cpCommune: '44110 LOUISFERT',
			adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
			mission: 'Complète',
			chargeAffaire: 'Augustin Jouan',
			dateSignature: '03.04.2026',
			nombreLots: 13,
			totalLibelle: 'Total marchés — 13 lots',
			totalTtc: '374016.00',
			totalTtcTexte: EUR('374 016,00'),
		});
	});

	it('lignes : entreprise, lot sans montant, sous-traitance sans numéro', () => {
		expect(d.contenu.lignes[1]).toEqual({
			numero: '02', designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS',
			montantTtc: '115500.00', montantTtcTexte: EUR('115 500,00'), tauxTva: '20', tvaTexte: '20,00 %',
			adresse: 'Z.I. du Pigeon Blanc', cp: '35640', commune: 'MARTIGNÉ-FERCHAUD',
			interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38',
		});
		expect(d.contenu.lignes[0].interlocuteur).toBe('—');
		expect(d.contenu.lignes[11]).toMatchObject({ numero: '—', designation: 'ESCALIER' });
		expect(d.contenu.lignes[12]).toMatchObject({
			numero: '12', entreprise: null, montantTtc: null, montantTtcTexte: '—', adresse: '—', telephone: '—',
		});
	});

	it('respecte son schéma', () => {
		expect(donneesDocumentSchema.safeParse(d).success).toBe(true);
	});

	it('au montant engagé : les avenants comptent', () => {
		const lots = PERRIER_LOTS.map((l) => (l.designation === 'CARRELAGE — FAÏENCE'
			? { ...l, avenants: [
				{ id: 'a1', numero: 1, devis: '', montantHt: '850', date: new Date('2026-05-12T00:00:00Z'), objet: '' },
				{ id: 'a2', numero: 2, devis: '', montantHt: '-300', date: new Date('2026-05-20T00:00:00Z'), objet: '' },
			] }
			: l));
		const r = batirRecap(PERRIER_CHANTIER, lots, PERRIER_PARAMETRES, MAINTENANT);
		expect(r.contenu.lignes.find((l) => l.designation === 'CARRELAGE — FAÏENCE')).toMatchObject({ montantTtc: '15780.00', montantTtcTexte: formatEuros('15780') });
		expect(r.contenu.totalTtc).toBe('374676.00');
	});
});

describe('empreinte d\'un document', () => {
	const base = batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), PERRIER_PARAMETRES, MAINTENANT);

	it('ignore les paramètres et le jour de génération', () => {
		const autre = batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), { ...PERRIER_PARAMETRES, telephone: '02 99 99 99 99', fax: '02 40 28 36 23' }, new Date('2027-01-15T10:00:00Z'));
		expect(empreinteDocument(autre)).toBe(empreinteDocument(base));
	});

	it('change avec le contenu', () => {
		const autre = batirMarche(PERRIER_CHANTIER, { ...lot('GROS ŒUVRE'), montantHtInitial: '96251' }, PERRIER_PARAMETRES, MAINTENANT);
		expect(empreinteDocument(autre)).not.toBe(empreinteDocument(base));
	});

	it('change avec la nature du lot', () => {
		const st = batirMarche(PERRIER_CHANTIER, { ...lot('GROS ŒUVRE'), nature: 'SOUS_TRAITANCE' }, PERRIER_PARAMETRES, MAINTENANT);
		expect(st.type).toBe('MARCHE_SOUS_TRAITANCE');
		expect(empreinteDocument(st)).not.toBe(empreinteDocument(base));
	});

	it('le fax apparaît dans le cadre quand il est renseigné', () => {
		const avecFax = batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), { ...PERRIER_PARAMETRES, fax: '02 40 28 36 23' }, MAINTENANT);
		expect(avecFax.cadre.entete.fax).toBe('02 40 28 36 23');
	});
});
