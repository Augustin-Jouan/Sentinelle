import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
	schema: 'prisma/schema.prisma',
	// Pas de clé « seed » : le seed se lance explicitement (npm run db:seed, service migration).
	migrations: {
		path: 'prisma/migrations',
	},
	datasource: {
		url: process.env['DATABASE_URL'],
	},
});
