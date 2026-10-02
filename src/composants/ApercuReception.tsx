'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { genererReceptionsAction, modifierChampReceptionAction, modifierChampReceptionCommunAction, preparerReceptionsAction } from '@/actions/receptions';
import { Bouton } from '@/composants/briques/Bouton';
import { CadreApercu, NoteApercu } from '@/composants/briques/CadreApercu';
import * as Icone from '@/composants/briques/icones';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { telecharger } from '@/composants/telecharger';
import { ProcesVerbalReception, type EditionReception } from '@/documents/gabarits/ProcesVerbalReception';
import { TITRES_TYPES } from '@/documents/libelles';
import { batirReception, type SaisiesReception } from '@/documents/reception';
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
		<CadreApercu libelle={TITRES_TYPES.PV_RECEPTION} surtitre={TITRES_TYPES.PV_RECEPTION} disposition="solo" onFermer={fermer}
			titre={tous ? `${reference} — ${ouvert.pages.length} lots, une page chacun` : reference}
			aide={ouvert.blocage ? undefined : "Chaque champ bleu s'enregistre aussitôt — le bleu ne s'imprime pas."}
			notes={ouvert.blocage && <NoteApercu>{ouvert.blocage}</NoteApercu>}
			actions={<>
				{ouvert.options.length > 0 && (
					<MenuDeroulant id="pv-lot" k="Procès-verbal pour" valeur={ouvert.cible} recherche largeur="large"
						options={[...ouvert.options.map((o) => ({ v: o.lotId, t: o.libelle, meta: o.entreprise })), { sep: true as const }, { v: TOUS_LES_LOTS, t: 'Tous les lots attribués — une page chacun' }]}
						onChoisir={aller} />
				)}
				<Bouton variante="fantome" onClick={fermer}>Fermer</Bouton>
				{!ouvert.blocage && (
					<Bouton variante="primaire" onClick={generer} enCours={enCours}>
						<Icone.Telecharger />{enCours ? 'Génération…' : tous ? `Générer les ${ouvert.pages.length} PV` : 'Générer le PDF'}
					</Bouton>
				)}
			</>}>
			<div className="pv-pages">
				{ouvert.pages.map((p) => (
					<div key={p.lotId} data-entreprise={p.entreprise}>
						<ProcesVerbalReception donnees={batirReception(p.source, saisies[p.lotId] ?? p.saisies, commun)} mode="edition" edition={edition(p.lotId)} />
					</div>
				))}
			</div>
		</CadreApercu>
	);
}
