import { genererAvenant, genererMarchesManquants, genererPlanning, genererRecap, genererVisa, type Dependances } from '../../src/documents/generer';
import { ajouterAcompteManuel, changerCaution, genererCertificat } from '../../src/donnees/acomptes';
import { ajouterAvenant, modifierChampAvenant } from '../../src/donnees/avenants';
import { changerConvocation, creerBrouillon, enregistrerCompteRendu, modifierChampCompteRendu } from '../../src/donnees/comptesRendus';
import { prisma } from '../../src/donnees/prisma';
import { genererReceptions, leverReserves, modifierChampReception, modifierChampReceptionCommun, preparerReceptions } from '../../src/donnees/receptions';
import { PERRIER_CHANTIER, PERRIER_LOTS } from '../../tests/fixtures/perrier';
import { insererPlanningPerrier } from '../../tests/integration/planningPerrier';
import { insererMaquette } from './maquette';

export const REFERENCE_TEST = 'TEST';

/** Documents d'abord (le visa référence le planning, tout est en `Restrict`), puis les chantiers : le reste suit en cascade. */
async function viderChantiers() {
	await prisma.document.deleteMany({ where: { sourceId: { not: null } } });
	await prisma.document.deleteMany();
	await prisma.chantier.deleteMany();
}

/**
 * Vide les chantiers puis insère les 4 de la maquette et le chantier TEST, qui passe par chaque fonction de l'application.
 * Les comptes, les artisans et les paramètres ne sont pas touchés. `deps.rendrePdf` remplace Chromium dans les tests.
 */
export async function construireDemo(adminId: string, deps: Dependances = {}): Promise<void> {
	await viderChantiers();
	await insererMaquette(adminId);
	await chantierTest(adminId, deps);
}

/** Les 13 lots et le planning de PERRIER, puis avenants, documents, certificats, comptes rendus et PV par les fonctions métier. */
async function chantierTest(adminId: string, deps: Dependances) {
	const artisans = new Map((await prisma.artisan.findMany({ select: { id: true, nom: true } })).map((a) => [a.nom, a.id]));
	const { chargeAffaire: _nom, reference: _ref, ...chantier } = PERRIER_CHANTIER;
	const { id: chantierId } = await prisma.chantier.create({
		data: { ...chantier, reference: REFERENCE_TEST, maitreOuvrage: 'M. et Mme TEST', chargeAffaireId: adminId, creeParId: adminId },
	});
	const lots: Record<string, string> = {};
	for (const [i, l] of PERRIER_LOTS.entries()) {
		const artisanId = l.artisan ? artisans.get(l.artisan.nom) : null;
		if (l.artisan && !artisanId) throw new Error(`Entreprise absente du référentiel : ${l.artisan.nom}`);
		lots[l.designation] = (await prisma.lot.create({ data: {
			chantierId, ordre: i + 1, numero: l.numero, designation: l.designation, nature: l.nature, artisanId, montantHtInitial: l.montantHtInitial,
			tauxTva: l.tauxTva, retenueGarantie: l.retenueGarantie, exemplaires: l.exemplaires,
			corpsEtat: l.corpsEtat, travaux: l.travaux, clauseParticuliere: l.clauseParticuliere, dateSignature: l.dateSignature,
		} })).id;
	}
	await insererPlanningPerrier({ chantierId, lots });

	// Avenants : une plus-value et une moins-value, chacun avec sa lettre.
	for (const [lot, devis, montant, date, objet] of [
		['GROS ŒUVRE', '106', '3720', '2026-05-18', 'Reprise de fondations en terrain hétérogène'],
		['MENUISERIES EXTÉRIEURES', '241', '-280', '2026-06-02', 'Volet roulant abandonné sur la porte de service'],
	] as const) {
		const { id } = await ajouterAvenant(lots[lot]);
		await modifierChampAvenant(id, 'devis', devis);
		await modifierChampAvenant(id, 'montantHt', montant);
		await modifierChampAvenant(id, 'date', date);
		await modifierChampAvenant(id, 'objet', objet);
		await genererAvenant(id, adminId, deps);
	}

	// Marchés (l'enduit, sans entreprise, est ignoré), récapitulatif, planning et son visa.
	await genererMarchesManquants(chantierId, adminId, deps);
	await genererRecap(chantierId, adminId, deps);
	await genererPlanning(chantierId, adminId, deps);
	await genererVisa(chantierId, adminId, deps);

	// Paiements : deux certificats sur le gros œuvre ; reprise d'un acompte manuel puis certificat sur le terrassement ; caution sur la charpente.
	await genererCertificat(lots['GROS ŒUVRE'], { numeroAttendu: 1, cumul: '30000', mois: '2026-05', date: '2026-05-29' }, adminId, deps);
	await genererCertificat(lots['GROS ŒUVRE'], { numeroAttendu: 2, cumul: '62500', mois: '2026-07', date: '2026-07-31' }, adminId, deps);
	await ajouterAcompteManuel(lots['TERRASSEMENT — V.R.D.'], '6000');
	await genererCertificat(lots['TERRASSEMENT — V.R.D.'], { numeroAttendu: 2, cumul: '15000', mois: '2026-06', date: '2026-06-30' }, adminId, deps);
	await changerCaution(lots.CHARPENTE, true);
	await genererCertificat(lots.CHARPENTE, { numeroAttendu: 1, cumul: '10000', mois: '2026-08', date: '2026-08-31' }, adminId, deps);

	// Comptes rendus : le n° 1 enregistré, le n° 2 en brouillon.
	const cr1 = await creerBrouillon(chantierId, new Date('2026-09-14T08:00:00Z'));
	await modifierChampCompteRendu(cr1.id, 'avancement', 'Gros œuvre **terminé**, charpente posée. Couverture en cours.');
	await modifierChampCompteRendu(cr1.id, 'rdvDate', '2026-09-21');
	await modifierChampCompteRendu(cr1.id, 'rdvHeure', '14:00');
	await changerConvocation(cr1.id, lots['GROS ŒUVRE']);
	await changerConvocation(cr1.id, lots.COUVERTURE);
	await enregistrerCompteRendu(cr1.id, adminId, deps);
	const cr2 = await creerBrouillon(chantierId, new Date('2026-09-21T08:00:00Z'));
	await modifierChampCompteRendu(cr2.id, 'avancement', 'Couverture terminée. Menuiseries extérieures à poser la semaine prochaine.');

	// Réception : une décision par lot, puis levée des réserves de la charpente.
	await modifierChampReceptionCommun(chantierId, 'date', '2026-09-25');
	await modifierChampReceptionCommun(chantierId, 'contrat', '2026-04-03');
	await modifierChampReceptionCommun(chantierId, 'signataire', 'M. TEST');
	const recus = [lots['TERRASSEMENT — V.R.D.'], lots.CHARPENTE, lots.COUVERTURE];
	for (const lotId of recus) await preparerReceptions(chantierId, lotId);
	await modifierChampReception(lots.CHARPENTE, 'decision', 'AVEC_RESERVES');
	await modifierChampReception(lots.CHARPENTE, 'reserves', 'Reprise du contreventement côté pignon\nNettoyage des chutes de bois');
	await modifierChampReception(lots.CHARPENTE, 'delai', '30 jours');
	await modifierChampReception(lots.COUVERTURE, 'decision', 'DIFFEREE');
	await modifierChampReception(lots.COUVERTURE, 'motifs', 'Faîtage non terminé, gouttières à poser.');
	await genererReceptions(chantierId, recus, adminId, deps);
	await leverReserves(lots.CHARPENTE, '2026-10-01');
}
