const FENETRE_MS = 60_000;
const MAX_ECHECS = 5;

const echecs = new Map<string, number[]>();

export function reinitialiserPlafondConnexion(): void {
	echecs.clear();
}

export function identifiantConnexion(email: string): string {
	return email.trim().toLowerCase();
}

/** Un compte banni et un mot de passe faux répondent le même statut au client. */
export function statutConnexionPublique(status: number): number {
	return status === 403 ? 401 : status;
}

function instantsRecents(email: string, maintenant: number): number[] {
	const cle = identifiantConnexion(email);
	return (echecs.get(cle) ?? []).filter((t) => maintenant - t < FENETRE_MS);
}

export function connexionBloquee(email: string, maintenant = Date.now()): boolean {
	if (echecs.size > 10_000) echecs.clear();
	const recents = instantsRecents(email, maintenant);
	echecs.set(identifiantConnexion(email), recents);
	return recents.length >= MAX_ECHECS;
}

export function noterEchecConnexion(email: string, maintenant = Date.now()): void {
	const recents = instantsRecents(email, maintenant);
	recents.push(maintenant);
	echecs.set(identifiantConnexion(email), recents);
}

export function noterReussiteConnexion(email: string): void {
	echecs.delete(identifiantConnexion(email));
}

/** Plafond par identifiant, en mémoire (une seule réplique). Le mot de passe n'est pas journalisé. */
export async function traiterConnexionEmail(requete: Request, suite: (requete: Request) => Promise<Response>): Promise<Response> {
	let email = '';
	try {
		const corps = await requete.clone().json() as { email?: unknown };
		if (typeof corps?.email === 'string') email = corps.email;
	} catch {
		// Corps illisible : Better Auth répondra.
	}
	const identifiant = email ? identifiantConnexion(email) : '';
	if (identifiant && process.env.E2E !== '1' && connexionBloquee(identifiant)) {
		console.error('[auth] plafond de connexion', { email: identifiant });
		return new Response(JSON.stringify({ message: 'Too many requests' }), {
			status: 429,
			headers: { 'content-type': 'application/json' },
		});
	}
	const reponse = await suite(requete);
	const statut = statutConnexionPublique(reponse.status);
	if (identifiant && statut === 401) {
		noterEchecConnexion(identifiant);
		console.error('[auth] échec de connexion', { email: identifiant });
	}
	if (identifiant && reponse.status === 200) noterReussiteConnexion(identifiant);
	if (statut === reponse.status) return reponse;
	return new Response(JSON.stringify({ message: 'Invalid email or password' }), {
		status: statut,
		headers: { 'content-type': 'application/json' },
	});
}
