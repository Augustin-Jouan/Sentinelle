import { Fragment, type KeyboardEvent, type ReactNode } from 'react';
import { LIBELLES_DECISIONS, type ChampReception, type ChampReceptionCommun, type Decision } from '@/domaine/reception';
import type { SaisiesReception, SaisiesReceptionCommunes } from '../reception';
import type { DonneesReception } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 9), sans hook : les dates sont contrôlées, les textes sont lus quand on les quitte.
 * Chaque texte a pour clé sa valeur : un champ commun changé sur une autre page remonte ici.
 */
export type EditionReception = {
	saisies: SaisiesReception;
	commun: SaisiesReceptionCommunes;
	surChamp: (champ: Exclude<ChampReception, 'decision'>, valeur: string) => void;
	surCommun: (champ: ChampReceptionCommun, valeur: string) => void;
	surDecision: (decision: Decision) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };
const Blanc = ({ children }: { children?: ReactNode }) => <span className="pv-blanc">{children || ' '}</span>;
const V = ({ children }: { children: ReactNode }) => <span className="pv-v">{children}</span>;

/** Fac-similé de « 3- PV de réception.ods » (maquette `pagePv`), A4 portrait, une page. */
export function ProcesVerbalReception({ donnees, mode, edition }: { donnees: DonneesReception; mode: ModeGabarit; edition?: EditionReception }) {
	const { contenu: c, societe } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	const texte = (valeur: string, libelle: string, placeholder: string, ecrire: (v: string) => void, max = 120) => (
		<input key={`${libelle}:${valeur}`} className="pv-saisie" aria-label={libelle} placeholder={placeholder} maxLength={max}
			defaultValue={valeur} onKeyDown={quitterSurEntree}
			onBlur={(e) => { if (e.currentTarget.value !== valeur) ecrire(e.currentTarget.value); }} />
	);
	const date = (valeur: string, libelle: string, ecrire: (v: string) => void) => (
		<input type="date" className="pv-saisie" aria-label={libelle} value={valeur} onChange={(e) => ecrire(e.target.value)} />
	);
	const coche = (d: Decision) => (ed ? (
		<button type="button" className="pv-case pv-case-bt" title="Choisir" aria-pressed={c.decision === d} aria-label={LIBELLES_DECISIONS[d]}
			onClick={() => ed.surDecision(d)}>{c.decision === d ? '✕' : ''}</button>
	) : <span className="pv-case">{c.decision === d ? '✕' : ''}</span>);
	const effet = (d: Decision) => (c.decision !== d ? <Blanc /> : ed ? (
		<span className="pv-blanc">{date(ed.saisies.dateEffet || ed.commun.date, "Date d'effet", (v) => ed.surChamp('dateEffet', v))}</span>
	) : <Blanc>{c.effet}</Blanc>);

	return (
		<article className="sheet sheet-doc sheet-pv">
			<div className="pv-tete">
				{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
				<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
				<div>
					<div className="pv-adr">{societe.lignes.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</div>
					<div className="pv-titre">PROCÈS-VERBAL DE RÉCEPTION<br />DES TRAVAUX ENTREPRISE</div>
				</div>
			</div>
			<p className="pv-date">En date du : {ed ? date(ed.commun.date, 'Date de la réception', (v) => ed.surCommun('date', v)) : <V>{c.enDateDu}</V>}</p>
			<dl className="pv-cadre">
				<dt className="fort">Maître d&apos;ouvrage :</dt><dd className="fort">{c.maitreOuvrage}</dd>
				<dt>Adresse des travaux :</dt><dd>{c.adresseTravaux}<br />{c.cpCommune}</dd>
			</dl>
			<div className="pv-corps">
				<p>
					Je, soussigné {ed ? texte(ed.commun.signataire, "Signataire pour le maître d'ouvrage", c.maitreOuvrage, (v) => ed.surCommun('signataire', v)) : <V>{c.soussigne}</V>}
					{c.representantDe && <> représentant de <V>{c.representantDe}</V></>} maître de l&apos;ouvrage,
				</p>
				<p>assisté du maître d&apos;œuvre SOCOREVE représenté par {ed ? texte(ed.commun.maitreOeuvre, "Maître d'œuvre", 'votre nom', (v) => ed.surCommun('maitreOeuvre', v)) : <V>{c.maitreOeuvre}</V>}</p>
				<p>et en présence de l&apos;entreprise <V>{c.entreprise}</V></p>
				<p>représentée par {ed ? texte(ed.saisies.representant, 'Entreprise représentée par', 'interlocuteur', (v) => ed.surChamp('representant', v)) : <V>{c.representant}</V>}</p>
				<p>titulaire du lot <V>{c.lot}</V></p>
				<p>des travaux exécutés pour mon compte à l&apos;adresse ci-dessus, au titre du contrat de maîtrise d&apos;œuvre {c.mission} du{' '}{ed ? date(ed.commun.contrat, "Date du contrat de maîtrise d'œuvre", (v) => ed.surCommun('contrat', v)) : <V>{c.contrat || '    '}</V>}, déclare que :</p>
			</div>
			<div className="pv-choix">
				<div>{coche('SANS_RESERVES')}<span>la réception est prononcée sans réserves, avec effet à la date du : {effet('SANS_RESERVES')}.</span></div>
				<div>{coche('AVEC_RESERVES')}<span>la réception est prononcée avec réserves (réserves mentionnées ci-après), avec effet à la date du : {effet('AVEC_RESERVES')}.</span></div>
				<div>
					{coche('DIFFEREE')}
					<span>la réception est différée pour les motifs suivants : {c.decision !== 'DIFFEREE' ? <Blanc /> : ed
						? texte(ed.saisies.motifs, 'Motifs du report', 'motifs du report', (v) => ed.surChamp('motifs', v), 2000)
						: <Blanc>{c.motifs}</Blanc>}.</span>
				</div>
			</div>
			<hr className="pv-sep" /><div className="pv-rubrique">NATURE DES RÉSERVES</div><hr className="pv-sep" />
			{ed ? (
				<div className="pv-reserves">
					{c.decision === 'AVEC_RESERVES' ? (
						<textarea key={`reserves:${ed.saisies.reserves}`} className="pv-saisie" aria-label="Nature des réserves" placeholder="Une réserve par ligne"
							maxLength={2000} defaultValue={ed.saisies.reserves}
							onBlur={(e) => { if (e.currentTarget.value !== ed.saisies.reserves) ed.surChamp('reserves', e.currentTarget.value); }} />
					) : <p className="pv-aide">Cochez « avec réserves » plus haut pour en saisir.</p>}
				</div>
			) : <div className="pv-reserves">{c.reserves.join('\n')}</div>}
			<hr className="pv-sep" />
			<p className="pv-phrase">
				Le maître d&apos;œuvre et le maître de l&apos;ouvrage conviennent que les travaux nécessaires pour lever les réserves mentionnées ci-dessus,
				seront exécutés dans un délai de {c.decision !== 'AVEC_RESERVES' ? <Blanc /> : ed
					? texte(ed.saisies.delai, 'Délai pour lever les réserves', '30 jours', (v) => ed.surChamp('delai', v))
					: <Blanc>{c.delai}</Blanc>}, à compter de ce jour.
			</p>
			<p className="pv-phrase">
				Pour garantir la levée de ces réserves, la retenue de garantie qui est de {c.retenue} % sera restituée à l&apos;entreprise soit après que le
				procès-verbal de levée de réserves soit signé par les deux parties soit dans un délai maximum de 6 mois après la levée de réserves comme
				indiqué sur le contrat de marché.
			</p>
			<div className="pv-signs"><span>Signature du maître de l&apos;ouvrage</span><span>Signature de l&apos;entreprise</span><span>Signature du maître d&apos;œuvre</span></div>
			<hr className="pv-sep" /><div className="pv-rubrique">CONSTAT DE LEVÉE DE RÉSERVES</div><hr className="pv-sep" />
			<p className="pv-phrase">
				Le maître de l&apos;ouvrage et l&apos;entreprise, ci-dessus désignés, constatent qu&apos;il a été valablement remédié aux malfaçons, omissions, imperfections concernées.
			</p>
			<div className="pv-fait"><span>Fait à <Blanc /></span><span>le <Blanc /></span><span>Signature du maître de l&apos;ouvrage</span></div>
		</article>
	);
}
