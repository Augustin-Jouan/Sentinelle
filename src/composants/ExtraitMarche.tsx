import { cx } from '@/composants/briques/cx';
import { LienAction } from '@/composants/briques/LienAction';
import { nomFichierMarche } from '@/domaine/fichiers';
import { destinataireFactures, type Mission } from '@/domaine/regles';

/** Les mentions du marché qu'un champ du formulaire remplit. */
export type Mention = 'maitreOuvrage' | 'adresseClient' | 'natureTravaux' | 'adresseChantier' | 'factures' | 'date' | 'reference';

type Props = {
	valeurs: {
		maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresseChantier: string;
		mission: Mission; dateSignaturePrevue: string; reference: string;
	};
	/** La mention que remplit le champ qui a le focus : elle passe en zone bleue, comme dans l'aperçu. */
	active: Mention | null;
	raisonSociale: string;
	villeSignature: string;
	onExemple: () => void;
};

/** Un blanc du marché (ex-.fill) ; actif, il prend le bleu des zones de saisie (ex-.zone), qui ne s'imprime pas. */
function Blanc({ valeur, actif, vide }: { valeur: string; actif: boolean; vide?: string }) {
	return (
		<span data-actif={actif || undefined}
			className={cx('inline-block border-b border-feuille-trait px-0.75 whitespace-pre-wrap transition-colors duration-120',
				'data-actif:border-feuille-zone-trait data-actif:bg-feuille-zone',
				// Vide, le blanc reste assez long pour se lire comme une ligne à remplir.
				valeur ? 'min-w-16 font-semibold' : 'min-w-32 italic text-feuille-gris')}>
			{valeur || vide || ' '}
		</span>
	);
}

const Coupure = () => <p aria-hidden="true" className="my-2.5 text-center text-feuille-gris">[…]</p>;

/** « 2026-10-02 » → « 02.10.2026 », comme formatDateCalendaire sur le marché. */
const dateImprimee = (iso: string) => iso.split('-').reverse().join('.');

/**
 * Ce que les marchés de ce chantier imprimeront : un extrait du marché de gré à gré (MarcheGreAGre), rempli à mesure de la saisie.
 * Il remplace les aides « imprimé sous la mention … » : on voit où va chaque champ.
 */
export function ExtraitMarche({ valeurs: v, active, raisonSociale, villeSignature, onExemple }: Props) {
	const lbl = 'text-feuille-gris';
	const reference = v.reference.trim() || v.maitreOuvrage.trim();
	const fichier = nomFichierMarche({ reference: reference || 'REFERENCE', numero: '02', designation: 'GROS ŒUVRE', nature: 'GRE_A_GRE', version: 1 });
	return (
		<figure className="m-0 flex flex-col gap-3">
			<div className="border border-feuille-trait bg-feuille px-7 pt-5 pb-6 text-12 leading-[1.55] text-feuille-encre shadow-ombre">
				<p className="text-11 font-semibold">{raisonSociale}</p>
				<p className="mt-4 mb-3.5 text-center font-titre text-15 font-bold tracking-capitales">MARCHE DE TRAVAUX DE GRE A GRE</p>
				<p className="my-2.5 text-center italic">Entre les soussignés :</p>
				<p className="my-2"><Blanc valeur={v.maitreOuvrage} actif={active === 'maitreOuvrage'} /></p>
				<p className="my-2"><span className={lbl}>Demeurant :</span> <Blanc valeur={v.adresseClient} actif={active === 'adresseClient'} /></p>
				<p className="my-2.5 text-center italic">D&apos;une part, le Maître d&apos;Ouvrage</p>
				<Coupure />
				<p className="my-2"><Blanc valeur={v.maitreOuvrage} actif={active === 'maitreOuvrage'} /><br />
					Maître d&apos;Ouvrage, a fait établir par SOCOREVE, les plans et descriptifs des travaux nécessaires à la réalisation de l&apos;opération suivante :</p>
				<p className="my-1.5 text-center"><Blanc valeur={v.natureTravaux} actif={active === 'natureTravaux'} /></p>
				<p className="my-1.5 text-center"><span className={lbl}>Située :</span> <Blanc valeur={v.adresseChantier} actif={active === 'adresseChantier'} /></p>
				<Coupure />
				<p className={cx('my-2 text-11', lbl)}>* Les factures […] devront parvenir en double exemplaire{' '}
					<Blanc valeur={destinataireFactures('GRE_A_GRE', v.mission)} actif={active === 'factures'} />, avant le 5<sup>ème</sup> jour du mois suivant, pour vérification.</p>
				<p className="mt-3.5">Fait en triple exemplaire à {villeSignature} le :{' '}
					<Blanc valeur={v.dateSignaturePrevue ? dateImprimee(v.dateSignaturePrevue) : ''} vide="jour de l'édition" actif={active === 'date'} /></p>
			</div>
			<figcaption className="flex flex-col gap-1.5 text-12 text-muted">
				<span>Extrait d&apos;un marché de gré à gré, tel que ce chantier l&apos;imprimera.</span>
				<span className="min-w-0 break-all">
					Fichier du lot 02 :{' '}
					<span data-actif={active === 'reference' || undefined}
						className="rounded-xs px-1 font-mono text-11 text-ink-2 transition-colors duration-120 data-actif:bg-accent-soft data-actif:text-accent-2">
						{fichier}
					</span>
				</span>
				<LienAction onClick={onExemple} className="self-start">Remplir avec un exemple</LienAction>
			</figcaption>
		</figure>
	);
}
