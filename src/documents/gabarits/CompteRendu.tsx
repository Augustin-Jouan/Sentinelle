import { Fragment, type KeyboardEvent } from 'react';
import type { ChampCompteRendu, Segment } from '@/domaine/compteRendu';
import type { SaisiesCompteRendu } from '../compteRendu';
import type { DonneesCompteRendu } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 8). Sans hook : dates et heure sont contrôlées par l'aperçu, les textes sont lus
 * quand on les quitte ; `generation` change quand un texte est remplacé de l'extérieur (« Repartir des lots »),
 * ce qui remonte les champs.
 */
export type EditionCompteRendu = {
	saisies: SaisiesCompteRendu;
	generation: number;
	surChamp: (champ: ChampCompteRendu, valeur: string) => void;
	surConvocation: (lotId: string) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

function Texte({ segments }: { segments: Segment[] }) {
	return <>{segments.map((s, i) => (s.surligne ? <mark key={i}>{s.texte}</mark> : <Fragment key={i}>{s.texte}</Fragment>))}</>;
}

/** Fac-similé de « COMPTE RENDU DE CHANTIER.doc » (maquette `renderCr`), A4 portrait, une ou plusieurs pages. */
export function CompteRendu({ donnees, mode, edition }: { donnees: DonneesCompteRendu; mode: ModeGabarit; edition?: EditionCompteRendu }) {
	const { contenu: c, societe } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	const texteCourt = (e: EditionCompteRendu, champ: 'redacteur' | 'portable', libelle: string, placeholder: string) => (
		<input key={`${champ}:${e.generation}`} className="cr-saisie" aria-label={libelle} placeholder={placeholder}
			defaultValue={e.saisies[champ]} onKeyDown={quitterSurEntree}
			onBlur={(ev) => { if (ev.currentTarget.value !== e.saisies[champ]) e.surChamp(champ, ev.currentTarget.value); }} />
	);
	const texteLong = (e: EditionCompteRendu, champ: 'avancement' | 'coordination', libelle: string, placeholder: string) => (
		<textarea key={`${champ}:${e.generation}`} className="cr-saisie" aria-label={libelle} placeholder={placeholder}
			defaultValue={e.saisies[champ]}
			onBlur={(ev) => { if (ev.currentTarget.value !== e.saisies[champ]) e.surChamp(champ, ev.currentTarget.value); }} />
	);
	const date = (e: EditionCompteRendu, champ: 'date' | 'rdvDate', libelle: string) => (
		<input type="date" className="cr-saisie" aria-label={libelle} value={e.saisies[champ]} onChange={(ev) => e.surChamp(champ, ev.target.value)} />
	);

	return (
		<article className="sheet sheet-doc sheet-cr">
			<table className="cr-tete">
				<tbody>
					<tr>
						<td className="cr-logo">
							{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
							<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
						</td>
						<td className="cr-adr">{societe.lignes.map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</td>
						<td className="cr-titre">COMPTE<br />RENDU DE<br />CHANTIER</td>
					</tr>
				</tbody>
			</table>
			<p className="cr-suivi">
				{ed ? (
					<>Suivi des travaux effectué par {texteCourt(ed, 'redacteur', 'Rédacteur', 'votre nom')} — Portable : {texteCourt(ed, 'portable', 'Portable', 'votre portable')}</>
				) : `Suivi des travaux effectué par ${c.redacteur}${c.portable ? ` — Portable : ${c.portable}` : ''}`}
			</p>
			<div className="cr-bloc">
				<p><b>RÉFÉRENCE CHANTIER :</b> {c.referenceChantier}{c.adresseChantier && <span className="cr-retrait">{c.adresseChantier}</span>}</p>
				<p><b>MAÎTRE D&apos;OUVRAGE :</b> {c.maitreOuvrage}</p>
				<div className="cr-ligne">
					<span><b>N° du Compte – Rendu :</b> {c.numero}</span>
					<span><b>Le :</b> {ed ? date(ed, 'date', 'Date du compte rendu') : c.date}</span>
					<span className="cr-rdv">
						<b>PROCHAIN RDV :</b> {ed ? (
							<>
								{date(ed, 'rdvDate', 'Date du prochain rendez-vous')}{' '}
								<input type="time" className="cr-saisie" aria-label="Heure du prochain rendez-vous" value={ed.saisies.rdvHeure}
									onChange={(ev) => ed.surChamp('rdvHeure', ev.target.value)} />
							</>
						) : c.prochainRdv}
					</span>
				</div>
				<p className="cr-legende">Légende : P = Présent / A = Absent / E = Excusé / <span className="cr-rouge">C = Convoqué au prochain RDV</span> / D = Diffusion</p>
				<table className="cr-lots">
					<thead><tr><th>Lot</th><th>Entreprise</th><th>Interlocuteur</th><th>Tél</th><th>Convocation</th></tr></thead>
					<tbody>
						{c.lots.length ? c.lots.map((l) => (
							<tr key={l.lotId}>
								<td>{l.lot}</td><td>{l.entreprise}</td><td>{l.interlocuteur}</td><td>{l.telephone}</td>
								<td className={l.convocation === 'C' ? 'cr-c' : undefined}>
									{ed ? (
										<button type="button" className={`cr-conv-bt${l.convocation === 'C' ? ' est-c' : ''}`} title="Cliquer pour changer : D, C, P, A, E"
											aria-label={`Convocation ${l.lot} : ${l.convocation}`} onClick={() => ed.surConvocation(l.lotId)}>{l.convocation}</button>
									) : l.convocation}
								</td>
							</tr>
						)) : <tr><td colSpan={5}>Aucun lot.</td></tr>}
					</tbody>
				</table>
			</div>
			<div className="cr-bloc cr-avancement">
				<span className="cr-souligne">AVANCEMENT :</span>
				<div>
					{ed ? texteLong(ed, 'avancement', 'Avancement', 'Démarrage des fondations prévu semaine 44')
						: c.avancement.map((l, i) => <Fragment key={i}>{i > 0 && '\n'}<Texte segments={l} /></Fragment>)}
				</div>
			</div>
			<div className="cr-bloc cr-co">
				<span className="cr-souligne">COORDINATION :</span>
				{ed ? (
					<>
						<p className="cr-aide">Un intitulé en MAJUSCULES suivi de « : » devient un titre souligné ; un titre sans rien dessous ne s&apos;imprime pas ; **texte** pour surligner.</p>
						{texteLong(ed, 'coordination', 'Coordination', 'GROS ŒUVRE :')}
					</>
				) : c.coordination.map((r, i) => (
					<Fragment key={i}>
						{r.titre && (
							<div className="cr-co-titre">
								{`${r.titre} :`}
								{r.suite.length > 0 && <> <span className="cr-co-suite"><Texte segments={r.suite} /></span></>}
							</div>
						)}
						{r.lignes.map((l, j) => <div key={j} className="cr-co-ligne"><Texte segments={l} /></div>)}
					</Fragment>
				))}
			</div>
			<div className="cr-pied"><span>SALUTATIONS</span><span>{c.redacteur}</span></div>
			<p className="cr-nb">NB : Sans réactions écrites de votre part à la réception de ce document, l&apos;ensemble des informations notées est considéré comme validé et accepté.</p>
		</article>
	);
}
