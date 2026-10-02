'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { creerChantierAction } from '@/actions/chantiers';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, ColonnesFormulaire, GrilleChamps, GroupeChamps, PiedFormulaire, Saisie } from '@/composants/briques/Champ';
import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
import { Ecran } from '@/composants/briques/Ecran';
import { Interrupteur } from '@/composants/briques/Interrupteur';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';

type Props = { chargesAffaire: { id: string; nom: string }[]; moi: { id: string; nom: string } };
type Valeurs = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };

const MISSIONS = [{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }] as const;

const VIDE: Valeurs = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
/** fillExample() de la maquette. */
const EXEMPLE: Valeurs = {
	maitreOuvrage: 'M. et Mme BLANCHARD', adresseClient: '7 rue des Tilleuls, 44110 CHÂTEAUBRIANT', natureTravaux: "Construction d'une maison individuelle — 118 m²",
	adresse: 'La Grande Noë', cp: '44520', commune: 'ISSÉ', dateSignaturePrevue: '2026-10-02', reference: 'BLANCHARD — Issé',
};

export function FormulaireChantier({ chargesAffaire, moi }: Props) {
	const router = useRouter();
	const [s, setS] = useState<Valeurs>(VIDE);
	const [surPlace, setSurPlace] = useState(false);
	const [mission, setMission] = useState<'COMPLETE' | 'PARTIELLE'>('COMPLETE');
	const [chargeAffaireId, setChargeAffaireId] = useState(moi.id);
	const [lotsDeBase, setLotsDeBase] = useState(true);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();
	const maj = (champ: keyof Valeurs) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [champ]: e.target.value });
	// Rénovation, extension : le client vit sur le chantier, son adresse en est recopiée (syncAdresseClient).
	const adresseChantier = [s.adresse.trim(), [s.cp.trim(), s.commune.trim()].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	const adresseClient = surPlace ? adresseChantier : s.adresseClient;

	function creer() {
		if (!s.maitreOuvrage.trim()) {
			document.getElementById('f-mo')?.focus();
			toast("Renseignez au moins le maître d'ouvrage.");
			return;
		}
		demarrer(async () => {
			const r = await creerChantierAction({
				...s, adresseClient, reference: s.reference.trim() || s.maitreOuvrage.trim(),
				clientHabiteSurPlace: surPlace, mission, chargeAffaireId, partirDesLotsDeBase: lotsDeBase,
			});
			if (r.ok) router.push(`/chantiers/${r.donnees.id}/marches`);
			else { setErreurs(r.champs ?? {}); toast.error(r.erreur); }
		});
	}

	const champ = (id: string, nom: keyof Valeurs, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; span?: boolean; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
		<Champ libelle={libelle} pour={id} aide={o.aide} erreur={erreurs[nom]} pleineLargeur={o.span}>
			<Saisie id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
				chiffres={o.num} erreur={erreurs[nom]} />
		</Champ>
	);

	const annuler = () => router.push('/chantiers');
	return (
		<Ecran titre="Nouveau chantier" actions={<>
			<Bouton variante="fantome" onClick={annuler}>Annuler</Bouton>
			<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
		</>}>
			<ColonnesFormulaire>
				<GroupeChamps titre="Client">
					<GrilleChamps>
						{champ('f-mo', 'maitreOuvrage', 'Nom du client', { span: true, placeholder: 'M. et Mme MARTIN — ou SCI LES CHÊNES',
							aide: "Imprimé sous la mention « Maître d'Ouvrage » dans les marchés, et « Mr/Mme » en tête du récap." })}
						{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { span: true, placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
							aide: <>Là où lui écrire <b>aujourd&apos;hui</b> — pas le chantier. En construction neuve il n&apos;y habite pas encore. Imprimée sous « Demeurant » sur les marchés.</> })}
					</GrilleChamps>
				</GroupeChamps>

				<GroupeChamps titre="Chantier">
					<GrilleChamps>
						{champ('f-nat', 'natureTravaux', 'Nature des travaux', { span: true, placeholder: "Construction d'une maison individuelle — 120 m²" })}
						{champ('f-adr', 'adresse', 'Adresse du chantier', { span: true, placeholder: 'Le Haut Bois', aide: 'Là où les travaux ont lieu. Imprimée sous « Située » sur les marchés.' })}
						{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
						{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
						<Champ pleineLargeur aide={<>Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</>}>
							<Interrupteur id="f-meme" variante="discrete" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
						</Champ>
					</GrilleChamps>
				</GroupeChamps>

				<GroupeChamps titre="Mission">
					<GrilleChamps>
						<Champ libelle="Type de mission" pleineLargeur>
							<ChoixSegmente libelle="Type de mission" options={MISSIONS} valeur={mission} onChoisir={setMission} />
						</Champ>
						{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
						<Champ libelle="Chargé d'affaire" pour="f-ca" aide="Chez vous, pas chez le client." erreur={erreurs.chargeAffaireId}>
							<MenuDeroulant id="f-ca" k="Compte" largeur="pleine" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
								options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
						</Champ>
						{champ('f-ref', 'reference', 'Référence dossier', { placeholder: "Repris du maître d'ouvrage si vide" })}
					</GrilleChamps>
				</GroupeChamps>

				<GroupeChamps titre="Lots">
					<Champ aide="Terrassement, gros œuvre, charpente… jusqu'à l'escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.">
						<Interrupteur id="f-lots-base" variante="discrete" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
					</Champ>
				</GroupeChamps>

				<PiedFormulaire>
					<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
					<Bouton onClick={() => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); }}>Remplir un exemple</Bouton>
					<Bouton variante="fantome" onClick={annuler}>Annuler</Bouton>
				</PiedFormulaire>
			</ColonnesFormulaire>
		</Ecran>
	);
}
