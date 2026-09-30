import { describe, expect, it } from 'vitest';
import { estEndpointAdminAuth } from './adminHttp';

describe('endpoints HTTP admin de Better Auth', () => {
	it('refuse /api/auth/admin et ses sous-chemins', () => {
		expect(estEndpointAdminAuth('/api/auth/admin')).toBe(true);
		expect(estEndpointAdminAuth('/api/auth/admin/create-user')).toBe(true);
		expect(estEndpointAdminAuth('/api/auth/admin/impersonate-user')).toBe(true);
	});

	it('laisse passer la connexion et les sessions', () => {
		expect(estEndpointAdminAuth('/api/auth/sign-in/email')).toBe(false);
		expect(estEndpointAdminAuth('/api/auth/get-session')).toBe(false);
		expect(estEndpointAdminAuth('/api/sante')).toBe(false);
	});
});
