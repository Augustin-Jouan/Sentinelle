'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function PageErreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error('[page] erreur', error.name);
	}, [error]);

	return (
		<main className="grid min-h-screen place-items-center px-4">
			<div className="w-full max-w-sm space-y-4 text-center">
				<h1 className="text-2xl font-bold">Une erreur est survenue</h1>
				<p className="text-sm text-muted-foreground">Réessayez ; si le problème persiste, prévenez l&apos;administrateur.</p>
				<Button onClick={reset}>Réessayer</Button>
			</div>
		</main>
	);
}
