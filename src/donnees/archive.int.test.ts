import { unzipSync } from 'fflate';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { genererAvenant, genererMarche, genererRecap } from '@/documents/generer';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { ARCHIVE_TROP_LOURDE, construireArchive } from './archive';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from './avenants';
import { corrigerCompteRendu, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu, ouvrirCompteRendu } from './comptesRendus';
import { prisma } from './prisma';
import { genererReceptions, preparerReceptions } from './receptions';

let compteur = 0;
/** Chaque PDF est distinct : on reconnaît la version rangée dans l'archive. */
const deps = { rendrePdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70, ++compteur])) };
const LE_6_OCTOBRE = new Date('2026-10-06T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;

async function avenant(designation: string) {
	const { id } = await ajouterAvenant(p.lots[designation]);
	await modifierChampAvenant(id, 'montantHt', '500');
	await genererAvenant(id, p.utilisateurId, deps);
	return id;
}

describe('archive du chantier', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('rien à télécharger : chantier inconnu, ou sans document', async () => {
		expect(await construireArchive('inconnu')).toBeNull();
		expect(await construireArchive(p.chantierId)).toBeNull();
	});

	it('dossiers, dernières versions seulement, avenant supprimé exclu, brouillon absent, récapitulatif à la racine', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await genererRecap(p.chantierId, p.utilisateurId, deps);
		await avenant('GROS ŒUVRE');
		const supprime = await avenant('PEINTURE');
		await supprimerAvenant(supprime);

		const b = await creerBrouillon(p.chantierId, LE_6_OCTOBRE);
		await modifierChampCompteRendu(b.id, 'avancement', 'Fondations coulées');
		await enregistrerCompteRendu(b.id, p.utilisateurId, deps);
		const ouvert = await ouvrirCompteRendu(b.id, p.chantierId, 'correction');
		const v2 = await corrigerCompteRendu(b.id, { ...ouvert!.saisies, avancement: 'Dalle faite' }, p.utilisateurId, deps);
		await creerBrouillon(p.chantierId);

		await preparerReceptions(p.chantierId, p.lots.PEINTURE);
		await genererReceptions(p.chantierId, [p.lots.PEINTURE], p.utilisateurId, deps);

		const archive = await construireArchive(p.chantierId, LE_6_OCTOBRE);
		expect(archive?.nomFichier).toBe('PERRIER-LOUISFERT-Documents-2026-10-06.zip');
		const fichiers = unzipSync(archive!.zip);
		expect(Object.keys(fichiers).sort()).toEqual([
			'01 Marchés/PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Marche-v1.pdf',
			'02 Avenants/PERRIER-LOUISFERT-Lot02-GROS-OEUVRE-Avenant01-v1.pdf',
			'04 Comptes rendus/PERRIER-LOUISFERT-CompteRendu01-v2.pdf',
			'05 Réceptions/PERRIER-LOUISFERT-Lot11-PEINTURE-Reception-v1.pdf',
			'PERRIER-LOUISFERT-RecapMarches-v1.pdf',
		]);
		const pdfV2 = (await prisma.document.findUniqueOrThrow({ where: { id: v2.documentId } })).pdf;
		expect(fichiers['04 Comptes rendus/PERRIER-LOUISFERT-CompteRendu01-v2.pdf']).toEqual(new Uint8Array(pdfV2));
	});

	it('refuse une archive trop lourde avant de charger les PDF', async () => {
		await genererMarche(p.lots['GROS ŒUVRE'], p.utilisateurId, deps);
		await expect(construireArchive(p.chantierId, LE_6_OCTOBRE, 1)).rejects.toThrow(ARCHIVE_TROP_LOURDE);
	});
});
