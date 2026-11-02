'use client';

import { Bouton } from '@/composants/briques/Bouton';
import { Champ, GrilleChamps, Saisie, ZoneTexte } from '@/composants/briques/Champ';
import { Surtitre } from '@/composants/briques/Surtitre';
import type { EditionCompteRendu } from '@/documents/gabarits/CompteRendu';
import type { ChampCompteRendu, Convocation } from '@/domaine/compteRendu';

/** Ce que veut dire chaque lettre de convocation (légende de la feuille). */
const SENS: Record<Convocation, string> = { D: 'Diffusion', C: 'Convoqué au prochain RDV', P: 'Présent', A: 'Absent', E: 'Excusé' };

type Lot = { id: string; designation: string; entreprise: string | null };

/**
 * Le compte rendu saisi sur un téléphone : les mêmes champs que les zones bleues de la feuille, à la taille du doigt,
 * branchés sur la même édition (EditionCompteRendu). Les textes partent quand on les quitte, les dates dès qu'elles
 * changent, une convocation passe à la lettre suivante d'un toucher. La feuille, dessous, en est l'aperçu fidèle.
 */
export function FormulaireCompteRendu({ edition: e, lots }: { edition: EditionCompteRendu; lots: Lot[] }) {
	const texte = (champ: Extract<ChampCompteRendu, 'redacteur' | 'portable' | 'avancement' | 'coordination'>) => ({
		// generation remonte le champ quand son texte est remplacé de l'extérieur (« Repartir des lots »).
		key: `${champ}:${e.generation}`,
		defaultValue: e.saisies[champ],
		onBlur: (ev: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			if (ev.currentTarget.value !== e.saisies[champ]) e.surChamp(champ, ev.currentTarget.value);
		},
	});
	return (
		<>
			<GrilleChamps>
				<Champ libelle="Date du compte rendu" pour="cr-f-date">
					<Saisie id="cr-f-date" type="date" value={e.saisies.date} onChange={(ev) => e.surChamp('date', ev.target.value)} />
				</Champ>
				<Champ libelle="Prochain rendez-vous" pour="cr-f-rdv">
					<Saisie id="cr-f-rdv" type="date" value={e.saisies.rdvDate} onChange={(ev) => e.surChamp('rdvDate', ev.target.value)} />
				</Champ>
				<Champ libelle="Heure du rendez-vous" pour="cr-f-heure">
					<Saisie id="cr-f-heure" type="time" value={e.saisies.rdvHeure} onChange={(ev) => e.surChamp('rdvHeure', ev.target.value)} />
				</Champ>
				<Champ libelle="Suivi effectué par" pour="cr-f-redacteur">
					<Saisie id="cr-f-redacteur" placeholder="votre nom" autoComplete="name" {...texte('redacteur')} />
				</Champ>
				<Champ libelle="Portable" pour="cr-f-portable">
					<Saisie id="cr-f-portable" type="tel" placeholder="votre portable" autoComplete="tel" {...texte('portable')} />
				</Champ>
				<Champ libelle="Avancement" pour="cr-f-avancement" pleineLargeur>
					<ZoneTexte id="cr-f-avancement" rows={4} placeholder="Démarrage des fondations prévu semaine…" {...texte('avancement')} />
				</Champ>
				<Champ libelle="Coordination" pour="cr-f-coordination" pleineLargeur
					aide="Une rubrique par lot : son intitulé suivi de « : » ; le texte en MAJUSCULES est surligné.">
					<ZoneTexte id="cr-f-coordination" rows={10} {...texte('coordination')} />
				</Champ>
			</GrilleChamps>
			<div className="flex flex-col gap-2">
				<Surtitre>Convocations — toucher pour changer</Surtitre>
				{lots.map((l) => {
					const c = e.saisies.convocations[l.id] ?? 'D';
					return (
						<div key={l.id} className="flex items-center justify-between gap-3 border-b border-rule pb-2 last:border-b-0">
							<div className="min-w-0">
								<div className="truncate text-14 font-medium">{l.designation}</div>
								<div className="truncate text-12 text-muted">{l.entreprise ?? '—'}</div>
							</div>
							<Bouton onClick={() => e.surConvocation(l.id)} aria-label={`Convocation ${l.designation} : ${SENS[c]}, toucher pour changer`}>
								<b>{c}</b>&nbsp;{SENS[c]}
							</Bouton>
						</div>
					);
				})}
			</div>
		</>
	);
}
