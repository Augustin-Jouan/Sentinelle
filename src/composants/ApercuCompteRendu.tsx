'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	abandonnerBrouillonAction, changerConvocationAction, corrigerCompteRenduAction, enregistrerCompteRenduAction, modifierChampCompteRenduAction,
} from '@/actions/comptesRendus';
import { Button, buttonVariants } from '@/components/ui/button';
import { telecharger } from '@/composants/telecharger';
import { batirCompteRendu, type SaisiesCompteRendu } from '@/documents/compteRendu';
import { CompteRendu, type EditionCompteRendu } from '@/documents/gabarits/CompteRendu';
import { TITRES_TYPES } from '@/documents/libelles';
import { CSS_DOCUMENTS } from '@/documents/styles';
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
	const [saisies, setSaisies] = useState(ouvert.saisies);
	const courant = useRef(ouvert.saisies);
	const [generation, setGeneration] = useState(0);
	const [modifie, setModifie] = useState(false);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const { mode } = ouvert;
	const n = numeroTexte(ouvert.numero);

	function fermer(confirmer = true) {
		if (confirmer && mode === 'correction' && modifie && !window.confirm('Fermer sans enregistrer la correction ?')) return;
		router.replace(chemin, { scroll: false });
	}

	// Un document ouvert bloque le défilement de la page de derrière ; Échap le ferme.
	const fermerRef = useRef(fermer);
	useEffect(() => { fermerRef.current = fermer; });
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermerRef.current(); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, []);

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

	function repartir() {
		if (!window.confirm('Remplacer la coordination par les seuls intitulés des lots ? Le texte saisi sera perdu.')) return;
		surChamp('coordination', coordinationBase(ouvert.source.lots.map((l) => l.designation)));
		setGeneration((g) => g + 1);
	}

	/** La saisie encore ouverte part d'abord : rien n'est perdu. */
	async function attendreSaisies() {
		(document.activeElement as HTMLElement | null)?.blur();
		await Promise.all(enregistrements.current);
	}

	function abandonner() {
		if (!window.confirm('Abandonner ce brouillon ? Son contenu sera perdu.')) return;
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
		<div role="dialog" aria-label={TITRES_TYPES.COMPTE_RENDU} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{entete}</p>
					<p className="font-semibold">{reference}</p>
				</div>
				<div className="ml-auto flex flex-wrap items-center gap-3">
					{mode === 'brouillon' && (
						<>
							<span className="text-xs text-muted-foreground">Chaque champ bleu s&apos;enregistre quand on le quitte — le bleu ne s&apos;imprime pas.</span>
							<Button variant="outline" onClick={repartir} disabled={enCours}>Repartir des lots</Button>
							<Button variant="outline" onClick={abandonner} disabled={enCours}>Abandonner le brouillon</Button>
							<Button onClick={enregistrer} disabled={enCours}>{enCours ? 'Enregistrement…' : `Enregistrer le n° ${n}`}</Button>
						</>
					)}
					{mode === 'correction' && (
						<Button onClick={corriger} disabled={enCours}>{enCours ? 'Génération…' : `Générer la v${(ouvert.derniere?.version ?? 0) + 1}`}</Button>
					)}
					{lecture && ouvert.derniere && (
						<a href={`/api/documents/${ouvert.derniere.documentId}/pdf`} className={buttonVariants({ variant: 'outline' })}>Télécharger le PDF</a>
					)}
					{lecture && ouvert.dernier && (
						<Button variant="outline" onClick={() => router.replace(`${chemin}?corriger-cr=${ouvert.id}`, { scroll: false })}>{`Corriger le n° ${n}`}</Button>
					)}
					<Button variant="outline" onClick={() => fermer()}>Fermer</Button>
				</div>
			</header>
			{ouvert.blocage && <p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{ouvert.blocage}</p>}
			<div className="flex flex-1 flex-col items-center gap-3 overflow-auto overscroll-contain p-7">
				<CompteRendu donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
			</div>
		</div>
	);
}
