const HOTES_LOCAUX = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Le jeu de démonstration vide les chantiers : base de développement locale seulement. Renvoie le motif du refus, ou nul. */
export function refusDemo(url: string | undefined, nodeEnv: string | undefined): string | null {
	if (nodeEnv === 'production') return 'Refus : NODE_ENV=production.';
	if (!url) return 'Refus : DATABASE_URL manque.';
	const { hostname, pathname } = new URL(url);
	if (!HOTES_LOCAUX.has(hostname)) return `Refus : « ${hostname} » n'est pas une base locale.`;
	const base = pathname.slice(1);
	if (base.endsWith('_test')) return `Refus : « ${base} » est la base des tests (nom en _test).`;
	return null;
}
