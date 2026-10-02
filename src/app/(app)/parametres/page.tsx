import { modifierParametreAction } from '@/actions/parametres';
import { exigerPage } from '@/auth/session';
import { ChampEnLigne } from '@/composants/ChampEnLigne';
import { Champ, ColonnesFormulaire, GrilleChamps, GroupeChamps } from '@/composants/briques/Champ';
import { Ecran } from '@/composants/briques/Ecran';
import { lireParametres, type ChampParametres } from '@/donnees/parametres';

const CHAMPS: { champ: ChampParametres; libelle: string; aide?: string }[] = [
	{ champ: 'raisonSociale', libelle: 'Raison sociale' },
	{ champ: 'libelleActivite', libelle: 'Activité' },
	{ champ: 'adresse', libelle: 'Adresse' },
	{ champ: 'cp', libelle: 'Code postal' },
	{ champ: 'ville', libelle: 'Ville' },
	{ champ: 'telephone', libelle: 'Téléphone' },
	{ champ: 'fax', libelle: 'Fax', aide: "Imprimé seulement s'il est renseigné." },
	{ champ: 'email', libelle: 'E-mail', aide: 'Imprimé sur les certificats, les comptes rendus et les PV de réception, pas sur les marchés.' },
	{ champ: 'villeSignature', libelle: 'Ville de signature', aide: '« Fait à … le … »' },
	{ champ: 'rcs', libelle: 'RCS', aide: 'Certificats de paiement.' },
	{ champ: 'ape', libelle: 'Code APE', aide: 'Certificats de paiement.' },
	{ champ: 'tvaIntracommunautaire', libelle: 'N° TVA intracommunautaire', aide: 'Certificats de paiement — « FR », la clé, puis le SIREN.' },
	{ champ: 'siteWeb', libelle: 'Site web', aide: 'Imprimé sur les comptes rendus.' },
];

export default async function PageParametres() {
	await exigerPage({ admin: true });
	const p = await lireParametres();
	return (
		<Ecran titre="Paramètres de l'entreprise">
			<ColonnesFormulaire>
				<GroupeChamps titre="En-tête des documents">
					<p>Imprimé sur les marchés, le récapitulatif, les certificats de paiement, les comptes rendus et les PV de réception. Chaque champ s&apos;enregistre quand on le quitte.</p>
					<GrilleChamps>
						{CHAMPS.map(({ champ, libelle, aide }) => (
							<Champ key={champ} libelle={libelle} pour={`p-${champ}`} aide={aide}>
								<ChampEnLigne id={`p-${champ}`} variante="champ" libelle={libelle} valeur={p[champ] ?? ''} enregistrer={modifierParametreAction.bind(null, champ)} />
							</Champ>
						))}
					</GrilleChamps>
				</GroupeChamps>
			</ColonnesFormulaire>
		</Ecran>
	);
}
