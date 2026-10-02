'use client';

import { useState } from 'react';
import { Champ, Saisie, ZoneTexte } from '@/composants/briques/Champ';
import { Surtitre } from '@/composants/briques/Surtitre';
import { CHIFFRES } from '@/composants/briques/typo';
import type { CleZone } from '@/documents/gabarits/Gabarit';
import type { DonneesDocument } from '@/documents/schemas';

type Marche = Extract<DonneesDocument, { type: 'MARCHE_GRE_A_GRE' | 'MARCHE_SOUS_TRAITANCE' }>;
const dateFr = (iso: string | null) => (iso ? iso.split('-').reverse().join('.') : 'date de la génération');

/** Une donnée reprise sur le marché, et d'où elle vient (ex-.frow, .src) ; le survol la relie à la feuille. */
const Ligne = ({ dt, dd, src, num }: { dt: string; dd: string; src: string; num?: boolean }) => (
	<dl className="grid cursor-default grid-cols-[7.5rem_minmax(0,1fr)] gap-3 rounded-xs border border-transparent px-1.75 py-1.25 hover:border-accent hover:bg-accent-soft">
		<dt className="text-12 text-muted">{dt}</dt>
		<dd className="text-13 [word-break:break-word]">{num ? <span className={CHIFFRES}>{dd || '—'}</span> : dd || '—'}<br />
			<span className="inline-block font-mono text-10 tracking-[0.02em] text-faint">{src}</span></dd>
	</dl>
);
/** Un groupe de lignes sous son surtitre souligné (ex-.fgroup). */
const Groupe = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
	<div className="flex flex-col gap-1.5"><Surtitre filet>{titre}</Surtitre>{children}</div>
);

export function ChampsMarche({ donnees, saisir }: { donnees: Marche; saisir: (cle: CleZone, texte: string) => void }) {
	const c = donnees.contenu;
	const gag = donnees.type === 'MARCHE_GRE_A_GRE';
	const [clause, setClause] = useState('clauseParticuliere' in c ? c.clauseParticuliere : '');
	const [corps, setCorps] = useState('corpsEtat' in c ? c.corpsEtat : '');
	const [travaux, setTravaux] = useState('travaux' in c ? c.travaux : '');
	return (
		<>
			<Groupe titre="Maître d'ouvrage">
				<Ligne dt="Mr / Mme" dd={c.maitreOuvrage} src="chantier · maitreOuvrage" />
				{'adresseClient' in c && <Ligne dt="Demeurant" dd={c.adresseClient} src="chantier · adresseMO" />}
			</Groupe>
			<Groupe titre="Entrepreneur">
				<Ligne dt="Entreprise" dd={c.entreprise} src="référentiel artisans" />
				<Ligne dt="Situé" dd={c.adresseEntreprise} src="référentiel artisans" />
			</Groupe>
			<Groupe titre="Opération">
				<Ligne dt="Construction" dd={c.natureTravaux} src="chantier · natureTravaux" />
				<Ligne dt="Située" dd={c.adresseChantier} src="chantier · adresseChantier" />
				{'lotTexte' in c && <Ligne dt="Lots" dd={c.lotTexte} src="lot · numero + designation" />}
				{'destinataireFactures' in c && <Ligne dt="Factures adressées" dd={c.destinataireFactures} src="chantier · mission" />}
			</Groupe>
			<Groupe titre="Montant">
				<Ligne dt="Montant TTC" dd={c.montantTtcTexte} src="lot · montantHT + TVA" num />
				<Ligne dt="T.V.A. au taux de" dd={c.tvaTexte} src="lot · tauxTva" />
				<Ligne dt="Fait le" dd={dateFr(c.dateSignature)} src="lot · dateSignature, sinon chantier" />
			</Groupe>
			{gag ? (
				<Groupe titre="Clause particulière">
					<Champ>
						<ZoneTexte rows={3} placeholder="Texte libre imprimé en bas du marché…" aria-label="Clause particulière" value={clause}
							onChange={(e) => setClause(e.target.value)} onBlur={() => saisir('clauseParticuliere', clause)} />
					</Champ>
				</Groupe>
			) : (
				<Groupe titre="Sous-traitance">
					<Champ libelle="Entrepreneur de" pour="g-corps" aide={<>Le corps d&apos;état, tel qu&apos;il s&apos;imprime sous le nom de l&apos;entreprise.</>}>
						<Saisie id="g-corps" placeholder="escalier" value={corps} onChange={(e) => setCorps(e.target.value)} onBlur={() => saisir('corpsEtat', corps)} />
					</Champ>
					<Champ libelle="S'engage à exécuter les travaux" pour="g-travaux">
						<ZoneTexte id="g-travaux" rows={2} placeholder="fourniture et pose d'un escalier" value={travaux}
							onChange={(e) => setTravaux(e.target.value)} onBlur={() => saisir('travaux', travaux)} />
					</Champ>
				</Groupe>
			)}
		</>
	);
}
