'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ajusterUneFeuille, LARGEUR_UTILE_PX, OPTIONS_UNE_FEUILLE } from '@/documents/uneFeuille';

export type Mesure = { pas: number; echelle: number };

/**
 * La feuille telle que le PDF l'imprimera : mise en page à la largeur utile d'une A4 paysage, numéros de
 * semaine espacés si besoin, puis réduite à l'échelle mesurée (même calcul que `htmlVersPdf`, Task 7).
 * Une mesure par montage : le parent change la `key` quand le contenu change.
 */
export function FeuilleUnique({ children, onMesure }: { children: ReactNode; onMesure?: (m: Mesure) => void }) {
	const [mesure, setMesure] = useState<Mesure | null>(null);

	useEffect(() => {
		let actif = true;
		void document.fonts.ready.then(() => {
			if (!actif) return;
			const m = ajusterUneFeuille({ ...OPTIONS_UNE_FEUILLE, selecteur: '#feuille-unique .sheet' });
			setMesure(m);
			onMesure?.(m);
		});
		return () => {
			actif = false;
		};
		// Une seule mesure, au montage (voir plus haut).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			id="feuille-unique"
			// shrink-0 : dans le conteneur flex de l'aperçu, la feuille garde la largeur mesurée.
			className="mode-impression shrink-0 shadow-ombre"
			data-pas={mesure?.pas}
			data-echelle={mesure?.echelle}
			style={mesure ? { width: LARGEUR_UTILE_PX / mesure.echelle, zoom: mesure.echelle } : { width: LARGEUR_UTILE_PX }}
		>
			{children}
		</div>
	);
}
