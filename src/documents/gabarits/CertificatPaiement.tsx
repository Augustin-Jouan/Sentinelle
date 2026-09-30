import { Fragment, type KeyboardEvent } from 'react';
import type { DonneesCertificat } from '../schemas';
import { LOGO_SOCOREVE } from './logo';
import type { ModeGabarit } from './Zone';

/**
 * Saisies de l'aperçu (Task 8). Sans hook : les champs sont contrôlés par l'aperçu (cumul, mois, date)
 * ou lus quand on les quitte (acomptes antérieurs), comme les zones des marchés.
 */
export type EditionCertificat = {
	cumul: string;
	mois: string;
	date: string;
	/** Acomptes antérieurs saisissables tant que le lot n'a aucun certificat ; sinon `null`. */
	acomptes: { id: string; saisie: string }[] | null;
	surCumul: (texte: string) => void;
	surMois: (mois: string) => void;
	surDate: (date: string) => void;
	surCaution: () => void;
	/** `id` nul : nouvel acompte ; texte vide : suppression. */
	surAcompte: (id: string | null, texte: string) => void;
};

const quitterSurEntree = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') e.currentTarget.blur(); };

/** Fac-similé du certificat SOCOREVE (maquette `renderCpSheet`), A4 portrait. */
export function CertificatPaiement({ donnees, mode, edition }: { donnees: DonneesCertificat; mode: ModeGabarit; edition?: EditionCertificat }) {
	const { contenu: c, societe: s } = donnees;
	const ed = mode === 'edition' ? edition : undefined;

	function celluleAcompte(i: number, montant: string) {
		const acomptes = ed?.acomptes;
		if (!acomptes) return montant;
		const a = acomptes[i];
		if (a) {
			return (
				<input key={`${a.id}:${a.saisie}`} className="zone cp-saisie" aria-label={`Acompte ${i + 1} HT`} defaultValue={a.saisie}
					onKeyDown={quitterSurEntree} onBlur={(e) => { if (e.currentTarget.value !== a.saisie) ed.surAcompte(a.id, e.currentTarget.value); }} />
			);
		}
		if (i !== acomptes.length) return '';
		return (
			<input key={`ajout:${acomptes.length}`} className="zone cp-saisie" aria-label="Ajouter un acompte antérieur" placeholder="ajouter"
				onKeyDown={quitterSurEntree}
				onBlur={(e) => {
					const texte = e.currentTarget.value;
					if (!texte.trim()) return;
					e.currentTarget.value = '';
					ed.surAcompte(null, texte);
				}} />
		);
	}

	return (
		<article className="sheet sheet-doc sheet-cp">
			<div className="cp-tete">
				{/* eslint-disable-next-line @next/next/no-img-element -- data URI, imprimée par Chromium sans réseau */}
				<img src={LOGO_SOCOREVE} alt="SOCOREVE" />
				<div className="cp-adr">{s.adresseLigne}<br />{s.contactLigne}<br />{s.rcsLigne}<br />{s.tvaLigne}</div>
			</div>
			<div className="cp-cadre">
				<div className="cp-titre">{`CERTIFICAT DE PAIEMENT N° ${c.numero}`}</div>
				<dl className="cp-kv">
					<dt>Maître de l&apos;Ouvrage :</dt><dd>{c.maitreOuvrage}</dd>
					<dt>Objet du marché :</dt><dd>{c.objet}{c.adresseChantier && <><br />{c.adresseChantier}</>}</dd>
					<dt>{`Lot n° ${c.lotNumero}`}</dt><dd>{c.lot}</dd>
					<dt>Titulaire :</dt><dd>{c.titulaire}</dd>
				</dl>
			</div>
			<div className="cp-cadre cp-montants">
				<span className="k">Montant du marché HT :</span><span className="v">{c.marcheHt}</span>
				<span className="av-titre">AVENANTS :</span>
				{c.avenants.map((a, i) => (
					<Fragment key={i}><span className="k">{a.libelle}</span><span className="v">{a.montant}</span></Fragment>
				))}
				<span className="k">Total HT :</span><span className="v">{c.totalHt}</span>
				<span className="k">TVA :</span><span className="v">{c.totalTva}</span>
				<span className="k">Total TTC :</span><span className="v">{c.totalTtc}</span>
			</div>
			<div className="cp-bande">
				{`État d'acompte n° ${c.numero} mois de `}
				{ed
					? <input type="month" className="cp-saisie cp-date" aria-label="Mois de l'acompte" value={ed.mois} onChange={(e) => ed.surMois(e.target.value)} />
					: c.mois}
			</div>
			<div className="cp-deux">
				<table className="cp-t cp-prec">
					<tbody>
						<tr><th colSpan={2}>Acomptes précédents</th></tr>
						<tr><th>N°</th><th>Montant HT</th></tr>
						{c.precedents.map((p, i) => (
							<tr key={i}><td>{p.numero}</td><td className="m">{celluleAcompte(i, p.montant)}</td></tr>
						))}
						<tr><td>Total HT</td><td className="m">{c.precedentsHt}</td></tr>
						<tr><td>TVA</td><td className="m">{c.precedentsTva}</td></tr>
						<tr><td>Total TTC</td><td className="m">{c.precedentsTtc}</td></tr>
					</tbody>
				</table>
				<table className="cp-t cp-titu">
					<tbody>
						<tr><th className="vide" /><th>Titulaire</th></tr>
						<tr>
							<td className="k">Montant des travaux réalisés HT :</td>
							<td className="m">
								{ed
									? <input className="zone cp-saisie" inputMode="decimal" aria-label="Montant des travaux réalisés HT (cumul)" placeholder="à saisir"
										value={ed.cumul} onChange={(e) => ed.surCumul(e.target.value)} />
									: c.realise}
							</td>
						</tr>
						<tr><td className="k">Montant total des acomptes précédents HT :</td><td className="m">{c.precedentsHt}</td></tr>
						<tr><td className="k">Montant du présent acompte HT :</td><td className="m">{c.presentHt}</td></tr>
						<tr><td className="k">Montant de la TVA :</td><td className="m">{c.presentTva}</td></tr>
						<tr><td className="k">Montant du présent acompte TTC :</td><td className="m">{c.presentTtc}</td></tr>
						<tr className="mandat"><td className="k">Montant total mandaté :</td><td className="m">{c.mandate}</td></tr>
						<tr>
							<td className="k">Caution bancaire (OUI/NON)</td>
							<td className="m cp-centre">
								{ed ? (
									<>
										<button type="button" className="cp-caution" aria-label={`Caution bancaire : ${c.caution === 'OUI' ? 'oui' : 'non'}`} title="Cliquer pour changer" onClick={ed.surCaution}>{c.caution}</button>
										<small className="cp-note">Enregistré sur le lot, vaut pour les certificats suivants.</small>
									</>
								) : c.caution}
							</td>
						</tr>
						<tr><td className="k">Dont retenue de garantie :</td><td className="m">{c.retenue}</td></tr>
					</tbody>
				</table>
			</div>
			<p className="cp-certif">
				Le Maître d&apos;œuvre soussigné certifie qu&apos;il peut être mandaté la somme de :
				<span className="cp-somme">{c.mandate || (ed ? <span className="cp-vide">à calculer</span> : '')}</span>
			</p>
			<p className="cp-fait">
				{`Fait à ${s.villeSignature} le : `}
				{ed ? <input type="date" className="cp-saisie cp-date" aria-label="Fait le" value={ed.date} onChange={(e) => ed.surDate(e.target.value)} /> : c.faitLe}
			</p>
			<p className="cp-sign">Le Maître d&apos;œuvre</p>
		</article>
	);
}
