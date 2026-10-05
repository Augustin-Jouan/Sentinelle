'use client';

import { useState } from 'react';
import { modifierParametreAction } from '@/actions/parametres';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { Champ, SectionChamps } from '@/composants/briques/Champ';
import { Ecran } from '@/composants/briques/Ecran';
import { Blanc, Coupure, Feuille, FormulaireEtFeuille } from '@/composants/briques/Feuille';
import type { ChampParametres } from '@/donnees/parametres';

export type ValeursParametres = Record<ChampParametres, string>;

/** Deux champs côte à côte ; « etroit » réduit le premier (code postal). */
function Paire({ etroit = false, children }: { etroit?: boolean; children: React.ReactNode }) {
	return <div className={etroit ? 'grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-x-4' : 'grid grid-cols-2 gap-x-4'}>{children}</div>;
}

/**
 * Les paramètres de l'entreprise, avec à côté l'en-tête tel que les documents l'impriment (batirCadre, certificat.ts, coordonnees.ts).
 * Chaque champ s'enregistre quand on le quitte (ChampEnLigne) ; la feuille suit la frappe.
 */
export function FormulaireParametres({ initiales }: { initiales: ValeursParametres }) {
	const [v, setV] = useState(initiales);
	const [active, setActive] = useState<ChampParametres | null>(null);

	const champ = (c: ChampParametres, libelle: string, o: { aide?: string; type?: 'text' | 'email' | 'tel'; chiffres?: boolean } = {}) => (
		<Champ libelle={libelle} pour={`p-${c}`} aide={o.aide}>
			<ChampEnLigne id={`p-${c}`} variante="champ" libelle={libelle} type={o.type} chiffres={o.chiffres} valeur={initiales[c]}
				enregistrer={modifierParametreAction.bind(null, c)} onSaisie={(x) => setV((avant) => ({ ...avant, [c]: x }))} />
		</Champ>
	);
	const b = (c: ChampParametres, vide?: string) => <Blanc valeur={v[c].trim()} actif={active === c} vide={vide} />;
	// Les mentions facultatives ne s'impriment que renseignées ; on les montre aussi pendant qu'on les saisit.
	const montre = (c: ChampParametres) => Boolean(v[c].trim()) || active === c;
	const suivreFocus = (e: React.FocusEvent<HTMLDivElement>) =>
		setActive(e.target.id.startsWith('p-') ? (e.target.id.slice(2) as ChampParametres) : null);

	const feuilles = (
		<div className="flex flex-col gap-6">
			<Feuille legende="En-tête des marchés et du récapitulatif.">
				<p className="text-11 leading-[1.4]">
					<span className="text-12">{b('raisonSociale')}</span><br />
					{b('libelleActivite')}<br />
					{b('adresse')} - {b('cp')} – {b('ville')}<br />
					Tél. {b('telephone')}{montre('fax') && <> - Fax. {b('fax')}</>}
				</p>
				<p className="mt-4 mb-3.5 text-center font-titre text-15 font-bold tracking-capitales">MARCHE DE TRAVAUX DE GRE A GRE</p>
				<Coupure />
				<p>Fait en triple exemplaire à {b('villeSignature')} le : <span className="text-feuille-gris italic">jour de l&apos;édition</span></p>
			</Feuille>
			<Feuille legende="En-tête des certificats de paiement ; les comptes rendus et les PV reprennent l'adresse, le téléphone, l'e-mail et le site.">
				<p className="text-11 leading-[1.6]">
					<span className="text-12">{b('raisonSociale')}</span><br />
					{b('adresse')} - {b('cp')} <span className="uppercase">{b('ville')}</span><br />
					Tél. : {b('telephone')}{montre('email') && <> - {b('email')}</>}<br />
					RCS : {b('rcs')} – APE {b('ape')}<br />
					N° TVA Intra. : {b('tvaIntracommunautaire')}
				</p>
				{montre('siteWeb') && <>
					<Coupure />
					<p className="text-11">Site : {b('siteWeb')}</p>
				</>}
			</Feuille>
		</div>
	);

	return (
		<Ecran titre="Paramètres de l'entreprise" sousTitre={<p className="mt-1 text-13 text-muted">Repris sur tous les documents. Chaque champ s&apos;enregistre quand on le quitte.</p>}>
			<FormulaireEtFeuille feuille={feuilles} onFocus={suivreFocus} onBlur={() => setActive(null)}>
				<SectionChamps titre="Entreprise">
					{champ('raisonSociale', 'Raison sociale')}
					{champ('libelleActivite', 'Activité')}
				</SectionChamps>

				<SectionChamps titre="Coordonnées">
					{champ('adresse', 'Adresse')}
					<Paire etroit>
						{champ('cp', 'Code postal', { chiffres: true })}
						{champ('ville', 'Ville')}
					</Paire>
					<Paire>
						{champ('telephone', 'Téléphone', { type: 'tel' })}
						{champ('fax', 'Fax', { type: 'tel', aide: "Imprimé seulement s'il est renseigné." })}
					</Paire>
					<Paire>
						{champ('email', 'E-mail', { type: 'email', aide: 'Pas sur les marchés.' })}
						{champ('siteWeb', 'Site web', { aide: 'Sur les comptes rendus.' })}
					</Paire>
				</SectionChamps>

				<SectionChamps titre="Signature">
					{champ('villeSignature', 'Ville de signature')}
				</SectionChamps>

				<SectionChamps titre="Mentions légales">
					<Paire>
						{champ('rcs', 'RCS', { chiffres: true })}
						{champ('ape', 'Code APE')}
					</Paire>
					{champ('tvaIntracommunautaire', 'N° TVA intracommunautaire', { aide: '« FR », la clé, puis le SIREN.' })}
				</SectionChamps>
			</FormulaireEtFeuille>
		</Ecran>
	);
}
