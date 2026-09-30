import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { ajouterLot, attribuerArtisan, changerNature, modifierChampLot, supprimerLot } from './lots';
import { prisma } from './prisma';

let chantierId: string;
let lotId: string;
let utilisateurId: string;
const lire = () => prisma.lot.findUniqueOrThrow({ where: { id: lotId } });

describe('lots', () => {
	beforeEach(async () => {
		await viderBase();
		const u = await creerUtilisateurTest();
		utilisateurId = u.id;
		chantierId = (await prisma.chantier.create({ data: { reference: 'T', maitreOuvrage: 'M. T', chargeAffaireId: u.id, creeParId: u.id } })).id;
		lotId = (await prisma.lot.create({ data: { chantierId, ordre: 1, numero: '02', designation: 'GROS ŒUVRE' } })).id;
	});

	it('saisir un TTC recalcule le HT initial (8 décimales)', async () => {
		await modifierChampLot(lotId, 'montantTtc', '1 000,00 €');
		expect((await lire()).montantHtInitial.toString()).toBe('833.33333333');
		await modifierChampLot(lotId, 'tauxTva', '5,5');
		await modifierChampLot(lotId, 'montantTtc', '115500');
		expect((await lire()).montantHtInitial.toFixed(2)).toBe('109478.67');
	});

	it('saisit un HT, une TVA, une retenue', async () => {
		await modifierChampLot(lotId, 'montantHt', '96 250,00');
		await modifierChampLot(lotId, 'tauxTva', '10 %');
		await modifierChampLot(lotId, 'retenueGarantie', '5');
		const l = await lire();
		expect([l.montantHtInitial.toString(), l.tauxTva.toString(), l.retenueGarantie.toString()]).toEqual(['96250', '10', '5']);
	});

	it('refuse une saisie invalide sans rien enregistrer', async () => {
		await modifierChampLot(lotId, 'montantHt', '100');
		await expect(modifierChampLot(lotId, 'montantHt', 'abc')).rejects.toThrow("« abc » n'est pas un nombre.");
		await expect(modifierChampLot(lotId, 'montantHt', '-5')).rejects.toThrow('Le montant ne peut pas être négatif.');
		await expect(modifierChampLot(lotId, 'tauxTva', '120')).rejects.toThrow('Le taux doit être compris entre 0 et 100.');
		expect((await lire()).montantHtInitial.toString()).toBe('100');
	});

	it('un numéro fait d\'espaces devient null ; une désignation vide est refusée', async () => {
		await modifierChampLot(lotId, 'numero', '   ');
		expect((await lire()).numero).toBeNull();
		await expect(modifierChampLot(lotId, 'designation', ' ')).rejects.toThrow('La désignation est obligatoire.');
	});

	it('limite la clause particulière à 600 caractères', async () => {
		await modifierChampLot(lotId, 'clauseParticuliere', 'x'.repeat(600));
		await expect(modifierChampLot(lotId, 'clauseParticuliere', 'x'.repeat(601)))
			.rejects.toThrow('La clause particulière est limitée à 600 caractères.');
	});

	it('date de signature du lot', async () => {
		await modifierChampLot(lotId, 'dateSignature', '2026-04-10');
		expect((await lire()).dateSignature?.toISOString()).toBe('2026-04-10T00:00:00.000Z');
		await modifierChampLot(lotId, 'dateSignature', '');
		expect((await lire()).dateSignature).toBeNull();
	});

	it('ajoute un lot à la fin', async () => {
		const id = await ajouterLot(chantierId);
		expect(await prisma.lot.findUniqueOrThrow({ where: { id } })).toMatchObject({ ordre: 2, designation: 'Nouveau lot', exemplaires: 3 });
	});

	it('cinq ajouts simultanés prennent cinq ordres distincts', async () => {
		await Promise.all(Array.from({ length: 5 }, () => ajouterLot(chantierId)));
		const ordres = (await prisma.lot.findMany({ where: { chantierId }, orderBy: { ordre: 'asc' } })).map((l) => l.ordre);
		expect(ordres).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('changer la nature remet les exemplaires par défaut', async () => {
		await changerNature(lotId, 'SOUS_TRAITANCE');
		expect(await lire()).toMatchObject({ nature: 'SOUS_TRAITANCE', exemplaires: 2 });
	});

	it('attribue une entreprise active, refuse une archivée non attribuée', async () => {
		const active = await prisma.artisan.create({ data: { nom: 'A' } });
		const archivee = await prisma.artisan.create({ data: { nom: 'B', actif: false } });
		await attribuerArtisan(lotId, active.id);
		expect((await lire()).artisanId).toBe(active.id);
		await expect(attribuerArtisan(lotId, archivee.id)).rejects.toThrow('Cette entreprise est archivée.');
		await attribuerArtisan(lotId, null);
		expect((await lire()).artisanId).toBeNull();
	});

	it('supprime un lot sans document, refuse sinon', async () => {
		const autre = await ajouterLot(chantierId);
		await supprimerLot(autre);
		await prisma.document.create({ data: {
			chantierId, lotId, serie: lotId, type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
			pdf: new Uint8Array([1]), nomFichier: 'x.pdf', creeParId: utilisateurId,
		} });
		await expect(supprimerLot(lotId)).rejects.toThrow('Ce lot a déjà un marché généré : il ne peut plus être supprimé.');
	});
});
