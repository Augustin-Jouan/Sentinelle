import type { Synthese as S } from '@/domaine/accueil';

const cellule = (k: string, v: React.ReactNode, sous: string, alerte = false) => (
	<div className={alerte ? 'synth-cell alerte' : 'synth-cell'}>
		<span className="synth-k">{k}</span><span className="synth-v">{v}</span><span className="synth-sous">{sous}</span>
	</div>
);

export function Synthese({ s }: { s: S }) {
	return (
		<div className="synthese">
			{cellule('Chantiers en cours', s.enCours, s.termines ? `${s.termines} terminé${s.termines > 1 ? 's' : ''} par ailleurs` : 'aucun terminé')}
			{cellule('Marchés engagés', s.ttcTexte, `${s.lots} lot${s.lots > 1 ? 's' : ''} au total`)}
			{cellule('Lots à attribuer', s.aAttribuer, s.aAttribuer ? 'aucune entreprise désignée' : 'tous les lots ont leur entreprise', s.aAttribuer > 0)}
			{cellule('Documents produits', s.documents, 'marchés et récapitulatifs')}
		</div>
	);
}
