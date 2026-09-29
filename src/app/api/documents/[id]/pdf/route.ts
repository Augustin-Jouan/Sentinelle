import { utilisateurConnecte } from '@/auth/session';
import { enTeteTelechargement } from '@/domaine/fichiers';
import { prisma } from '@/donnees/prisma';

/** Renvoie toujours les octets stockés : le PDF téléchargé est exactement celui qui a été généré. */
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
	const u = await utilisateurConnecte();
	if (!u || u.doitChangerMotDePasse) return new Response('Non autorisé', { status: 401 });
	const doc = await prisma.document.findUnique({ where: { id: (await params).id }, select: { pdf: true, nomFichier: true } });
	if (!doc) return new Response('Document introuvable', { status: 404 });
	return new Response(Buffer.from(doc.pdf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': enTeteTelechargement(doc.nomFichier),
			'Cache-Control': 'private, no-store',
		},
	});
}
