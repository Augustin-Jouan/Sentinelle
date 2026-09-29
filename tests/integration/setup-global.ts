import { execSync } from 'node:child_process';
import 'dotenv/config';

/** Une fois par suite : la base de test repart des migrations. */
export default function preparer() {
	const url = process.env.DATABASE_URL_TEST;
	if (!url) throw new Error('DATABASE_URL_TEST manque dans .env');
	execSync('node scripts/reinitialiser-base-test.mjs', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
}
