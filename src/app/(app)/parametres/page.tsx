import { modifierParametreAction } from '@/actions/parametres';
import { exigerPage } from '@/auth/session';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { lireParametres, type ChampParametres } from '@/donnees/parametres';

const CHAMPS: { champ: ChampParametres; libelle: string; aide?: string }[] = [
	{ champ: 'raisonSociale', libelle: 'Raison sociale' },
	{ champ: 'libelleActivite', libelle: 'Activité' },
	{ champ: 'adresse', libelle: 'Adresse' },
	{ champ: 'cp', libelle: 'Code postal' },
	{ champ: 'ville', libelle: 'Ville' },
	{ champ: 'telephone', libelle: 'Téléphone' },
	{ champ: 'fax', libelle: 'Fax', aide: "Imprimé seulement s'il est renseigné." },
	{ champ: 'email', libelle: 'E-mail', aide: 'Imprimé sur les certificats de paiement, pas sur les marchés.' },
	{ champ: 'villeSignature', libelle: 'Ville de signature', aide: '« Fait à … le … »' },
	{ champ: 'rcs', libelle: 'RCS', aide: 'Certificats de paiement.' },
	{ champ: 'ape', libelle: 'Code APE', aide: 'Certificats de paiement.' },
	{ champ: 'tvaIntracommunautaire', libelle: 'N° TVA intracommunautaire', aide: 'Certificats de paiement — « FR », la clé, puis le SIREN.' },
];

export default async function PageParametres() {
	await exigerPage({ admin: true });
	const p = await lireParametres();
	return (
		<section className="max-w-2xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Paramètres de l&apos;entreprise</h1>
				<p className="text-sm text-muted-foreground">En-tête imprimé sur les marchés, le récapitulatif et les certificats de paiement. Chaque champ s&apos;enregistre quand on le quitte.</p>
			</div>
			<dl className="grid grid-cols-[12rem_1fr] items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-6">
				{CHAMPS.map(({ champ, libelle, aide }) => (
					<div key={champ} className="contents">
						<dt className="text-sm text-muted-foreground">{libelle}</dt>
						<dd>
							<ChampEnLigne libelle={libelle} valeur={p[champ] ?? ''} enregistrer={modifierParametreAction.bind(null, champ)} />
							{aide && <p className="px-1.5 text-xs text-muted-foreground">{aide}</p>}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}
