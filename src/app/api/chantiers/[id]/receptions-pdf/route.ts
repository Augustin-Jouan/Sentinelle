import { utilisateurConnecte } from '@/auth/session';
import { enTeteTelechargement } from '@/domaine/fichiers';
import { assemblerReceptions } from '@/donnees/receptions';

/** Les PV de « Tous les lots », une page par lot, pour l'impression ; refuse tout document qui n'est pas un PV du chantier. */
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const ids = (new URL(requete.url).searchParams.get('documents') ?? '').split(',').filter(Boolean).slice(0, 200);
	const assemble = await assemblerReceptions((await params).id, ids);
	if (!assemble) return new Response('Documents introuvables', { status: 404 });
	return new Response(Buffer.from(assemble.pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': enTeteTelechargement(assemble.nomFichier),
			'Cache-Control': 'private, no-store',
		},
	});
}
