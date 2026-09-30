import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DonneesCertificat } from '@/documents/schemas';
import {
	AUTRE_CERTIFICAT, CERTIFICAT_IMPOSSIBLE, CERTIFICATS_EXISTENT, CUMUL_MANQUANT, DERNIER_SEUL, PRESENT_NON_POSITIF,
} from '@/domaine/certificats';
import { formatEuros, formatMontantSaisie } from '@/domaine/montants';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import {
	ajouterAcompteManuel, changerCaution, corrigerCertificat, genererCertificat, modifierAcompteManuel, ouvrirCorrection,
	ouvrirNouveauCertificat, saisiesCertificatSchema, supprimerAcompteManuel,
} from './acomptes';
import { ajouterAvenant, modifierChampAvenant } from './avenants';
import { prisma } from './prisma';

const faux = vi.fn(async () => new Uint8Array([37, 80, 68, 70]));
const deps = { rendrePdf: faux };
const JUILLET = { mois: '2026-07', date: '2026-09-30' };
let p: Awaited<ReturnType<typeof insererPerrier>>;
let lotId: string;

const acomptes = () => prisma.acompte.findMany({ where: { lotId }, orderBy: { numero: 'asc' } });
const resume = async () => (await acomptes()).map((a) => [a.numero, a.montantHt.toString(), a.manuel]);
const montantDe = async (id: string) => (await prisma.acompte.findUniqueOrThrow({ where: { id } })).montantHt.toString();
const certificat = (numeroAttendu: number, cumul: string, d: { rendrePdf: typeof faux } = deps) =>
	genererCertificat(lotId, { numeroAttendu, cumul, ...JUILLET }, p.utilisateurId, d);
const corriger = (acompteId: string, cumul: string, d: { rendrePdf: typeof faux } = deps) =>
	corrigerCertificat(acompteId, { cumul, ...JUILLET }, p.utilisateurId, d);
const contenu = async (documentId: string) =>
	((await prisma.document.findUniqueOrThrow({ where: { id: documentId } })).donnees as DonneesCertificat).contenu;

describe('certificats de paiement', () => {
	beforeEach(async () => {
		await viderBase();
		faux.mockClear();
		p = await insererPerrier();
		lotId = p.lots['CARRELAGE — FAÏENCE'];
	});

	it('annexe A de bout en bout : avenant, deux acomptes antérieurs, certificat n° 03', async () => {
		const { id } = await ajouterAvenant(lotId);
		await modifierChampAvenant(id, 'montantHt', '850');
		await ajouterAcompteManuel(lotId, '3 000');
		await ajouterAcompteManuel(lotId, '4 200,00');
		const ouvert = await ouvrirNouveauCertificat(lotId, new Date('2026-09-30T08:00:00Z'));
		expect(ouvert).toMatchObject({ acompteId: null, derniereVersion: null, blocage: null, saisies: { cumul: '', mois: '2026-09', date: '2026-09-30' } });
		expect(ouvert.source.numero).toBe(3);
		expect(ouvert.acomptesManuels?.map((a) => a.saisie)).toEqual([formatMontantSaisie('3000'), formatMontantSaisie('4200')]);

		const r = await certificat(3, '9 850');
		expect(r).toMatchObject({ version: 1, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Certificat03-v1.pdf' });
		const doc = await prisma.document.findUniqueOrThrow({ where: { id: r.documentId } });
		expect([doc.type, doc.serie, doc.lotId, doc.version]).toEqual(['CERTIFICAT_PAIEMENT', `CERTIFICAT:${r.acompteId}`, lotId, 1]);
		const c = await contenu(r.documentId);
		expect([c.totalTtc, c.presentHt, c.retenue, c.mandate, c.mois])
			.toEqual([formatEuros('16140'), formatEuros('2650'), formatEuros('159'), formatEuros('3021'), 'Juillet 2026']);
		const a = await prisma.acompte.findUniqueOrThrow({ where: { id: r.acompteId } });
		expect([a.numero, a.montantHt.toString(), a.manuel, a.cumulRealiseHt?.toString(), a.mois, a.date?.toISOString().slice(0, 10)])
			.toEqual([3, '2650', false, '9850', '2026-07', '2026-09-30']);
	});

	it('acomptes antérieurs : renumérotés tant qu\'aucun certificat, figés ensuite', async () => {
		for (const m of ['1000', '2000', '3000']) await ajouterAcompteManuel(lotId, m);
		const [, deuxieme, troisieme] = await acomptes();
		await supprimerAcompteManuel(deuxieme.id);
		expect(await resume()).toEqual([[1, '1000', true], [2, '3000', true]]);
		await modifierAcompteManuel(troisieme.id, '3 500');
		expect(await resume()).toEqual([[1, '1000', true], [2, '3500', true]]);
		await expect(ajouterAcompteManuel(lotId, '0')).rejects.toThrow('Le montant doit être positif.');

		await certificat(3, '9 850');
		await expect(ajouterAcompteManuel(lotId, '100')).rejects.toThrow(CERTIFICATS_EXISTENT);
		await expect(modifierAcompteManuel(troisieme.id, '100')).rejects.toThrow(CERTIFICATS_EXISTENT);
		await expect(supprimerAcompteManuel(troisieme.id)).rejects.toThrow(CERTIFICATS_EXISTENT);
		expect((await ouvrirNouveauCertificat(lotId)).acomptesManuels).toBeNull();
	});

	it('acomptes antérieurs écrits en même temps : numéros continus, aucun conflit', async () => {
		await Promise.all(['100', '200', '300'].map((m) => ajouterAcompteManuel(lotId, m)));
		expect((await acomptes()).map((a) => a.numero)).toEqual([1, 2, 3]);
	});

	it('deux certificats simultanés : un seul passe, l\'autre reçoit le message, rien d\'écrit pour lui', async () => {
		const r = await Promise.allSettled([certificat(1, '1000'), certificat(1, '2000')]);
		expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected']);
		expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason.message).toBe(AUTRE_CERTIFICAT);
		expect([await prisma.acompte.count(), await prisma.document.count()]).toEqual([1, 1]);
		await expect(certificat(1, '3000')).rejects.toThrow(AUTRE_CERTIFICAT);
	});

	it('saisies invalides, lot incomplet : refus, ni PDF ni écriture', async () => {
		await expect(certificat(1, ' ')).rejects.toThrow(CUMUL_MANQUANT);
		await expect(certificat(1, 'abc')).rejects.toThrow('Montant : saisissez un nombre.');
		await expect(certificat(1, '0')).rejects.toThrow(PRESENT_NON_POSITIF);
		await expect(genererCertificat(lotId, { numeroAttendu: 1, cumul: '100', mois: '2026-13', date: '2026-09-30' }, p.utilisateurId, deps))
			.rejects.toThrow('Mois : choisissez un mois.');
		await expect(genererCertificat(lotId, { numeroAttendu: 1, cumul: '100', mois: '2026-07', date: '2026-02-30' }, p.utilisateurId, deps))
			.rejects.toThrow('Date : choisissez une date.');
		expect(saisiesCertificatSchema.safeParse({ cumul: '100', mois: '2026-13', date: '2026-09-30' }).success).toBe(false);
		await expect(genererCertificat(p.lots['ENDUIT EXTÉRIEUR'], { numeroAttendu: 1, cumul: '100', ...JUILLET }, p.utilisateurId, deps))
			.rejects.toThrow(CERTIFICAT_IMPOSSIBLE);
		expect((await ouvrirNouveauCertificat(p.lots['ENDUIT EXTÉRIEUR'])).blocage).toBe(CERTIFICAT_IMPOSSIBLE);
		expect([await prisma.acompte.count(), await prisma.document.count()]).toEqual([0, 0]);
		expect(faux).not.toHaveBeenCalled();
	});

	it('correction du dernier : v2 et acompte à jour ; sans changement, pas de v2 ; un plus ancien est refusé', async () => {
		const r1 = await certificat(1, '5000');
		expect(await corriger(r1.acompteId, '5 000,00')).toMatchObject({ version: 1, nouvelle: false });
		expect(await corriger(r1.acompteId, '6000')).toMatchObject({
			version: 2, nouvelle: true, nomFichier: 'PERRIER-LOUISFERT-Lot10-CARRELAGE-FAIENCE-Certificat01-v2.pdf',
		});
		expect(await montantDe(r1.acompteId)).toBe('6000');
		expect(await ouvrirCorrection(r1.acompteId)).toMatchObject({
			acompteId: r1.acompteId, derniereVersion: 2, blocage: null, acomptesManuels: null,
			saisies: { cumul: formatMontantSaisie('6000'), mois: '2026-07', date: '2026-09-30' },
		});

		const r2 = await certificat(2, '8000');
		// Le n° 2 se calcule avec le n° 1 corrigé : 8 000 − 6 000.
		expect((await contenu(r2.documentId)).presentHt).toBe(formatEuros('2000'));
		await expect(corriger(r1.acompteId, '6500')).rejects.toThrow(DERNIER_SEUL);
		expect((await ouvrirCorrection(r1.acompteId)).blocage).toBe(DERNIER_SEUL);
		expect(await prisma.document.count({ where: { serie: `CERTIFICAT:${r1.acompteId}` } })).toBe(2);
	});

	it('un acompte antérieur ne se corrige pas ; un acompte disparu est signalé', async () => {
		await ajouterAcompteManuel(lotId, '1000');
		const [m] = await acomptes();
		await expect(corriger(m.id, '2000')).rejects.toThrow(DERNIER_SEUL);
		await supprimerAcompteManuel(m.id);
		await expect(corriger(m.id, '2000')).rejects.toThrow("Cet acompte n'existe plus.");
		await expect(modifierAcompteManuel(m.id, '10')).rejects.toThrow("Cet acompte n'existe plus.");
	});

	it('correction concurrente : un certificat émis pendant le rendu la fait refuser sous verrou, rien d\'écrit', async () => {
		const r1 = await certificat(1, '5000');
		const pendant = vi.fn(async () => {
			await certificat(2, '8000');
			return new Uint8Array([1]);
		});
		await expect(corriger(r1.acompteId, '6000', { rendrePdf: pendant })).rejects.toThrow(DERNIER_SEUL);
		expect(await montantDe(r1.acompteId)).toBe('5000');
		expect(await prisma.document.count({ where: { serie: `CERTIFICAT:${r1.acompteId}` } })).toBe(1);
	});

	it('le lot change pendant le rendu : aucun certificat', async () => {
		const pendant = vi.fn(async () => {
			await prisma.lot.update({ where: { id: lotId }, data: { tauxTva: '10' } });
			return new Uint8Array([1]);
		});
		await expect(certificat(1, '1000', { rendrePdf: pendant })).rejects.toThrow('Les données ont changé pendant la génération');
		expect(await prisma.acompte.count()).toBe(0);
	});

	it('caution : gardée sur le lot, sans retenue sur les certificats suivants', async () => {
		await changerCaution(lotId, true);
		expect((await prisma.lot.findUniqueOrThrow({ where: { id: lotId } })).cautionBancaire).toBe(true);
		const r = await certificat(1, '1000');
		expect(await contenu(r.documentId)).toMatchObject({ caution: 'OUI', retenue: formatEuros('0'), mandate: formatEuros('1200') });
	});
});
