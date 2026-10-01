'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { changerActiviteArtisanAction, creerArtisanAction, modifierChampArtisanAction } from '@/actions/artisans';
import { enregistrerArtisan, idArtisanOuverte, type FicheArtisan as Fiche } from '@/composants/ficheArtisan';
import { useConfirmation } from '@/composants/maquette/Confirmation';
import * as Icone from '@/composants/maquette/icones';
import { Panneau } from '@/composants/maquette/Panneau';
import { Recherche } from '@/composants/maquette/Recherche';
import type { ArtisanFiche, ChampArtisan } from '@/donnees/artisans';
import { normaliser } from '@/domaine/recherche';

const VIDE: Fiche = { nom: '', adresse: '', cp: '', commune: '', interlocuteur: '', telephone: '', email: '' };
const versFiche = (a: ArtisanFiche | undefined): Fiche => (a
	? { nom: a.nom, adresse: a.adresse, cp: a.cp, commune: a.commune, interlocuteur: a.interlocuteur, telephone: a.telephone, email: a.email }
	: VIDE);
/** « Ajouter une entreprise » est dans la barre de titre, rendue par la page : il ouvre la fiche vide par cet événement. */
const OUVRIR_FICHE_VIDE = 'sentinelle:nouvelle-entreprise';
const CHAMPS: { champ: ChampArtisan; id: string; libelle: string; placeholder: string; span?: boolean; num?: boolean; type?: string; aide?: string }[] = [
	{ champ: 'nom', id: 'e-nom', libelle: 'Raison sociale', placeholder: 'AM COUVERTURE', span: true, aide: 'Le nom imprimé sur le marché. Il doit être unique.' },
	{ champ: 'adresse', id: 'e-adr', libelle: 'Adresse', placeholder: 'Z.I. Le Champ Jubin', span: true },
	{ champ: 'cp', id: 'e-cp', libelle: 'Code postal', placeholder: '44590', num: true },
	{ champ: 'commune', id: 'e-com', libelle: 'Commune', placeholder: 'DERVAL' },
	{ champ: 'interlocuteur', id: 'e-int', libelle: 'Interlocuteur', placeholder: 'Stéphane BIORET' },
	{ champ: 'telephone', id: 'e-tel', libelle: 'Téléphone', placeholder: '02-28-50-46-95', num: true },
	{ champ: 'email', id: 'e-mail', libelle: 'Courriel (optionnel)', placeholder: 'contact@entreprise.fr', span: true, type: 'email' },
];
const vide = (v: string, texte = '—') => v || <span className="dash">{texte}</span>;

export function ReferentielArtisans({ artisans, ficheInitiale }: { artisans: ArtisanFiche[]; ficheInitiale: string | null }) {
	const router = useRouter();
	const confirmer = useConfirmation();
	const [requete, setRequete] = useState('');
	/** null : fermé ; 'nouvelle' : fiche vide ; sinon l'id de l'entreprise. */
	const [ouverte, setOuverte] = useState<string | null>(ficheInitiale);
	const [fiche, setFiche] = useState<Fiche>(() => versFiche(artisans.find((a) => a.id === ficheInitiale)));
	const [erreur, setErreur] = useState<{ champ: string; message: string } | null>(null);
	const [enCours, demarrer] = useTransition();
	const actuelle = artisans.find((a) => a.id === ouverte) ?? null;

	// Tout est listé, archivées comprises : les masquer reviendrait à les supprimer (visiblesEnts de la maquette).
	const mots = normaliser(requete).split(/\s+/).filter(Boolean);
	const vues = artisans.filter((a) => mots.every((m) => normaliser([a.nom, a.adresse, a.cp, a.commune, a.interlocuteur, a.telephone].join(' ')).includes(m)));
	const archivees = artisans.filter((a) => !a.actif).length;

	function ouvrir(a: ArtisanFiche | null) {
		setOuverte(a ? a.id : 'nouvelle');
		setFiche(versFiche(a ?? undefined));
		setErreur(null);
	}
	useEffect(() => {
		const nouvelle = () => ouvrir(null);
		window.addEventListener(OUVRIR_FICHE_VIDE, nouvelle);
		return () => window.removeEventListener(OUVRIR_FICHE_VIDE, nouvelle);
	}, []);
	function fermer() {
		setOuverte(null);
		if (ficheInitiale) router.replace('/artisans', { scroll: false });
	}

	/** Enregistre champ par champ (les règles du serveur sont par champ) ; s'arrête au premier refus, sur son champ. */
	function enregistrer() {
		if (!fiche.nom.trim()) { setErreur({ champ: 'nom', message: 'La raison sociale est obligatoire.' }); document.getElementById('e-nom')?.focus(); return; }
		demarrer(async () => {
			const r = await enregistrerArtisan({
				id: idArtisanOuverte(ouverte),
				fiche,
				actuelle: actuelle ? versFiche(actuelle) : null,
				creer: creerArtisanAction,
				modifier: modifierChampArtisanAction,
			});
			// Même si un champ est refusé, l'id créé reste ouvert : « Ajouter » ne recrée pas.
			if (r.id) setOuverte(r.id);
			if (r.erreur) {
				const { champ, message } = r.erreur;
				setErreur({ champ, message });
				document.getElementById(CHAMPS.find((c) => c.champ === champ)!.id)?.focus();
				return;
			}
			toast(actuelle ? <><b>{fiche.nom}</b> mise à jour. Les prochains documents la porteront.</> : <><b>{fiche.nom}</b> ajoutée au référentiel.</>);
			fermer();
		});
	}

	/** removeArtisan() de la maquette : une archivée se réactive ; une active s'archive (jamais de suppression, écart 6). */
	async function supprimer(a: ArtisanFiche) {
		if (a.actif) {
			const oui = await confirmer(a.nombreLots
				? { texte: <><b>{a.nom}</b> est attribuée à {a.nombreLots} lot{a.nombreLots > 1 ? 's' : ''}. Elle ne peut pas être supprimée sans trahir ces marchés.<br /><br />L&apos;archiver&nbsp;? Elle disparaîtra des listes d&apos;attribution mais restera lisible sur les documents déjà établis.</>, libelle: 'Archiver' }
				: { texte: <>Archiver <b>{a.nom}</b>&nbsp;? Elle disparaîtra des listes d&apos;attribution ; « Réactiver » la fera revenir.</>, libelle: 'Archiver' });
			if (!oui) return;
		}
		demarrer(async () => {
			const r = await changerActiviteArtisanAction(a.id, !a.actif);
			if (!r.ok) { toast.error(r.erreur); return; }
			toast(a.actif ? <><b>{a.nom}</b> archivée{a.nombreLots ? ` — ${a.nombreLots} lot(s) conservent son nom` : ''}.</> : <><b>{a.nom}</b> réactivée.</>);
			if (ouverte === a.id) fermer();
		});
	}

	return (
		<>
			<div className="toolbar">
				<Recherche placeholder="Rechercher une entreprise, une commune, un interlocuteur…" libelle="Rechercher une entreprise" valeur={requete} onChange={setRequete} />
				<span className="eyebrow">
					{`${vues.length} entreprise${vues.length > 1 ? 's' : ''}${vues.length !== artisans.length ? ` sur ${artisans.length}` : ''}${archivees ? ` · ${archivees} archivée${archivees > 1 ? 's' : ''}` : ''}`}
				</span>
			</div>
			<div className="table-frame">
				<table className="plain">
					<thead><tr><th>Entreprise</th><th>Adresse</th><th>CP</th><th>Commune</th><th>Interlocuteur</th><th>Téléphone</th><th className="ta-r">Actions</th></tr></thead>
					<tbody>
						{vues.map((a) => (
							<tr key={a.id} className={a.actif ? undefined : 'is-archived'} onClick={() => ouvrir(a)}>
								<td className="ent-name">{a.nom}{!a.actif && <> <span className="pill pill-fini">Archivée</span></>}</td>
								<td>{vide(a.adresse)}</td>
								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.cp)}</td>
								<td>{vide(a.commune)}</td>
								<td>{vide(a.interlocuteur, 'non renseigné')}</td>
								<td className="num" style={{ fontSize: '0.75rem' }}>{vide(a.telephone)}</td>
								<td className="ta-r nowrap cell-actions">
									<button type="button" className="btn btn-sm" title="Modifier cette entreprise" onClick={(e) => { e.stopPropagation(); ouvrir(a); }}><Icone.Crayon />Modifier</button>
									{' '}
									{a.actif
										? <button type="button" className="btn btn-sm btn-danger" title="Archiver cette entreprise" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Corbeille />Supprimer</button>
										: <button type="button" className="btn btn-sm" title="Remettre cette entreprise en service" onClick={(e) => { e.stopPropagation(); void supprimer(a); }}><Icone.Reactiver />Réactiver</button>}
								</td>
							</tr>
						))}
						{!vues.length && <tr className="empty-row"><td colSpan={7}>Aucune entreprise ne correspond.</td></tr>}
					</tbody>
				</table>
			</div>
			<Panneau ouvert={ouverte !== null} surtitre={actuelle ? 'ENTREPRISE' : 'NOUVELLE ENTREPRISE'} titre={actuelle ? actuelle.nom : 'Ajouter au référentiel'} onFermer={fermer}
				pied={<>
					<button type="button" className="btn btn-primary" disabled={enCours} onClick={enregistrer}>{actuelle ? 'Enregistrer' : 'Ajouter'}</button>
					{actuelle && <button type="button" className="btn btn-ghost" disabled={enCours} onClick={() => void supprimer(actuelle)}>{actuelle.actif ? 'Supprimer' : 'Réactiver'}</button>}
					<button type="button" className="btn btn-ghost" onClick={fermer}>Annuler</button>
				</>}>
				<div className="grid-2">
					{CHAMPS.map((c) => (
						<div key={c.champ} className={c.span ? 'field span' : 'field'}>
							<label htmlFor={c.id}>{c.libelle}</label>
							<input id={c.id} type={c.type ?? 'text'} placeholder={c.placeholder} value={fiche[c.champ]}
								className={[c.num && 'num', erreur?.champ === c.champ && 'est-erreur'].filter(Boolean).join(' ') || undefined}
								onChange={(e) => setFiche({ ...fiche, [c.champ]: e.target.value })} />
							{c.aide && <span className="hint">{c.aide}</span>}
							{erreur?.champ === c.champ && <span className="erreur">{erreur.message}</span>}
						</div>
					))}
				</div>
				{actuelle && actuelle.nombreLots > 0 && (
					<div className="block">
						<div className="block-body" style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>
							Attribuée à <b>{actuelle.nombreLots} lot{actuelle.nombreLots > 1 ? 's' : ''}</b> dans vos chantiers. Renommer l&apos;entreprise met ces lots à jour ; la supprimer n&apos;est pas possible.
						</div>
					</div>
				)}
			</Panneau>
		</>
	);
}

/** « Ajouter une entreprise » de la barre de titre : ouvre la fiche vide du référentiel. */
export function BoutonAjouterEntreprise() {
	return (
		<button type="button" className="btn btn-primary" onClick={() => window.dispatchEvent(new Event(OUVRIR_FICHE_VIDE))}>
			<Icone.Plus />Ajouter une entreprise
		</button>
	);
}
