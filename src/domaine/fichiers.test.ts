import { describe, expect, it } from 'vitest';
import { enTeteTelechargement, nomFichierMarche, nomFichierRecap, nomFichierTableur, slugifier } from './fichiers';

describe('noms de fichiers', () => {
	it('slugifie accents, ligatures et ponctuation', () => {
		expect(slugifier('PERRIER — Louisfert')).toBe('PERRIER-LOUISFERT');
		expect(slugifier('GROS ŒUVRE')).toBe('GROS-OEUVRE');
		expect(slugifier("L'ÉCLAIRCIE / 2")).toBe('L-ECLAIRCIE-2');
		expect(slugifier('  --a  b--  ')).toBe('A-B');
	});
	it('marché de gré à gré', () => {
		expect(nomFichierMarche({ reference: 'PERRIER — Louisfert', numero: '02', designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', version: 2 }))
			.toBe('PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Marche-v2.pdf');
	});
	it('marché de sous-traitance', () => {
		expect(nomFichierMarche({ reference: 'PERRIER — Louisfert', numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', version: 1 }))
			.toBe('PERRIER-LOUISFERT-ST-ESCALIER-Marche-v1.pdf');
	});
	it('gré à gré sans numéro', () => {
		expect(nomFichierMarche({ reference: 'X', numero: null, designation: 'Divers', nature: 'GRE_A_GRE', version: 1 }))
			.toBe('X-Lot-DIVERS-Marche-v1.pdf');
	});
	it('récapitulatif et tableur', () => {
		expect(nomFichierRecap('PERRIER — Louisfert', 3)).toBe('PERRIER-LOUISFERT-RecapMarches-v3.pdf');
		expect(nomFichierTableur('PERRIER — Louisfert')).toBe('PERRIER-LOUISFERT-RecapMarches.xlsx');
	});
	it('en-tête de téléchargement ASCII et encodé', () => {
		expect(enTeteTelechargement('A-Lot02-B-Marche-v1.pdf'))
			.toBe(`attachment; filename="A-Lot02-B-Marche-v1.pdf"; filename*=UTF-8''A-Lot02-B-Marche-v1.pdf`);
		expect(enTeteTelechargement('é"x.pdf')).toBe(`attachment; filename="_x.pdf"; filename*=UTF-8''%C3%A9%22x.pdf`);
	});
});
