'use client';

import { useState } from 'react';
import type { CleZone } from '@/documents/gabarits/Gabarit';
import type { DonneesDocument } from '@/documents/schemas';

type Marche = Extract<DonneesDocument, { type: 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' }>;
const dateFr = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : 'date de la génération');

const Ligne = ({ dt, dd, src, num }: { dt: string; dd: string; src: string; num?: boolean }) => (
	<dl className="frow"><dt>{dt}</dt><dd>{num ? <span className="num">{dd || '—'}</span> : dd || '—'}<br /><span className="src">{src}</span></dd></dl>
);

export function ChampsMarche({ donnees, saisir }: { donnees: Marche; saisir: (cle: CleZone, texte: string) => void }) {
	const c = donnees.contenu;
	const gag = donnees.type === 'MARCHE_GRE_A_GRE';
	const [clause, setClause] = useState('clauseParticuliere' in c ? c.clauseParticuliere : '');
	const [corps, setCorps] = useState('corpsEtat' in c ? c.corpsEtat : '');
	const [travaux, setTravaux] = useState('travaux' in c ? c.travaux : '');
	return (
		<>
			<div className="fgroup">
				<span className="eyebrow">Maître d&apos;ouvrage</span>
				<Ligne dt="Mr / Mme" dd={c.maitreOuvrage} src="chantier · maitreOuvrage" />
				{'adresseClient' in c && <Ligne dt="Demeurant" dd={c.adresseClient} src="chantier · adresseMO" />}
			</div>
			<div className="fgroup">
				<span className="eyebrow">Entrepreneur</span>
				<Ligne dt="Entreprise" dd={c.entreprise} src="référentiel artisans" />
				<Ligne dt="Situé" dd={c.adresseEntreprise} src="référentiel artisans" />
			</div>
			<div className="fgroup">
				<span className="eyebrow">Opération</span>
				<Ligne dt="Construction" dd={c.natureTravaux} src="chantier · natureTravaux" />
				<Ligne dt="Située" dd={c.adresseChantier} src="chantier · adresseChantier" />
				{'lotTexte' in c && <Ligne dt="Lots" dd={c.lotTexte} src="lot · numero + designation" />}
				{'destinataireFactures' in c && <Ligne dt="Factures adressées" dd={c.destinataireFactures} src="chantier · mission" />}
			</div>
			<div className="fgroup">
				<span className="eyebrow">Montant</span>
				<Ligne dt="Montant TTC" dd={c.montantTtcTexte} src="lot · montantHT + TVA" num />
				<Ligne dt="T.V.A. au taux de" dd={c.tvaTexte} src="lot · tauxTva" />
				<Ligne dt="Fait le" dd={dateFr(c.dateSignature)} src="lot · dateSignature, sinon chantier" />
			</div>
			{gag ? (
				<div className="fgroup">
					<span className="eyebrow">Clause particulière</span>
					<div className="field">
						<textarea rows={3} placeholder="Texte libre imprimé en bas du marché…" aria-label="Clause particulière" value={clause}
							onChange={(e) => setClause(e.target.value)} onBlur={() => saisir('clauseParticuliere', clause)} />
					</div>
				</div>
			) : (
				<div className="fgroup">
					<span className="eyebrow">Sous-traitance</span>
					<div className="field">
						<label htmlFor="g-corps">Entrepreneur de</label>
						<input id="g-corps" placeholder="escalier" value={corps} onChange={(e) => setCorps(e.target.value)} onBlur={() => saisir('corpsEtat', corps)} />
						<span className="hint">Le corps d&apos;état, tel qu&apos;il s&apos;imprime sous le nom de l&apos;entreprise.</span>
					</div>
					<div className="field">
						<label htmlFor="g-travaux">S&apos;engage à exécuter les travaux</label>
						<textarea id="g-travaux" rows={2} placeholder="fourniture et pose d'un escalier" value={travaux}
							onChange={(e) => setTravaux(e.target.value)} onBlur={() => saisir('travaux', travaux)} />
					</div>
				</div>
			)}
		</>
	);
}
