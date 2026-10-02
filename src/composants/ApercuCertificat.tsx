'use client';

import type Decimal from 'decimal.js';
import { usePathname, useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ajouterAcompteManuelAction, changerCautionAction, corrigerCertificatAction, genererCertificatAction,
	modifierAcompteManuelAction, supprimerAcompteManuelAction,
} from '@/actions/certificats';
import type { Resultat } from '@/actions/executer';
import { Bouton } from '@/composants/briques/Bouton';
import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
import * as Icone from '@/composants/briques/icones';
import { telecharger } from '@/composants/telecharger';
import { batirCertificat, entreeCalcul } from '@/documents/certificat';
import { CertificatPaiement, type EditionCertificat } from '@/documents/gabarits/CertificatPaiement';
import { TITRES_TYPES } from '@/documents/libelles';
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
			telecharger(`/api/documents/${r.donnees.documentId}/pdf`);
			fermer();
			router.refresh();
		});
	}

	return (
		<CadreApercu libelle={TITRES_TYPES.CERTIFICAT_PAIEMENT} disposition="solo" onFermer={fermer}
			surtitre={acompteId ? `Correction du certificat n° ${donnees.contenu.numero}` : TITRES_TYPES.CERTIFICAT_PAIEMENT} titre={sousTitre}
			aide={lecture ? undefined : "Le cumul réalisé, le mois et la date se saisissent sur la feuille — le bleu ne s'imprime pas."}
			notes={messages.map((m) => <NoteApercu key={m}>{m}</NoteApercu>)}
			actions={<>
				<Bouton variante="fantome" onClick={fermer}>Fermer</Bouton>
				{!lecture && (
					<Bouton variante="primaire" onClick={generer} enCours={enCours} desactive={messages.length > 0 || !lu.cumul}>
						<Icone.Telecharger />{enCours ? 'Génération…' : acompteId ? `Générer la v${(ouvert.derniereVersion ?? 0) + 1}` : 'Générer le PDF'}
					</Bouton>
				)}
			</>}>
			<CertificatPaiement donnees={donnees} mode={lecture ? 'lecture' : 'edition'} edition={lecture ? undefined : edition} />
			{alerte && <NoteApercu>{alerte}</NoteApercu>}
		</CadreApercu>
	);
}
