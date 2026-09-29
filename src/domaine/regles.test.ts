import { describe, expect, it } from 'vitest';
import { LOTS_DE_BASE } from './lotsDeBase';
import {
	corpsEtatImprime, dateDuJourTexte, dateSignatureMarche, destinataireFactures, exemplairesParDefaut,
	exemplairesTexte, formatDateCalendaire, manquesPourGenerer,
} from './regles';

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('exemplaires', () => {
	it('2 en sous-traitance, 3 en gré à gré', () => {
		expect(exemplairesParDefaut('SOUS_TRAITANCE')).toBe(2);
		expect(exemplairesParDefaut('GRE_A_GRE')).toBe(3);
	});
	it('texte imprimé', () => {
		expect(exemplairesTexte(2)).toBe('double');
		expect(exemplairesTexte(3)).toBe('triple');
		expect(exemplairesTexte(4)).toBe('4');
	});
});

describe('destinataire des factures', () => {
	it('gré à gré : suit la mission', () => {
		expect(destinataireFactures('GRE_A_GRE', 'COMPLETE')).toBe('à SOCOREVE');
		expect(destinataireFactures('GRE_A_GRE', 'PARTIELLE')).toBe("au Maître d'Ouvrage");
	});
	it('sous-traitance : toujours SOCOREVE', () => {
		expect(destinataireFactures('SOUS_TRAITANCE', 'PARTIELLE')).toBe('à SOCOREVE');
	});
});

describe('dates', () => {
	it('format jj.mm.aaaa, lu en UTC pour une date calendaire', () => {
		expect(formatDateCalendaire(jour('2026-04-03'))).toBe('03.04.2026');
		expect(formatDateCalendaire(null)).toBeNull();
	});
	it('la date du jour suit le fuseau de Paris', () => {
		expect(dateDuJourTexte(new Date('2026-09-29T22:30:00Z'))).toBe('30.09.2026');
		expect(dateDuJourTexte(new Date('2026-09-29T08:00:00Z'))).toBe('29.09.2026');
	});
	it('« Fait le » : date du lot, sinon du chantier, sinon rien', () => {
		expect(dateSignatureMarche(jour('2026-04-10'), jour('2026-04-03'))).toEqual(jour('2026-04-10'));
		expect(dateSignatureMarche(null, jour('2026-04-03'))).toEqual(jour('2026-04-03'));
		expect(dateSignatureMarche(null, null)).toBeNull();
	});
});

describe('corps d\'état imprimé', () => {
	it('reprend la désignation en minuscules quand il est vide', () => {
		expect(corpsEtatImprime('', 'ESCALIER')).toBe('escalier');
		expect(corpsEtatImprime('   ', 'GROS ŒUVRE')).toBe('gros œuvre');
		expect(corpsEtatImprime('Menuisier', 'ESCALIER')).toBe('Menuisier');
	});
});

describe('conditions pour générer un marché', () => {
	const complet = { artisanId: 'a1', montantHtInitial: '100', maitreOuvrage: 'M. X', adresseChantier: 'Le Haut Bois' };
	it('rien ne manque', () => {
		expect(manquesPourGenerer(complet)).toEqual([]);
	});
	it('liste tout ce qui manque, dans l\'ordre', () => {
		expect(manquesPourGenerer({ artisanId: null, montantHtInitial: '0', maitreOuvrage: '', adresseChantier: '' }))
			.toEqual(['entreprise', 'montant', 'client', 'adresseChantier']);
	});
	it('des espaces valent vide', () => {
		expect(manquesPourGenerer({ ...complet, maitreOuvrage: '   ', adresseChantier: ' ' }))
			.toEqual(['client', 'adresseChantier']);
	});
});

describe('lots de base', () => {
	it('13 lots, escalier en sous-traitance sans numéro', () => {
		expect(LOTS_DE_BASE).toHaveLength(13);
		const escalier = LOTS_DE_BASE.find((l) => l.designation === 'ESCALIER');
		expect(escalier).toEqual({ numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', couleur: 'vert-fonce' });
		expect(LOTS_DE_BASE[12]).toEqual({ numero: '12', designation: 'ENDUIT EXTÉRIEUR', nature: 'GRE_A_GRE', couleur: 'orange' });
	});
});
