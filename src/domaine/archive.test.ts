import { describe, expect, it } from 'vitest';
import { cheminsArchive, dernieresVersions, DOSSIERS_ARCHIVE } from './archive';

describe('archive « Tout télécharger »', () => {
	it('un dossier par sorte de document ; le récapitulatif à la racine', () => {
		expect(DOSSIERS_ARCHIVE).toEqual({
			MARCHE_GRE_A_GRE: '01 Marchés', MARCHE_SOUS_TRAITANCE: '01 Marchés', AVENANT: '02 Avenants',
			CERTIFICAT_PAIEMENT: '03 Certificats de paiement', COMPTE_RENDU: '04 Comptes rendus', PV_RECEPTION: '05 Réceptions',
			PLANNING: '06 Planning', VISA_PLANNING: '06 Planning', RECAPITULATIF: '',
		});
	});

	it('la dernière version de chaque série, quel que soit l\'ordre', () => {
		const docs = [
			{ serie: 'A', version: 1, id: 'a1' }, { serie: 'B', version: 1, id: 'b1' }, { serie: 'A', version: 3, id: 'a3' }, { serie: 'A', version: 2, id: 'a2' },
		];
		expect(dernieresVersions(docs).map((d) => d.id).sort()).toEqual(['a3', 'b1']);
	});

	it('chemins triés ; un nom déjà pris dans un dossier prend « (2) » avant l\'extension', () => {
		const r = cheminsArchive([
			{ dossier: '05 Réceptions', nom: 'X-Reception-v1.pdf' },
			{ dossier: '', nom: 'X-RecapMarches.xlsx' },
			{ dossier: '01 Marchés', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '01 Marchés', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '02 Avenants', nom: 'X-Lot-A-Marche-v1.pdf' },
			{ dossier: '01 Marchés', nom: 'SANSEXTENSION' },
			{ dossier: '01 Marchés', nom: 'SANSEXTENSION' },
		]);
		expect(r.map((f) => f.chemin)).toEqual([
			'01 Marchés/SANSEXTENSION', '01 Marchés/SANSEXTENSION (2)', '01 Marchés/X-Lot-A-Marche-v1.pdf', '01 Marchés/X-Lot-A-Marche-v1 (2).pdf',
			'02 Avenants/X-Lot-A-Marche-v1.pdf', '05 Réceptions/X-Reception-v1.pdf', 'X-RecapMarches.xlsx',
		]);
	});
});
