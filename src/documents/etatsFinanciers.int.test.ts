import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ajouterAcompteManuel, corrigerCertificat, genererCertificat } from '@/donnees/acomptes';
import { ajouterAvenant, modifierChampAvenant, supprimerAvenant } from '@/donnees/avenants';
import { prisma } from '@/donnees/prisma';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { etatsDocumentsChantier } from './etats';
import { genererAvenant, genererMarche } from './generer';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { maintenant: new Date('2026-09-29T08:00:00Z'), rendrePdf: faux };
const JUILLET = { mois: '2026-07', date: '2026-09-30' };
let p: Awaited<ReturnType<typeof insererPerrier>>;
let lotId: string;

const ligne = async (id = lotId) =>
	(await etatsDocumentsChantier(p.chantierId, deps.maintenant))!.entreprises.flatMap((e) => e.lots).find((l) => l.lotId === id)!;
async function avenant(montant: string) {
	const { id } = await ajouterAvenant(lotId);
	if (montant !== '0') await modifierChampAvenant(id, 'montantHt', montant);
	return id;
}

describe('page Documents : avenants et certificats', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		lotId = p.lots['CARRELAGE — FAÏENCE'];
	});

	it('lettres : à jour, « modifiée » quand un avenant antérieur change, à produire, montant nul', async () => {
		await genererMarche(lotId, p.utilisateurId, deps);
		const n1 = await avenant('850');
		const n2 = await avenant('-300');
		await genererAvenant(n1, p.utilisateurId, deps);
		await genererAvenant(n2, p.utilisateurId, deps);
		let l = await ligne();
		expect(l.avenants.map((a) => [a.numero, a.etat, a.versions.length])).toEqual([[1, 'a-jour', 1], [2, 'a-jour', 1]]);

		await modifierChampAvenant(n1, 'montantHt', '900');
		await avenant('0');
		l = await ligne();
		expect(l.avenants.map((a) => [a.numero, a.etat, a.manques])).toEqual([
			[1, 'modifie', []], [2, 'modifie', []], [3, 'a-produire', ['montantAvenant']],
		]);
		// Un avenant ne touche pas au marché imprimé.
		expect(l.marche.etat).toBe('a-jour');
	});

	it('historique : versions du marché et des lettres, avenants supprimés compris', async () => {
		await genererMarche(lotId, p.utilisateurId, deps);
		const n1 = await avenant('850');
		await avenant('-300');
		await genererAvenant(n1, p.utilisateurId, deps);
		await supprimerAvenant(n1);
		const l = await ligne();
		expect(l.avenants.map((a) => a.numero)).toEqual([2]);
		expect(l.historique.map((v) => v.libelle ?? v.type)).toEqual(['Avenant n° 01 · avenant supprimé', 'MARCHE_GRE_A_GRE']);
		expect(l.historique[0].nomFichier).toBe('PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Avenant01-v1.pdf');
	});

	it('certificats : acomptes antérieurs sans document, versions, seul le dernier se corrige, jamais « modifié »', async () => {
		await ajouterAcompteManuel(lotId, '1000');
		const c2 = await genererCertificat(lotId, { numeroAttendu: 2, cumul: '3000', ...JUILLET }, p.utilisateurId, deps);
		await corrigerCertificat(c2.acompteId, { cumul: '3500', ...JUILLET }, p.utilisateurId, deps);
		await avenant('850');
		const l = await ligne();
		expect(l.certificatPossible).toBe(true);
		expect(l.certificats.map((c) => [c.numero, c.manuel, c.versions.map((v) => v.version), c.corrigeable]))
			.toEqual([[1, true, [], false], [2, false, [2, 1], true]]);
		// Un avenant ajouté après le certificat : pas d'état à recalculer, aucune version nouvelle.
		expect(l.certificats[1]).not.toHaveProperty('etat');
		expect(await prisma.document.count({ where: { type: 'CERTIFICAT_PAIEMENT' } })).toBe(2);
		// Les certificats ne vont pas dans l'historique du marché.
		expect(l.historique).toEqual([]);
	});

	it('lot sans entreprise : pas de nouveau certificat', async () => {
		expect((await ligne(p.lots['ENDUIT EXTÉRIEUR'])).certificatPossible).toBe(false);
	});
});
