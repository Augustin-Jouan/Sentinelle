'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { genererMarchesManquantsAction } from '@/actions/documents';

export function BoutonMarchesManquants({ chantierId, forme = 'barre', texte }: { chantierId: string; forme?: 'barre' | 'entete'; texte?: string }) {
	const [enCours, demarrer] = useTransition();
	const router = useRouter();
	const clic = () => demarrer(async () => {
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
		router.refresh();
	});
	return forme === 'barre' ? (
		<button type="button" className="btn btn-primary" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : 'Générer les marchés manquants'}</button>
	) : (
		<button type="button" className="dm-th-action" disabled={enCours} onClick={clic}>{enCours ? 'Génération…' : texte}</button>
	);
}
