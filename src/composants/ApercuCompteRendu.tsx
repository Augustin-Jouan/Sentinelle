'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	abandonnerBrouillonAction, changerConvocationAction, corrigerCompteRenduAction, enregistrerCompteRenduAction, modifierChampCompteRenduAction,
} from '@/actions/comptesRendus';
import { CadreApercu } from '@/composants/briques/CadreApercu';
import { useConfirmation } from '@/composants/briques/Confirmation';
import * as Icone from '@/composants/briques/icones';
import { telecharger } from '@/composants/telecharger';
import { batirCompteRendu, type SaisiesCompteRendu } from '@/documents/compteRendu';
import { CompteRendu, type EditionCompteRendu } from '@/documents/gabarits/CompteRendu';
import { TITRES_TYPES } from '@/documents/libelles';
import type { CompteRenduOuvert } from '@/donnees/comptesRendus';
import { convocationSuivante, coordinationBase, numeroTexte, type ChampCompteRendu } from '@/domaine/compteRendu';

/**
 * Aperçu plein écran du compte rendu (spec § 5).
 * - brouillon : chaque champ s'enregistre en base quand on le quitte (partagé avec les collègues) ;
 * - correction : les saisies vivent ici jusqu'à « Générer la vN » ; fermer après une modification demande confirmation ;
 * - lecture : la feuille figée de la dernière version.
 * `courant` double l'état : le clic sur un bouton suit la sortie du champ dans le même geste, avant le rendu suivant.
 */
export function ApercuCompteRendu({ ouvert, reference }: { ouvert: CompteRenduOuvert; reference: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const confirmer = useConfirmation();
	const [saisies, setSaisies] = useState(ouvert.saisies);
	const courant = useRef(ouvert.saisies);
	const [generation, setGeneration] = useState(0);
	const [modifie, setModifie] = useState(false);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const { mode } = ouvert;
	const n = numeroTexte(ouvert.numero);

	async function fermer(confirmerSortie = true) {
		if (confirmerSortie && mode === 'correction' && modifie
			&& !(await confirmer({ texte: 'Fermer sans enregistrer la correction ?', libelle: 'Fermer' }))) return;
		router.replace(chemin, { scroll: false });
	}

	function changer(suivantes: SaisiesCompteRendu) {
		courant.current = suivantes;
		setSaisies(suivantes);
	}

	function suivre<T>(envoi: Promise<T>) {
		enregistrements.current.add(envoi);
		void envoi.finally(() => enregistrements.current.delete(envoi));
	}

	function surChamp(champ: ChampCompteRendu, valeur: string) {
		const avant = courant.current;
		// Vider la date du rendez-vous efface son heure (la base refuserait une heure sans date).
		changer({ ...avant, [champ]: valeur, ...(champ === 'rdvDate' && !valeur ? { rdvHeure: '' } : {}) });
		if (mode === 'correction') {
			setModifie(true);
			return;
		}
		suivre(modifierChampCompteRenduAction(ouvert.id, champ, valeur).then((r) => {
			if (r.ok) return;
			toast.error(r.erreur);
			// L'écran ne doit pas garder une valeur refusée : la base a l'ancienne, « Enregistrer » la relirait.
			changer({ ...courant.current, [champ]: avant[champ], ...(champ === 'rdvDate' ? { rdvHeure: avant.rdvHeure } : {}) });
			setGeneration((g) => g + 1);
		}));
	}

	function surConvocation(lotId: string) {
		if (mode === 'correction') {
			const c = courant.current.convocations;
			changer({ ...courant.current, convocations: { ...c, [lotId]: convocationSuivante(c[lotId]) } });
			setModifie(true);
			return;
		}
		suivre(changerConvocationAction(ouvert.id, lotId).then((r) => {
			if (r.ok) changer({ ...courant.current, convocations: r.donnees });
			else toast.error(r.erreur);
		}));
	}

	async function repartir() {
		if (!(await confirmer({ texte: 'Remplacer la coordination par les seuls intitulés des lots ? Le texte saisi sera perdu.', libelle: 'Repartir des lots', dangereux: true }))) return;
		surChamp('coordination', coordinationBase(ouvert.source.lots.map((l) => l.designation)));
		setGeneration((g) => g + 1);
	}

	/** La saisie encore ouverte part d'abord : rien n'est perdu. */
	async function attendreSaisies() {
		(document.activeElement as HTMLElement | null)?.blur();
		await Promise.all(enregistrements.current);
	}

	async function abandonner() {
		if (!(await confirmer({ texte: 'Abandonner ce brouillon ? Son contenu sera perdu.', libelle: 'Abandonner', dangereux: true }))) return;
		demarrer(async () => {
			await attendreSaisies();
			const r = await abandonnerBrouillonAction(ouvert.id);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			fermer(false);
			router.refresh();
		});
	}

	function enregistrer() {
		demarrer(async () => {
			await attendreSaisies();
			const r = await enregistrerCompteRenduAction(ouvert.id);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			const { documentId, numero } = r.donnees;
			toast.success(`Compte rendu n° ${numeroTexte(numero)} enregistré.`, {
				duration: 15_000,
				action: { label: 'Télécharger le PDF', onClick: () => telecharger(`/api/documents/${documentId}/pdf`) },
			});
			fermer(false);
			router.refresh();
		});
	}

	function corriger() {
		demarrer(async () => {
			await attendreSaisies();
			const r = await corrigerCompteRenduAction(ouvert.id, courant.current);
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			// Libellés du certificat (écart assumé) : la spec § 5 ne fixe que « Rien n'a changé depuis la version N ».
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			telecharger(`/api/documents/${r.donnees.documentId}/pdf`);
			fermer(false);
			router.refresh();
		});
	}

	const lecture = mode === 'lecture';
	const donnees = lecture && ouvert.fige ? ouvert.fige : batirCompteRendu(ouvert.source, saisies);
	const edition: EditionCompteRendu = { saisies, generation, surChamp, surConvocation };
	const entete = mode === 'brouillon' ? `Brouillon n° ${n}` : mode === 'correction' ? `Correction du n° ${n}`
		: `N° ${n}${ouvert.derniere ? ` — version ${ouvert.derniere.version}` : ''}`;

	return (
		<CadreApercu libelle={TITRES_TYPES.COMPTE_RENDU} surtitre={entete} titre={reference} disposition="solo" onFermer={() => void fermer()}
			aide={mode === 'brouillon' ? "Écrivez directement dans les zones bleues — le bleu ne s'imprime pas." : undefined}
			notes={ouvert.blocage && <p role="note" className="gen-note">{ouvert.blocage}</p>}
			actions={<>
				<button type="button" className="btn btn-ghost" onClick={() => void fermer()}>Fermer</button>
				{mode === 'brouillon' && (
					<>
						<button type="button" className="btn" onClick={repartir} disabled={enCours} title="Remplacer la coordination par les seuls intitulés des lots">Repartir des lots</button>
						<button type="button" className="btn" onClick={abandonner} disabled={enCours}>Abandonner le brouillon</button>
						<button type="button" className="btn btn-primary" onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</button>
					</>
				)}
				{mode === 'correction' && (
					<button type="button" className="btn btn-primary" onClick={corriger} disabled={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</button>
				)}
				{lecture && ouvert.dernier && (
					<button type="button" className="btn" onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</button>
				)}
				{lecture && ouvert.derniere && (
					<a className="btn btn-primary" href={`/api/documents/${ouvert.derniere.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
				)}
			</>}>
			<CompteRendu donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
		</CadreApercu>
	);
}
