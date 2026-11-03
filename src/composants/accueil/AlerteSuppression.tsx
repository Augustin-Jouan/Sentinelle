'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, Erreur, Saisie } from '@/composants/briques/Champ';
import { cx } from '@/composants/briques/cx';
import { SURTITRE } from '@/composants/briques/typo';
import { dateDuJourTexte } from '@/domaine/regles';
import {
	decompteSuppression, phraseCorrespond, phraseSuppression,
	type DocumentSuppression, type ResumeSuppression,
} from '@/domaine/suppression';
import { LIBELLES_TYPES, type TypeDocument } from '@/documents/libelles';

export type EtatAlerteSuppression = 'chargement' | 'erreur-lecture' | 'pret' | 'erreur-suppression';

type ResultatLecture = { ok: true; donnees: ResumeSuppression } | { ok: false; erreur: string };
type ResultatSuppression = { ok: true; donnees: null } | { ok: false; erreur: string };

function groupesDocuments(documents: DocumentSuppression[]): { type: TypeDocument; libelle: string; documents: DocumentSuppression[] }[] {
	const parType = new Map<TypeDocument, DocumentSuppression[]>();
	for (const doc of documents) {
		const liste = parType.get(doc.type);
		if (liste) liste.push(doc);
		else parType.set(doc.type, [doc]);
	}
	const groupes: { type: TypeDocument; libelle: string; documents: DocumentSuppression[] }[] = [];
	for (const type of Object.keys(LIBELLES_TYPES) as TypeDocument[]) {
		const liste = parType.get(type);
		if (liste) groupes.push({ type, libelle: LIBELLES_TYPES[type], documents: liste });
	}
	return groupes;
}

/** Présentation de l'alerte : décompte, liste, consigne, boutons. */
export function ContenuSuppression({ chantierId, reference, resume, saisie, etat, messageErreur, enCours, champRef, onSaisie, onAnnuler, onConfirmer }: {
	chantierId: string;
	reference: string;
	resume: ResumeSuppression | null;
	saisie: string;
	etat: EtatAlerteSuppression;
	messageErreur?: string;
	enCours?: boolean;
	champRef?: React.Ref<HTMLInputElement>;
	onSaisie: (valeur: string) => void;
	onAnnuler: () => void;
	onConfirmer: () => void;
}) {
	const phrase = phraseSuppression(reference);
	const lectureOk = etat === 'pret' || etat === 'erreur-suppression';
	const peutSupprimer = lectureOk && resume !== null && phraseCorrespond(saisie, reference);
	const lignes = resume ? decompteSuppression(resume) : [];
	const avecDocuments = (resume?.documents.length ?? 0) > 0;

	function soumettre(e: React.FormEvent) {
		e.preventDefault();
		if (peutSupprimer) onConfirmer();
	}

	return (
		<form onSubmit={soumettre} className="flex min-h-0 flex-1 flex-col">
			<h2 id={`suppression-titre-${chantierId}`} className="font-titre text-17 font-semibold">Supprimer {reference}</h2>
			<p className="mt-1.5 text-13 text-muted">La suppression est définitive et ne peut pas être annulée.</p>
			<div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
				{etat === 'chargement' && <p className="text-13 text-muted">Chargement…</p>}
				{etat === 'erreur-lecture' && messageErreur && <Erreur alerte>{messageErreur}</Erreur>}
				{lectureOk && resume && (
					<>
						{avecDocuments ? (
							<ul className="m-0 list-none p-0 text-13 leading-normal">
								{lignes.map((ligne) => <li key={ligne}>{ligne}</li>)}
							</ul>
						) : (
							<>
								<p className="m-0 text-13">Aucun document généré.</p>
								{lignes.length > 0 && (
									<ul className="mt-2 list-none p-0 text-13 leading-normal">
										{lignes.map((ligne) => <li key={ligne}>{ligne}</li>)}
									</ul>
								)}
							</>
						)}
						{avecDocuments && (
							<details className="mt-3 rounded-sm border border-rule bg-surface">
								<summary className="cursor-pointer px-3 py-2 text-13">Liste détaillée</summary>
								<div className="max-h-40 overflow-y-auto overscroll-contain border-t border-rule px-3 py-2">
									{groupesDocuments(resume.documents).map((groupe) => (
										<div key={groupe.type} className="mb-2.5 last:mb-0">
											<div className={cx(SURTITRE, 'mb-1')}>{groupe.libelle}</div>
											<ul className="m-0 list-none p-0">
												{groupe.documents.map((d) => (
													<li key={d.id} className="break-all font-mono text-12 text-ink-2">
														{d.nomFichier} · v{d.version} · {dateDuJourTexte(new Date(d.creeLe))}
													</li>
												))}
											</ul>
										</div>
									))}
								</div>
							</details>
						)}
						{avecDocuments && (
							<p className="mt-3">
								<Bouton natif href={`/api/chantiers/${chantierId}/archive`} download>
									Télécharger l&apos;archive avant de supprimer
								</Bouton>
							</p>
						)}
					</>
				)}
				{etat === 'erreur-suppression' && messageErreur && (
					<div className="mt-3"><Erreur alerte>{messageErreur}</Erreur></div>
				)}
			</div>
			<Champ className="mt-4" libelle={`Pour confirmer, tapez : ${phrase}`} pour="phrase-suppression">
				<Saisie ref={champRef} id="phrase-suppression" value={saisie} autoComplete="off" autoCorrect="off" spellCheck={false}
					onChange={(e) => onSaisie(e.target.value)} />
			</Champ>
			<div className="mt-4 flex justify-end gap-2">
				<Bouton onClick={onAnnuler}>Annuler</Bouton>
				<Bouton type="submit" variante="danger" desactive={!peutSupprimer} enCours={enCours}>Supprimer</Bouton>
			</div>
		</form>
	);
}

/** Alerte de suppression définitive : même surcouche que Confirmation. */
export function AlerteSuppression({ id, reference, onFermer, lireResume, supprimer }: {
	id: string;
	reference: string;
	onFermer: () => void;
	lireResume: (id: string) => Promise<ResultatLecture>;
	supprimer: (id: string, phrase: string, documentsAttendus: string[]) => Promise<ResultatSuppression>;
}) {
	const [saisie, setSaisie] = useState('');
	const [resume, setResume] = useState<ResumeSuppression | null>(null);
	const [etat, setEtat] = useState<EtatAlerteSuppression>('chargement');
	const [messageErreur, setMessageErreur] = useState('');
	const [enCours, demarrer] = useTransition();
	const champ = useRef<HTMLInputElement>(null);
	const onFermerRef = useRef(onFermer);
	useEffect(() => { onFermerRef.current = onFermer; });

	useEffect(() => {
		champ.current?.focus();
		const touche = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { e.stopPropagation(); onFermerRef.current(); }
		};
		window.addEventListener('keydown', touche, true);
		return () => window.removeEventListener('keydown', touche, true);
	}, []);

	useEffect(() => {
		let ignore = false;
		void lireResume(id).then((r) => {
			if (ignore) return;
			if (!r.ok) {
				setEtat('erreur-lecture');
				setMessageErreur(r.erreur);
				return;
			}
			setResume(r.donnees);
			setEtat('pret');
		});
		return () => { ignore = true; };
	}, [id, lireResume]);

	function confirmer() {
		if (!resume || !phraseCorrespond(saisie, reference)) return;
		demarrer(async () => {
			const r = await supprimer(id, saisie, resume.documents.map((d) => d.id));
			if (!r.ok) {
				setEtat('erreur-suppression');
				setMessageErreur(r.erreur);
				return;
			}
			onFermerRef.current();
			toast(<><b>{reference}</b> supprimé.</>);
		});
	}

	return (
		<div role="alertdialog" aria-modal="true" aria-labelledby={`suppression-titre-${id}`} aria-busy={etat === 'chargement' || enCours || undefined}
			data-surcouche="confirmation" data-ouvert="" data-verrou-defilement="" data-bloque-clavier=""
			onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onFermer(); }}
			onKeyDown={(e) => e.stopPropagation()}
			className="fixed inset-0 z-80 flex items-center justify-center bg-voile/50 p-6">
			<div className="flex max-h-[calc(100dvh-3rem)] w-[min(32rem,100%)] flex-col overflow-hidden rounded-md border border-rule-strong bg-raise px-5.5 pt-5 pb-4.5 shadow-ombre-h">
				<ContenuSuppression chantierId={id} reference={reference} resume={resume} saisie={saisie} etat={etat}
					messageErreur={messageErreur} enCours={enCours} champRef={champ}
					onSaisie={setSaisie} onAnnuler={onFermer} onConfirmer={confirmer} />
			</div>
		</div>
	);
}
