'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, modifierChampChantierAction } from '@/actions/chantiers';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { Bouton } from '@/composants/briques/Bouton';
import { Champ, GrilleChamps } from '@/composants/briques/Champ';
import { ChoixSegmente } from '@/composants/briques/ChoixSegmente';
import { cx } from '@/composants/briques/cx';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
import { CHIFFRES, CLE } from '@/composants/briques/typo';
import type { ChampChantier, EnTeteChantierVue } from '@/donnees/chantiers';

const CHAMPS: { champ: ChampChantier; libelle: string; type?: 'date'; span?: boolean; num?: boolean }[] = [
	{ champ: 'maitreOuvrage', libelle: 'Nom du client', span: true },
	{ champ: 'adresseClient', libelle: 'Adresse actuelle du client', span: true },
	{ champ: 'natureTravaux', libelle: 'Nature des travaux', span: true },
	{ champ: 'adresse', libelle: 'Adresse du chantier', span: true },
	{ champ: 'cp', libelle: 'Code postal', num: true },
	{ champ: 'commune', libelle: 'Commune' },
	{ champ: 'dateSignaturePrevue', libelle: 'Signature des marchés prévue le', type: 'date' },
	{ champ: 'reference', libelle: 'Référence dossier' },
];

const MISSIONS = [{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }] as const;

const dateFr = (iso: string) => iso.split('-').reverse().join('.');

export function BandeauChantier({ chantier: c, chargesAffaire }: { chantier: EnTeteChantierVue; chargesAffaire: { id: string; nom: string }[] }) {
	const [ouvert, setOuvert] = useState(false);
	const [, demarrer] = useTransition();
	const agir = (fn: () => Promise<{ ok: boolean; erreur?: string }>, succes?: React.ReactNode) => demarrer(async () => {
		const r = await fn();
		if (!r.ok) toast.error(r.erreur);
		else if (succes) toast(succes);
	});
	const situee = [c.adresse, [c.cp, c.commune].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—';
	const cellules: [string, string, boolean][] = [
		['Client', c.maitreOuvrage || '—', false],
		['Construction', c.natureTravaux || '—', false],
		['Située', situee, false],
		['Mission', c.mission === 'COMPLETE' ? 'Complète' : 'Partielle', false],
		['Signature', c.dateSignaturePrevue ? dateFr(c.dateSignaturePrevue) : 'non fixée', Boolean(c.dateSignaturePrevue)],
	];
	return (
		<div className="w-full">
			{/* Le bandeau du chantier (ex-.context) : un clic ouvre l'en-tête à modifier. */}
			<button type="button" className="flex w-full cursor-pointer overflow-x-auto border-t border-rule bg-surface text-left hover:bg-idle-soft"
				title="Modifier l'en-tête du chantier" onClick={() => setOuvert(true)}>
				{cellules.map(([k, v, mono]) => (
					<div key={k} className="min-w-0 flex-none border-r border-rule px-6 pt-2.5 pb-2.75 last:border-r-0">
						<span className={cx(CLE, 'mb-0.25 flow-root')}>{k}</span>
						<span className={cx('text-13 whitespace-nowrap', mono && CHIFFRES)}>{v}</span>
					</div>
				))}
			</button>
			<Panneau ouvert={ouvert} surtitre="CHANTIER" titre="En-tête du chantier" onFermer={() => setOuvert(false)}
				pied={<>
					<Bouton onClick={() => agir(() => marquerTermineAction(c.id, !c.termine),
						c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>)}>
						{c.termine ? 'Rouvrir le chantier' : 'Marquer terminé'}
					</Bouton>
					<Bouton variante="fantome" onClick={() => setOuvert(false)}>Fermer</Bouton>
				</>}>
				<GrilleChamps>
					{CHAMPS.map((f) => (
						<Champ key={f.champ} libelle={f.libelle} pour={`e-${f.champ}`} pleineLargeur={f.span}>
							<ChampEnLigne id={`e-${f.champ}`} variante="champ" chiffres={f.num} libelle={f.libelle} type={f.type}
								valeur={c[f.champ] as string} enregistrer={modifierChampChantierAction.bind(null, c.id, f.champ)} />
						</Champ>
					))}
					<Champ libelle="Type de mission" pleineLargeur>
						<ChoixSegmente libelle="Type de mission" options={MISSIONS} valeur={c.mission}
							onChoisir={(m) => agir(() => modifierChampChantierAction(c.id, 'mission', m))} />
					</Champ>
					<Champ libelle="Chargé d'affaire" pour="e-ca" pleineLargeur>
						<MenuDeroulant id="e-ca" k="Compte" largeur="pleine" valeur={c.chargeAffaireId}
							options={chargesAffaire.map((x) => ({ v: x.id, t: x.nom }))}
							onChoisir={(v) => agir(() => modifierChampChantierAction(c.id, 'chargeAffaireId', v))} />
					</Champ>
				</GrilleChamps>
			</Panneau>
		</div>
	);
}
