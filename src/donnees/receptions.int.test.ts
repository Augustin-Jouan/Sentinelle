import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DONNEES_CHANGEES } from '@/documents/generer';
import type { DonneesReception } from '@/documents/schemas';
import { ErreurMetier } from '@/domaine/erreurs';
import {
	AUCUN_LOT_RECEPTIONNABLE, bilanReceptions, DATE_RECEPTION, LEVEE_AVANT, MOTIFS_TROP_LONGS, PAS_DE_RESERVES, SANS_ENTREPRISE, TOUS_LES_LOTS,
} from '@/domaine/reception';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { prisma } from './prisma';
import {
	annulerLevee, assemblerReceptions, genererReceptions, leverReserves, lireReceptionsOuvertes, modifierChampReception, modifierChampReceptionCommun,
	preparerReceptions,
} from './receptions';

/** Un vrai PDF d'une page : l'assemblage le relit. */
const faux = vi.fn(async () => {
	const d = await PDFDocument.create();
	d.addPage();
	return d.save();
});
const deps = { rendrePdf: faux };
const LE_12_OCTOBRE = new Date('2026-10-12T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;
let grosOeuvre: string;
let peinture: string;

const reception = (lotId: string) => prisma.reception.findUnique({ where: { lotId } });
const generer = (lotIds: string[], d = deps) => genererReceptions(p.chantierId, lotIds, p.utilisateurId, d);
/** Les pages de « Tous les lots » à l'ouverture, comme l'aperçu les envoie. */
const affiches = async () => (await preparerReceptions(p.chantierId, TOUS_LES_LOTS))!.pages.map((x) => x.lotId);
const genererTous = async (d = deps) => generer(await affiches(), d);
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as unknown as DonneesReception).contenu;
async function refus(promesse: Promise<unknown>): Promise<ErreurMetier> {
	const e = await promesse.then(() => null, (x: unknown) => x);
	expect(e).toBeInstanceOf(ErreurMetier);
	return e as ErreurMetier;
}

describe('procès-verbaux de réception', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		grosOeuvre = p.lots['GROS ŒUVRE'];
		peinture = p.lots.PEINTURE;
	});

	it('lire sans préparer n\'écrit pas en base', async () => {
		const o = await lireReceptionsOuvertes(p.chantierId, grosOeuvre);
		expect(o?.pages).toHaveLength(1);
		expect(o?.commun.date).toBe('');
		expect(await prisma.reception.count()).toBe(0);
		expect((await prisma.chantier.findUniqueOrThrow({ where: { id: p.chantierId } })).receptionDate).toBeNull();
	});

	it('première ouverture : champs communs remplis une fois, brouillon du lot avec l\'interlocuteur', async () => {
		const o = await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		expect(o).toMatchObject({
			chantierId: p.chantierId, cible: grosOeuvre, blocage: null,
			commun: { date: '2026-10-12', signataire: '', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' },
		});
		expect(o?.options).toHaveLength(12);
		expect(o?.options[1]).toEqual({ lotId: grosOeuvre, libelle: '02 — GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS' });
		expect(o?.options.at(-1)).toEqual({ lotId: p.lots.ESCALIER, libelle: 'ESCALIER', entreprise: 'PASSION BOIS' });
		expect(o?.pages).toHaveLength(1);
		expect(o?.pages[0]).toMatchObject({
			lotId: grosOeuvre, entreprise: 'CONSTRUCTIONS REBOURS',
			saisies: { decision: 'SANS_RESERVES', dateEffet: '', reserves: '', delai: '', motifs: '', representant: 'Mikaël REBOURS' },
		});
		expect(await prisma.reception.count()).toBe(1);

		// Une valeur saisie est gardée ; une valeur effacée est reproposée à l'ouverture suivante.
		await modifierChampReceptionCommun(p.chantierId, 'signataire', 'Jean PERRIER');
		await modifierChampReceptionCommun(p.chantierId, 'date', '2026-10-15');
		await modifierChampReceptionCommun(p.chantierId, 'maitreOeuvre', '');
		const again = await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		expect(again?.commun).toEqual({ date: '2026-10-15', signataire: 'Jean PERRIER', contrat: '2026-04-03', maitreOeuvre: 'Augustin Jouan' });
	});

	it('tous les lots : une page par lot attribué, dans l\'ordre de saisie', async () => {
		const o = await preparerReceptions(p.chantierId, TOUS_LES_LOTS);
		expect(o?.pages.map((x) => x.entreprise)).toHaveLength(12);
		expect(o?.pages[0].entreprise).toBe('GILLOT TP');
		expect(await reception(p.lots['ENDUIT EXTÉRIEUR'])).toBeNull();
		expect(await prisma.reception.count()).toBe(12);
	});

	it('lot sans entreprise, chantier sans lot attribué, lot d\'un autre chantier', async () => {
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		expect(await preparerReceptions(p.chantierId, enduit)).toMatchObject({ blocage: SANS_ENTREPRISE, pages: [] });
		expect(await reception(enduit)).toBeNull();

		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		await prisma.lot.create({ data: { chantierId: autre.id, ordre: 1, designation: 'PEINTURE' } });
		expect(await preparerReceptions(autre.id, TOUS_LES_LOTS)).toMatchObject({ blocage: AUCUN_LOT_RECEPTIONNABLE, pages: [], options: [] });
		expect(await preparerReceptions(autre.id, grosOeuvre)).toBeNull();
		expect(await preparerReceptions('inconnu', TOUS_LES_LOTS)).toBeNull();
		expect(await prisma.reception.count()).toBe(0);
	});

	it('champs du lot et champs communs : contrôles de longueur, lot sans entreprise refusé', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		await modifierChampReception(grosOeuvre, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(grosOeuvre, 'reserves', 'Joint\nPeinture');
		await modifierChampReception(grosOeuvre, 'dateEffet', '2026-10-20');
		await expect(modifierChampReception(grosOeuvre, 'decision', 'PEUT_ETRE')).rejects.toThrow();
		await expect(modifierChampReception(grosOeuvre, 'reserves', 'x'.repeat(2001))).rejects.toThrow('Les réserves sont limitées à 2 000 caractères.');
		await expect(modifierChampReception(grosOeuvre, 'reserves', Array(61).fill('x').join('\n'))).rejects.toThrow('Les réserves sont limitées à 60 lignes.');
		await expect(modifierChampReception(grosOeuvre, 'motifs', 'x'.repeat(2001))).rejects.toThrow(MOTIFS_TROP_LONGS);
		await expect(modifierChampReception(grosOeuvre, 'representant', 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
		await expect(modifierChampReception(p.lots['ENDUIT EXTÉRIEUR'], 'reserves', 'x')).rejects.toThrow(SANS_ENTREPRISE);
		expect(await reception(grosOeuvre)).toMatchObject({ decision: 'AVEC_RESERVES', reserves: 'Joint\nPeinture' });
		expect((await reception(grosOeuvre))?.dateEffet?.toISOString().slice(0, 10)).toBe('2026-10-20');

		await modifierChampReceptionCommun(p.chantierId, 'contrat', '');
		expect((await prisma.chantier.findUniqueOrThrow({ where: { id: p.chantierId } })).contratMoeDate).toBeNull();
		await expect(modifierChampReceptionCommun(p.chantierId, 'signataire', 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
	});

	it('un lot : v1, puis rien de neuf sans changement', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre, LE_12_OCTOBRE);
		const [r] = await generer([grosOeuvre]);
		expect(r).toMatchObject({ lotId: grosOeuvre, entreprise: 'CONSTRUCTIONS REBOURS', version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Reception-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['PV_RECEPTION', `RECEPTION:${grosOeuvre}`, grosOeuvre]);
		expect(await contenu(r.documentId)).toMatchObject({ decision: 'SANS_RESERVES', effet: '12/10/2026', dateReception: '2026-10-12', entreprise: 'CONSTRUCTIONS REBOURS' });
		const [bis] = await generer([grosOeuvre]);
		expect(bis).toMatchObject({ documentId: r.documentId, version: 1, nouvelle: false });
		expect(faux).toHaveBeenCalledTimes(1);
	});

	it('tous les lots : un lot invalide bloque tout, rien d\'écrit ; puis 12 PV ; puis inchangés', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		const e = await refus(genererTous());
		expect([e.message, e.champ]).toEqual(["LA DÉCO'TECH : précisez la nature des réserves.", peinture]);
		expect([faux.mock.calls.length, await prisma.document.count()]).toEqual([0, 0]);

		await modifierChampReception(peinture, 'reserves', 'Reprise des joints de la cuisine');
		const premiers = await genererTous();
		expect(premiers.filter((r) => r.nouvelle)).toHaveLength(12);
		expect(premiers.map((r) => r.entreprise)[0]).toBe('GILLOT TP');

		// Le délai d'un lot sans réserves ne s'imprime pas : rien ne change. Le représentant, si.
		await modifierChampReception(grosOeuvre, 'delai', '15 jours');
		await modifierChampReception(grosOeuvre, 'representant', 'Paul REBOURS');
		const seconds = await genererTous();
		expect(seconds.filter((r) => r.nouvelle).map((r) => [r.lotId, r.version])).toEqual([[grosOeuvre, 2]]);
		expect(bilanReceptions(1, 11)).toBe('1 PV généré, 11 inchangés.');
	});

	it('différée sans motif refusée ; date de réception vide refusée', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		await modifierChampReception(grosOeuvre, 'decision', 'DIFFEREE');
		await expect(generer([grosOeuvre])).rejects.toThrow('CONSTRUCTIONS REBOURS : précisez les motifs du report.');
		await modifierChampReception(grosOeuvre, 'motifs', 'Enduits non secs');
		await modifierChampReceptionCommun(p.chantierId, 'date', '');
		await expect(generer([grosOeuvre])).rejects.toThrow(DATE_RECEPTION);
		expect(await prisma.document.count()).toBe(0);
	});

	it('entreprise retirée entre l\'ouverture et la génération : refus, en « tous les lots » aussi, rien d\'écrit', async () => {
		const vus = await affiches();
		expect(vus).toHaveLength(12);
		await prisma.lot.update({ where: { id: grosOeuvre }, data: { artisanId: null } });
		await expect(generer([grosOeuvre])).rejects.toThrow(SANS_ENTREPRISE);
		const e = await refus(generer(vus));
		expect([e.message, e.champ]).toEqual([SANS_ENTREPRISE, grosOeuvre]);
		expect([faux.mock.calls.length, await prisma.document.count()]).toEqual([0, 0]);
		// Rouvert, « tous les lots » ne le compte plus.
		const tous = await genererTous();
		expect(tous).toHaveLength(11);
		expect(tous.some((r) => r.lotId === grosOeuvre)).toBe(false);
	});

	it('un lot attribué après l\'ouverture n\'est pas généré : on génère les pages qu\'on a vues', async () => {
		const vus = await affiches();
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		await prisma.lot.update({ where: { id: enduit }, data: { artisanId: p.artisans.MATELEC } });
		const r = await generer(vus);
		expect(r).toHaveLength(12);
		expect(r.some((x) => x.lotId === enduit)).toBe(false);
	});

	it('lot inconnu ou d\'un autre chantier, liste vide : refusés', async () => {
		await expect(generer(['inconnu'])).rejects.toThrow('Lot introuvable.');
		await expect(generer([])).rejects.toThrow(AUCUN_LOT_RECEPTIONNABLE);
	});

	it('données changées pendant le rendu : rien d\'écrit', async () => {
		await preparerReceptions(p.chantierId, grosOeuvre);
		const renomme = vi.fn(async () => {
			await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
			return faux();
		});
		await expect(generer([grosOeuvre], { rendrePdf: renomme })).rejects.toThrow(DONNEES_CHANGEES);
		expect(await prisma.document.count()).toBe(0);
	});

	it('levée : après la réception seulement, gardée par un PV inchangé, effacée par un nouveau PV', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS, LE_12_OCTOBRE);
		await expect(leverReserves(peinture, '2026-10-20')).rejects.toThrow(PAS_DE_RESERVES);
		await modifierChampReception(peinture, 'decision', 'AVEC_RESERVES');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints');
		await generer([peinture]);
		await generer([grosOeuvre]);
		await expect(leverReserves(grosOeuvre, '2026-10-20')).rejects.toThrow(PAS_DE_RESERVES);
		await expect(leverReserves(peinture, '2026-10-11')).rejects.toThrow(LEVEE_AVANT);
		await expect(leverReserves(peinture, '')).rejects.toThrow('Date : choisissez une date.');
		expect(await leverReserves(peinture, '2026-10-20')).toEqual({ chantierId: p.chantierId });
		const levee = async () => (await reception(peinture))?.reservesLeveesLe?.toISOString().slice(0, 10) ?? null;
		expect(await levee()).toBe('2026-10-20');

		await generer([peinture]);
		expect(await levee()).toBe('2026-10-20');
		await modifierChampReception(peinture, 'reserves', 'Reprise des joints\nNettoyage');
		await generer([peinture]);
		expect(await levee()).toBeNull();

		await leverReserves(peinture, '2026-10-21');
		await annulerLevee(peinture);
		expect(await levee()).toBeNull();

		await modifierChampReception(peinture, 'decision', 'DIFFEREE');
		await modifierChampReception(peinture, 'motifs', 'Peinture fraîche');
		await generer([peinture]);
		await expect(leverReserves(peinture, '2026-10-22')).rejects.toThrow(PAS_DE_RESERVES);
	});

	it('PDF assemblé : une page par lot dans l\'ordre de saisie ; rien d\'un autre chantier ni d\'un autre type', async () => {
		await preparerReceptions(p.chantierId, TOUS_LES_LOTS);
		const [a, b] = [await generer([peinture]), await generer([grosOeuvre])].map(([r]) => r);
		const assemble = await assemblerReceptions(p.chantierId, [a.documentId, b.documentId]);
		expect(assemble?.nomFichier).toBe('PERRIER-LOUISFERT-Receptions.pdf');
		expect((await PDFDocument.load(assemble!.pdf)).getPageCount()).toBe(2);

		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		const lot = await prisma.lot.create({ data: { chantierId: autre.id, ordre: 1, designation: 'PEINTURE', artisanId: p.artisans.MATELEC } });
		await preparerReceptions(autre.id, lot.id);
		const [etranger] = await genererReceptions(autre.id, [lot.id], p.utilisateurId, deps);
		await expect(genererReceptions(p.chantierId, [lot.id], p.utilisateurId, deps)).rejects.toThrow('Lot introuvable.');
		expect(await assemblerReceptions(p.chantierId, [a.documentId, etranger.documentId])).toBeNull();
		expect(await assemblerReceptions(p.chantierId, [])).toBeNull();
		expect(await assemblerReceptions(p.chantierId, ['inconnu'])).toBeNull();
	});
});
