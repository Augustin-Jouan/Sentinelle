import { beforeEach, describe, expect, it, vi } from 'vitest';
import { corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu, ouvrirCompteRendu } from '@/donnees/comptesRendus';
import { prisma } from '@/donnees/prisma';
import { genererReceptions, leverReserves, modifierChampReception, preparerReceptions } from '@/donnees/receptions';
import { TOUS_LES_LOTS } from '@/domaine/reception';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier } from './etats';

const deps = { rendrePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])) };
const LE_12_OCTOBRE = new Date('2026-10-12T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;

const vue = async () => (await etatsDocumentsChantier(p.chantierId))!;
const ligne = async (designation: string) =>
	(await vue()).entreprises.flatMap((g) => g.lots).find((l) => l.lotTexte.endsWith(designation))!;

describe('page Documents : comptes rendus et réceptions', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('chantier neuf : aucun compte rendu, « + Réception » pour un lot attribué, rien pour un lot sans entreprise', async () => {
		const v = await vue();
		expect(v.comptesRendus).toEqual({ brouillon: null, liste: [], prochainRdv: null });
		expect(v.resume).toEqual({ nombre: 0, dernierLe: null });
		expect((await ligne('GROS ŒUVRE')).reception).toEqual({ etat: 'a-produire', texte: '+ Réception', alerte: false, derniere: null, leveeLe: null });
		expect((await ligne('ENDUIT EXTÉRIEUR')).reception).toBeNull();
	});

	it('carte Comptes rendus : dernier enregistré, prochain rendez-vous, brouillon en cours, versions', async () => {
		const premier = await creerBrouillon(p.chantierId, new Date('2026-10-06T08:00:00Z'));
		await modifierChampCompteRendu(premier.id, 'avancement', 'Fondations coulées');
		await modifierChampCompteRendu(premier.id, 'rdvDate', '2026-10-13');
		await modifierChampCompteRendu(premier.id, 'rdvHeure', '14:00');
		await enregistrerCompteRendu(premier.id, p.utilisateurId, deps);
		let c = (await vue()).comptesRendus;
		expect(c).toMatchObject({ brouillon: null, prochainRdv: 'mardi 13/10 à 14h00' });
		expect(c.liste).toEqual([{ id: premier.id, numero: 1, date: '06/10/2026', versions: [expect.objectContaining({ version: 1, type: 'COMPTE_RENDU' })], dernier: true }]);

		const ouvert = await ouvrirCompteRendu(premier.id, p.chantierId, 'correction');
		await corrigerCompteRendu(premier.id, { ...ouvert!.saisies, rdvDate: '', rdvHeure: '' }, p.utilisateurId, deps);
		await creerBrouillon(p.chantierId);
		c = (await vue()).comptesRendus;
		expect(c.brouillon).toEqual({ numero: 2 });
		expect(c.prochainRdv).toBe('');
		expect(c.liste[0].versions.map((x) => x.version)).toEqual([2, 1]);

		const v = await vue();
		expect(v.resume.nombre).toBe(2);
		expect(v.resume.dernierLe).toBe(c.liste[0].versions[0].creeLe);
	});

	it('case Réception : avec réserves (orangé), levée (bleu), différée (orangé) ; les PV dans l\'historique', async () => {
		const peinture = p.lots.PEINTURE;
		const tous = (await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE))!.pages.map((x) => x.lotId);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints');
		await genererReceptions(p.chantierId, tous, p.utilisateurId, deps);

		expect((await ligne('GROS ŒUVRE')).reception).toMatchObject({ etat: 'sans-reserves', texte: 'Sans réserves · 12/10', alerte: false });
		let l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'avec-reserves', texte: 'Avec réserves · 12/10', alerte: true, leveeLe: null, derniere: { version: 1 } });
		expect(l.historique).toEqual([expect.objectContaining({ type: 'PV_RECEPTION', libelle: 'PV', version: 1 })]);

		await leverReserves(peinture, '2026-10-20');
		l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'levee', texte: 'Réserves levées le 20/10', alerte: false, leveeLe: '2026-10-20' });

		await modifierChampReception(peinture, 'decision', 'DIFFEREE');
		await modifierChampReception(peinture, 'motifs', 'Peinture fraîche');
		await genererReceptions(p.chantierId, [peinture], p.utilisateurId, deps);
		l = await ligne('PEINTURE');
		expect(l.reception).toMatchObject({ etat: 'differee', texte: 'Différée · 12/10', alerte: true, leveeLe: null, derniere: { version: 2 } });
		expect(l.historique.map((h) => [h.libelle, h.version])).toEqual([['PV', 2], ['PV', 1]]);
	});

	it('une entreprise renommée ne rend ni le compte rendu ni le PV « modifiés » : ils n\'ont pas d\'état', async () => {
		const b = await creerBrouillon(p.chantierId);
		await modifierChampCompteRendu(b.id, 'avancement', 'x');
		await enregistrerCompteRendu(b.id, p.utilisateurId, deps);
		await preparerReceptions(p.chantierId, p.lots['GROS ŒUVRE']);
		await genererReceptions(p.chantierId, [p.lots['GROS ŒUVRE']], p.utilisateurId, deps);
		const avant = await vue();
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
		const apres = await vue();
		expect(apres.comptesRendus).toEqual(avant.comptesRendus);
		expect(apres.entreprises.flatMap((g) => g.lots).find((x) => x.lotId === p.lots['GROS ŒUVRE'])?.reception)
			.toEqual(avant.entreprises.flatMap((g) => g.lots).find((x) => x.lotId === p.lots['GROS ŒUVRE'])?.reception);
	});
});
