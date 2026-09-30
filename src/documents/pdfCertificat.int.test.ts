import Decimal from 'decimal.js';
import { PDFDocument } from 'pdf-lib';
import { afterAll, describe, expect, it } from 'vitest';
import { batirCertificat, type SourceCertificat } from './certificat';
import { imprimerCertificat } from './generer';
import { fermerNavigateur } from './pdf';
import { rendreHtml } from './rendu';

const SOURCE: SourceCertificat = {
	numero: 3,
	chantier: { maitreOuvrage: 'M. et Mme PERRIER', natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT' },
	lot: { numero: '10', designation: 'CARRELAGE — FAÏENCE', entreprise: 'MD CARRELAGE', htInitial: '12600', tauxTva: '20', tauxRetenue: '5', caution: false },
	avenants: [{ numero: 1, montantHt: '850' }],
	precedents: [{ id: 'm1', numero: 1, montantHt: '3000', manuel: true }, { id: 'm2', numero: 2, montantHt: '4200', manuel: true }],
	societe: {
		adresse: '71 rue du Général Patton', cp: '44110', ville: 'Châteaubriant', telephone: '02 40 81 40 26', email: 'contact@socoreve-chateaubriant.com',
		rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503', villeSignature: 'Châteaubriant',
	},
};
const SAISIE = { cumul: new Decimal('9850'), mois: '2026-07', date: '2026-09-30' };

async function pages(source: SourceCertificat, cumul: string) {
	const pdf = await PDFDocument.load(await imprimerCertificat(await rendreHtml(batirCertificat(source, { ...SAISIE, cumul: new Decimal(cumul) }))));
	const { width, height } = pdf.getPage(0).getSize();
	return { nombre: pdf.getPageCount(), portrait: height > width, largeur: Math.round(width) };
}

describe('impression du certificat', () => {
	afterAll(fermerNavigateur);

	it('annexe A : une page A4 portrait', async () => {
		// Chromium on this machine reports A4 portrait as 596 pt wide (not ISO 595).
		expect(await pages(SOURCE, '9850')).toEqual({ nombre: 1, portrait: true, largeur: 596 });
	});

	it('10 avenants et 24 acomptes précédents : toujours une page', async () => {
		const long: SourceCertificat = {
			...SOURCE,
			numero: 25,
			avenants: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, montantHt: '100' })),
			precedents: Array.from({ length: 24 }, (_, i) => ({ id: `a${i}`, numero: i + 1, montantHt: '300', manuel: i < 3 })),
		};
		expect(await pages(long, '8000')).toEqual({ nombre: 1, portrait: true, largeur: 596 });
	});
});
