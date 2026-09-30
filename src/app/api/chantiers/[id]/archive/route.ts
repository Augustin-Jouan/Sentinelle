import { utilisateurConnecte } from '@/auth/session';
import { enTeteTelechargement } from '@/domaine/fichiers';
import { construireArchive } from '@/donnees/archive';

/** « Tout télécharger » : session requise, comme la route des PDF ; 404 si le chantier n'existe pas ou n'a aucun document. */
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const archive = await construireArchive((await params).id);
	if (!archive) return new Response('Aucun document à télécharger', { status: 404 });
	return new Response(Buffer.from(archive.zip), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': enTeteTelechargement(archive.nomFichier),
			'Cache-Control': 'private, no-store',
		},
	});
}
