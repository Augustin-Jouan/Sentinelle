'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { Interrupteur } from '@/composants/briques/Interrupteur';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { usePreference } from '@/composants/briques/preference';
import { Recherche } from '@/composants/briques/Recherche';
import { lireChantierOuvert } from '@/composants/navigation/chantierOuvert';
import { chantiersVisibles, synthese, TRIS_CHANTIERS, type CarteChantier as Carte, type TriChantiers } from '@/domaine/accueil';
import { CarteChantier } from './CarteChantier';
import { Synthese } from './Synthese';

const estTri = (v: unknown): v is TriChantiers => TRIS_CHANTIERS.some((t) => t.v === v);
const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';

export function AccueilChantiers({ cartes }: { cartes: Carte[] }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = usePreference<TriChantiers>('sentinelle-tri-chantiers', 'ref', estTri);
	const [masquer, setMasquer] = usePreference('sentinelle-masquer-termines', true, estBooleen);
	const ouvert = useSyncExternalStore(() => () => {}, lireChantierOuvert, () => null);

	const visibles = chantiersVisibles(cartes, requete, masquer, tri);
	const q = requete.trim();
	return (
		<>
			<Synthese s={synthese(cartes)} />
			<div className="toolbar">
				<Recherche placeholder="Rechercher un chantier, un client, une commune…" libelle="Rechercher un chantier" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="ch-sort" k="Trier par" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<Interrupteur coche={masquer} onChange={setMasquer}>Masquer les terminés</Interrupteur>
				<span className="eyebrow">{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</span>
			</div>
			<div className="chantier-grid">
				{visibles.map((c) => <CarteChantier key={c.id} c={c} ouvert={c.id === ouvert} />)}
				{!visibles.length && (
					<div className="empty-list">{q ? `Aucun chantier ne correspond à « ${q} ».` : 'Tous les chantiers sont terminés. Décochez le filtre pour les revoir.'}</div>
				)}
				<Link className="chantier chantier-new" href="/chantiers/nouveau">
					<span className="plus">+</span>
					<span className="chantier-ref">Nouveau chantier</span>
					<div className="chantier-meta">Saisissez l&apos;en-tête une fois, il alimentera tous les documents.</div>
				</Link>
			</div>
		</>
	);
}
