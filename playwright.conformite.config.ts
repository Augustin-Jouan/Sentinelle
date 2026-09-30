import { defineConfig, devices } from '@playwright/test';

/** Banc de conformité à la maquette : sa propre base (les 4 chantiers de la maquette) ; jamais en même temps que test:e2e. */
export default defineConfig({
	testDir: 'e2e/conformite',
	snapshotPathTemplate: '{testDir}/references/{arg}{ext}',
	fullyParallel: false,
	workers: 1,
	use: { baseURL: 'http://localhost:3200', locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure',
		...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
	webServer: {
		command: 'npm run conformite:serveur',
		url: 'http://localhost:3200/connexion',
		timeout: 300_000,
		reuseExistingServer: false,
	},
});
