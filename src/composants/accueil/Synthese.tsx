import { cx } from '@/composants/briques/cx';
import { CHIFFRES, CLE } from '@/composants/briques/typo';
import type { Synthese as S } from '@/domaine/accueil';

/** Une case de la synthèse (ex-.synth-cell) : la clé, la valeur en chiffres (en danger si alerte), la précision. */
const cellule = (k: string, v: React.ReactNode, sous: string, alerte = false) => (
	<div className="bg-raise px-4.5 pt-3.5 pb-3.75">
		<div className={cx(CLE, 'mb-0.75')}>{k}</div>
		<span className={cx(CHIFFRES, 'text-22 leading-[1.1]', alerte && 'text-danger')}>{v}</span>
		<div className="mt-0.75 text-12 text-muted">{sous}</div>
	</div>
);

/** Ce qu'on veut savoir en arrivant (ex-.synthese) : un filet d'un pixel entre les cases, c'est le fond qui le dessine. */
export function Synthese({ s }: { s: S }) {
	return (
		<div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-px overflow-hidden rounded-md border border-rule bg-rule shadow-ombre">
			{cellule('Chantiers en cours', s.enCours, s.termines ? `${s.termines} terminé${s.termines > 1 ? 's' : ''} par ailleurs` : 'aucun terminé')}
			{cellule('Marchés engagés', s.ttcTexte, `${s.lots} lot${s.lots > 1 ? 's' : ''} au total`)}
			{cellule('Lots à attribuer', s.aAttribuer, s.aAttribuer ? 'aucune entreprise désignée' : 'tous les lots ont leur entreprise', s.aAttribuer > 0)}
			{cellule('Documents produits', s.documents, 'marchés et récapitulatifs')}
		</div>
	);
}
