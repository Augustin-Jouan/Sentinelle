'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { creerChantierAction } from '@/actions/chantiers';
import { Interrupteur } from '@/composants/briques/Interrupteur';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';

type Props = { chargesAffaire: { id: string; nom: string }[]; moi: { id: string; nom: string } };
type Saisie = { maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string; dateSignaturePrevue: string; reference: string };

const VIDE: Saisie = { maitreOuvrage: '', adresseClient: '', natureTravaux: '', adresse: '', cp: '', commune: '', dateSignaturePrevue: '', reference: '' };
/** fillExample() de la maquette. */
const EXEMPLE: Saisie = {
	maitreOuvrage: 'M. et Mme BLANCHARD', adresseClient: '7 rue des Tilleuls, 44110 CHÂTEAUBRIANT', natureTravaux: "Construction d'une maison individuelle — 118 m²",
	adresse: 'La Grande Noë', cp: '44520', commune: 'ISSÉ', dateSignaturePrevue: '2026-10-02', reference: 'BLANCHARD — Issé',
};

export function FormulaireChantier({ chargesAffaire, moi }: Props) {
	const router = useRouter();
	const [s, setS] = useState<Saisie>(VIDE);
	const [surPlace, setSurPlace] = useState(false);
	const [mission, setMission] = useState<'COMPLETE' | 'PARTIELLE'>('COMPLETE');
	const [chargeAffaireId, setChargeAffaireId] = useState(moi.id);
	const [lotsDeBase, setLotsDeBase] = useState(true);
	const [erreurs, setErreurs] = useState<Record<string, string>>({});
	const [enCours, demarrer] = useTransition();
	const maj = (champ: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [champ]: e.target.value });
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

	const champ = (id: string, nom: keyof Saisie, libelle: string, o: { placeholder?: string; aide?: React.ReactNode; span?: boolean; type?: string; num?: boolean; valeur?: string; lecture?: boolean } = {}) => (
		<div className={o.span ? 'field span' : 'field'}>
			<label htmlFor={id}>{libelle}</label>
			<input id={id} type={o.type ?? 'text'} placeholder={o.placeholder} value={o.valeur ?? s[nom]} onChange={maj(nom)} readOnly={o.lecture}
				className={[o.num && 'num', erreurs[nom] && 'est-erreur'].filter(Boolean).join(' ') || undefined} aria-invalid={Boolean(erreurs[nom])} />
			{o.aide && <span className="hint">{o.aide}</span>}
			{erreurs[nom] && <span className="erreur">{erreurs[nom]}</span>}
		</div>
	);

	return (
		<>
			<div className="topbar">
				<div className="topbar-row">
					<div><h1 className="page-title">Nouveau chantier</h1></div>
					<div className="topbar-actions">
						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
					</div>
				</div>
			</div>
			<div className="body-pad">
				<div className="form-wrap">
					<div className="fieldset">
						<span className="eyebrow">Client</span>
						<div className="grid-2">
							{champ('f-mo', 'maitreOuvrage', 'Nom du client', { span: true, placeholder: 'M. et Mme MARTIN — ou SCI LES CHÊNES',
								aide: "Imprimé sous la mention « Maître d'Ouvrage » dans les marchés, et « Mr/Mme » en tête du récap." })}
							{champ('f-dem', 'adresseClient', 'Adresse actuelle du client', { span: true, placeholder: '12 rue de la Barre, 44110 CHÂTEAUBRIANT', valeur: adresseClient, lecture: surPlace,
								aide: <>Là où lui écrire <b>aujourd&apos;hui</b> — pas le chantier. En construction neuve il n&apos;y habite pas encore. Imprimée sous « Demeurant » sur les marchés.</> })}
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Chantier</span>
						<div className="grid-2">
							{champ('f-nat', 'natureTravaux', 'Nature des travaux', { span: true, placeholder: "Construction d'une maison individuelle — 120 m²" })}
							{champ('f-adr', 'adresse', 'Adresse du chantier', { span: true, placeholder: 'Le Haut Bois', aide: 'Là où les travaux ont lieu. Imprimée sous « Située » sur les marchés.' })}
							{champ('f-cp', 'cp', 'Code postal', { placeholder: '44110', num: true })}
							{champ('f-com', 'commune', 'Commune', { placeholder: 'LOUISFERT' })}
							<div className="field span">
								<Interrupteur id="f-meme" coche={surPlace} onChange={setSurPlace}>Le client habite déjà à cette adresse</Interrupteur>
								<span className="hint">Cas d&apos;une rénovation ou d&apos;une extension&nbsp;: son adresse actuelle est recopiée du chantier.</span>
							</div>
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Mission</span>
						<div className="grid-2">
							<div className="field span">
								<label>Type de mission</label>
								<div className="radio-row" role="radiogroup" aria-label="Type de mission">
									{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
										<label key={m} className={mission === m ? 'is-on' : undefined}>
											<input type="radio" name="mission" checked={mission === m} onChange={() => setMission(m)} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
										</label>
									))}
								</div>
							</div>
							{champ('f-sig', 'dateSignaturePrevue', 'Signature des marchés prévue le', { type: 'date' })}
							<div className="field">
								<label htmlFor="f-ca">Chargé d&apos;affaire</label>
								<MenuDeroulant id="f-ca" k="Compte" classe="dd-plein" valeur={chargeAffaireId} onChoisir={setChargeAffaireId}
									options={chargesAffaire.map((c) => ({ v: c.id, t: c.nom }))} />
								<span className="hint">Chez vous, pas chez le client.</span>
								{erreurs.chargeAffaireId && <span className="erreur">{erreurs.chargeAffaireId}</span>}
							</div>
							{champ('f-ref', 'reference', 'Référence dossier', { placeholder: "Repris du maître d'ouvrage si vide" })}
						</div>
					</div>

					<div className="fieldset">
						<span className="eyebrow">Lots</span>
						<div className="field">
							<Interrupteur id="f-lots-base" coche={lotsDeBase} onChange={setLotsDeBase}>Partir des 13 lots de base</Interrupteur>
							<span className="hint">Terrassement, gros œuvre, charpente… jusqu&apos;à l&apos;escalier en sous-traitance, sans entreprise ni montant. Il suffit ensuite de supprimer ceux qui ne servent pas.</span>
						</div>
					</div>

					<div className="form-actions">
						<button type="button" className="btn btn-primary" disabled={enCours} onClick={creer}>Créer le chantier</button>
						<button type="button" className="btn" onClick={() => { setS(EXEMPLE); setSurPlace(false); setChargeAffaireId(moi.id); toast('Exemple chargé. Vous pouvez modifier avant de créer.'); }}>Remplir un exemple</button>
						<button type="button" className="btn btn-ghost" onClick={() => router.push('/chantiers')}>Annuler</button>
					</div>
				</div>
			</div>
		</>
	);
}
