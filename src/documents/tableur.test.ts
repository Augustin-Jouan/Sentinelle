import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { batirRecap } from './batir';
import { recapVersXlsx } from './tableur';

describe('export tableur du récapitulatif', () => {
	it('reprend en-tête, lignes et total', async () => {
		const tampon = await recapVersXlsx(batirRecap(PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES, new Date('2026-09-29T08:00:00Z')));
		const classeur = new ExcelJS.Workbook();
		await classeur.xlsx.load(tampon as never);
		const f = classeur.getWorksheet('Récapitulatif')!;
		expect(f.getCell('A1').value).toBe('RÉCAPITULATIF DES MARCHÉS');
		expect(f.getCell('B3').value).toBe('M. et Mme PERRIER');
		const lignes = f.getSheetValues().filter(Boolean) as unknown[][];
		const grosOeuvre = lignes.find((l) => l[2] === 'GROS ŒUVRE')!;
		expect(grosOeuvre.slice(1, 6)).toEqual(['02', 'GROS ŒUVRE', 'CONSTRUCTIONS REBOURS', 115500, 0.2]);
		const enduit = lignes.find((l) => l[2] === 'ENDUIT EXTÉRIEUR')!;
		expect(enduit[3] ?? '').toBe('');
		expect(enduit[4] ?? null).toBeNull();
		const total = lignes.find((l) => l[1] === 'TOTAL MARCHÉS')!;
		expect(total[4]).toBe(374016);
	});
});
