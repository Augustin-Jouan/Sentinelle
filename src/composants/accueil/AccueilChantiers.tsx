'use client';

import { useState, useSyncExternalStore } from 'react';
import { BarreOutils } from '@/composants/briques/BarreOutils';
import { Carte } from '@/composants/briques/Carte';
import { Interrupteur } from '@/composants/briques/Interrupteur';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { usePreference } from '@/composants/briques/preference';
import { Recherche } from '@/composants/briques/Recherche';
import { Surtitre } from '@/composants/briques/Surtitre';
import { Vide } from '@/composants/briques/Vide';
import { lireChantierOuvert } from '@/composants/navigation/chantierOuvert';
import { chantiersVisibles, synthese, TRIS_CHANTIERS, type CarteChantier as DonneesCarte, type TriChantiers } from '@/domaine/accueil';
import { CarteChantier } from './CarteChantier';
import { Synthese } from './Synthese';

const estTri = (v: unknown): v is TriChantiers => TRIS_CHANTIERS.some((t) => t.v === v);
const estBooleen = (v: unknown): v is boolean => typeof v === 'boolean';

export function AccueilChantiers({ cartes }: { cartes: DonneesCarte[] }) {
	const [requete, setRequete] = useState('');
	const [tri, setTri] = usePreference<TriChantiers>('sentinelle-tri-chantiers', 'ref', estTri);
	const [masquer, setMasquer] = usePreference('sentinelle-masquer-termines', true, estBooleen);
	const ouvert = useSyncExternalStore(() => () => {}, lireChantierOuvert, () => null);

	const visibles = chantiersVisibles(cartes, requete, masquer, tri);
	const q = requete.trim();
	return (
		<>
			<Synthese s={synthese(cartes)} />
			<BarreOutils>
				<Recherche placeholder="Rechercher un chantier, un client, une commune…" libelle="Rechercher un chantier" valeur={requete} onChange={setRequete} />
				<MenuDeroulant id="ch-sort" k="Trier par" className="self-stretch" valeur={tri} options={TRIS_CHANTIERS} onChoisir={(v) => { if (estTri(v)) setTri(v); }} />
				<Interrupteur coche={masquer} onChange={setMasquer}>Masquer les terminés</Interrupteur>
				<Surtitre>{q ? `${visibles.length} résultat${visibles.length > 1 ? 's' : ''} sur ${cartes.length}` : ''}</Surtitre>
			</BarreOutils>
			{/* 24 rem et non 20 : à 1392 px, 20 rem donnait 4 colonnes où les noms de chantier passaient à la ligne. */}
			<div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-4">
				{visibles.map((c) => <CarteChantier key={c.id} c={c} ouvert={c.id === ouvert} />)}
				{!visibles.length && (
					<Vide variante="liste">{q ? `Aucun chantier ne correspond à « ${q} ».` : 'Tous les chantiers sont terminés. Décochez le filtre pour les revoir.'}</Vide>
				)}
				<Carte variante="ajout" href="/chantiers/nouveau">
					<span className="font-titre text-24 leading-none text-accent">+</span>
					<span className="font-titre text-17 font-semibold text-accent-2">Nouveau chantier</span>
					<div className="text-12 leading-[1.45] text-muted">Saisissez l&apos;en-tête une fois, il alimentera tous les documents.</div>
				</Carte>
			</div>
		</>
	);
}
