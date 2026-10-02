'use client';

import { useEffect } from 'react';
import { Bouton } from '@/composants/briques/Bouton';
import { EcranCentre } from '@/composants/briques/EcranCentre';

export default function PageErreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error('[page] erreur', error.name);
	}, [error]);

	return (
		<EcranCentre titre="Une erreur est survenue" accroche="Réessayez ; si le problème persiste, prévenez l'administrateur.">
			<Bouton variante="primaire" taille="grand" onClick={reset}>Réessayer</Bouton>
		</EcranCentre>
	);
}
