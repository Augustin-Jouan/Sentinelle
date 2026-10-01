import Link from 'next/link';

export default function PageIntrouvable() {
	return (
		<div className="screen is-on">
			<div className="login">
				<div className="login-card">
					<div className="login-brand">
						<div className="login-mark">Page introuvable</div>
						<p className="login-tag">Ce chantier ou cette page n&apos;existe pas.</p>
					</div>
					<Link href="/chantiers" className="btn btn-primary" style={{ justifyContent: 'center', padding: '0.5625rem' }}>
						Retour aux chantiers
					</Link>
				</div>
			</div>
		</div>
	);
}
