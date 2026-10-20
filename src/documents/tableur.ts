import ExcelJS from 'exceljs';
import type { DonneesRecap } from './schemas';

const vide = (t: string) => (t === '—' ? '' : t);

/** Un texte qui commence par ces signes est une formule pour Excel et LibreOffice. */
const DECLENCHEUR_FORMULE = /^[=+\-@\t\r]/;

/** Apostrophe initiale : le tableur affiche le texte et ne l'évalue pas. */
export function texteTableur(valeur: string): string {
	const t = vide(valeur);
	return DECLENCHEUR_FORMULE.test(t) ? `'${t}` : t;
}

/** Même trame que le récap imprimé. Les montants deviennent des nombres de cellule pour que le tableur sache les additionner. */
export async function recapVersXlsx(d: DonneesRecap): Promise<Buffer> {
	const c = d.contenu;
	const classeur = new ExcelJS.Workbook();
	const f = classeur.addWorksheet('Récapitulatif');
	f.addRow(['RÉCAPITULATIF DES MARCHÉS']).font = { bold: true, size: 14 };
	f.addRow([]);
	for (const [libelle, valeur] of [
		['Mr/Mme', c.maitreOuvrage],
		['Construction', c.natureTravaux],
		['Adresse', c.adresseChantier],
		['Code postal', c.cpCommune],
		["Adresse postale du maître d'ouvrage", c.adresseClient],
		['Mission', c.mission],
		["Chargé d'affaire", c.chargeAffaire],
		[`${d.cadre.villeSignature} le`, c.dateSignature ?? d.cadre.dateGeneration],
	]) f.addRow([libelle, texteTableur(valeur)]);
	f.addRow([]);
	f.addRow(['N°', 'Lot', 'Entreprise', 'Montant TTC', 'TVA', "Adresse de l'artisan", 'Code postal', 'Commune', 'Interlocuteur', 'Téléphone']).font = { bold: true };
	for (const l of c.lignes) {
		const ligne = f.addRow([
			texteTableur(l.numero), texteTableur(l.designation), texteTableur(l.entreprise ?? ''), l.montantTtc === null ? null : Number(l.montantTtc),
			Number(l.tauxTva) / 100, texteTableur(l.adresse), texteTableur(l.cp), texteTableur(l.commune), texteTableur(l.interlocuteur), texteTableur(l.telephone),
		]);
		ligne.getCell(4).numFmt = '#,##0.00 "€"';
		ligne.getCell(5).numFmt = '0.00%';
	}
	f.addRow([]);
	const total = f.addRow(['TOTAL MARCHÉS', '', '', Number(c.totalTtc)]);
	total.font = { bold: true };
	total.getCell(4).numFmt = '#,##0.00 "€"';
	f.columns.forEach((col, i) => { col.width = [6, 32, 30, 16, 9, 34, 11, 26, 22, 16][i]; });
	return Buffer.from(await classeur.xlsx.writeBuffer());
}
