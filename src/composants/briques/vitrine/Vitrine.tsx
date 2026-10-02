'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { BarreOutils } from '../BarreOutils';
import { Bloc } from '../Bloc';
import { Bouton } from '../Bouton';
import { Carte } from '../Carte';
import { Champ, GrilleChamps, GroupeChamps, Saisie, ZoneTexte } from '../Champ';
import { ChoixSegmente } from '../ChoixSegmente';
import { Cle, CleValeur, Valeur } from '../CleValeur';
import { useConfirmation } from '../Confirmation';
import { Etiquette } from '../Etiquette';
import * as Icone from '../icones';
import { Interrupteur } from '../Interrupteur';
import { LienAction } from '../LienAction';
import { MenuDeroulant } from '../MenuDeroulant';
import { BarreOnglets, Onglet } from '../Onglet';
import { Panneau } from '../Panneau';
import { Pastille } from '../Pastille';
import { Recherche } from '../Recherche';
import { Sigle } from '../Sigle';
import { Surtitre } from '../Surtitre';
import { CadreTableau, Tableau } from '../Tableau';
import { Vide } from '../Vide';

/** Assez long pour déborder partout : il doit se tronquer, jamais pousser la mise en page. */
const LONG = 'SOCIÉTÉ NOUVELLE DE CONSTRUCTIONS MÉTALLIQUES ET DE SERRURERIE DU PAYS DE CHÂTEAUBRIANT';

const ENTREPRISES = [
	{ v: 'rebours', t: 'CONSTRUCTIONS REBOURS', meta: 'Martigné-Ferchaud' },
	{ v: 'gillot', t: 'GILLOT TP', meta: 'Vallons-de-l’Erdre' },
	{ v: 'long', t: LONG, meta: 'Châteaubriant' },
];

/** Une section : son surtitre, puis ses exemples ; data-testid sert aux captures (e2e/visuel/vitrine.spec.ts). */
function Section({ nom, titre, children }: { nom: string; titre: string; children: React.ReactNode }) {
	return (
		<section data-testid={`vitrine-${nom}`} className="flex flex-col gap-4 bg-paper py-2">
			<Surtitre filet>{titre}</Surtitre>
			{children}
		</section>
	);
}

const Rangee = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

/**
 * Toutes les briques, toutes leurs variantes et tous leurs états, en clair comme en sombre.
 * Une variante ou un état nouveau s'ajoute ici en même temps que dans sa brique.
 */
export function Vitrine() {
	const [mission, setMission] = useState<'complete' | 'partielle'>('complete');
	const [coche, setCoche] = useState(true);
	const [recherche, setRecherche] = useState('');
	const [entreprise, setEntreprise] = useState('long');
	const [vus, setVus] = useState(['rebours']);
	const [panneau, setPanneau] = useState(false);
	const demander = useConfirmation();
	const confirmer = () => void demander({ texte: <>Supprimer le lot <b>02 — GROS ŒUVRE</b> ?</>, libelle: 'Supprimer', dangereux: true });

	return (
		<div className="flex flex-col gap-8">
			<Section nom="boutons" titre="Boutons">
				<Rangee>
					<Bouton>Normal</Bouton>
					<Bouton variante="primaire"><Icone.Plus />Primaire</Bouton>
					<Bouton variante="fantome">Fantôme</Bouton>
					<Bouton variante="danger"><Icone.Corbeille />Danger</Bouton>
					<Bouton variante="surCarte"><Icone.Coche />Sur carte</Bouton>
					<Bouton href="/vitrine">Lien</Bouton>
				</Rangee>
				<Rangee>
					<Bouton taille="sm">Petit</Bouton>
					<Bouton taille="sm" variante="primaire">Petit primaire</Bouton>
					<Bouton taille="sm" variante="danger" seulIcone aria-label="Supprimer" title="Supprimer"><Icone.Corbeille /></Bouton>
					<Bouton desactive>Désactivé</Bouton>
					<Bouton variante="primaire" enCours>En cours…</Bouton>
				</Rangee>
				<div className="w-80"><Bouton variante="primaire" taille="grand" className="w-full">Grand, pleine largeur</Bouton></div>
			</Section>

			<Section nom="etiquettes" titre="Pastilles, étiquettes, surtitres">
				<Rangee>
					<Pastille>Ouvert</Pastille>
					<Pastille ton="neutre">Terminé</Pastille>
					<Etiquette ton="accent">Sous-traitance</Etiquette>
					<Etiquette>1 avenant</Etiquette>
					<Etiquette taille="mini">v2</Etiquette>
					<Surtitre>Surtitre</Surtitre>
					<LienAction onClick={() => toast('Action discrète.')}>Action discrète</LienAction>
				</Rangee>
				<Surtitre filet>Surtitre souligné d’un filet</Surtitre>
			</Section>

			<Section nom="champs" titre="Champs">
				<GroupeChamps titre="Identification">
					<GrilleChamps>
						<Champ libelle="Référence" pour="v-ref"><Saisie id="v-ref" defaultValue="PERRIER — Louisfert" /></Champ>
						<Champ libelle="Commune" pour="v-commune" aide="Telle qu’elle figure sur l’arrêté."><Saisie id="v-commune" placeholder="Louisfert" /></Champ>
						<Champ libelle="Code postal" pour="v-cp" erreur="Cinq chiffres attendus."><Saisie id="v-cp" defaultValue="441" erreur="Cinq chiffres attendus." /></Champ>
						<Champ libelle="Type de mission">
							<ChoixSegmente libelle="Type de mission" valeur={mission} onChoisir={setMission}
								options={[{ v: 'complete', t: 'Complète' }, { v: 'partielle', t: 'Partielle' }]} />
						</Champ>
						<Champ libelle="Observations" pour="v-obs" pleineLargeur><ZoneTexte id="v-obs" rows={3} defaultValue={LONG} /></Champ>
					</GrilleChamps>
				</GroupeChamps>
				<Rangee>
					<Interrupteur coche={coche} onChange={setCoche}>Interrupteur</Interrupteur>
					<Interrupteur coche={!coche} onChange={(v) => setCoche(!v)} variante="discrete">Interrupteur discret</Interrupteur>
					<Recherche placeholder="Rechercher un lot, une entreprise…" libelle="Rechercher" valeur={recherche} onChange={setRecherche} />
				</Rangee>
				<Rangee>
					<Saisie variante="kv" aria-label="Montant kv" defaultValue="96 250,00" />
					<Saisie variante="kv-etroit" aria-label="Taux" defaultValue="20,00" />
					<Saisie variante="kv" gras aria-label="Montant gras" defaultValue="115 500,00" />
					<Saisie variante="date" type="date" aria-label="Date" defaultValue="2026-03-04" />
					<Saisie variante="montant-etroit" aria-label="Durée" defaultValue="12" />
				</Rangee>
			</Section>

			<Section nom="structure" titre="Cartes, blocs, valeurs">
				<div className="grid grid-cols-[repeat(auto-fill,minmax(20rem,1fr))] gap-4">
					<Carte variante="cliquable" role="button" tabIndex={0}>
						<div className="flex items-center justify-between gap-2"><span className="truncate font-titre text-18 font-semibold">{LONG}</span><Pastille>Ouvert</Pastille></div>
						<span className="text-13 text-muted">Carte cliquable : elle se soulève au survol.</span>
					</Carte>
					<Carte variante="cliquable" estompee role="button" tabIndex={0}>
						<span className="font-titre text-18 font-semibold">Chantier terminé</span>
						<span className="text-13 text-muted">Carte estompée.</span>
					</Carte>
					<Carte variante="ajout" href="/vitrine"><Icone.Plus /><span className="font-titre text-15 font-semibold">Nouveau chantier</span></Carte>
					<Carte variante="compacte"><Surtitre>Marché</Surtitre><span className="text-13">v2 · 04/03/2026</span></Carte>
					<Carte variante="compacteVide"><Surtitre>Avenant</Surtitre><span className="text-13 text-muted">Aucun</span></Carte>
				</div>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(24rem,1fr))] gap-4">
					<Bloc titre="Entreprise" action={<Bouton variante="fantome" taille="sm">Voir la fiche</Bouton>}>
						<CleValeur>
							<Cle>Adresse</Cle><Valeur>Z.I. du Pigeon Blanc</Valeur>
							<Cle>Interlocuteur</Cle><Valeur>{LONG}</Valeur>
							<Cle>Avenants</Cle><Valeur chiffres moins>− 300,00 €</Valeur>
							<Cle>Montant TTC</Cle><Valeur chiffres>115 500,00 €</Valeur>
						</CleValeur>
					</Bloc>
					<Bloc titre="Avenants" corps="colonne"><Vide variante="mini">Aucun avenant.</Vide></Bloc>
				</div>
				<Vide variante="liste">Aucun chantier ne correspond.</Vide>
			</Section>

			<Section nom="navigation" titre="Navigation">
				<BarreOnglets libelle="Exemple d’onglets">
					<Onglet href="/vitrine" actif icone={<Icone.Marches />} compteur={13}>Marchés</Onglet>
					<Onglet href="/vitrine" actif={false} icone={<Icone.Planning />} compteur={27}>Planning</Onglet>
					<Onglet href="/vitrine" actif={false} icone={<Icone.Documents />}>Documents</Onglet>
				</BarreOnglets>
				<Rangee>
					<Sigle />
					<Sigle taille="grande" />
				</Rangee>
				<BarreOutils etalee>
					<Recherche placeholder="Rechercher…" libelle="Rechercher dans la barre" valeur="" onChange={() => {}} />
					<Bouton variante="primaire"><Icone.Plus />Ajouter</Bouton>
				</BarreOutils>
			</Section>

			<Section nom="tableaux" titre="Tableaux">
				<CadreTableau>
					<Tableau variante="plain">
						<thead><tr><th>Entreprise</th><th>Commune</th><th data-droite>Lots</th><th data-actions /></tr></thead>
						<tbody>
							<tr><td>CONSTRUCTIONS REBOURS</td><td>Martigné-Ferchaud</td><td data-droite>2</td>
								<td data-actions><Bouton taille="sm"><Icone.Crayon />Modifier</Bouton><Bouton taille="sm" variante="danger">Archiver</Bouton></td></tr>
							<tr data-inactif><td>ANCIENNE SARL</td><td>Rennes</td><td data-droite>0</td><td data-actions><Bouton taille="sm">Réactiver</Bouton></td></tr>
							<tr><td data-vide colSpan={4}>Aucune autre entreprise.</td></tr>
						</tbody>
					</Tableau>
				</CadreTableau>
				<div className="grid grid-cols-[repeat(auto-fill,minmax(28rem,1fr))] gap-4">
					<CadreTableau>
						<Tableau variante="mini">
							<thead><tr><th>Avenant</th><th data-droite>Montant HT</th></tr></thead>
							<tbody>
								<tr><td data-saisie><Saisie variante="texte" aria-label="Objet" placeholder="Objet de l’avenant" /></td>
									<td data-saisie data-droite><Saisie variante="montant" aria-label="Montant" defaultValue="1 250,00" /></td></tr>
								<tr><td data-saisie><Saisie variante="texte-mini" aria-label="Note" defaultValue="note" /></td>
									<td data-saisie data-droite><Saisie variante="montant-mini" aria-label="Montant mini" defaultValue="− 300,00" /></td></tr>
							</tbody>
						</Tableau>
					</CadreTableau>
					<CadreTableau>
						<Tableau variante="lots">
							<thead><tr><th>N°</th><th>Lot</th><th data-droite>Montant HT</th></tr></thead>
							<tbody>
								<tr><td>01</td><td>TERRASSEMENT — V.R.D.</td><td data-droite>42 300,00</td></tr>
								<tr data-ouvert><td>02</td><td>GROS ŒUVRE</td><td data-droite>96 250,00</td></tr>
							</tbody>
						</Tableau>
					</CadreTableau>
				</div>
				<CadreTableau>
					<Tableau variante="dm">
						<thead><tr><th data-premiere>Lot et entreprise</th><th>Marché</th><th>Avenants</th></tr></thead>
						<tbody>
							<tr><th data-premiere scope="row">02 — GROS ŒUVRE</th><td>v2</td><td>1</td></tr>
							<tr><th data-premiere scope="row">03 — CHARPENTE</th><td>v1</td><td>—</td></tr>
						</tbody>
					</Tableau>
				</CadreTableau>
			</Section>

			<Section nom="menus" titre="Menus">
				<BarreOutils>
					<MenuDeroulant id="v-tri" k="Trier par" valeur="ordre" className="self-stretch"
						options={[{ v: 'ordre', t: 'Ordre du chantier' }, { v: 'nom', t: 'Nom' }]} onChoisir={() => {}} />
					<MenuDeroulant id="v-vus" k="Lots affichés" multi largeur="large" className="self-stretch" valeurs={vus}
						libelle={`${vus.length} lot${vus.length > 1 ? 's' : ''}`}
						options={[{ tete: 'Entreprises' }, ...ENTREPRISES, { sep: true }, { v: 'aucune', t: 'Non attribués' }]}
						onChoisir={(v) => setVus((avant) => (avant.includes(v) ? avant.filter((x) => x !== v) : [...avant, v]))} />
					<MenuDeroulant id="v-off" k="Version" valeur="v1" desactive options={[{ v: 'v1', t: 'v1 · 04/03/2026' }]} onChoisir={() => {}} />
				</BarreOutils>
				<div className="flex w-96 max-w-full">
					<MenuDeroulant id="v-ent" k="Attribuée à" largeur="pleine" recherche="Nom, commune…" valeur={entreprise} options={ENTREPRISES} onChoisir={setEntreprise} />
				</div>
			</Section>

			<Section nom="surcouches" titre="Surcouches">
				<Rangee>
					<Bouton onClick={() => setPanneau(true)}>Ouvrir le panneau</Bouton>
					<Bouton variante="danger" onClick={confirmer}>Demander une confirmation</Bouton>
					<Bouton onClick={() => toast(<>Chantier <b>PERRIER — Louisfert</b> marqué terminé.</>)}>Afficher un message</Bouton>
				</Rangee>
			</Section>

			<Panneau ouvert={panneau} surtitre="Lot 02" titre="GROS ŒUVRE" onFermer={() => setPanneau(false)}
				pied={<><Bouton variante="primaire">Générer le marché</Bouton><Bouton variante="danger" onClick={confirmer}>Supprimer le lot</Bouton></>}>
				<Bloc titre="Entreprise" corps="colonne">
					<MenuDeroulant id="v-panneau-ent" k="Attribuée à" largeur="pleine" recherche valeur={entreprise} options={ENTREPRISES} onChoisir={setEntreprise} />
					<CleValeur><Cle>Commune</Cle><Valeur>35640 MARTIGNÉ-FERCHAUD</Valeur></CleValeur>
				</Bloc>
				<Bloc titre="Marché" corps="colonne">
					<CleValeur><Cle>Montant HT</Cle><Valeur chiffres>96 250,00 €</Valeur></CleValeur>
				</Bloc>
			</Panneau>
		</div>
	);
}
