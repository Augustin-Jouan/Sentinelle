'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { creerBrouillonAction } from '@/actions/comptesRendus';
import type { SerieDocuments, SerieVisa, VueDocuments } from '@/documents/etats';
import { numeroTexte } from '@/domaine/compteRendu';
import type { Semaine } from '@/domaine/semaines';
import { dateDuJourTexte } from '@/domaine/regles';

type Carte = { k: string; n: string; v: React.ReactNode; vide: boolean; ouvrir?: string; s: string; bouton: React.ReactNode; serie: string; idSuite?: string };

function DmCarte(c: Carte) {
	return (
		<div className={c.vide ? 'dm-carte est-vide' : 'dm-carte'} data-serie={c.serie}>
			<div className="dm-carte-tete"><span className="dm-carte-k">{c.k}</span><span className="dm-carte-n">{c.n}</span></div>
			{c.vide || !c.ouvrir ? <div className={c.vide ? 'dm-carte-v est-vide' : 'dm-carte-v'}>{c.v}</div> : <Link className="dm-carte-v" href={c.ouvrir} scroll={false}>{c.v}</Link>}
			<div className="dm-carte-s" data-testid={c.idSuite}>{c.s}</div>
			{c.bouton}
		</div>
	);
}

const le = (iso: string) => dateDuJourTexte(new Date(iso));
const pastille = (texte: string) => <span className="pill pill-modif">{texte}</span>;

export function CartesDocuments({ vue, etendue, attribues }: { vue: VueDocuments; etendue: { debut: Semaine; fin: Semaine }; attribues: number }) {
	const router = useRouter();
	const [enCours, demarrer] = useTransition();
	const cr = vue.comptesRendus;
	const dernier = cr.liste[0];
	const planning = `/chantiers/${vue.chantierId}/planning`;
	const derniere = (s: SerieDocuments | SerieVisa) => s.versions[0];
	const recap = derniere(vue.recap), plan = derniere(vue.planning), visa = derniere(vue.visa);
	const nbRecap = vue.recap.versions.length;

	function nouveauCompteRendu() {
		demarrer(async () => {
			const r = await creerBrouillonAction(vue.chantierId);
			if (!r.ok) { toast.error(r.erreur); return; }
			router.push('?cr=brouillon', { scroll: false });
		});
	}

	return (
		<div className="dm-cartes">
			<DmCarte serie="comptes-rendus" idSuite="suite-comptes-rendus" k="Comptes rendus" n={cr.liste.length ? String(cr.liste.length) : ''} vide={!dernier}
				v={dernier ? `n° ${numeroTexte(dernier.numero)} · ${dernier.date.replace(/\//g, '.')}` : "Aucun pour l'instant"}
				ouvrir={dernier ? `?cr=${dernier.id}` : undefined}
				s={cr.brouillon ? `Brouillon n° ${numeroTexte(cr.brouillon.numero)} en cours`
					: cr.prochainRdv === null ? 'Le premier reprend lots et entreprises'
					: cr.prochainRdv ? `Prochain : ${cr.prochainRdv}` : 'Prochain rendez-vous non fixé'}
				bouton={cr.brouillon
					? <Link className="btn btn-sm btn-primary" href="?cr=brouillon" scroll={false}>Reprendre le brouillon</Link>
					: <button type="button" className="btn btn-sm btn-primary" disabled={enCours} onClick={nouveauCompteRendu}>Nouveau compte rendu</button>} />
			<DmCarte serie="recap" k="Récap des marchés" n={recap ? `v${recap.version}` : ''} vide={!recap}
				v={recap ? <>{le(recap.creeLe)}{vue.recap.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore exporté'} ouvrir="?apercu=recap"
				s={recap ? `${nbRecap} version${nbRecap > 1 ? 's' : ''} enregistrée${nbRecap > 1 ? 's' : ''}` : `${vue.lots.length} lots à récapituler`}
				bouton={<Link className="btn btn-sm" href="?apercu=recap" scroll={false}>Exporter à jour</Link>} />
			<DmCarte serie="planning" k="Planning" n={plan ? `v${plan.version}` : ''} vide={!plan}
				v={plan ? <>{le(plan.creeLe)}{vue.planning.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore imprimé'} ouvrir={`${planning}?apercu=planning`}
				s={`Semaine ${etendue.debut.semaine} · ${etendue.debut.annee} à ${etendue.fin.semaine} · ${etendue.fin.annee}`}
				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=planning`}>Planning imprimable</Link>} />
			<DmCarte serie="visa" k="Feuille de visa" n={visa ? `v${visa.version}` : ''} vide={!visa}
				v={visa ? <>{le(visa.creeLe)}{vue.visa.etat === 'perime' && pastille('périmé')}</> : 'Pas encore produite'} ouvrir={`${planning}?apercu=visa`}
				s={`À faire signer aux ${attribues} entreprise${attribues > 1 ? 's' : ''}`}
				bouton={<Link className="btn btn-sm" href={`${planning}?apercu=visa`}>{visa ? 'Réimprimer' : 'Produire'}</Link>} />
		</div>
	);
}
