'use client';

import type Decimal from 'decimal.js';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ajouterAcompteManuelAction, changerCautionAction, corrigerCertificatAction, genererCertificatAction,
	modifierAcompteManuelAction, supprimerAcompteManuelAction,
} from '@/actions/certificats';
import type { Resultat } from '@/actions/executer';
import { Button } from '@/components/ui/button';
import { batirCertificat, entreeCalcul } from '@/documents/certificat';
import { CertificatPaiement, type EditionCertificat } from '@/documents/gabarits/CertificatPaiement';
import { TITRES_TYPES } from '@/documents/libelles';
import { CSS_DOCUMENTS } from '@/documents/styles';
import type { CertificatOuvert } from '@/donnees/acomptes';
import { alerteCertificat, calculerCertificat, lireCumul, PRESENT_NON_POSITIF } from '@/domaine/certificats';
import { ErreurMetier } from '@/domaine/erreurs';

/** Le cumul tel que le serveur le lira : nul tant qu'il est vide, message s'il est illisible. */
function lireSaisieCumul(texte: string): { cumul: Decimal | null; erreur: string | null } {
	if (!texte.trim()) return { cumul: null, erreur: null };
	try {
		return { cumul: lireCumul(texte), erreur: null };
	} catch (e) {
		if (e instanceof ErreurMetier) return { cumul: null, erreur: e.message };
		throw e;
	}
}

/** Téléchargement sans quitter la page (l'aperçu se ferme juste après). */
function telecharger(documentId: string) {
	const lien = document.createElement('a');
	lien.href = `/api/documents/${documentId}/pdf`;
	lien.download = '';
	lien.click();
}

/**
 * Aperçu plein écran du certificat (spec § 6) : la feuille se recalcule à la frappe avec les règles du domaine ;
 * seules les saisies partent au serveur, qui recalcule tout. Cumul, mois et date vivent ici et se perdent à la
 * fermeture ; la caution et les acomptes antérieurs sont des données du lot, enregistrées aussitôt.
 */
export function ApercuCertificat({ ouvert, sousTitre }: { ouvert: CertificatOuvert; sousTitre: string }) {
	const router = useRouter();
	const chemin = usePathname();
	const [cumul, setCumul] = useState(ouvert.saisies.cumul);
	const [mois, setMois] = useState(ouvert.saisies.mois);
	const [date, setDate] = useState(ouvert.saisies.date);
	const [enCours, demarrer] = useTransition();
	const enregistrements = useRef(new Set<Promise<unknown>>());

	// Un document ouvert bloque le défilement de la page de derrière ; Échap le ferme.
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

	const { source, acompteId, blocage } = ouvert;
	// Un certificat qui n'est plus le dernier s'ouvre tel quel, sans saisie.
	const lecture = acompteId !== null && blocage !== null;
	const lu = lireSaisieCumul(cumul);
	const calcul = lu.cumul ? calculerCertificat(entreeCalcul(source, lu.cumul)) : null;
	const donnees = batirCertificat(source, { cumul: lu.cumul, mois, date }, { ligneAjout: ouvert.acomptesManuels !== null });
	const messages = [blocage, lu.erreur, calcul && !calcul.presentHt.greaterThan(0) ? PRESENT_NON_POSITIF : null]
		.filter((m): m is string => m !== null);
	const alerte = calcul ? alerteCertificat(calcul) : null;

	function enregistrer(envoi: Promise<Resultat>) {
		const suivi = envoi.then((r) => {
			if (r.ok) router.refresh();
			else toast.error(r.erreur);
		});
		enregistrements.current.add(suivi);
		void suivi.finally(() => enregistrements.current.delete(suivi));
	}

	const edition: EditionCertificat = {
		cumul, mois, date,
		acomptes: ouvert.acomptesManuels,
		surCumul: setCumul,
		surMois: setMois,
		surDate: setDate,
		surCaution: () => enregistrer(changerCautionAction(ouvert.lotId, !source.lot.caution)),
		surAcompte: (id, texte) => enregistrer(
			id === null ? ajouterAcompteManuelAction(ouvert.lotId, texte)
				: texte.trim() ? modifierAcompteManuelAction(id, texte) : supprimerAcompteManuelAction(id),
		),
	};

	function fermer() {
		router.replace(chemin, { scroll: false });
	}

	function generer() {
		demarrer(async () => {
			// Un acompte antérieur ou la caution en cours d'enregistrement changent la feuille : on la laisse se mettre à jour.
			if (enregistrements.current.size) {
				await Promise.all(enregistrements.current);
				toast.info('Enregistré : vérifiez la feuille, puis générez-la.');
				return;
			}
			const saisies = { cumul, mois, date };
			const r = acompteId
				? await corrigerCertificatAction(acompteId, saisies)
				: await genererCertificatAction(ouvert.lotId, { ...saisies, numeroAttendu: source.numero });
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			telecharger(r.donnees.documentId);
			fermer();
			router.refresh();
		});
	}

	return (
		<div role="dialog" aria-label={TITRES_TYPES.CERTIFICAT_PAIEMENT} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">
						{acompteId ? `Correction du certificat n° ${donnees.contenu.numero}` : TITRES_TYPES.CERTIFICAT_PAIEMENT}
					</p>
					<p className="font-semibold">{sousTitre}</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					{!lecture && (
						<>
							<span className="text-xs text-muted-foreground">Le cumul réalisé, le mois et la date se saisissent sur la feuille — le bleu ne s&apos;imprime pas.</span>
							<Button onClick={generer} disabled={enCours || messages.length > 0 || !lu.cumul}>
								{enCours ? 'Génération…' : acompteId ? `Générer la v${(ouvert.derniereVersion ?? 0) + 1}` : 'Générer le PDF'}
							</Button>
						</>
					)}
					<Button variant="outline" onClick={fermer}>Fermer</Button>
				</div>
			</header>
			{messages.map((m) => <p key={m} role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">{m}</p>)}
			<div className="flex flex-1 flex-col items-center gap-3 overflow-auto overscroll-contain p-7">
				<CertificatPaiement donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
				{alerte && <p role="note" className="rounded-md border border-destructive bg-destructive-soft px-3 py-2 text-sm text-destructive">{alerte}</p>}
			</div>
		</div>
	);
}
