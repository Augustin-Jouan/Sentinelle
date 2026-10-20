import type { NextConfig } from 'next';

/**
 * Posés par l'app elle-même : derrière Caddy (docker-compose.yml) comme derrière Traefik (Coolify), qui n'en
 * ajoute aucun. Caddy en réécrit certains, à l'identique. HSTS est ignoré sur une réponse en HTTP (développement).
 * Outil interne : rien n'est à indexer.
 */
const EN_TETES = [
	{ key: 'Strict-Transport-Security', value: 'max-age=31536000' },
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
	{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
	{ key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const config: NextConfig = {
	output: 'standalone',
	// Chromium et ExcelJS restent des modules Node ordinaires, hors du bundle serveur.
	serverExternalPackages: ['playwright', 'playwright-core', 'exceljs'],
	async headers() {
		return [{ source: '/(.*)', headers: EN_TETES }];
	},
};

export default config;
