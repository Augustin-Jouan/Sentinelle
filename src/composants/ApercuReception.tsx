'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { genererReceptionsAction, modifierChampReceptionAction, modifierChampReceptionCommunAction, preparerReceptionsAction } from '@/actions/receptions';
import { Button } from '@/components/ui/button';
import { telecharger } from '@/composants/telecharger';
import { ProcesVerbalReception, type EditionReception } from '@/documents/gabarits/ProcesVerbalReception';
import { TITRES_TYPES } from '@/documents/libelles';
import { batirReception, type SaisiesReception } from '@/documents/reception';
import { CSS_DOCUMENTS } from '@/documents/styles';
import type { ReceptionsOuvertes } from '@/donnees/receptions';
import { bilanReceptions, TOUS_LES_LOTS, type ChampReception } from '@/domaine/reception';

/**
 * Aperçu plein écran du PV (spec § 6) : un lot, ou tous les lots attribués, une page chacun. Chaque champ
 * s'enregistre en base à la saisie (brouillon du lot sous verrou du lot ; champs communs sur le chantier) ;
 * une valeur commune changée sur une page se voit sur toutes.
 */
export function ApercuReception({ ouvert: initial, reference }: { ouvert: ReceptionsOuvertes; reference: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const [ouvert, setOuvert] = useState(initial);
	const [commun, setCommun] = useState(initial.commun);
	const communCourant = useRef(initial.commun);
	const [saisies, setSaisies] = useState<Record<string, SaisiesReception>>(() => Object.fromEntries(initial.pages.map((p) => [p.lotId, p.saisies])));
	const saisiesCourantes = useRef(saisies);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const tous = ouvert.cible === TOUS_LES_LOTS;

	useEffect(() => {
		void preparerReceptionsAction(initial.chantierId, initial.cible).then((r) => {
			if (!r.ok || !r.donnees) return;
			setOuvert(r.donnees);
			communCourant.current = r.donnees.commun;
			setCommun(r.donnees.commun);
			const suivantes = Object.fromEntries(r.donnees.pages.map((p) => [p.lotId, p.saisies]));
			saisiesCourantes.current = suivantes;
			setSaisies(suivantes);
		});
	}, [initial.chantierId, initial.cible]);

	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') router.replace(chemin, { scroll: false }); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, [router, chemin]);

	function suivre(envoi: Promise<unknown>) {
		enregistrements.current.add(envoi);
		void envoi.finally(() => enregistrements.current.delete(envoi));
	}

	function changerLot(lotId: string, suivantes: SaisiesReception) {
		const toutes = { ...saisiesCourantes.current, [lotId]: suivantes };
		saisiesCourantes.current = toutes;
		setSaisies(toutes);
	}

	function changerCommun(suivantes: typeof commun) {
		communCourant.current = suivantes;
		setCommun(suivantes);
	}

	function surChamp(lotId: string, champ: ChampReception, valeur: string) {
		const avant = saisiesCourantes.current[lotId];
		changerLot(lotId, { ...avant, [champ]: valeur });
		suivre(modifierChampReceptionAction(lotId, champ, valeur).then((r) => {
			if (r.ok) return;
			toast.error(r.erreur);
			// Remonter le champ : la clé du gabarit suit la valeur, donc l'ancienne saisie réapparaît.
			changerLot(lotId, { ...saisiesCourantes.current[lotId], [champ]: avant[champ] });
		}));
	}

	const edition = (lotId: string): EditionReception => ({
		saisies: saisies[lotId],
		commun,
		surChamp: (champ, valeur) => surChamp(lotId, champ, valeur),
		surDecision: (decision) => surChamp(lotId, 'decision', decision),
		surCommun: (champ, valeur) => {
			const avant = communCourant.current;
			changerCommun({ ...avant, [champ]: valeur });
			suivre(modifierChampReceptionCommunAction(ouvert.chantierId, champ, valeur).then((r) => {
				if (r.ok) return;
				toast.error(r.erreur);
				changerCommun({ ...communCourant.current, [champ]: avant[champ] });
			}));
		},
	});

	const fermer = () => router.replace(chemin, { scroll: false });

	/** Changer de lot : la saisie quittée en ouvrant le menu part d'abord, la page suivante la relit. */
	function aller(cible: string) {
		(document.activeElement as HTMLElement | null)?.blur();
		void Promise.all(enregistrements.current).then(() => router.replace(`${chemin}?pv=${cible}`, { scroll: false }));
	}

	function generer() {
		demarrer(async () => {
			// La saisie encore ouverte part d'abord : le PDF ne perd jamais une saisie.
			(document.activeElement as HTMLElement | null)?.blur();
			await Promise.all(enregistrements.current);
			// Les pages affichées, et elles seules : un lot attribué depuis l'ouverture n'est pas ajouté.
			const r = await genererReceptionsAction(ouvert.chantierId, ouvert.pages.map((p) => p.lotId));
			if (!r.ok) {
				toast.error(r.erreur);
				// Refus de génération propre à un lot : son id est la clé du champ en erreur ; l'aperçu passe sur lui.
				const enCause = Object.keys(r.champs ?? {}).find((cle) => ouvert.pages.some((p) => p.lotId === cle));
				if (tous && enCause) aller(enCause);
				return;
			}
			const resultats = r.donnees;
			if (tous) {
				const generes = resultats.filter((x) => x.nouvelle).length;
				toast.success(bilanReceptions(generes, resultats.length - generes));
				telecharger(`/api/chantiers/${ouvert.chantierId}/receptions-pdf?documents=${resultats.map((x) => x.documentId).join(',')}`);
			} else {
				const [x] = resultats;
				toast.success(x.nouvelle ? `PV de réception généré — ${x.entreprise}.` : `Rien n'a changé depuis la version ${x.version} : elle est téléchargée.`);
				telecharger(`/api/documents/${x.documentId}/pdf`);
			}
			fermer();
			router.refresh();
		});
	}

	return (
		<div role="dialog" aria-label={TITRES_TYPES.PV_RECEPTION} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{TITRES_TYPES.PV_RECEPTION}</p>
					<p className="font-semibold">{tous ? `${reference} — ${ouvert.pages.length} lots, une page chacun` : reference}</p>
				</div>
				{ouvert.options.length > 0 && (
					<label className="flex items-center gap-2 text-sm">
						<span className="text-muted-foreground">Procès-verbal pour</span>
						<select aria-label="Procès-verbal pour" value={ouvert.cible} className="rounded-md border bg-background px-2 py-1"
							onChange={(e) => aller(e.target.value)}>
							{ouvert.options.map((o) => <option key={o.lotId} value={o.lotId}>{`${o.libelle} — ${o.entreprise}`}</option>)}
							<option value={TOUS_LES_LOTS}>Tous les lots attribués — une page chacun</option>
						</select>
					</label>
				)}
				<div className="ml-auto flex items-center gap-3">
					{!ouvert.blocage && (
						<>
							<span className="text-xs text-muted-foreground">Chaque champ bleu s&apos;enregistre aussitôt — le bleu ne s&apos;imprime pas.</span>
							<Button onClick={generer} disabled={enCours}>
								{enCours ? 'Génération…' : tous ? `Générer les ${ouvert.pages.length} PV` : 'Générer le PDF'}
							</Button>
						</>
					)}
					<Button variant="outline" onClick={fermer}>Fermer</Button>
				</div>
			</header>
			{ouvert.blocage && <p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{ouvert.blocage}</p>}
			<div className="pv-pages flex-1 overflow-auto overscroll-contain p-7">
				{ouvert.pages.map((p) => (
					<div key={p.lotId} data-entreprise={p.entreprise}>
						<ProcesVerbalReception donnees={batirReception(p.source, saisies[p.lotId] ?? p.saisies, commun)} mode="edition" edition={edition(p.lotId)} />
					</div>
				))}
			</div>
		</div>
	);
}
