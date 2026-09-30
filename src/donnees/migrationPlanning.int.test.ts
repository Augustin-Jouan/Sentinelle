import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const PLANNING = '20261001000000_planning';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du planning sur une base qui a déjà des documents', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_migration CASCADE; CREATE SCHEMA essai_migration; SET search_path TO essai_migration;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < PLANNING).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "utilisateur" (id, name, email, "updatedAt") VALUES ('u', 'U', 'u@test.local', now())`);
		await client.query(`INSERT INTO "Chantier" (id, reference, "maitreOuvrage", "chargeAffaireId", "creeParId") VALUES ('c', 'R', 'M', 'u', 'u')`);
		await client.query(`INSERT INTO "Lot" (id, "chantierId", ordre, designation) VALUES ('l', 'c', 1, 'GROS ŒUVRE')`);
		const inserer = 'INSERT INTO "Document" (id, "chantierId", "lotId", type, version, donnees, empreinte, pdf, "nomFichier", "creeParId") VALUES ($1, \'c\', $2, $3, 1, \'{}\', \'e\', $4, \'f.pdf\', \'u\')';
		await client.query(inserer, ['d1', 'l', 'MARCHE_GRE_A_GRE', Buffer.from([1])]);
		await client.query(inserer, ['d2', null, 'RECAPITULATIF', Buffer.from([1])]);
		await client.query(sql(PLANNING));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_migration CASCADE');
		await client.end();
	});

	it('les documents existants reçoivent leur série', async () => {
		const { rows } = await client.query('SELECT id, serie FROM "Document" ORDER BY id');
		expect(rows).toEqual([{ id: 'd1', serie: 'l' }, { id: 'd2', serie: 'RECAPITULATIF' }]);
	});

	it('planning et visa prennent place à côté du récapitulatif', async () => {
		const inserer = 'INSERT INTO "Document" (id, "chantierId", serie, type, version, donnees, empreinte, pdf, "nomFichier", "creeParId", "sourceId") VALUES ($1, \'c\', $2, $3, 1, \'{}\', \'e\', $4, \'f.pdf\', \'u\', $5)';
		await client.query(inserer, ['d3', 'PLANNING', 'PLANNING', Buffer.from([1]), null]);
		await client.query(inserer, ['d4', 'VISA', 'VISA_PLANNING', Buffer.from([1]), 'd3']);
		const { rows } = await client.query('SELECT count(*)::int AS n FROM "Document" WHERE version = 1');
		expect(rows[0].n).toBe(4);
	});

	it('le début d\'une période ou d\'une fermeture est un lundi', async () => {
		await client.query(`INSERT INTO "Periode" (id, "lotId", debut, duree) VALUES ('p1', 'l', '2026-04-06', 2)`);
		await expect(client.query(`INSERT INTO "Periode" (id, "lotId", debut, duree) VALUES ('p2', 'l', '2026-04-07', 2)`)).rejects.toThrow(/Periode_debut_lundi/);
		await expect(client.query(`INSERT INTO "Fermeture" (id, "chantierId", debut, duree) VALUES ('f1', 'c', '2026-08-01', 2)`)).rejects.toThrow(/Fermeture_debut_lundi/);
	});
});
