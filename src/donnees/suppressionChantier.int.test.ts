import { beforeEach, describe, expect, it } from 'vitest';
import { ErreurMetier } from '@/domaine/erreurs';
import { lundiIso } from '@/domaine/semaines';
import { DEJA_SUPPRIME, DOCUMENTS_CHANGES, PHRASE_INCORRECTE } from '@/domaine/suppression';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { lireResumeSuppression, supprimerChantierDefinitivement } from './chantiers';
import { prisma } from './prisma';

let u: { id: string };

function messageExact(s: string): RegExp {
	return new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

function signal() {
	let ouvrir = () => {};
	const attendu = new Promise<void>((r) => { ouvrir = r; });
	return { attendu, ouvrir };
}

async function chantier(reference: string, extra: { termine?: boolean } = {}) {
	return prisma.chantier.create({
		data: {
			reference, maitreOuvrage: 'M. TEST', chargeAffaireId: u.id, creeParId: u.id,
			termine: extra.termine ?? false,
		},
	});
}

async function documentDe(
	chantierId: string,
	champs: {
		type: 'MARCHE_GRE_A_GRE' | 'RECAPITULATIF' | 'PLANNING' | 'VISA_PLANNING';
		serie: string;
		version?: number;
		nomFichier?: string;
		lotId?: string | null;
		sourceId?: string | null;
		creeLe?: Date;
	},
) {
	return prisma.document.create({
		data: {
			chantierId, creeParId: u.id, type: champs.type, serie: champs.serie,
			version: champs.version ?? 1, nomFichier: champs.nomFichier ?? `${champs.serie}.pdf`,
			lotId: champs.lotId ?? null, sourceId: champs.sourceId ?? null,
			donnees: {}, empreinte: 'x', pdf: new Uint8Array([1]),
			...(champs.creeLe ? { creeLe: champs.creeLe } : {}),
		},
	});
}

describe('suppression définitive d\'un chantier', () => {
	beforeEach(async () => {
		await viderBase();
		u = await creerUtilisateurTest();
	});

	it('EX-1 — supprime un chantier avec documents, visa, lots et comptes rendus', async () => {
		const artisan = await prisma.artisan.create({ data: { nom: 'MATELEC' } });
		const c = await chantier("L'Atelier", { termine: true });
		const lot = await prisma.lot.create({
			data: { chantierId: c.id, ordre: 1, designation: 'ÉLECTRICITÉ', artisanId: artisan.id },
		});
		await prisma.lot.create({ data: { chantierId: c.id, ordre: 2, designation: 'PEINTURE' } });
		await prisma.avenant.create({ data: { lotId: lot.id, numero: 1, montantHt: 100, date: new Date('2026-05-12T00:00:00Z') } });
		await prisma.acompte.create({ data: { lotId: lot.id, numero: 1, montantHt: 1000, manuel: true } });
		await prisma.reception.create({ data: { lotId: lot.id } });
		await prisma.periode.create({ data: { lotId: lot.id, intitule: 'Réseaux', debut: lundiIso(2026, 40), duree: 1 } });
		await prisma.fermeture.create({ data: { chantierId: c.id, libelle: 'Congés', debut: lundiIso(2026, 31), duree: 2 } });
		await prisma.compteRendu.create({ data: { chantierId: c.id, numero: 1, date: new Date('2026-10-06T00:00:00Z'), statut: 'BROUILLON' } });
		await prisma.compteRendu.create({ data: { chantierId: c.id, numero: 2, date: new Date('2026-10-13T00:00:00Z'), statut: 'ENREGISTRE' } });
		const marche = await documentDe(c.id, { type: 'MARCHE_GRE_A_GRE', serie: lot.id, lotId: lot.id, nomFichier: 'marche.pdf' });
		const planning = await documentDe(c.id, { type: 'PLANNING', serie: 'PLANNING', nomFichier: 'planning.pdf' });
		const visa = await documentDe(c.id, { type: 'VISA_PLANNING', serie: 'VISA', sourceId: planning.id, nomFichier: 'visa.pdf' });

		await supprimerChantierDefinitivement(c.id, {
			phrase: "  JE  supprime  l’atelier ",
			documentsAttendus: [visa.id, marche.id, planning.id],
		});

		expect(await prisma.chantier.count()).toBe(0);
		expect(await prisma.document.count()).toBe(0);
		expect(await prisma.lot.count()).toBe(0);
		expect(await prisma.periode.count()).toBe(0);
		expect(await prisma.avenant.count()).toBe(0);
		expect(await prisma.acompte.count()).toBe(0);
		expect(await prisma.reception.count()).toBe(0);
		expect(await prisma.fermeture.count()).toBe(0);
		expect(await prisma.compteRendu.count()).toBe(0);
		expect(await prisma.artisan.count()).toBe(1);
		expect(await prisma.utilisateur.count()).toBe(1);
	});

	it('EX-1 — refuse un chantier déjà supprimé', async () => {
		const c = await chantier('TEST — Vide');
		await prisma.chantier.delete({ where: { id: c.id } });
		const appel = () => supprimerChantierDefinitivement(c.id, { phrase: 'je supprime TEST — Vide', documentsAttendus: [] });
		await expect(appel()).rejects.toThrow(ErreurMetier);
		await expect(appel()).rejects.toThrow(messageExact(DEJA_SUPPRIME));
	});

	it('EX-1 — un chantier déjà supprimé l\'emporte sur une phrase incorrecte', async () => {
		const appel = () => supprimerChantierDefinitivement('inconnu', { phrase: 'incorrecte', documentsAttendus: ['x'] });
		await expect(appel()).rejects.toThrow(ErreurMetier);
		await expect(appel()).rejects.toThrow(messageExact(DEJA_SUPPRIME));
	});

	it('EX-2 — refuse une phrase incorrecte sans rien effacer', async () => {
		const c = await chantier('École');
		const doc = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', nomFichier: 'recap.pdf' });
		const appel = () => supprimerChantierDefinitivement(c.id, {
			phrase: 'je supprime Ecole',
			documentsAttendus: [doc.id],
		});
		await expect(appel()).rejects.toThrow(ErreurMetier);
		await expect(appel()).rejects.toThrow(messageExact(PHRASE_INCORRECTE));
		expect(await prisma.chantier.count({ where: { id: c.id } })).toBe(1);
		expect(await prisma.document.count({ where: { id: doc.id } })).toBe(1);
	});

	it('EX-2 — une phrase incorrecte l\'emporte sur une liste de documents changée', async () => {
		const c = await chantier('École');
		const doc = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF' });
		const appel = () => supprimerChantierDefinitivement(c.id, { phrase: 'je supprime Ecole', documentsAttendus: [] });
		await expect(appel()).rejects.toThrow(ErreurMetier);
		await expect(appel()).rejects.toThrow(messageExact(PHRASE_INCORRECTE));
		expect(await prisma.document.count({ where: { id: doc.id } })).toBe(1);
	});

	it('EX-3 — lit le résumé de suppression du chantier', async () => {
		const c = await chantier('PERRIER — Louisfert');
		const lotA = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		const lotB = await prisma.lot.create({ data: { chantierId: c.id, ordre: 2, designation: 'PEINTURE' } });
		await prisma.periode.create({ data: { lotId: lotA.id, intitule: 'Fondations', debut: lundiIso(2026, 16), duree: 3 } });
		await prisma.periode.create({ data: { lotId: lotA.id, intitule: 'Élévation', debut: lundiIso(2026, 19), duree: 2 } });
		await prisma.periode.create({ data: { lotId: lotB.id, intitule: 'Peintures', debut: lundiIso(2026, 40), duree: 1 } });
		await prisma.fermeture.create({ data: { chantierId: c.id, libelle: "Congés d'été", debut: lundiIso(2026, 31), duree: 2 } });
		await prisma.fermeture.create({ data: { chantierId: c.id, libelle: 'Noël', debut: lundiIso(2026, 52), duree: 2 } });
		await prisma.compteRendu.create({ data: { chantierId: c.id, numero: 1, date: new Date('2026-10-06T00:00:00Z'), statut: 'ENREGISTRE' } });
		await prisma.compteRendu.create({ data: { chantierId: c.id, numero: 2, date: new Date('2026-10-13T00:00:00Z'), statut: 'BROUILLON' } });
		const creeLe = new Date('2026-03-15T10:00:00.000Z');
		const marche = await documentDe(c.id, {
			type: 'MARCHE_GRE_A_GRE', serie: lotA.id, lotId: lotA.id,
			nomFichier: 'PERRIER-marche-v1.pdf', version: 1, creeLe,
		});
		const recap = await documentDe(c.id, {
			type: 'RECAPITULATIF', serie: 'RECAPITULATIF',
			nomFichier: 'PERRIER-recap-v2.pdf', version: 2, creeLe,
		});

		const resume = await lireResumeSuppression(c.id);

		expect(resume.reference).toBe('PERRIER — Louisfert');
		expect(resume.lots).toBe(2);
		expect(resume.periodes).toBe(3);
		expect(resume.fermetures).toBe(2);
		expect(resume.compteRenduEnBrouillon).toBe(true);
		expect(resume.documents).toEqual([
			{ id: marche.id, type: 'MARCHE_GRE_A_GRE', serie: lotA.id, nomFichier: 'PERRIER-marche-v1.pdf', version: 1, creeLe },
			{ id: recap.id, type: 'RECAPITULATIF', serie: 'RECAPITULATIF', nomFichier: 'PERRIER-recap-v2.pdf', version: 2, creeLe },
		]);
	});

	it('EX-3 — le résumé trie les documents par type, série puis version', async () => {
		const c = await chantier('TRI');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		const recapV2 = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 2, nomFichier: 'recap-v2.pdf' });
		const marcheV1 = await documentDe(c.id, { type: 'MARCHE_GRE_A_GRE', serie: lot.id, lotId: lot.id, version: 1, nomFichier: 'marche-v1.pdf' });
		const recapV1 = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 1, nomFichier: 'recap-v1.pdf' });

		const resume = await lireResumeSuppression(c.id);

		expect(resume.documents.map((d) => ({ id: d.id, type: d.type, serie: d.serie, version: d.version }))).toEqual([
			{ id: marcheV1.id, type: 'MARCHE_GRE_A_GRE', serie: lot.id, version: 1 },
			{ id: recapV1.id, type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 1 },
			{ id: recapV2.id, type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 2 },
		]);
	});

	it('EX-4 — refuse si la liste des documents a changé', async () => {
		const c = await chantier('LISTE');
		const a = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 1, nomFichier: 'a.pdf' });
		const b = await documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 2, nomFichier: 'b.pdf' });
		const appel = () => supprimerChantierDefinitivement(c.id, {
			phrase: 'je supprime LISTE',
			documentsAttendus: [a.id],
		});
		await expect(appel()).rejects.toThrow(ErreurMetier);
		await expect(appel()).rejects.toThrow(messageExact(DOCUMENTS_CHANGES));
		expect(await prisma.chantier.count({ where: { id: c.id } })).toBe(1);
		expect(await prisma.document.count({ where: { chantierId: c.id } })).toBe(2);
		expect(await prisma.document.findMany({ where: { id: { in: [a.id, b.id] } }, select: { id: true } })).toHaveLength(2);
	});

	it('EX-4 — un document inséré pendant la suppression annule tout', async () => {
		const c = await chantier('COURSE');
		const lot = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'GROS ŒUVRE' } });
		const doc = await documentDe(c.id, { type: 'MARCHE_GRE_A_GRE', serie: lot.id, lotId: lot.id, nomFichier: 'marche.pdf' });
		const documentInsere = signal();
		const fin = signal();
		const generation = prisma.$transaction(async (tx) => {
			await tx.document.create({
				data: {
					chantierId: c.id, creeParId: u.id, type: 'RECAPITULATIF', serie: 'RECAPITULATIF',
					version: 1, nomFichier: 'concurrent.pdf', donnees: {}, empreinte: 'x', pdf: new Uint8Array([1]),
				},
			});
			documentInsere.ouvrir();
			await fin.attendu;
		});
		await documentInsere.attendu;
		const suppression = supprimerChantierDefinitivement(c.id, {
			phrase: 'je supprime COURSE',
			documentsAttendus: [doc.id],
		});
		await new Promise((r) => setTimeout(r, 300));
		fin.ouvrir();
		await generation;
		const erreur = await suppression.then(
			() => { throw new Error('aurait dû lever'); },
			(e: unknown) => e,
		);
		expect(() => { throw erreur; }).toThrow(ErreurMetier);
		expect(() => { throw erreur; }).toThrow(messageExact(DOCUMENTS_CHANGES));
		expect(await prisma.chantier.count({ where: { id: c.id } })).toBe(1);
		expect(await prisma.document.count({ where: { chantierId: c.id } })).toBe(2);
		expect(await prisma.document.count({ where: { id: doc.id } })).toBe(1);
	});

	it('EX-6 — renvoie le nombre de documents effacés', async () => {
		const c = await chantier('TROIS');
		const docs = await Promise.all([
			documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 1, nomFichier: 'r1.pdf' }),
			documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 2, nomFichier: 'r2.pdf' }),
			documentDe(c.id, { type: 'RECAPITULATIF', serie: 'RECAPITULATIF', version: 3, nomFichier: 'r3.pdf' }),
		]);
		const resultat = await supprimerChantierDefinitivement(c.id, {
			phrase: 'je supprime TROIS',
			documentsAttendus: docs.map((d) => d.id),
		});
		expect(resultat).toEqual({ documents: 3 });
	});
});
