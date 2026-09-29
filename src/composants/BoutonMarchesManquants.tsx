'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { genererMarchesManquantsAction } from '@/actions/documents';
import { Button } from '@/components/ui/button';

export function BoutonMarchesManquants({ chantierId }: { chantierId: string }) {
	const [enCours, demarrer] = useTransition();
	return (
		<Button variant="outline" disabled={enCours} onClick={() => demarrer(async () => {
			const r = await genererMarchesManquantsAction(chantierId);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			const { generes, ignores } = r.donnees;
			toast.success(generes.length ? `${generes.length} marché(s) généré(s) : ${generes.join(', ')}.` : 'Aucun marché à générer.', {
				description: ignores.length ? `Ignorés — ${ignores.map((i) => `${i.lot} : ${i.raison}`).join(' ; ')}` : undefined,
				duration: 10_000,
			});
		})}>
			{enCours ? 'Génération…' : 'Générer les marchés manquants'}
		</Button>
	);
}
