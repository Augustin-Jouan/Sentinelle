import Link from 'next/link';
import { deconnexionAction } from '@/actions/session';
import type { UtilisateurConnecte } from '@/auth/session';
import { Button } from '@/components/ui/button';

export function EnTeteApp({ utilisateur }: { utilisateur: UtilisateurConnecte }) {
	const liens = [
		{ href: '/chantiers', texte: 'Chantiers' },
		{ href: '/artisans', texte: 'Artisans' },
		...(utilisateur.role === 'admin'
			? [{ href: '/parametres', texte: 'Paramètres' }, { href: '/admin/comptes', texte: 'Comptes' }]
			: []),
	];
	return (
		<header className="border-b bg-card">
			<div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
				<Link href="/chantiers" className="font-titre text-lg font-bold text-primary">Sentinelle</Link>
				<nav className="flex gap-4 text-sm">
					{liens.map((l) => (
						<Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">{l.texte}</Link>
					))}
				</nav>
				<div className="ml-auto flex items-center gap-3 text-sm">
					<span className="text-muted-foreground">{utilisateur.nom}</span>
					<form action={deconnexionAction}>
						<Button type="submit" variant="ghost" size="sm">Se déconnecter</Button>
					</form>
				</div>
			</div>
		</header>
	);
}
