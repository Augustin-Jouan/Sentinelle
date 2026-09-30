import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function PageIntrouvable() {
	return (
		<main className="grid min-h-screen place-items-center px-4">
			<div className="w-full max-w-sm space-y-4 text-center">
				<h1 className="text-2xl font-bold">Page introuvable</h1>
				<p className="text-sm text-muted-foreground">Ce chantier ou cette page n&apos;existe pas.</p>
				<Link href="/chantiers" className={buttonVariants()}>Retour aux chantiers</Link>
			</div>
		</main>
	);
}
