import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { creerChantier, listerChantiers, lireEnTeteChantier, marquerTermine, modifierChampChantier, type SaisieChantier } from './chantiers';
import { prisma } from './prisma';

let ca: { id: string };
const saisie = (o: Partial<SaisieChantier> = {}): SaisieChantier => ({
	reference: 'PERRIER — Louisfert', maitreOuvrage: 'M. et Mme PERRIER', adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
	natureTravaux: "Construction d'une maison individuelle", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT',
	clientHabiteSurPlace: false, mission: 'COMPLETE', dateSignaturePrevue: '2026-04-03', chargeAffaireId: ca.id,
	partirDesLotsDeBase: true, ...o,
});

describe('chantiers', () => {
	beforeEach(async () => {
		await viderBase();
		ca = await creerUtilisateurTest();
	});

	it('crée un chantier avec les 13 lots de base', async () => {
		const id = await creerChantier(saisie(), ca.id);
		const lots = await prisma.lot.findMany({ where: { chantierId: id }, orderBy: { ordre: 'asc' } });
		expect(lots).toHaveLength(13);
		expect(lots.map((l) => l.ordre)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
		expect(lots[11]).toMatchObject({ numero: null, designation: 'ESCALIER', nature: 'SOUS_TRAITANCE', exemplaires: 2, artisanId: null });
		expect(lots[1]).toMatchObject({ numero: '02', designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', exemplaires: 3 });
		expect(lots[1].montantHtInitial.toString()).toBe('0');
		const c = await lireEnTeteChantier(id);
		expect(c).toMatchObject({ dateSignaturePrevue: '2026-04-03', mission: 'COMPLETE' });
	});

	it('crée un chantier vide si on renonce aux lots de base', async () => {
		const id = await creerChantier(saisie({ partirDesLotsDeBase: false }), ca.id);
		expect(await prisma.lot.count({ where: { chantierId: id } })).toBe(0);
	});

	it('recopie l\'adresse du chantier quand le client y habite déjà', async () => {
		const id = await creerChantier(saisie({ clientHabiteSurPlace: true, adresseClient: 'ignorée' }), ca.id);
		expect((await lireEnTeteChantier(id))?.adresseClient).toBe('Le Haut Bois, 44110 LOUISFERT');
	});

	it('refuse un client fait d\'espaces et une référence déjà prise', async () => {
		await expect(creerChantier(saisie({ maitreOuvrage: '   ' }), ca.id)).rejects.toThrow('Le nom du client est obligatoire.');
		await creerChantier(saisie(), ca.id);
		await expect(creerChantier(saisie(), ca.id)).rejects.toThrow('Cette référence existe déjà.');
	});

	it('modifie l\'en-tête champ par champ', async () => {
		const id = await creerChantier(saisie(), ca.id);
		await modifierChampChantier(id, 'mission', 'PARTIELLE');
		await modifierChampChantier(id, 'dateSignaturePrevue', '');
		await modifierChampChantier(id, 'maitreOuvrage', ' M. PERRIER ');
		expect(await lireEnTeteChantier(id)).toMatchObject({ mission: 'PARTIELLE', dateSignaturePrevue: '', maitreOuvrage: 'M. PERRIER' });
		await expect(modifierChampChantier(id, 'mission', 'AUTRE')).rejects.toThrow();
		await expect(modifierChampChantier(id, 'dateSignaturePrevue', '03/04/2026')).rejects.toThrow('Date invalide.');
	});

	it('liste les chantiers avec leur total TTC engagé', async () => {
		const id = await creerChantier(saisie({ partirDesLotsDeBase: false }), ca.id);
		await prisma.lot.createMany({ data: [
			{ chantierId: id, ordre: 1, designation: 'A', montantHtInitial: '96250', tauxTva: '20' },
			{ chantierId: id, ordre: 2, designation: 'B', montantHtInitial: '0.004', tauxTva: '0' },
		] });
		await marquerTermine(id, true);
		const [c] = await listerChantiers();
		expect(c).toMatchObject({ reference: 'PERRIER — Louisfert', commune: 'LOUISFERT', chargeAffaire: 'Augustin Jouan', termine: true, totalTtcTexte: '115 500,00 €' });
	});
});
