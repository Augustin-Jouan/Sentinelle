'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, supprimerChantierAction } from '@/actions/chantiers';
import { sansOuvrirLaCarte } from '@/composants/accueil/carteActions';
import * as Icone from '@/composants/briques/icones';
import { useConfirmation } from '@/composants/briques/Confirmation';
import { pertesSuppression, SUPPRESSION_IMPOSSIBLE, type CarteChantier as Carte } from '@/domaine/accueil';
import { formatEuros } from '@/domaine/montants';

const dateFr = (iso: string) => iso.split('-').reverse().join('.');

export function CarteChantier({ c, ouvert }: { c: Carte; ouvert: boolean }) {
	const router = useRouter();
	const confirmer = useConfirmation();
	const [, demarrer] = useTransition();
	const ouvrir = () => router.push(`/chantiers/${c.id}/marches`);

	function terminer() {
		demarrer(async () => {
			const r = await marquerTermineAction(c.id, !c.termine);
			if (!r.ok) toast.error(r.erreur);
			else toast(c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>);
		});
	}

	async function supprimer() {
		// Refus d'emblée, sans faire confirmer une suppression qui échouerait (le serveur vérifie de toute façon).
		if (c.documents) { toast.error(SUPPRESSION_IMPOSSIBLE); return; }
		const pertes = pertesSuppression(c);
		const oui = await confirmer({
			texte: <>Supprimer <b>{c.reference}</b>&nbsp;? {pertes.length ? `${pertes.join(', ')} seront perdus. ` : ''}La suppression est définitive.</>,
			libelle: 'Supprimer', dangereux: true,
		});
		if (!oui) return;
		demarrer(async () => {
			const r = await supprimerChantierAction(c.id);
			if (!r.ok) toast.error(r.erreur);
			else toast(<><b>{c.reference}</b> supprimé.</>);
		});
	}

	const adresse = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	return (
		<div className={c.termine ? 'chantier is-done' : 'chantier'} role="button" tabIndex={0} onClick={ouvrir}
			onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } }}>
			<div className="chantier-top">
				<span className="chantier-ref">{c.reference}</span>
				<span className="chantier-actions">
					{c.termine ? <span className="pill pill-fini">Terminé</span> : ouvert && <span className="pill pill-actif">Ouvert</span>}
					<button type="button" className="btn btn-sm" onClick={(e) => { sansOuvrirLaCarte(e); terminer(); }}
						onKeyDown={sansOuvrirLaCarte} title={c.termine ? 'Rouvrir ce chantier' : 'Marquer ce chantier terminé'}>
						{c.termine ? <><Icone.Rouvrir />Rouvrir</> : <><Icone.Coche />Terminer</>}
					</button>
					<button type="button" className="btn btn-sm btn-danger btn-ico"
						onClick={(e) => { sansOuvrirLaCarte(e); void supprimer(); }} onKeyDown={sansOuvrirLaCarte}
						title="Supprimer ce chantier" aria-label={`Supprimer ${c.reference}`}>
						<Icone.Corbeille />
					</button>
				</span>
			</div>
			<div className="chantier-meta">
				{c.maitreOuvrage || '—'}<br />
				{c.natureTravaux || 'Nature des travaux non renseignée'}<br />
				{adresse || 'Adresse non renseignée'}
				{c.dateSignature && <><br /><span className="chantier-sig">Signature le {dateFr(c.dateSignature)}</span></>}
			</div>
			<div className="chantier-foot">
				<div className="chantier-lots">{c.lots === 0 ? 'Aucun lot' : `${c.lots} lot${c.lots > 1 ? 's' : ''} · ${c.attribues} attribué${c.attribues > 1 ? 's' : ''}`}</div>
				<div className="chantier-total"><small>Marchés TTC</small>{c.lots ? formatEuros(c.ttc) : '—'}</div>
			</div>
		</div>
	);
}
