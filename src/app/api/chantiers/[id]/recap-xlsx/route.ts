import { utilisateurConnecte } from '@/auth/session';
import { construireDonneesRecap } from '@/documents/donnees';
import { recapVersXlsx } from '@/documents/tableur';
import { enTeteTelechargement, nomFichierTableur } from '@/domaine/fichiers';

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const { chantier, donnees } = await construireDonneesRecap((await params).id);
	return new Response(new Uint8Array(await recapVersXlsx(donnees)), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': enTeteTelechargement(nomFichierTableur(chantier.reference)),
			'Cache-Control': 'private, no-store',
		},
	});
}
