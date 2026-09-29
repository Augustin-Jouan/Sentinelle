import type { NextConfig } from 'next';

const config: NextConfig = {
	output: 'standalone',
	// Chromium et ExcelJS restent des modules Node ordinaires, hors du bundle serveur.
	serverExternalPackages: ['playwright', 'playwright-core', 'exceljs'],
};

export default config;
