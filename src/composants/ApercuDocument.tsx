'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { modifierAvenantAction } from '@/actions/avenants';
import { genererAvenantAction, genererMarcheAction, genererRecapAction } from '@/actions/documents';
import type { Resultat } from '@/actions/executer';
import { modifierChampLotAction } from '@/actions/lots';
import { ChampsMarche } from '@/composants/apercu/ChampsMarche';
import { MenuVersions } from '@/composants/apercu/MenuVersions';
import { CadreApercu } from '@/composants/briques/CadreApercu';
import * as Icone from '@/composants/briques/icones';
import { FeuilleUnique } from '@/composants/planning/FeuilleUnique';
import { telecharger } from '@/composants/telecharger';
import type { VersionResume } from '@/documents/etats';
import { Gabarit, type CleZone } from '@/documents/gabarits/Gabarit';
import type { DonneesDocument } from '@/documents/schemas';

type Source =
	| { type: 'marche'; lotId: string } | { type: 'avenant'; avenantId: string }
	| { type: 'recap'; chantierId: string } | { type: 'version'; documentId: string };

type Props = { titre: string; sousTitre: string; donnees: DonneesDocument; source: Source; manques?: string[]; chantierId: string; versions?: VersionResume[]; retourActuel?: string };

export function ApercuDocument({ titre, sousTitre, donnees, source, manques = [], chantierId, versions = [], retourActuel }: Props) {
	const router = useRouter();
	const chemin = usePathname();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const [enCours, demarrer] = useTransition();

	function saisir(cle: CleZone, texte: string) {
		// Même garde que Zone : un blur sans changement n'écrit pas (évite d'écraser la feuille avec une colonne périmée).
		const contenu = 'contenu' in donnees ? donnees.contenu : undefined;
		if (contenu && cle in contenu && (contenu as Record<string, unknown>)[cle] === texte) return null;
		// La lettre d'avenant n'a qu'une zone, son objet ; le marché écrit dans le lot.
		let envoi: Promise<Resultat> | null = null;
		if (source.type === 'marche' && cle !== 'objet') envoi = modifierChampLotAction(source.lotId, cle, texte);
		if (source.type === 'avenant' && cle === 'objet') envoi = modifierAvenantAction(source.avenantId, 'objet', texte);
		if (!envoi) return null;
		const enregistrement = envoi.then((r) => {
			if (!r.ok) toast.error(r.erreur);
			return r;
		});
		enregistrements.current.add(enregistrement);
		void enregistrement.finally(() => enregistrements.current.delete(enregistrement));
		return enregistrement;
	}

	function generer() {
		demarrer(async () => {
			// La zone encore ouverte s'enregistre d'abord : le PDF ne perd jamais une saisie.
			(document.activeElement as HTMLElement | null)?.blur();
			await Promise.all(enregistrements.current);
			const r = source.type === 'marche' ? await genererMarcheAction(source.lotId)
				: source.type === 'avenant' ? await genererAvenantAction(source.avenantId)
					: source.type === 'recap' ? await genererRecapAction(source.chantierId) : null;
			if (!r) return;
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			telecharger(`/api/documents/${r.donnees.documentId}/pdf`);
			router.refresh();
		});
	}

	const ecrit = source.type === 'marche' || source.type === 'avenant';
	const fermer = () => router.replace(chemin, { scroll: false });
	const estMarche = donnees.type === 'MARCHE_GRE_A_GRE' || donnees.type === 'MARCHE_SOUS_TRAITANCE';
	const courante = source.type === 'version' ? source.documentId : null;
	const actions = (
		<>
			<button type="button" className="btn btn-ghost" onClick={fermer}>Fermer</button>
			<MenuVersions chantierId={chantierId} versions={versions} courante={courante} retourActuel={retourActuel} />
			{source.type === 'recap' && <a className="btn" href={`/api/chantiers/${source.chantierId}/recap-xlsx`}><Icone.Telecharger />Télécharger le tableur</a>}
			{source.type === 'version' ? (
				<a className="btn btn-primary" href={`/api/documents/${source.documentId}/pdf`}><Icone.Telecharger />Télécharger le PDF</a>
			) : (
				<button type="button" className="btn btn-primary" onClick={generer} disabled={enCours || manques.length > 0} title={manques.length ? `Manque : ${manques.join(', ')}` : undefined}>
					<Icone.Telecharger />{enCours ? 'Génération…' : 'Générer le PDF'}
				</button>
			)}
		</>
	);
	const notes = (
		<>
			{source.type === 'version' && <p role="note" className="gen-note est-info">Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.</p>}
			{manques.length > 0 && <p role="note" className="gen-note">Pour générer {source.type === 'avenant' ? 'cette lettre' : 'ce marché'} : {manques.join(', ')}.</p>}
		</>
	);
	const saisirPuisRafraichir = (cle: CleZone, texte: string) => { void saisir(cle, texte)?.then(() => router.refresh()); };
	return (
		<CadreApercu libelle={titre} surtitre={titre} titre={sousTitre} notes={notes} actions={actions} onFermer={fermer}
			aide={ecrit ? `Les zones bleues s'écrivent directement sur ${source.type === 'avenant' ? 'la lettre' : 'le marché'} — le bleu ne s'imprime pas.` : undefined}
			disposition={estMarche && source.type === 'marche' ? 'champs' : 'simple'}
			champs={(donnees.type === 'MARCHE_GRE_A_GRE' || donnees.type === 'MARCHE_SOUS_TRAITANCE') && source.type === 'marche' ? (
				<ChampsMarche key={'clauseParticuliere' in donnees.contenu ? donnees.contenu.clauseParticuliere : `${donnees.contenu.corpsEtat}\0${donnees.contenu.travaux}`}
					donnees={donnees} saisir={saisirPuisRafraichir} />
			) : undefined}>
			{donnees.type === 'PLANNING' || donnees.type === 'VISA_PLANNING' ? (
				<FeuilleUnique key={sousTitre}><Gabarit donnees={donnees} mode="lecture" /></FeuilleUnique>
			) : (
				<Gabarit donnees={donnees} mode={ecrit ? 'edition' : 'lecture'} onSaisie={saisirPuisRafraichir} />
			)}
		</CadreApercu>
	);
}
