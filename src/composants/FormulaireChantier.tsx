'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { creerChantierAction } from '@/actions/chantiers';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, GrilleChamps, Saisie, SectionChamps } from '@/composants/briques/Champ';
import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
import { Ecran } from '@/composants/briques/Ecran';
import { Interrupteur } from '@/composants/briques/Interrupteur';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { ExtraitMarche, type Mention } from '@/composants/ExtraitMarche';

type Props = {
	chargesAffaire: { id: string; nom: string }[];
	moi: { id: string; nom: string };
	/** Ce que l'extrait du marché reprend des Paramètres. */
	entete: { raisonSociale: string; villeSignature: string };
};
type Valeurs = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };

/** L'id d'un champ → la mention qu'il remplit sur le marché. */
const MENTIONS: Record<string, Mention> = {
	'f-mo': 'maitreOuvrage', 'f-dem': 'adresseClient', 'f-nat': 'natureTravaux',
	'f-adr': 'adresseChantier', 'f-cp': 'adresseChantier', 'f-com': 'adresseChantier', 'f-sig': 'date', 'f-ref': 'reference', 'f-meme': 'adresseClient',
};

const MISSIONS = [{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }] as const;

const VIDE: Valeurs = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
/** fillExample() de la maquette. */
const EXEMPLE: Valeurs = {
	maitreOuvrage: 'M. et Mme BLANCHARD', adresseClient: '7 rue des Tilleuls, 44110 CHÂTEAUBRIANT', natureTravaux: "Construction d'une maison individuelle — 118 m²",
	adresse: 'La Grande Noë', cp: '44520', commune: 'ISSÉ', dateSignaturePrevue: '2026-10-02', reference: 'BLANCHARD — Issé',
};

export function FormulaireChantier({ chargesAffaire, moi, entete }: Props) {
	const router = useRouter();
	const [s, setS] = useState<Valeurs>(VIDE);
	const [surPlace, setSurPlace] = useState(false);
	const [mission, setMission] = useState<'COMPLETE' | 'PARTIELLE'>('COMPLETE');
	const [chargeAffaireId, setChargeAffaireId] = useState(moi.id);
	const [lotsDeBase, setLotsDeBase] = useState(true);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [active, setActive] = useState<Mention | null>(null);
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

	const champ = (id: string, nom: keyof Valeurs, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
		<Champ libelle={libelle} pour={id} aide={o.aide} erreur={erreurs[nom]}>
			<Saisie id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
				chiffres={o.num} erreur={erreurs[nom]} />
		</Champ>
	);

	const annuler = () => router.push('/chantiers');
	const exemple = () => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); };
	// Le champ qui a le focus allume, sur l'extrait, la mention qu'il remplit.
	const suivreFocus = (e: React.FocusEvent<HTMLDivElement>) =>
		setActive(e.target.closest('[role="radiogroup"]') ? 'factures' : MENTIONS[e.target.id] ?? null);
	return (
		<Ecran titre="Nouveau chantier" actions={<>
			<Bouton variante="fantome" onClick={annuler}>Annuler</Bouton>
			<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
		</>}>
			<div className="grid grid-cols-2 items-start gap-x-10 gap-y-10 max-etroit:grid-cols-1">
				<div className="flex flex-col gap-7" onFocus={suivreFocus} onBlur={() => setActive(null)}>
					<SectionChamps titre="Client">
						{champ('f-mo', 'maitreOuvrage', 'Nom du client', { placeholder: 'M. et Mme MARTIN, ou SCI LES CHÊNES' })}
						{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
							aide: surPlace ? "Recopiée de l'adresse du chantier." : <>Là où lui écrire <b>aujourd&apos;hui</b>. En construction neuve, ce n&apos;est pas le chantier.</> })}
						<Interrupteur id="f-meme" variante="discrete" coche={surPlace} onChange={setSurPlace}>Il habite déjà sur le chantier (rénovation, extension)</Interrupteur>
					</SectionChamps>

					<SectionChamps titre="Chantier">
						{champ('f-nat', 'natureTravaux', 'Nature des travaux', { placeholder: "Construction d'une maison individuelle, 120 m²" })}
						{champ('f-adr', 'adresse', 'Adresse du chantier', { placeholder: 'Le Haut Bois' })}
						<div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4">
							{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
							{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
						</div>
					</SectionChamps>

					<SectionChamps titre="Dossier">
						{champ('f-ref', 'reference', 'Référence dossier', { placeholder: 'Reprend le nom du client si vide' })}
						<Champ libelle="Chargé d'affaire" pour="f-ca" aide="Chez vous, pas chez le client." erreur={erreurs.chargeAffaireId}>
							<MenuDeroulant id="f-ca" k="Compte" largeur="pleine" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
								options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
						</Champ>
						<GrilleChamps>
							<Champ libelle="Type de mission">
								<ChoixSegmente libelle="Type de mission" options={MISSIONS} valeur={mission} onChoisir={setMission} />
							</Champ>
							{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
						</GrilleChamps>
					</SectionChamps>

					<SectionChamps titre="Lots">
						<Champ aide="Terrassement, gros œuvre, charpente… jusqu'à l'escalier en sous-traitance, sans entreprise ni montant. Supprimez ensuite ceux qui ne servent pas.">
							<Interrupteur id="f-lots-base" variante="discrete" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
						</Champ>
					</SectionChamps>

					<div className="border-t border-rule pt-5.5">
						<Bouton variante="primaire" enCours={enCours} onClick={creer}>Créer le chantier</Bouton>
					</div>
				</div>

				<div className="sticky top-22 max-etroit:static">
					<ExtraitMarche active={active} raisonSociale={entete.raisonSociale} villeSignature={entete.villeSignature} onExemple={exemple}
						valeurs={{ ...s, adresseClient, adresseChantier, mission, reference: s.reference }} />
				</div>
			</div>
		</Ecran>
	);
}
