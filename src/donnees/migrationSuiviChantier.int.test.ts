import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const SUIVI = '20261003000000_suivi_chantier';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du suivi de chantier', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	const compteRendu = (id: string, colonnes: string, valeurs: string) =>
		client.query(`INSERT INTO "CompteRendu" (id, "chantierId", ${colonnes}) VALUES ('${id}', 'c', ${valeurs})`);

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_suivi CASCADE; CREATE SCHEMA essai_suivi; SET search_path TO essai_suivi;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < SUIVI).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "utilisateur" (id, name, email, "updatedAt") VALUES ('u', 'U', 'u@test.local', now())`);
		await client.query(`INSERT INTO "Chantier" (id, reference, "maitreOuvrage", "chargeAffaireId", "creeParId") VALUES ('c', 'R', 'M', 'u', 'u')`);
		await client.query(`INSERT INTO "Lot" (id, "chantierId", ordre, designation) VALUES ('l', 'c', 1, 'PEINTURE'), ('l2', 'c', 2, 'CARRELAGE')`);
		await client.query(`INSERT INTO "Parametres" (id, "raisonSociale", "libelleActivite", adresse, cp, ville, telephone, email, "villeSignature")
			VALUES (1, 'S.A.S SOCOREVE', 'Activité', '71 rue du Général Patton', '44110', 'Châteaubriant', '02 40 81 40 26', 'contact@socoreve-chateaubriant.com', 'Châteaubriant')`);
		await client.query(sql(SUIVI));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_suivi CASCADE');
		await client.end();
	});

	it('les paramètres existants reçoivent le site web ; les chantiers, des champs de réception vides', async () => {
		expect((await client.query('SELECT "siteWeb" FROM "Parametres"')).rows).toEqual([{ siteWeb: 'socoreve-chateaubriant.com' }]);
		const { rows } = await client.query('SELECT "receptionDate", "receptionSignataire", "contratMoeDate", "receptionMaitreOeuvre" FROM "Chantier"');
		expect(rows).toEqual([{ receptionDate: null, receptionSignataire: '', contratMoeDate: null, receptionMaitreOeuvre: '' }]);
	});

	it('compte rendu : brouillon par défaut, numéro de 1 à 999, unique dans le chantier', async () => {
		await compteRendu('r1', 'numero, date', `1, '2026-10-06'`);
		const { rows } = await client.query(`SELECT statut, convocations FROM "CompteRendu" WHERE id = 'r1'`);
		expect(rows).toEqual([{ statut: 'BROUILLON', convocations: {} }]);
		await expect(compteRendu('r2', 'numero, date, statut', `1, '2026-10-06', 'ENREGISTRE'`)).rejects.toThrow(/CompteRendu_chantierId_numero_key/);
		await expect(compteRendu('r3', 'numero, date', `0, '2026-10-06'`)).rejects.toThrow(/CompteRendu_numero_borne/);
		await expect(compteRendu('r4', 'numero, date', `1000, '2026-10-06'`)).rejects.toThrow(/CompteRendu_numero_borne/);
	});

	it('compte rendu : heure au format HH:MM, jamais sans date', async () => {
		await compteRendu('h1', 'numero, date, "rdvDate", "rdvHeure"', `2, '2026-10-06', '2026-10-13', '14:00'`);
		await expect(compteRendu('h2', 'numero, date, "rdvDate", "rdvHeure"', `3, '2026-10-06', '2026-10-13', '25:00'`)).rejects.toThrow(/CompteRendu_heure_valide/);
		await expect(compteRendu('h3', 'numero, date, "rdvHeure"', `4, '2026-10-06', '14:00'`)).rejects.toThrow(/CompteRendu_heure_avec_date/);
	});

	it('réception : une par lot, sans réserves par défaut, emportée avec le lot', async () => {
		await client.query(`INSERT INTO "Reception" (id, "lotId") VALUES ('p1', 'l2')`);
		expect((await client.query(`SELECT decision FROM "Reception"`)).rows).toEqual([{ decision: 'SANS_RESERVES' }]);
		await expect(client.query(`INSERT INTO "Reception" (id, "lotId") VALUES ('p2', 'l2')`)).rejects.toThrow(/Reception_lotId_key/);
		await client.query(`DELETE FROM "Lot" WHERE id = 'l2'`);
		expect((await client.query('SELECT count(*)::int AS n FROM "Reception"')).rows).toEqual([{ n: 0 }]);
	});

	it('les deux nouveaux types de document', async () => {
		const inserer = 'INSERT INTO "Document" (id, "chantierId", "lotId", serie, type, version, donnees, empreinte, pdf, "nomFichier", "creeParId") VALUES ($1, \'c\', $2, $3, $4, 1, \'{}\', \'e\', $5, \'f.pdf\', \'u\')';
		await client.query(inserer, ['d1', null, 'CR:r1', 'COMPTE_RENDU', Buffer.from([1])]);
		await client.query(inserer, ['d2', 'l', 'RECEPTION:l', 'PV_RECEPTION', Buffer.from([1])]);
		expect((await client.query('SELECT count(*)::int AS n FROM "Document"')).rows).toEqual([{ n: 2 }]);
	});
});
