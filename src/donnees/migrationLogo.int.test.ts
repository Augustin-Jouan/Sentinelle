import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LOGO_SOCOREVE } from '@/documents/gabarits/logo';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const LOGO = '20261105000000_logo_entreprise';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du logo de l\'entreprise', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_logo CASCADE; CREATE SCHEMA essai_logo; SET search_path TO essai_logo;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < LOGO).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "Parametres" (id, "raisonSociale", "libelleActivite", adresse, cp, ville, telephone, "villeSignature")
			VALUES (1, 'S.A.S SOCOREVE', 'Activité', '71 rue du Général Patton', '44110', 'Châteaubriant', '02 40 81 40 26', 'Châteaubriant')`);
		await client.query(sql(LOGO));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_logo CASCADE');
		await client.end();
	});

	it('l\'installation existante garde le logo qu\'elle imprimait', async () => {
		expect((await client.query('SELECT logo FROM "Parametres"')).rows).toEqual([{ logo: LOGO_SOCOREVE }]);
	});
});
