/** Endpoints HTTP du plugin Better Auth `admin()` : l'app les refuse, les comptes passent par nos actions. */
export function estEndpointAdminAuth(pathname: string): boolean {
	return pathname === '/api/auth/admin' || pathname.startsWith('/api/auth/admin/');
}
