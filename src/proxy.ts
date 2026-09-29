import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC = ['/connexion', '/api/auth', '/api/sante'];

/** Contrôle optimiste (présence du cookie) : la vraie vérification est faite par exigerPage et executer. */
export function proxy(request: NextRequest) {
	const chemin = request.nextUrl.pathname;
	if (PUBLIC.some((p) => chemin === p || chemin.startsWith(`${p}/`))) return NextResponse.next();
	if (!getSessionCookie(request)) return NextResponse.redirect(new URL('/connexion', request.url));
	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|polices/).*)'],
};
