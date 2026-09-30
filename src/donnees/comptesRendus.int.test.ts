import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DonneesCompteRendu } from '@/documents/schemas';
import { DONNEES_CHANGEES } from '@/documents/generer';
import {
	BROUILLON_DISPARU, coordinationBase, CR_INTROUVABLE, CR_VIDE, DERNIER_CR_SEUL, HEURE_INVALIDE, HEURE_SANS_DATE,
} from '@/domaine/compteRendu';
import { PERRIER_LOTS } from '../../tests/fixtures/perrier';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import {
	abandonnerBrouillon, changerConvocation, corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, lireBrouillon,
	modifierChampCompteRendu, ouvrirCompteRendu,
} from './comptesRendus';
import { prisma } from './prisma';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { rendrePdf: faux };
/** 23 h 30 à Londres le 5 : déjà le 6 à Châteaubriant. */
const LE_6_OCTOBRE = new Date('2026-10-05T23:30:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;
let grosOeuvre: string;
let peinture: string;

const ligne = (id: string) => prisma.compteRendu.findUniqueOrThrow({ where: { id } });
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as DonneesCompteRendu).contenu;
/** Un brouillon qui a de quoi s'imprimer. */
async function brouillonRempli(avancement = 'Fondations coulées') {
	const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
	await modifierChampCompteRendu(b.id, 'avancement', avancement);
	return b;
}
const enregistrer = (id: string, d = deps) => enregistrerCompteRendu(id, p.utilisateurId, d);

describe('comptes rendus de chantier', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		grosOeuvre = p.lots['GROS ŒUVRE'];
		peinture = p.lots.PEINTURE;
		await prisma.utilisateur.update({ where: { id: p.utilisateurId }, data: { telephone: '06 12 34 56 78' } });
	});

	it('premier brouillon : n° 1, coordination de base, jour de Châteaubriant, chargé d\'affaire ; un seul par chantier', async () => {
		const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		expect(b.numero).toBe(1);
		const ouvert = await lireBrouillon(p.chantierId);
		expect(ouvert).toMatchObject({ id: b.id, numero: 1, mode: 'brouillon', fige: null, derniere: null, blocage: null });
		expect(ouvert?.saisies).toEqual({
			date: '2026-10-06', rdvDate: '', rdvHeure: '', avancement: '',
			coordination: coordinationBase(PERRIER_LOTS.map((l) => l.designation)),
			redacteur: 'Augustin Jouan', portable: '06 12 34 56 78', convocations: {},
		});
		expect(ouvert?.source.lots).toHaveLength(13);
		expect(ouvert?.source.lots[1]).toEqual({
			id: grosOeuvre, designation: 'GROS ŒUVRE', entreprise: 'CONSTRUCTIONS REBOURS', interlocuteur: 'Mikaël REBOURS', telephone: '06-77-07-05-38',
		});
		expect(await creerBrouillon(p.chantierId)).toEqual(b);
	});

	it('deux « Nouveau compte rendu » simultanés : un seul brouillon, ouvert par les deux', async () => {
		const [a, b] = await Promise.all([creerBrouillon(p.chantierId), creerBrouillon(p.chantierId)]);
		expect(a).toEqual(b);
		expect(await prisma.compteRendu.count({ where: { chantierId: p.chantierId } })).toBe(1);
	});

	it('dates et heure du brouillon : date vide refusée, heure contrôlée, rendez-vous vidé avec son heure', async () => {
		const { id } = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await expect(modifierChampCompteRendu(id, 'date', '')).rejects.toThrow('Date : choisissez une date.');
		expect((await ligne(id)).date.toISOString().slice(0, 10)).toBe('2026-10-06');
		await expect(modifierChampCompteRendu(id, 'rdvHeure', '14:00')).rejects.toThrow(HEURE_SANS_DATE);
		await modifierChampCompteRendu(id, 'rdvDate', '2026-10-13');
		await expect(modifierChampCompteRendu(id, 'rdvHeure', '25:00')).rejects.toThrow(HEURE_INVALIDE);
		await modifierChampCompteRendu(id, 'rdvHeure', '14:00');
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({ rdvDate: '2026-10-13', rdvHeure: '14:00' });
		await modifierChampCompteRendu(id, 'rdvDate', '');
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({ rdvDate: '', rdvHeure: '' });
		await modifierChampCompteRendu(id, 'rdvHeure', '');
	});

	it('textes du brouillon : longueurs contrôlées, rédacteur et portable raccourcis de leurs espaces', async () => {
		const { id } = await creerBrouillon(p.chantierId);
		await expect(modifierChampCompteRendu(id, 'avancement', 'x'.repeat(5001))).rejects.toThrow("L'avancement est limité à 5 000 caractères.");
		await expect(modifierChampCompteRendu(id, 'coordination', 'x'.repeat(20001))).rejects.toThrow('La coordination est limitée à 20 000 caractères.');
		await expect(modifierChampCompteRendu(id, 'portable', '0'.repeat(121))).rejects.toThrow('120 caractères au plus.');
		await modifierChampCompteRendu(id, 'redacteur', '  Paul Martin ');
		expect((await ligne(id)).redacteur).toBe('Paul Martin');
	});

	it('convocations : D → C → P → A → E → D ; deux lots changés en même temps sont tous deux gardés', async () => {
		const { id } = await creerBrouillon(p.chantierId);
		const lettres: string[] = [];
		for (let i = 0; i < 5; i++) lettres.push((await changerConvocation(id, grosOeuvre))[grosOeuvre]);
		expect(lettres).toEqual(['C', 'P', 'A', 'E', 'D']);
		await Promise.all([changerConvocation(id, grosOeuvre), changerConvocation(id, peinture)]);
		expect((await lireBrouillon(p.chantierId))?.saisies.convocations).toEqual({ [grosOeuvre]: 'C', [peinture]: 'C' });
	});

	it('enregistrer : refusé sans avancement ni coordination imprimable, puis v1 figée', async () => {
		const { id } = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await modifierChampCompteRendu(id, 'coordination', 'GROS ŒUVRE :\n\nPEINTURE :');
		await expect(enregistrer(id)).rejects.toThrow(CR_VIDE);
		expect(faux).not.toHaveBeenCalled();

		await modifierChampCompteRendu(id, 'coordination', 'GROS ŒUVRE : **reprise** du mur');
		await changerConvocation(id, grosOeuvre);
		const r = await enregistrer(id);
		expect(r).toMatchObject({ version: 1, nouvelle: true, numero: 1, chantierId: p.chantierId, nomFichier: 'PERRIER-LOUISFERT-CompteRendu01-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId]).toEqual(['COMPTE_RENDU', `CR:${id}`, null]);
		expect((await ligne(id)).statut).toBe('ENREGISTRE');
		const c = await contenu(r.documentId);
		expect([c.numero, c.date, c.lots[1].entreprise, c.lots[1].convocation, c.coordination[0].titre]).toEqual(['01', '06/10/2026', 'CONSTRUCTIONS REBOURS', 'C', 'GROS ŒUVRE']);
		expect(await lireBrouillon(p.chantierId)).toBeNull();
	});

	it('un brouillon enregistré ou abandonné par un collègue ne s\'écrit plus', async () => {
		const { id } = await brouillonRempli();
		await enregistrer(id);
		const avant = await ligne(id);
		await expect(modifierChampCompteRendu(id, 'avancement', 'autre')).rejects.toThrow(BROUILLON_DISPARU);
		await expect(changerConvocation(id, grosOeuvre)).rejects.toThrow(BROUILLON_DISPARU);
		await expect(abandonnerBrouillon(id)).rejects.toThrow(BROUILLON_DISPARU);
		await expect(enregistrer(id)).rejects.toThrow(BROUILLON_DISPARU);
		expect(await ligne(id)).toEqual(avant);

		const suivant = await creerBrouillon(p.chantierId);
		await abandonnerBrouillon(suivant.id);
		await expect(modifierChampCompteRendu(suivant.id, 'avancement', 'x')).rejects.toThrow(BROUILLON_DISPARU);
		expect(await prisma.compteRendu.count()).toBe(1);
	});

	it('le suivant reprend coordination et convocations ; celles d\'un lot supprimé sont oubliées', async () => {
		const enduit = p.lots['ENDUIT EXTÉRIEUR'];
		const premier = await brouillonRempli();
		await modifierChampCompteRendu(premier.id, 'coordination', 'GROS ŒUVRE : reprise du mur');
		await changerConvocation(premier.id, grosOeuvre);
		await changerConvocation(premier.id, enduit);
		await enregistrer(premier.id);
		await prisma.lot.delete({ where: { id: enduit } });

		const second = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		expect(second.numero).toBe(2);
		expect((await lireBrouillon(p.chantierId))?.saisies).toMatchObject({
			avancement: '', rdvDate: '', coordination: 'GROS ŒUVRE : reprise du mur', convocations: { [grosOeuvre]: 'C' },
		});
	});

	it('données changées pendant le rendu : rien d\'enregistré', async () => {
		const { id } = await brouillonRempli();
		const renomme = vi.fn(async () => {
			await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
			return new Uint8Array([37]);
		});
		await expect(enregistrer(id, { rendrePdf: renomme })).rejects.toThrow(DONNEES_CHANGEES);
		expect((await ligne(id)).statut).toBe('BROUILLON');
		expect(await prisma.document.count()).toBe(0);
	});

	it('une entreprise renommée après l\'enregistrement ne change pas le compte rendu figé', async () => {
		const { id } = await brouillonRempli();
		const r = await enregistrer(id);
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS SAS' } });
		expect((await contenu(r.documentId)).lots[1].entreprise).toBe('CONSTRUCTIONS REBOURS');
		const lu = await ouvrirCompteRendu(id, p.chantierId, 'lecture');
		expect(lu?.fige?.contenu.lots[1].entreprise).toBe('CONSTRUCTIONS REBOURS');
		expect(lu?.source.lots[1].entreprise).toBe('REBOURS SAS');
	});

	it('correction du dernier : v2 et ligne à jour ; sans changement, pas de v2 ; un plus ancien est refusé', async () => {
		const premier = await brouillonRempli();
		await enregistrer(premier.id);
		const ouvert = await ouvrirCompteRendu(premier.id, p.chantierId, 'correction');
		expect(ouvert).toMatchObject({ mode: 'correction', dernier: true, blocage: null, derniere: { version: 1 } });
		const saisies = ouvert!.saisies;

		expect(await corrigerCompteRendu(premier.id, saisies, p.utilisateurId, deps)).toMatchObject({ version: 1, nouvelle: false });
		const v2 = await corrigerCompteRendu(premier.id, { ...saisies, avancement: 'Fondations coulées, dalle faite' }, p.utilisateurId, deps);
		expect(v2).toMatchObject({ version: 2, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-CompteRendu01-v2.pdf', chantierId: p.chantierId });
		expect((await ligne(premier.id)).avancement).toBe('Fondations coulées, dalle faite');
		await expect(corrigerCompteRendu(premier.id, { ...saisies, avancement: '', coordination: '' }, p.utilisateurId, deps)).rejects.toThrow(CR_VIDE);
		await expect(corrigerCompteRendu(premier.id, { ...saisies, rdvHeure: '9h' }, p.utilisateurId, deps)).rejects.toThrow(HEURE_INVALIDE);

		// Le brouillon suivant ne compte pas : le n° 1 reste le dernier enregistré, et la correction ne touche pas au brouillon.
		const second = await brouillonRempli('Élévation des murs');
		await corrigerCompteRendu(premier.id, { ...saisies, avancement: 'v3' }, p.utilisateurId, deps);
		expect((await ligne(second.id)).avancement).toBe('Élévation des murs');

		await enregistrer(second.id);
		await expect(corrigerCompteRendu(premier.id, { ...saisies, avancement: 'trop tard' }, p.utilisateurId, deps)).rejects.toThrow(DERNIER_CR_SEUL);
		await expect(corrigerCompteRendu(second.id + 'x', saisies, p.utilisateurId, deps)).rejects.toThrow(CR_INTROUVABLE);
	});

	it('liens périmés : autre chantier, brouillon, ancien compte rendu en correction', async () => {
		const autre = await prisma.chantier.create({
			data: { reference: 'AUTRE', maitreOuvrage: 'M. AUTRE', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId },
		});
		const premier = await brouillonRempli();
		await enregistrer(premier.id);
		expect(await ouvrirCompteRendu(premier.id, autre.id, 'lecture')).toBeNull();
		const second = await brouillonRempli();
		expect(await ouvrirCompteRendu(second.id, p.chantierId, 'lecture')).toBeNull();
		await enregistrer(second.id);
		expect(await ouvrirCompteRendu(premier.id, p.chantierId, 'correction')).toMatchObject({ mode: 'lecture', dernier: false, blocage: DERNIER_CR_SEUL });
		await expect(changerConvocation((await creerBrouillon(p.chantierId)).id, 'lot-inconnu')).rejects.toThrow('Lot introuvable.');
	});

	it('la base refuse deux comptes rendus de même numéro sur un chantier', async () => {
		const { numero } = await creerBrouillon(p.chantierId);
		await expect(prisma.compteRendu.create({ data: { chantierId: p.chantierId, numero, date: new Date('2026-10-06') } })).rejects.toMatchObject({ code: 'P2002' });
	});
});
