import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DOSSIER = path.join(process.cwd(), 'prisma', 'migrations');
const FINANCIER = '20261002000000_suivi_financier';
const sql = (nom: string) => readFileSync(path.join(DOSSIER, nom, 'migration.sql'), 'utf8');

describe('migration du suivi financier', () => {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	const acompte = (id: string, colonnes: string, valeurs: string) =>
		client.query(`INSERT INTO "Acompte" (id, "lotId", ${colonnes}) VALUES ('${id}', 'l', ${valeurs})`);

	beforeAll(async () => {
		await client.connect();
		// Schéma à part : la base de test (schéma public) n'est pas touchée.
		await client.query('DROP SCHEMA IF EXISTS essai_financier CASCADE; CREATE SCHEMA essai_financier; SET search_path TO essai_financier;');
		for (const nom of readdirSync(DOSSIER).filter((n) => /^\d{14}_/.test(n) && n < FINANCIER).sort()) await client.query(sql(nom));
		await client.query(`INSERT INTO "utilisateur" (id, name, email, "updatedAt") VALUES ('u', 'U', 'u@test.local', now())`);
		await client.query(`INSERT INTO "Chantier" (id, reference, "maitreOuvrage", "chargeAffaireId", "creeParId") VALUES ('c', 'R', 'M', 'u', 'u')`);
		await client.query(`INSERT INTO "Lot" (id, "chantierId", ordre, designation) VALUES ('l', 'c', 1, 'PEINTURE')`);
		await client.query(`INSERT INTO "Parametres" (id, "raisonSociale", "libelleActivite", adresse, cp, ville, telephone, email, "villeSignature")
			VALUES (1, 'S.A.S SOCOREVE', 'Activité', '71 rue du Général Patton', '44110', 'Châteaubriant', '02 40 81 40 26', 'contact@socoreve-chateaubriant.fr', 'Châteaubriant')`);
		await client.query(sql(FINANCIER));
	});

	afterAll(async () => {
		await client.query('DROP SCHEMA IF EXISTS essai_financier CASCADE');
		await client.end();
	});

	it('les paramètres existants reçoivent RCS, APE, TVA intracommunautaire et la nouvelle adresse e-mail', async () => {
		const { rows } = await client.query('SELECT email, rcs, ape, "tvaIntracommunautaire" FROM "Parametres"');
		expect(rows).toEqual([{ email: 'contact@socoreve-chateaubriant.com', rcs: '328999503', ape: '4120A', tvaIntracommunautaire: 'FR47328999503' }]);
	});

	it('les lots existants partent sans avenant ni caution', async () => {
		const { rows } = await client.query('SELECT "dernierNumeroAvenant", "cautionBancaire" FROM "Lot"');
		expect(rows).toEqual([{ dernierNumeroAvenant: 0, cautionBancaire: false }]);
	});

	it('avenant : numéro positif, unique dans le lot', async () => {
		await client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a1', 'l', 1, '2026-05-12')`);
		await expect(client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a2', 'l', 1, '2026-05-12')`)).rejects.toThrow(/Avenant_lotId_numero_key/);
		await expect(client.query(`INSERT INTO "Avenant" (id, "lotId", numero, date) VALUES ('a3', 'l', 0, '2026-05-12')`)).rejects.toThrow(/Avenant_numero_positif/);
	});

	it('acompte : montant positif, certificat complet, mois valide', async () => {
		await acompte('m1', 'numero, "montantHt", manuel', `1, 2000, true`);
		await expect(acompte('m2', 'numero, "montantHt", manuel', `2, 0, true`)).rejects.toThrow(/Acompte_montant_positif/);
		await expect(acompte('m3', 'numero, "montantHt", manuel', `0, 10, true`)).rejects.toThrow(/Acompte_numero_positif/);
		await expect(acompte('c1', 'numero, "montantHt"', `2, 500`)).rejects.toThrow(/Acompte_certificat_complet/);
		await expect(acompte('c2', 'numero, "montantHt", "cumulRealiseHt", mois, date', `2, 500, 2500, '2026-13', '2026-09-30'`))
			.rejects.toThrow(/Acompte_mois_valide/);
		await acompte('c3', 'numero, "montantHt", "cumulRealiseHt", mois, date', `2, 500, 2500, '2026-07', '2026-09-30'`);
		await expect(acompte('c4', 'numero, "montantHt", manuel', `2, 10, true`)).rejects.toThrow(/Acompte_lotId_numero_key/);
	});

	it('supprimer le lot emporte ses avenants et acomptes', async () => {
		await client.query(`DELETE FROM "Lot" WHERE id = 'l'`);
		const { rows } = await client.query('SELECT (SELECT count(*) FROM "Avenant")::int AS a, (SELECT count(*) FROM "Acompte")::int AS c');
		expect(rows).toEqual([{ a: 0, c: 0 }]);
	});
});
