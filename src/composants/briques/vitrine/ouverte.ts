/**
 * La vitrine sert au développement et au banc visuel : jamais en production,
 * sauf sous E2E=1 (le serveur de test est une compilation de production).
 */
export function vitrineOuverte(env: { NODE_ENV?: string; E2E?: string }): boolean {
	return env.NODE_ENV !== 'production' || env.E2E === '1';
}
