import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';
import { prisma } from '@/donnees/prisma';

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
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		customRules: { '/sign-in/email': { window: 60, max: 5 } },
	},
	advanced: {
		defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' },
	},
	plugins: [admin(), nextCookies()],
});
