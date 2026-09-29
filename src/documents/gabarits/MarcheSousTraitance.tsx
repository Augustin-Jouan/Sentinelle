import type { DonneesMarcheSousTraitance } from '../schemas';
import { EnTete } from './EnTete';
import { Zone, type ModeGabarit, type Saisie } from './Zone';

export function MarcheSousTraitance({ donnees, mode, onSaisie }: { donnees: DonneesMarcheSousTraitance; mode: ModeGabarit; onSaisie?: Saisie }) {
	const { contenu: c, cadre } = donnees;
	const f = (t: string, classe = '') => <span className={`fill ${classe}`.trim()}>{t}</span>;
	return (
		<article className="sheet">
			<div className="col-l">
				<EnTete entete={cadre.entete} />
				<h4>MARCHE DE SOUS-TRAITANCE DE TRAVAUX</h4>
				<p className="ctr">Entre le Maître d&apos;œuvre SOCOREVE<br />et L&apos;ENTREPRISE SOUS-TRAITANTE, désignée ci-après</p>
				<p>ENT. {f(c.entreprise)}</p>
				<p><span className="lbl">Entrepreneur de :</span> <Zone cle="corpsEtat" valeur={c.corpsEtat} mode={mode} onSaisie={onSaisie} placeholder="corps d'état" /></p>
				<p><span className="lbl">Adresse :</span> {f(c.adresseEntreprise)}</p>
				<p className="ctr">s&apos;engage à exécuter les travaux :</p>
				<p className="ctr-b"><Zone cle="travaux" valeur={c.travaux} mode={mode} onSaisie={onSaisie} placeholder="travaux à exécuter" /></p>
				<p className="ctr">nécessaire à la réalisation de :</p>
				<p className="ctr-b">{f(c.natureTravaux)}</p>
				<p><span className="lbl">Située :</span> {f(c.adresseChantier)}</p>
				<p className="ctr">dont le Maître d&apos;Ouvrage est :</p>
				<p className="ctr-b">{f(c.maitreOuvrage)}</p>
				<p>Il reconnaît avoir pris connaissance de l&apos;ensemble du dossier, avoir réalisé ses propres études et s&apos;être rendu sur les lieux de réalisation des dits travaux.</p>
				<p>Il s&apos;engage à prendre toutes les dispositions nécessaires pour mener les travaux à leur terme, à ses risques et périls, suivant :<br />
					1<sup>er</sup> DESCRIPTIF, 2<sup>ème</sup> PLANS, 3<sup>ème</sup> PLANNING établis par SOCOREVE et 4<sup>ème</sup> SON PROPRE DEVIS.</p>
				<p className="fine">(en cas de discordance entre les documents, ceux-ci seront pris en considération dans l&apos;ordre précédent et d&apos;importance décroissante)</p>
				<p className="ctr-b" style={{ marginTop: '1rem' }}><span className="lbl">Pour la somme T.T.C de :</span> {f(c.montantTtcTexte, 'big')}</p>
				<p className="ctr-b"><span className="lbl">T.V.A au taux de</span> {f(c.tvaTexte)}</p>
				<p style={{ marginTop: '0.875rem' }}>Ces travaux seront réalisés conformément aux normes, règlements et prescriptions techniques en vigueur à la date de leur réalisation, notamment aux D.T.U.</p>
			</div>
			<div className="col-r">
				<p>Le montant du marché indiqué ci-avant ne sera ni actualisé, ni révisé et il ne subira aucune majoration pour erreur ou omission.</p>
				<p>* Les travaux non exécutés seront déduits lors de la facturation.</p>
				<p>* Les travaux hors forfait ne pourront être exécutés qu&apos;après accord de SOCOREVE, et proposition écrite mentionnant leur évaluation, suivant les prix unitaires du devis de base.</p>
				<p>* Le montant des travaux supplémentaires exécutés sans accord de SOCOREVE, sera déduit du présent marché.</p>
				<p>* L&apos;entreprise sous-traitante s&apos;interdit de sous-traiter elle-même tout ou partie des travaux du présent marché sans l&apos;accord de SOCOREVE. Les travaux sous-traités sans accord ne donneront pas lieu à paiement.</p>
				<p>* Les factures seront datées de la fin du mois au cours duquel les travaux auront été réalisés, et devront parvenir en double exemplaire à SOCOREVE, avant le 5<sup>ème</sup> jour du mois suivant, pour vérification. Sinon elles ne seront prises en considération qu&apos;en fin de ce mois.</p>
				<p>* Après vérification, les situations seront réglées par traite acceptée à 60 jours maximum, avec application de la retenue de garantie légale de {f(c.retenueTexte)} %, et suivant les modalités suivantes : la retenue de garantie de {f(c.retenueTexte)} % sera débloquée au plus tard 6 mois après la réception des ouvrages.</p>
				<p>Les délais d&apos;exécution des travaux seront ceux mentionnés sur le planning général.</p>
				<p>Les pénalités de retard sont fixées au taux de 1/1000<sup>ème</sup> du montant du marché par jour de retard, s&apos;y ajoutent les conséquences supportées par les autres entreprises.</p>
				<p>SOCOREVE se réserve le droit de modifier le planning et éventuellement de faire arrêter les travaux sans contrepartie, dans le cas où le client cesserait ses paiements.</p>
				<p>Chaque entreprise devra posséder en état de validité, une police individuelle de responsabilité civile et une garantie décennale.</p>
				<p>Chaque entreprise est responsable des dommages causés aux autres corps d&apos;états et du nettoyage du chantier après chacune de ses interventions. En cas de défaillances, l&apos;entreprise de gros œuvre effectuera ce nettoyage aux frais des dites entreprises.</p>
				<p>En cas de désistement après signature du présent marché, l&apos;entreprise aura à sa charge l&apos;augmentation éventuelle du coût des ouvrages qui devraient être réalisés par une autre entreprise et les conséquences financières et juridiques du retard des travaux.</p>
				<p>Si les travaux sont repris par une autre entreprise, choisie par SOCOREVE, un relevé des ouvrages exécutés sera effectué contradictoirement.</p>
				<p>En l&apos;absence d&apos;accord amiable, tous les différends découlant du présent contrat seront soumis aux tribunaux compétents du siège social de SOCOREVE.</p>
				<p style={{ marginTop: '0.875rem' }}>{`Fait en double exemplaire, à ${cadre.villeSignature} le `}{f(c.dateSignature ?? cadre.dateGeneration)}</p>
				<div className="sign-row sign-row-2">
					<div>L&apos;Entreprise sous-traitant<br /><i>(lu et approuvé)</i></div>
					<div>SOCOREVE<br /><i>(lu et approuvé)</i></div>
				</div>
			</div>
		</article>
	);
}
