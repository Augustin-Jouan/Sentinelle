'use client';

import { useEffect } from 'react';

export default function PageErreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error('[page] erreur', error.name);
	}, [error]);

	return (
		<div className="screen is-on">
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark">Une erreur est survenue</div>
						<p className="login-tag">Réessayez ; si le problème persiste, prévenez l&apos;administrateur.</p>
					</div>
					<button type="button" className="btn btn-primary" onClick={reset} style={{ justifyContent: 'center', padding: '0.5625rem' }}>
						Réessayer
					</button>
				</div>
			</div>
		</div>
	);
}
