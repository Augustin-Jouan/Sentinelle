import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';
import { COORDONNEES_SOCOREVE, CR_SAISIES, CR_SOURCE } from '../../tests/fixtures/compteRendu';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { sourcePlanningPerrier } from '../../tests/fixtures/planningPerrier';
import { PV_COMMUN, PV_SAISIES, PV_SOURCE } from '../../tests/fixtures/reception';
import { batirAvenant, batirMarche, batirPlanning, batirRecap, batirVisa, empreinteDocument } from './batir';
import { batirCertificat, type SourceCertificat } from './certificat';
import { batirCompteRendu } from './compteRendu';
import { LOGO_SOCOREVE } from './gabarits/logo';
import { batirReception } from './reception';
import { rendreHtml } from './rendu';
import { donneesDocumentSchema, type DonneesDocument } from './schemas';

const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANAUTRE';
const MAINTENANT = new Date('2026-09-29T08:00:00Z');
type Logo = string | null;

const lot = (d: string) => PERRIER_LOTS.find((l) => l.designation === d)!;
const avecAvenant = { ...lot('CARRELAGE — FAÏENCE'), avenants: [{ id: 'a1', numero: 1, devis: 'D-1', montantHt: '850', date: MAINTENANT, objet: 'Faïence' }] };
const parametres = (logo: Logo) => ({ ...PERRIER_PARAMETRES, logo });
const planning = (logo: Logo) => batirPlanning(sourcePlanningPerrier(), parametres(logo), MAINTENANT);
const certificat: SourceCertificat = {
	numero: 1,
	chantier: { maitreOuvrage: 'M. TEST', natureTravaux: 'Maison', adresse: 'Le Bourg', cp: '44110', commune: 'LOUISFERT' },
	lot: { numero: '10', designation: 'CARRELAGE', entreprise: 'MD', htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false },
	avenants: [],
	precedents: [],
	societe: {
		adresse: 'a', cp: 'c', ville: 'v', telephone: 't', email: null, rcs: 'r', ape: 'p', tvaIntracommunautaire: 'f', villeSignature: 'v', logo: null,
	},
};

const SANS_LOGO_AUTREFOIS: [string, (logo: Logo) => DonneesDocument][] = [
	['marché de gré à gré', (logo) => batirMarche(PERRIER_CHANTIER, lot('GROS ŒUVRE'), parametres(logo), MAINTENANT)],
	['marché de sous-traitance', (logo) => batirMarche(PERRIER_CHANTIER, lot('ESCALIER'), parametres(logo), MAINTENANT)],
	['récapitulatif', (logo) => batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, parametres(logo), MAINTENANT)],
	['planning', planning],
	['visa', (logo) => batirVisa({ version: 1, donnees: planning(logo) }, parametres(logo), MAINTENANT)],
	['avenant', (logo) => batirAvenant(PERRIER_CHANTIER, avecAvenant, 'a1', parametres(logo), MAINTENANT)],
];
const AVEC_LOGO_AUTREFOIS: [string, (logo: Logo) => DonneesDocument][] = [
	['certificat de paiement', (logo) => batirCertificat(
		{ ...certificat, societe: { ...certificat.societe, logo } },
		{ cumul: new Decimal('1000'), mois: '2026-07', date: '2026-09-30' },
	)],
	['compte rendu', (logo) => batirCompteRendu({ ...CR_SOURCE, societe: { ...COORDONNEES_SOCOREVE, logo } }, CR_SAISIES)],
	['PV de réception', (logo) => batirReception({ ...PV_SOURCE, societe: { ...COORDONNEES_SOCOREVE, logo } }, PV_SAISIES, PV_COMMUN)],
];
const TOUS = [...SANS_LOGO_AUTREFOIS, ...AVEC_LOGO_AUTREFOIS];

/** Corps seulement : le base64 des polices peut contenir n'importe quelle sous-chaîne. */
const corps = async (d: DonneesDocument) => (await rendreHtml(d)).split('</head>')[1];

/** Un document enregistré avant le logo paramétrable : son objet figé n'a pas de clé `logo`. */
function figeAvantLeLogo(d: DonneesDocument): DonneesDocument {
	const copie = structuredClone(d) as { cadre?: { entete: { logo?: Logo } }; societe?: { logo?: Logo } };
	if (copie.cadre) delete copie.cadre.entete.logo;
	if (copie.societe) delete copie.societe.logo;
	return copie as DonneesDocument;
}

describe('logo de l\'entreprise sur les documents', () => {
	it.each(TOUS)('%s : imprime le logo des paramètres', async (_nom, batir) => {
		const d = batir(LOGO);
		expect(await corps(d)).toContain(`src="${LOGO}"`);
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it.each(TOUS)('%s : sans logo, aucune image', async (_nom, batir) => {
		const d = batir(null);
		expect(await corps(d)).not.toContain('<img');
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it.each(TOUS)('%s : changer de logo ne rend pas le document « modifié »', (_nom, batir) => {
		expect(empreinteDocument(batir(LOGO))).toBe(empreinteDocument(batir(null)));
	});

	it.each(AVEC_LOGO_AUTREFOIS)('%s figé avant cette évolution : garde le logo qu\'il a imprimé', async (_nom, batir) => {
		const d = figeAvantLeLogo(batir(LOGO));
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
		expect(await corps(d)).toContain(`src="${LOGO_SOCOREVE}"`);
	});

	it.each(SANS_LOGO_AUTREFOIS)('%s figé avant cette évolution : reste sans logo', async (_nom, batir) => {
		const d = figeAvantLeLogo(batir(LOGO));
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
		expect(await corps(d)).not.toContain('<img');
	});
});
