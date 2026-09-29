// Vide la base de TEST puis rejoue les migrations. Refuse toute base dont le nom ne finit pas par « _test ».
import { execSync } from 'node:child_process';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const base = url ? new URL(url).pathname.slice(1) : '';
if (!base.endsWith('_test')) {
	console.error(`Refus : « ${base || '(aucune)'} » n'est pas une base de test (le nom doit finir par _test).`);
	process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
await client.end();
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
