'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Resultat } from '@/actions/executer';
import {
	ajouterFermetureAction, changerCouleurLotAction, creerPeriodeAction, deplacerPeriodesAction, lierPeriodeAction,
	modifierFermetureAction, modifierPeriodeAction, supprimerFermetureAction, supprimerPeriodesAction,
} from '@/actions/planning';
import { Bouton } from '@/composants/briques/Bouton';
import { useConfirmation } from '@/composants/briques/Confirmation';
import { Ecran } from '@/composants/briques/Ecran';
import * as Icone from '@/composants/briques/icones';
import * as regles from '@/domaine/planning';
import { appliquerPeriodes, etendueDuPlanning, isoRang, periodesDuPlanning, rangIso, type PlanningVue, type ReponsePlanning } from '@/domaine/planningVue';
import type { ChampFermeture, ChampPeriode } from '@/donnees/planning';
import { BarreOutilsPlanning } from './BarreOutilsPlanning';
import { FenetreFermetures } from './FenetreFermetures';
import { DENSITES, resume } from './geometrie';
import { GrillePlanning } from './GrillePlanning';
import { PanneauLotPlanning } from './PanneauLotPlanning';
import { usePreferencesPlanning } from './preferences';
import { useClavier } from './useClavier';
import { creerFileActions, ID_PERIODE_TEMPORAIRE } from './fileActions';
import { appliquerPositions, useGestes } from './useGestes';

type Appel = () => Promise<Resultat<ReponsePlanning>>;

/**
 * Écran Planning. Un geste s'affiche aussitôt, calculé par les règles du domaine, puis part au serveur
 * comme une intention ; la réponse (le planning relu en base) remplace l'état, changements des collègues compris.
 */
export function Planning({ planningInitial, aujourdhui, contexte }: { planningInitial: PlanningVue; aujourdhui: string; contexte: React.ReactNode }) {
	const router = useRouter();
	// Un planning neuf venu du serveur (rafraîchissement de la page) remplace l'état.
	const [recu, setRecu] = useState(planningInitial);
	const [planning, setPlanning] = useState(planningInitial);
	if (planningInitial !== recu) {
		setRecu(planningInitial);
		setPlanning(planningInitial);
	}
	/** Dernier planning renvoyé par le serveur : l'état y revient quand une action échoue. */
	const serveur = useRef(planningInitial);
	useEffect(() => { serveur.current = recu; }, [recu]);

	const [selection, setSelection] = useState<string[]>([]);
	const [principale, setPrincipale] = useState<string | null>(null);
	const [panneauLot, setPanneauLot] = useState<string | null>(null);
	const [fermeturesOuvertes, setFermeturesOuvertes] = useState(false);
	const confirmer = useConfirmation();
	const { preferences, masques, changerPreferences, basculerLot, toutAfficher } = usePreferencesPlanning(planning.chantierId);

	const periodes = useMemo(() => periodesDuPlanning(planning), [planning]);
	const e = useMemo(() => etendueDuPlanning(planning, aujourdhui), [planning, aujourdhui]);
	const w = DENSITES[preferences.densite];
	const existantes = new Set(periodes.map((x) => x.id));
	/** La sélection, sans les périodes supprimées entre-temps. */
	const choisies = selection.filter((id) => existantes.has(id));
	const nbAffichees = planning.lots.filter((l) => !masques.includes(l.id)).reduce((n, l) => n + l.periodes.length, 0);
	const rangAujourdhui = rangIso(aujourdhui);
	const enFile = useRef(creerFileActions()).current;

	async function envoyer(local: PlanningVue | null, appel: Appel, silencieux = false): Promise<Resultat<ReponsePlanning>> {
		if (local) setPlanning(local);
		return enFile(async () => {
			const r = await appel();
			if (r.ok) {
				serveur.current = r.donnees.planning;
				setPlanning(r.donnees.planning);
				if (r.donnees.message) toast(r.donnees.message);
			} else {
				setPlanning(serveur.current);
				if (!silencieux) toast.error(r.erreur);
				router.refresh();
			}
			return r;
		});
	}

	/** Le résultat d'un geste par la règle du domaine ; null si elle le refuse (le serveur dira pourquoi). */
	function calculer(operation: (p: regles.PeriodePlan[]) => regles.ResultatPlan): PlanningVue | null {
		try {
			return appliquerPeriodes(planning, operation(periodes).periodes);
		} catch {
			return null;
		}
	}

	function selectionner(ids: string[], principal: string | null = ids[ids.length - 1] ?? null) {
		setSelection(ids);
		setPrincipale(principal);
	}

	function basculer(id: string) {
		selectionner(choisies.includes(id) ? choisies.filter((x) => x !== id) : [...choisies, id]);
	}

	function tracer(lotId: string, debut: number, duree: number) {
		const local = calculer((p) => regles.creerPeriode(p, { id: ID_PERIODE_TEMPORAIRE, lotId, intitule: '', debut, duree, dependDeId: null }));
		void envoyer(local, () => creerPeriodeAction(lotId, isoRang(debut), duree)).then((r) => {
			if (!r.ok || !r.donnees.periodeId) return;
			selectionner([r.donnees.periodeId]);
			setPanneauLot(lotId);
		});
	}

	/** Déplacement seul, en groupe ou aux flèches : des débuts absolus, recalés et cascadés par le domaine. */
	function deplacer(mouvements: { id: string; debut: number }[]) {
		void envoyer(
			calculer((p) => regles.deplacerPeriodes(p, mouvements)),
			() => deplacerPeriodesAction(planning.chantierId, mouvements.map((m) => ({ id: m.id, debut: isoRang(m.debut) }))),
		);
	}

	function allonger(id: string, duree: number) {
		void envoyer(calculer((p) => regles.modifierPeriode(p, id, { duree })), () => modifierPeriodeAction(id, 'duree', String(duree)));
	}

	function decalerSelection(semaines: number) {
		deplacer(periodes.filter((x) => choisies.includes(x.id)).map((x) => ({ id: x.id, debut: x.debut + semaines })));
	}

	function supprimer(ids: string[]) {
		selectionner(choisies.filter((x) => !ids.includes(x)));
		void envoyer(calculer((p) => regles.supprimerPeriodes(p, ids)), () => supprimerPeriodesAction(planning.chantierId, ids));
	}

	/** Bouton « Ajouter » du panneau : une semaine après la dernière période du lot, ou au début de l'axe. */
	function ajouterPeriode(lotId: string) {
		const duLot = periodes.filter((x) => x.lotId === lotId);
		tracer(lotId, duLot.length ? Math.max(...duLot.map(regles.finPeriode)) + 1 : e.debut, 1);
	}

	const modifierPeriode = (id: string, champ: ChampPeriode, valeur: string) =>
		envoyer(null, () => modifierPeriodeAction(id, champ, valeur), true);
	const lier = (id: string, dependDeId: string | null) =>
		void envoyer(calculer((p) => regles.lierPeriode(p, id, dependDeId)), () => lierPeriodeAction(id, dependDeId));
	const changerCouleur = (lotId: string, couleur: string) => void envoyer(
		{ ...planning, lots: planning.lots.map((l) => (l.id === lotId ? { ...l, couleur } : l)) },
		() => changerCouleurLotAction(lotId, couleur),
	);
	const ajouterFermeture = () => void envoyer(null, () => ajouterFermetureAction(planning.chantierId));
	const modifierFermeture = (id: string, champ: ChampFermeture, valeur: string) =>
		envoyer(null, () => modifierFermetureAction(id, champ, valeur), true);
	const supprimerFermeture = (id: string) => void envoyer(
		{ ...planning, fermetures: planning.fermetures.filter((f) => f.id !== id) },
		() => supprimerFermetureAction(id),
	);

	const cadre = useRef<HTMLDivElement>(null);
	/** Rang de la semaine au bord gauche de la vue : il tient quand l'axe s'allonge ou que la densité change. */
	const ancre = useRef<number | null>(null);

	// À l'ouverture : la semaine en cours si elle est dans l'axe, sinon la première période.
	useLayoutEffect(() => {
		const g = cadre.current;
		if (!g) return;
		const premiere = periodes.length ? Math.min(...periodes.map((x) => x.debut)) : null;
		const cible = rangAujourdhui >= e.debut && rangAujourdhui <= e.fin ? rangAujourdhui : premiere;
		if (cible !== null) g.scrollLeft = Math.max(0, (cible - e.debut) * w - 200);
		ancre.current = e.debut + g.scrollLeft / w;
		// Une seule fois, à l'ouverture de l'écran.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Après un nouvel axe ou une nouvelle densité, la même semaine reste au bord gauche : la vue ne revient jamais au début.
	useLayoutEffect(() => {
		const g = cadre.current;
		if (g && ancre.current !== null) g.scrollLeft = (ancre.current - e.debut) * w;
	}, [e.debut, w]);

	function surDefilement() {
		if (cadre.current) ancre.current = e.debut + cadre.current.scrollLeft / w;
	}

	function allerAujourdhui() {
		if (rangAujourdhui < e.debut || rangAujourdhui > e.fin) {
			toast('La semaine en cours est hors du planning.');
			return;
		}
		if (cadre.current) cadre.current.scrollLeft = Math.max(0, (rangAujourdhui - e.debut) * w - 200);
	}

	const { rendu, onPointerDown } = useGestes({
		outil: preferences.outil, debutAxe: e.debut, w,
		periodes: periodes.filter((x) => x.id !== ID_PERIODE_TEMPORAIRE),
		selection: choisies.filter((id) => id !== ID_PERIODE_TEMPORAIRE), cadre,
		onSelection: selectionner, onBasculer: basculer, onOuvrirLot: setPanneauLot,
		onTracer: tracer, onDeplacer: deplacer, onAllonger: allonger,
	});
	useClavier({
		nbSelection: choisies.length,
		panneauOuvert: panneauLot !== null,
		onDecaler: decalerSelection,
		onSupprimer: () => {
			if (choisies.length === 1) { supprimer(choisies); return; }
			const ids = choisies;
			void confirmer({ texte: `Supprimer les ${ids.length} périodes sélectionnées ?`, libelle: 'Supprimer', dangereux: true })
				.then((oui) => { if (oui) supprimer(ids); });
		},
		onVider: () => selectionner([]),
	});

	// Pendant un glisser, la grille montre les positions du geste ; l'axe reste celui du planning.
	const affiche = rendu.positions ? appliquerPositions(planning, rendu.positions) : planning;
	const lotsAffiches = affiche.lots.filter((l) => !masques.includes(l.id));
	const lotOuvert = planning.lots.find((l) => l.id === panneauLot) ?? null;

	return (
		<Ecran
			titre="Planning des travaux"
			actions={<>
				<Bouton onClick={() => setFermeturesOuvertes(true)}><Icone.Calendrier />Fermetures</Bouton>
				<Bouton href="?apercu=visa" scroll={false}><Icone.Visa />Feuille de visa</Bouton>
				<Bouton variante="primaire" href="?apercu=planning" scroll={false}><Icone.Imprimer />Planning imprimable</Bouton>
			</>}
			contexte={contexte}
		>
			<BarreOutilsPlanning
				resume={resume(nbAffichees, periodes.length, e.debut, e.fin)}
				nbSelection={choisies.length}
				onDeselectionner={() => selectionner([])}
				lots={planning.lots}
				masques={masques}
				onBasculerLot={basculerLot}
				onToutAfficher={toutAfficher}
				outil={preferences.outil}
				onOutil={(outil) => changerPreferences({ ...preferences, outil })}
				densite={preferences.densite}
				onDensite={(densite) => changerPreferences({ ...preferences, densite })}
				onAujourdhui={allerAujourdhui}
			/>
			<GrillePlanning
				cadre={cadre}
				onScroll={surDefilement}
				planning={affiche}
				lotsAffiches={lotsAffiches}
				debutAxe={e.debut}
				nbSemaines={e.nb}
				w={w}
				rangAujourdhui={rangAujourdhui}
				selection={rendu.lassoIds ?? choisies}
				outil={preferences.outil}
				onOuvrirLot={setPanneauLot}
				onToutAfficher={toutAfficher}
				saisi={rendu.saisi}
				fantome={rendu.fantome}
				onPointerDown={onPointerDown}
			/>
			{rendu.lasso && <div className="g-lasso" style={rendu.lasso} />}
			{rendu.pastille && <div className="g-chip" style={{ left: rendu.pastille.x, top: rendu.pastille.y }}>{rendu.pastille.texte}</div>}
			<PanneauLotPlanning
				lot={lotOuvert}
				planning={planning}
				principale={principale}
				onFermer={() => setPanneauLot(null)}
				onCouleur={(couleur) => { if (lotOuvert) changerCouleur(lotOuvert.id, couleur); }}
				onModifier={modifierPeriode}
				onLier={lier}
				onSupprimer={(id) => supprimer([id])}
				onAjouter={() => { if (lotOuvert) ajouterPeriode(lotOuvert.id); }}
			/>
			<FenetreFermetures
				ouverte={fermeturesOuvertes}
				onFermer={() => setFermeturesOuvertes(false)}
				fermetures={planning.fermetures}
				onAjouter={ajouterFermeture}
				onModifier={modifierFermeture}
				onSupprimer={supprimerFermeture}
			/>
		</Ecran>
	);
}
