'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { creerBrouillonAction } from '@/actions/comptesRendus';
import { Bouton } from '@/composants/briques/Bouton';
import { Carte as CarteBrique } from '@/composants/briques/Carte';
import { cx } from '@/composants/briques/cx';
import { Pastille } from '@/composants/briques/Pastille';
import type { SerieDocuments, SerieVisa, VueDocuments } from '@/documents/etats';
import { numeroTexte } from '@/domaine/compteRendu';
import type { Semaine } from '@/domaine/semaines';
import { dateDuJourTexte } from '@/domaine/regles';

type Carte = { k: string; n: string; v: React.ReactNode; vide: boolean; ouvrir?: string; s: string; bouton: React.ReactNode; serie: string; idSuite?: string };

/** Une carte de série (ex-.dm-carte) : le nom, la dernière version, ce qu'elle contient, son bouton. */
function DmCarte(c: Carte) {
	const valeur = cx('font-titre text-17 font-semibold', c.vide ? 'cursor-default text-muted' : 'cursor-pointer text-accent-2 hover:underline');
	return (
		<CarteBrique variante={c.vide ? 'compacteVide' : 'compacte'} data-serie={c.serie}>
			<div className="flex justify-between self-stretch">
				<span className="font-titre text-11 font-semibold tracking-capitales uppercase text-muted">{c.k}</span>
				<span className="font-mono text-12 text-muted" data-testid="carte-version">{c.n}</span>
			</div>
			{c.vide || !c.ouvrir
				? <div className={valeur} data-testid="carte-valeur">{c.v}</div>
				: <Link className={valeur} href={c.ouvrir} scroll={false} data-testid="carte-valeur">{c.v}</Link>}
			<div className="mb-1.5 text-12 text-muted" data-testid={c.idSuite}>{c.s}</div>
			{c.bouton}
		</CarteBrique>
	);
}

const le = (iso: string) => dateDuJourTexte(new Date(iso));
const pastille = (texte: string) => <Pastille className="ml-1">{texte}</Pastille>;

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
		<div className="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3">
			<DmCarte serie="comptes-rendus" idSuite="suite-comptes-rendus" k="Comptes rendus" n={cr.liste.length ? String(cr.liste.length) : ''} vide={!dernier}
				v={dernier ? `n° ${numeroTexte(dernier.numero)} · ${dernier.date.replace(/\//g, '.')}` : "Aucun pour l'instant"}
				ouvrir={dernier ? `?cr=${dernier.id}` : undefined}
				s={cr.brouillon ? `Brouillon n° ${numeroTexte(cr.brouillon.numero)} en cours`
					: cr.prochainRdv === null ? 'Le premier reprend lots et entreprises'
					: cr.prochainRdv ? `Prochain : ${cr.prochainRdv}` : 'Prochain rendez-vous non fixé'}
				bouton={cr.brouillon
					? <Bouton taille="sm" variante="primaire" href="?cr=brouillon" scroll={false}>Reprendre le brouillon</Bouton>
					: <Bouton taille="sm" variante="primaire" enCours={enCours} onClick={nouveauCompteRendu}>Nouveau compte rendu</Bouton>} />
			<DmCarte serie="recap" k="Récap des marchés" n={recap ? `v${recap.version}` : ''} vide={!recap}
				v={recap ? <>{le(recap.creeLe)}{vue.recap.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore exporté'} ouvrir="?apercu=recap"
				s={recap ? `${nbRecap} version${nbRecap > 1 ? 's' : ''} enregistrée${nbRecap > 1 ? 's' : ''}` : `${vue.lots.length} lots à récapituler`}
				bouton={<Bouton taille="sm" href="?apercu=recap" scroll={false}>Exporter à jour</Bouton>} />
			<DmCarte serie="planning" k="Planning" n={plan ? `v${plan.version}` : ''} vide={!plan}
				v={plan ? <>{le(plan.creeLe)}{vue.planning.etat === 'modifie' && pastille('modifié')}</> : 'Pas encore imprimé'} ouvrir={`${planning}?apercu=planning`}
				s={`Semaine ${etendue.debut.semaine} · ${etendue.debut.annee} à ${etendue.fin.semaine} · ${etendue.fin.annee}`}
				bouton={<Bouton taille="sm" href={`${planning}?apercu=planning`}>Planning imprimable</Bouton>} />
			<DmCarte serie="visa" k="Feuille de visa" n={visa ? `v${visa.version}` : ''} vide={!visa}
				v={visa ? <>{le(visa.creeLe)}{vue.visa.etat === 'perime' && pastille('périmé')}</> : 'Pas encore produite'} ouvrir={`${planning}?apercu=visa`}
				s={`À faire signer aux ${attribues} entreprise${attribues > 1 ? 's' : ''}`}
				bouton={<Bouton taille="sm" href={`${planning}?apercu=visa`}>{visa ? 'Réimprimer' : 'Produire'}</Bouton>} />
		</div>
	);
}
