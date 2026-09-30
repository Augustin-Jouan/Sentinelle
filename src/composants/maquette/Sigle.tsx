const S = '0,17 15.5,0 70.5,0 86,17 19.8,17 19.8,41.5 86,41.5 86,83 70.5,100 15.5,100 0,83 66.2,83 66.2,58.5 0,58.5';

/** Le sprite du sigle (la plaque gravée, claire et sombre) : une fois par page, dans le layout. */
export function SigleDefs() {
	return (
		<svg className="sigle-defs" width="0" height="0" aria-hidden="true">
			<defs>
				<linearGradient id="wall-l" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#8ea9c3" /><stop offset="0.38" stopColor="#b8cadd" /><stop offset="0.7" stopColor="#cfdcea" /><stop offset="1" stopColor="#f2f7fb" />
				</linearGradient>
				<linearGradient id="wall-d" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#0b1319" /><stop offset="0.38" stopColor="#17242f" /><stop offset="0.7" stopColor="#22323f" /><stop offset="1" stopColor="#3b5064" />
				</linearGradient>
				<symbol id="plaque-clair" viewBox="0 0 160 160">
					<rect width="160" height="160" rx="6" fill="currentColor" />
					<g transform="translate(33 27)">
						<polygon points={S} fill="#6d89a7" /><polygon points={S} fill="#ffffff" transform="translate(6 6)" /><polygon points={S} fill="url(#wall-l)" transform="translate(3 3)" />
					</g>
				</symbol>
				<symbol id="plaque-sombre" viewBox="0 0 160 160">
					<rect width="160" height="160" rx="6" fill="currentColor" />
					<g transform="translate(33 27)">
						<polygon points={S} fill="#05090d" /><polygon points={S} fill="#4e6d87" transform="translate(6 6)" /><polygon points={S} fill="url(#wall-d)" transform="translate(3 3)" />
					</g>
				</symbol>
			</defs>
		</svg>
	);
}

export function Sigle({ grand = false }: { grand?: boolean }) {
	return (
		<svg className={grand ? 'sigle sigle-lg' : 'sigle'} viewBox="0 0 160 160" aria-hidden="true">
			<use className="pl-clair" href="#plaque-clair" /><use className="pl-sombre" href="#plaque-sombre" />
		</svg>
	);
}
