import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier, versionsDeLaSerie } from './etats';
import { genererMarche, genererRecap } from './generer';

const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: async () => new Uint8Array([1]) };
let p: Awaited<ReturnType<typeof insererPerrier>>;

async function etatDe(designation: string) {
	const vue = await etatsDocumentsChantier(p.chantierId, deps.maintenant);
	return vue!.lots.find((l) => l.lotId === p.lots[designation])!.marche;
}

describe('états des documents', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('à produire, puis à jour, puis modifié', async () => {
		expect((await etatDe('GROS ŒUVRE')).etat).toBe('a-produire');
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const aJour = await etatDe('GROS ŒUVRE');
		expect(aJour.etat).toBe('a-jour');
		expect(aJour.versions[0]).toMatchObject({ version: 1, type: 'MARCHE_GRE_A_GRE', auteur: 'Augustin Jouan' });
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { clauseParticuliere: 'Autre clause' } });
		expect((await etatDe('GROS ŒUVRE')).etat).toBe('modifie');
	});

	it('renommer l\'artisan après génération rend le marché « modifié »', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.artisan.update({ where: { id: p.artisans['CONSTRUCTIONS REBOURS'] }, data: { nom: 'REBOURS CONSTRUCTIONS' } });
		expect((await etatDe('GROS ŒUVRE')).etat).toBe('modifie');
	});

	it('changer les paramètres ne rend rien « modifié »', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.parametres.update({ where: { id: 1 }, data: { adresse: 'Z.I route de St Nazaire' } });
		expect((await etatDe('GROS ŒUVRE')).etat).toBe('a-jour');
	});

	it('lots sans entreprise portent les manques, récap séparé', async () => {
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		const vue = await etatsDocumentsChantier(p.chantierId, deps.maintenant);
		expect(vue!.recap.etat).toBe('a-jour');
		expect(new Set(vue!.lots.map((l) => l.entreprise)).size).toBe(13);
		expect(vue!.lots.find((l) => l.entreprise === null)).toMatchObject({ lotTexte: '12 — ENDUIT EXTÉRIEUR', manques: ['entreprise', 'montant'] });
	});

	it('chantier inconnu : nul', async () => {
		expect(await etatsDocumentsChantier('inconnu')).toBeNull();
	});

	it('liste les versions d\'une série, de la plus récente à la plus ancienne', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await prisma.lot.update({ where: { id: p.lots['GROS ŒUVRE'] }, data: { clauseParticuliere: 'Autre clause' } });
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		const versions = await versionsDeLaSerie(p.chantierId, p.lots['GROS ŒUVRE']);
		expect(versions.map((v) => v.version)).toEqual([2, 1]);
		expect(versions[0]).toMatchObject({ type: 'MARCHE_GRE_A_GRE', auteur: 'Augustin Jouan' });
		expect(await versionsDeLaSerie(p.chantierId, 'serie-inconnue')).toEqual([]);
	});

	it('liste les lots dans l\'ordre du chantier, avec numéro, désignation, nature, entreprise et montant des avenants', async () => {
		const vue = (await etatsDocumentsChantier(p.chantierId, deps.maintenant))!;
		const ordre = await prisma.lot.findMany({ where: { chantierId: p.chantierId }, orderBy: { ordre: 'asc' }, select: { id: true } });
		expect(vue.lots.map((l) => l.lotId)).toEqual(ordre.map((l) => l.id));
		const go = vue.lots.find((l) => l.lotId === p.lots['GROS ŒUVRE'])!;
		expect(go).toMatchObject({ designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', entreprise: 'CONSTRUCTIONS REBOURS' });
		const avenant = await prisma.avenant.create({ data: { lotId: p.lots['GROS ŒUVRE'], numero: 1, montantHt: '3720', date: new Date('2026-05-12T00:00:00Z') } });
		const apres = (await etatsDocumentsChantier(p.chantierId, deps.maintenant))!;
		expect(apres.lots.find((l) => l.lotId === p.lots['GROS ŒUVRE'])!.avenants).toEqual([expect.objectContaining({ avenantId: avenant.id, montantHt: '3720' })]);
	});
});
