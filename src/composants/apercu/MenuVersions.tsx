'use client';

import { useRouter } from 'next/navigation';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import type { VersionResume } from '@/documents/etats';
import { dateDuJourTexte } from '@/domaine/regles';

/** L'historique d'une série : choisir une version l'ouvre telle qu'émise ; « Données actuelles » revient à l'aperçu vivant. */
export function MenuVersions({ chantierId, versions, courante, retourActuel }: { chantierId: string; versions: VersionResume[]; courante: string | null; retourActuel?: string }) {
	const router = useRouter();
	if (!versions.length) return null;
	return (
		<MenuDeroulant id="dd-version" k="Version" valeur={courante ?? 'actuel'}
			options={[
				...(retourActuel ? [{ v: 'actuel', t: 'Données actuelles' }, { sep: true as const }] : []),
				...versions.map((v) => ({ v: v.id, t: `v${v.version} · ${dateDuJourTexte(new Date(v.creeLe))}${v.libelle ? ` · ${v.libelle}` : ''}`, meta: v.auteur })),
			]}
			onChoisir={(v) => router.push(v === 'actuel' ? (retourActuel ?? '') : `/chantiers/${chantierId}/documents?version=${v}`, { scroll: false })} />
	);
}
