import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { prisma } from '@/donnees/prisma';

if (!process.env.BETTER_AUTH_SECRET) throw new Error('BETTER_AUTH_SECRET est absent.');

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: 'postgresql' }),
	emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
	user: {
		modelName: 'utilisateur',
		additionalFields: {
			initiales: { type: 'string', required: false, defaultValue: '', input: false },
			telephone: { type: 'string', required: false, input: false },
			doitChangerMotDePasse: { type: 'boolean', required: false, defaultValue: false, input: false },
		},
	},
	account: { modelName: 'compte' },
	// En E2E la suite enchaîne plus de 5 connexions en <60 s ; on ne désactive que le plafond sign-in.
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		customRules: {
			'/sign-in/email': { window: 60, max: process.env.E2E === '1' ? 1_000 : 5 },
		},
	},
	advanced: {
		defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
	},
	plugins: [admin(), nextCookies()],
});
