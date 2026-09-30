import { toNextJsHandler } from 'better-auth/next-js';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { estEndpointAdminAuth } from '@/auth/adminHttp';

const { GET: getAuth, POST: postAuth } = toNextJsHandler(auth);

function refuserAdmin(requete: NextRequest) {
	if (estEndpointAdminAuth(requete.nextUrl.pathname)) return new Response('Not Found', { status: 404 });
	return null;
}

export async function GET(requete: NextRequest) {
	return refuserAdmin(requete) ?? getAuth(requete);
}

export async function POST(requete: NextRequest) {
	return refuserAdmin(requete) ?? postAuth(requete);
}
