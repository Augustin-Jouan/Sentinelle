import { defineConfig, devices } from '@playwright/test';

/** Le serveur E2E remet la base de test à zéro : ne pas lancer les tests d'intégration en même temps. */
export default defineConfig({
	testDir: 'e2e',
	fullyParallel: false,
	workers: 1,
	use: { baseURL: 'http://localhost:3100', trace: 'retain-on-failure', locale: 'fr-FR', timezoneId: 'Europe/Paris' },
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: 'npm run e2e:serveur',
		url: 'http://localhost:3100/connexion',
		timeout: 300_000,
		reuseExistingServer: false,
	},
});
