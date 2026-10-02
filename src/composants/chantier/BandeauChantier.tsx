'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { marquerTermineAction, modifierChampChantierAction } from '@/actions/chantiers';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { MenuDeroulant } from '@/composants/briques/MenuDeroulant';
import { Panneau } from '@/composants/briques/Panneau';
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
		<>
			<button type="button" className="context" title="Modifier l'en-tête du chantier" onClick={() => setOuvert(true)}>
				{cellules.map(([k, v, mono]) => (
					<div key={k} className="context-cell"><span className="context-k">{k}</span><span className={mono ? 'context-v num' : 'context-v'}>{v}</span></div>
				))}
			</button>
			<Panneau ouvert={ouvert} surtitre="CHANTIER" titre="En-tête du chantier" onFermer={() => setOuvert(false)}
				pied={<>
					<button type="button" className="btn" onClick={() => agir(() => marquerTermineAction(c.id, !c.termine),
						c.termine ? <>Chantier <b>{c.reference}</b> rouvert.</> : <>Chantier <b>{c.reference}</b> marqué terminé.</>)}>
						{c.termine ? 'Rouvrir le chantier' : 'Marquer terminé'}
					</button>
					<button type="button" className="btn btn-ghost" onClick={() => setOuvert(false)}>Fermer</button>
				</>}>
				<div className="grid-2">
					{CHAMPS.map((f) => (
						<div key={f.champ} className={f.span ? 'field span' : 'field'}>
							<label htmlFor={`e-${f.champ}`}>{f.libelle}</label>
							<ChampEnLigne id={`e-${f.champ}`} variante="champ" chiffres={f.num} libelle={f.libelle} type={f.type}
								valeur={c[f.champ] as string} enregistrer={modifierChampChantierAction.bind(null, c.id, f.champ)} />
						</div>
					))}
					<div className="field span">
						<label>Type de mission</label>
						<div className="radio-row" role="radiogroup" aria-label="Type de mission">
							{(['COMPLETE', 'PARTIELLE'] as const).map((m) => (
								<label key={m} className={c.mission === m ? 'is-on' : undefined}>
									<input type="radio" name="e-mission" checked={c.mission === m} onChange={() => agir(() => modifierChampChantierAction(c.id, 'mission', m))} /> {m === 'COMPLETE' ? 'Complète' : 'Partielle'}
								</label>
							))}
						</div>
					</div>
					<div className="field span">
						<label htmlFor="e-ca">Chargé d&apos;affaire</label>
						<MenuDeroulant id="e-ca" k="Compte" largeur="pleine" valeur={c.chargeAffaireId}
							options={chargesAffaire.map((x) => ({ v: x.id, t: x.nom }))}
							onChoisir={(v) => agir(() => modifierChampChantierAction(c.id, 'chargeAffaireId', v))} />
					</div>
				</div>
			</Panneau>
		</>
	);
}
