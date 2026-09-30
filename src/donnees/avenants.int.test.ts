import { beforeEach, describe, expect, it } from 'vitest';
import { AVENANT_DISPARU, MOINS_VALUE_NEGATIVE, MONTANT_ILLISIBLE, SUPPRESSION_NEGATIVE } from '@/domaine/avenants';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from './avenants';
import { prisma } from './prisma';

let lotId: string;
const MAINTENANT = new Date('2026-09-29T22:30:00Z'); // déjà le 30 à Châteaubriant
const avenants = () => prisma.avenant.findMany({ where: { lotId }, orderBy: { numero: 'asc' } });
const lire = (id: string) => prisma.avenant.findUniqueOrThrow({ where: { id } });

describe('avenants', () => {
	beforeEach(async () => {
		await viderBase();
		const u = await creerUtilisateurTest();
		const c = await prisma.chantier.create({ data: { reference: 'T', maitreOuvrage: 'M. T', chargeAffaireId: u.id, creeParId: u.id } });
		lotId = (await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, numero: '11', designation: 'PEINTURE', montantHtInitial: '1000' } })).id;
	});

	it('ajout : numéro suivant, montant nul, date du jour à Châteaubriant, message', async () => {
		const r = await ajouterAvenant(lotId, MAINTENANT);
		expect(r).toMatchObject({ numero: 1, message: 'Avenant n° 01 ajouté — saisissez son montant.' });
		const a = await lire(r.id);
		expect([a.numero, a.montantHt.toString(), a.date.toISOString().slice(0, 10), a.devis, a.objet]).toEqual([1, '0', '2026-09-30', '', '']);
	});

	it('un numéro n\'est jamais réutilisé, même après suppression du dernier', async () => {
		await ajouterAvenant(lotId);
		await ajouterAvenant(lotId);
		const trois = await ajouterAvenant(lotId);
		await supprimerAvenant(trois.id);
		expect((await ajouterAvenant(lotId)).numero).toBe(4);
		expect((await avenants()).map((a) => a.numero)).toEqual([1, 2, 4]);
	});

	it('deux ajouts simultanés ont deux numéros', async () => {
		const r = await Promise.all([ajouterAvenant(lotId), ajouterAvenant(lotId)]);
		expect(r.map((x) => x.numero).sort()).toEqual([1, 2]);
	});

	it('montant : signé, au centime ; illisible ou rendant le lot négatif : refusé, rien d\'écrit', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'montantHt', '−300,004 €');
		expect((await lire(id)).montantHt.toString()).toBe('-300');
		await expect(modifierChampAvenant(id, 'montantHt', 'abc')).rejects.toThrow(MONTANT_ILLISIBLE);
		await expect(modifierChampAvenant(id, 'montantHt', '-1000,01')).rejects.toThrow(MOINS_VALUE_NEGATIVE);
		expect((await lire(id)).montantHt.toString()).toBe('-300');
		await modifierChampAvenant(id, 'montantHt', '-1000');
		expect((await lire(id)).montantHt.toString()).toBe('-1000');
	});

	it('deux moins-values simultanées ne rendent pas le lot négatif', async () => {
		const a = await ajouterAvenant(lotId);
		const b = await ajouterAvenant(lotId);
		const r = await Promise.allSettled([modifierChampAvenant(a.id, 'montantHt', '-600'), modifierChampAvenant(b.id, 'montantHt', '-600')]);
		expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected']);
		expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason.message).toBe(MOINS_VALUE_NEGATIVE);
		expect((await avenants()).map((x) => x.montantHt.toString()).sort()).toEqual(['-600', '0']);
	});

	it('devis, objet, date', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'devis', ' D-2026-114 ');
		await modifierChampAvenant(id, 'objet', 'Reprise des peintures du séjour.\n');
		await modifierChampAvenant(id, 'date', '2026-05-12');
		expect(await lire(id)).toMatchObject({ devis: 'D-2026-114', objet: 'Reprise des peintures du séjour.', date: new Date('2026-05-12T00:00:00Z') });
		await expect(modifierChampAvenant(id, 'date', '2026-02-30')).rejects.toThrow('Date : choisissez une date.');
		await expect(modifierChampAvenant(id, 'date', '')).rejects.toThrow('Date : choisissez une date.');
		await expect(modifierChampAvenant(id, 'devis', 'x'.repeat(41))).rejects.toThrow('Le numéro de devis est limité à 40 caractères.');
		await expect(modifierChampAvenant(id, 'objet', 'x'.repeat(601))).rejects.toThrow("L'objet est limité à 600 caractères.");
	});

	it('supprimer une plus-value qui compense une moins-value : refusé', async () => {
		const plus = await ajouterAvenant(lotId);
		const moins = await ajouterAvenant(lotId);
		await modifierChampAvenant(plus.id, 'montantHt', '500');
		await modifierChampAvenant(moins.id, 'montantHt', '-1400');
		await expect(supprimerAvenant(plus.id)).rejects.toThrow(SUPPRESSION_NEGATIVE);
		await supprimerAvenant(moins.id);
		expect((await avenants()).map((a) => a.numero)).toEqual([1]);
	});

	it('un avenant supprimé entre-temps : message clair', async () => {
		const { id } = await ajouterAvenant(lotId);
		await supprimerAvenant(id);
		await expect(modifierChampAvenant(id, 'montantHt', '10')).rejects.toThrow(AVENANT_DISPARU);
		await expect(supprimerAvenant(id)).rejects.toThrow(AVENANT_DISPARU);
	});
});
