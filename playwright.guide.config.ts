import { defineConfig, devices } from '@playwright/test';

/**
 * Les captures du guide d'utilisation (page Aide) : `npm run aide:captures` les refait dans public/guide/, sur la
 * base du banc visuel (les 4 chantiers de la maquette). Jamais en même temps que test:e2e ou test:visuel.
 */
export default defineConfig({
	testDir: 'e2e/guide',
	fullyParallel: false,
	workers: 1,
	timeout: 600_000,
	use: {
		...devices['Desktop Chrome'], baseURL: 'http://localhost:3200', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2,
		locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: 'light', reducedMotion: 'reduce',
		// Les dates des champs <input type="date"> suivent la langue du système, pas `locale`.
		launchOptions: { args: ['--lang=fr-FR'], env: { ...process.env, LANG: 'fr_FR.UTF-8', LANGUAGE: 'fr' } },
	},
	webServer: {
		command: 'npm run visuel:serveur',
		url: 'http://localhost:3200/connexion',
		timeout: 300_000,
		reuseExistingServer: false,
	},
});
