'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { lireResumeSuppressionAction, marquerTermineAction, supprimerChantierAction } from '@/actions/chantiers';
import { sansOuvrirLaCarte } from '@/composants/accueil/carteActions';
import { Bouton } from '@/composants/briques/Bouton';
import { Carte } from '@/composants/briques/Carte';
import { cx } from '@/composants/briques/cx';
import * as Icone from '@/composants/briques/icones';
import { Pastille } from '@/composants/briques/Pastille';
import { CHIFFRES } from '@/composants/briques/typo';
import { type CarteChantier as DonneesCarte } from '@/domaine/accueil';
import { formatEuros } from '@/domaine/montants';
import { AlerteSuppression } from './AlerteSuppression';

const dateFr = (iso: string) => iso.split('-').reverse().join('.');

export function CarteChantier({ c, ouvert }: { c: DonneesCarte; ouvert: boolean }) {
	const router = useRouter();
	const [, demarrer] = useTransition();
	const [alerte, setAlerte] = useState(false);
	const ouvrir = () => router.push(`/chantiers/${c.id}/marches`);

	function terminer() {
		demarrer(async () => {
			const r = await marquerTermineAction(c.id, !c.termine);
			if (!r.ok) toast.error(r.erreur);
			else toast(c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>);
		});
	}

	const adresse = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	return (
		<>
			<Carte variante="cliquable" estompee={c.termine} role="button" tabIndex={0} data-testid="carte-chantier" onClick={ouvrir}
				onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } }}>
				{/* En étroit, l'en-tête s'efface (contents) : le nom reste en tête, Terminer et la corbeille passent en bas de la
				    carte, à l'écart de là où le pouce tombe en premier. */}
				<div className="flex items-start justify-between gap-3 max-etroit:contents">
					{/* Un chantier terminé est barré. */}
					<span className={cx('font-titre text-17 font-semibold', c.termine && 'line-through decoration-1')}>{c.reference}</span>
					<span className="flex flex-none items-center gap-1.5 max-etroit:order-last max-etroit:justify-end max-etroit:border-t max-etroit:border-rule max-etroit:pt-3">
						{c.termine ? <Pastille ton="neutre">Terminé</Pastille> : ouvert && <Pastille>Ouvert</Pastille>}
						<Bouton variante="surCarte" taille="sm" onClick={(e) => { sansOuvrirLaCarte(e); terminer(); }}
							onKeyDown={sansOuvrirLaCarte} title={c.termine ? 'Rouvrir ce chantier' : 'Marquer ce chantier terminé'}>
							{c.termine ? <><Icone.Rouvrir />Rouvrir</> : <><Icone.Coche />Terminer</>}
						</Bouton>
						<Bouton variante="surCarte" taille="sm" seulIcone onClick={(e) => { sansOuvrirLaCarte(e); setAlerte(true); }} onKeyDown={sansOuvrirLaCarte}
							title="Supprimer ce chantier" aria-label={`Supprimer ${c.reference}`}>
							<Icone.Corbeille />
						</Bouton>
					</span>
				</div>
				<div className="text-12 leading-[1.45] text-muted">
					{c.maitreOuvrage || '—'}<br />
					{c.natureTravaux || 'Nature des travaux non renseignée'}<br />
					{adresse || 'Adresse non renseignée'}
					{c.dateSignature && <><br /><span className="font-mono text-11 text-faint">Signature le {dateFr(c.dateSignature)}</span></>}
				</div>
				<div className="mt-auto flex items-end justify-between gap-4">
					<div className="font-mono text-11 text-muted">{c.lots === 0 ? 'Aucun lot' : `${c.lots} lot${c.lots > 1 ? 's' : ''} · ${c.attribues} attribué${c.attribues > 1 ? 's' : ''}`}</div>
					<div className={cx(CHIFFRES, 'text-16')}>
						<div className="font-titre text-10 tracking-capitales uppercase text-faint">Marchés TTC</div>
						{c.lots ? formatEuros(c.ttc) : '—'}
					</div>
				</div>
			</Carte>
			{alerte && createPortal(
				<AlerteSuppression id={c.id} reference={c.reference} onFermer={() => setAlerte(false)}
					lireResume={lireResumeSuppressionAction} supprimer={supprimerChantierAction} />,
				document.body,
			)}
		</>
	);
}
