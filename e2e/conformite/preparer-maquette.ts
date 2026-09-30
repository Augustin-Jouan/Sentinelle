import 'dotenv/config';
import { construireDonneesMarche, construireDonneesRecap } from '../../src/documents/donnees';
import { empreinteDocument } from '../../src/documents/batir';
import { SERIES } from '../../src/documents/series';
import { lundiIso } from '../../src/domaine/semaines';
import { prisma } from '../../src/donnees/prisma';

/*
 * Le jeu de démonstration de la maquette (seed(), l. 3075-3150), à l'identique : les 4 chantiers, leurs lots,
 * avenants, périodes, fermetures et les 6 documents de PERRIER. Base de test seulement.
 */
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);
type L = [numero: string | null, designation: string, entreprise: string | null, ht: number, nature?: 'SOUS_TRAITANCE', plus?: { dateSignature?: string; avenants?: [devis: string, ht: number, date: string, objet: string][] }];

const PLAN: Record<string, [couleur: string, periodes: [string, number, number, number][]]> = {
	'TERRASSEMENT — V.R.D.': ['noir', [['Accès et plateforme', 2026, 15, 1], ['Terrassements finaux', 2026, 42, 2]]],
	'GROS ŒUVRE': ['noir', [['Fondations et soubassements', 2026, 16, 3], ['Élévation RDC', 2026, 20, 4], ['Plancher intermédiaire', 2026, 25, 2], ['Élévation étage', 2026, 28, 3], ['Appuis et seuils', 2026, 38, 1]]],
	'CHARPENTE': ['vert-clair', [['Montage charpente', 2026, 33, 2]]],
	'COUVERTURE': ['bleu-fonce', [['Couverture et gouttières', 2026, 36, 2]]],
	'MENUISERIES EXTÉRIEURES': ['vert-fonce', [['Pose des menuiseries', 2026, 38, 2], ['Réglages de fin de chantier', 2027, 8, 1]]],
	'ENDUIT EXTÉRIEUR': ['orange', [['Dégrossi des façades', 2026, 41, 2]]],
	'PLÂTRERIE — ISOLATION': ['jaune', [['Isolation périphérique', 2026, 43, 2], ['Plafonds et cloisons', 2026, 46, 3]]],
	'PLOMBERIE — CHAUFFAGE — V.M.C.': ['rouge', [['Réseaux avant doublage', 2026, 40, 1], ['Pose des appareils', 2026, 48, 2]]],
	'ÉLECTRICITÉ': ['rouge', [['Passage des réseaux', 2026, 40, 1], ['Appareillage', 2026, 49, 2]]],
	'CARRELAGE — FAÏENCE': ['violet', [['Chape', 2026, 50, 1], ['Carrelage et faïence', 2027, 2, 3]]],
	'ESCALIER': ['vert-fonce', [['Fourniture et pose', 2027, 3, 1]]],
	'MENUISERIES INTÉRIEURES': ['vert-fonce', [['Pose des portes', 2027, 5, 2]]],
	'PEINTURE': ['bleu-clair', [['Peintures', 2027, 7, 3]]],
};
const CHAINE = ['Accès et plateforme', 'Fondations et soubassements', 'Élévation RDC', 'Plancher intermédiaire', 'Élévation étage',
	'Montage charpente', 'Couverture et gouttières', 'Pose des menuiseries', 'Isolation périphérique', 'Plafonds et cloisons', 'Chape',
	'Carrelage et faïence', 'Pose des portes', 'Peintures'];

const CHANTIERS: { reference: string; maitreOuvrage: string; adresseClient: string; natureTravaux: string; adresse: string; cp: string; commune: string;
	mission: 'COMPLETE' | 'PARTIELLE'; dateSignaturePrevue: string | null; termine: boolean; creeLe: string; lots: L[]; planning?: true }[] = [
	{ reference: 'PERRIER — Louisfert', maitreOuvrage: 'M. et Mme PERRIER', adresseClient: '12 rue de la Barre, 44110 CHÂTEAUBRIANT',
		natureTravaux: "Construction d'une maison individuelle — 142 m² + garage", adresse: 'Le Haut Bois', cp: '44110', commune: 'LOUISFERT',
		mission: 'COMPLETE', dateSignaturePrevue: '2026-04-03', termine: false, creeLe: '2026-08-31', planning: true, lots: [
			['01', 'TERRASSEMENT — V.R.D.', 'GILLOT TP', 18400],
			['02', 'GROS ŒUVRE', 'CONSTRUCTIONS REBOURS', 96250, undefined, { dateSignature: '2026-04-03', avenants: [['106', 3720, '2026-05-18', 'Reprise de fondations en terrain hétérogène']] }],
			['03', 'CHARPENTE', 'CHARPENTE ET CONSTRUCTIONS BOIS', 21900],
			['04', 'COUVERTURE', 'AM COUVERTURE', 27480],
			['05', 'MENUISERIES EXTÉRIEURES', 'ISSÉ MENUISERIE', 34150, undefined, { dateSignature: '2026-04-10', avenants: [['241', -280, '2026-06-02', 'Volet roulant abandonné sur la porte de service']] }],
			['06', 'PLÂTRERIE — ISOLATION', 'PLÂTRERIE DELAUNAY', 29700],
			['07', 'MENUISERIES INTÉRIEURES', 'MENUISERIES DU DON', 16250],
			['08', 'ÉLECTRICITÉ', 'MATELEC', 14900],
			['09', 'PLOMBERIE — CHAUFFAGE — V.M.C.', 'CMP PLUMEJEAU', 23800],
			['10', 'CARRELAGE — FAÏENCE', 'MD CARRELAGE', 12600],
			['11', 'PEINTURE', "LA DÉCO'TECH", 9450],
			[null, 'ESCALIER', 'PASSION BOIS', 6800, 'SOUS_TRAITANCE'],
			['12', 'ENDUIT EXTÉRIEUR', null, 0],
		] },
	{ reference: 'GUÉRIN — Erbray', maitreOuvrage: 'M. GUÉRIN', adresseClient: '3 rue des Forges, 44110 ERBRAY', natureTravaux: 'Extension et surélévation — 68 m²',
		adresse: 'La Rivaudière', cp: '44110', commune: 'ERBRAY', mission: 'PARTIELLE', dateSignaturePrevue: '2026-02-10', termine: true, creeLe: '2026-08-01', lots: [
			// « LORAND MACONNERIE » dans la maquette (faute de frappe, hors référentiel) : l'entreprise du référentiel la remplace ; le chantier est terminé, donc masqué.
			['01', 'GROS ŒUVRE', 'LORAND MAÇONNERIE', 41200], ['02', 'CHARPENTE — COUVERTURE', 'BD COUVERTURE', 38600],
			['03', 'MENUISERIES EXTÉRIEURES', 'MENUISERIE SAVOURÉ', 22400], ['04', 'PLÂTRERIE', 'PLÂTRERIE DELAUNAY', 21300],
		] },
	{ reference: 'SCI LES CHÊNES — Derval', maitreOuvrage: 'SCI LES CHÊNES', adresseClient: '4 rue du Bourg, 44590 DERVAL', natureTravaux: "Réhabilitation d'un corps de ferme",
		adresse: '4 rue du Bourg', cp: '44590', commune: 'DERVAL', mission: 'COMPLETE', dateSignaturePrevue: null, termine: false, creeLe: '2026-07-02', lots: [
			['01', 'DÉMOLITION — TERRASSEMENT', 'HERVÉ TP', 26800], ['02', 'MAÇONNERIE', 'SOCIÉTÉ MAÇONNERIE GLAINOISE', 118400],
			['03', 'CHARPENTE', 'MC3 BOIS', 44900], ['04', 'COUVERTURE', 'FERRÉ COUVERTURE', 51200], ['05', 'ENDUIT EXTÉRIEUR', 'ROBERT ENDUIT', 33500],
			['06', 'ÉLECTRICITÉ', null, 0],
		] },
	{ reference: 'MOREAU — Soudan', maitreOuvrage: 'M. et Mme MOREAU', adresseClient: '', natureTravaux: 'Maison individuelle — 96 m²', adresse: 'Le Bois Joli',
		cp: '44110', commune: 'SOUDAN', mission: 'COMPLETE', dateSignaturePrevue: null, termine: false, creeLe: '2026-06-02', lots: [] },
];

async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
	const artisans = new Map((await prisma.artisan.findMany({ select: { id: true, nom: true } })).map((a) => [a.nom, a.id]));

	for (const c of CHANTIERS) {
		const chantier = await prisma.chantier.create({ data: {
			reference: c.reference, maitreOuvrage: c.maitreOuvrage, adresseClient: c.adresseClient, natureTravaux: c.natureTravaux,
			adresse: c.adresse, cp: c.cp, commune: c.commune, mission: c.mission, termine: c.termine, creeLe: jour(c.creeLe),
			dateSignaturePrevue: c.dateSignaturePrevue ? jour(c.dateSignaturePrevue) : null, chargeAffaireId: admin.id, creeParId: admin.id,
		} });
		const periodes = new Map<string, string>();
		for (const [i, [numero, designation, entreprise, ht, nature, plus]] of c.lots.entries()) {
			const artisanId = entreprise ? artisans.get(entreprise) : null;
			if (entreprise && !artisanId) throw new Error(`Entreprise absente du référentiel : ${entreprise}`);
			const plan = c.planning ? PLAN[designation] : undefined;
			const lot = await prisma.lot.create({ data: {
				chantierId: chantier.id, ordre: i + 1, numero, designation, nature: nature ?? 'GRE_A_GRE', artisanId, montantHtInitial: ht,
				exemplaires: nature ? 2 : 3, couleur: plan?.[0] ?? 'noir', dateSignature: plus?.dateSignature ? jour(plus.dateSignature) : null,
				dernierNumeroAvenant: plus?.avenants?.length ?? 0,
			} });
			for (const [n, [devis, montantHt, date, objet]] of (plus?.avenants ?? []).entries()) {
				await prisma.avenant.create({ data: { lotId: lot.id, numero: n + 1, devis, montantHt, date: jour(date), objet } });
			}
			for (const [intitule, annee, semaine, duree] of plan?.[1] ?? []) {
				const p = await prisma.periode.create({ data: { lotId: lot.id, intitule, debut: lundiIso(annee, semaine), duree } });
				periodes.set(intitule, p.id);
			}
		}
		// L'enchaînement de la maquette : chaque intitulé attend la fin du précédent.
		for (const [i, nom] of CHAINE.entries()) {
			const id = periodes.get(nom), avant = periodes.get(CHAINE[i - 1] ?? '');
			if (i && id && avant) await prisma.periode.update({ where: { id }, data: { dependDeId: avant } });
		}
		if (c.planning) {
			await prisma.fermeture.createMany({ data: [
				{ chantierId: chantier.id, libelle: "Congés d'été", debut: lundiIso(2026, 31), duree: 2 },
				{ chantierId: chantier.id, libelle: 'Congés de Noël', debut: lundiIso(2026, 52), duree: 2 },
			] });
			await documentsPerrier(chantier.id, admin.id);
		}
	}
	console.log('Conformité : les 4 chantiers de la maquette sont prêts.');
}

/** Les 6 documents de PERRIER dans la maquette, à jour des données (même empreinte que l'état calculé). PDF factice : base de test. */
async function documentsPerrier(chantierId: string, creeParId: string) {
	const lots = await prisma.lot.findMany({ where: { chantierId }, select: { id: true, numero: true, designation: true, nature: true } });
	const lot = (designation: string) => lots.find((l) => l.designation === designation)!;
	const maintenant = new Date('2026-09-30T08:00:00Z');
	const marche = async (designation: string, version: number, le: string) => {
		const l = lot(designation);
		const { donnees } = await construireDonneesMarche(l.id, maintenant);
		await prisma.document.create({ data: {
			chantierId, lotId: l.id, serie: l.id, type: donnees.type, version, donnees: donnees as object, empreinte: empreinteDocument(donnees),
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: `PERRIER-${l.numero ?? 'ST'}-v${version}.pdf`, creeParId, creeLe: new Date(`${le}T09:00:00Z`),
		} });
	};
	const recap = async (version: number, le: string) => {
		const { donnees } = await construireDonneesRecap(chantierId, maintenant);
		await prisma.document.create({ data: {
			chantierId, lotId: null, serie: SERIES.RECAPITULATIF, type: 'RECAPITULATIF', version, donnees: donnees as object, empreinte: empreinteDocument(donnees),
			pdf: new Uint8Array([37, 80, 68, 70]), nomFichier: `PERRIER-Recap-v${version}.pdf`, creeParId, creeLe: new Date(`${le}T09:00:00Z`),
		} });
	};
	await recap(1, '2026-03-26');
	await marche('GROS ŒUVRE', 2, '2026-04-02');
	await marche('ESCALIER', 1, '2026-04-02');
	await marche('PLOMBERIE — CHAUFFAGE — V.M.C.', 1, '2026-04-02');
	await marche('PEINTURE', 1, '2026-04-02');
	await recap(3, '2026-06-18');
}

main()
	.catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
	.finally(() => prisma.$disconnect());
