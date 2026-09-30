import { beforeEach, describe, expect, it } from 'vitest';
import { contraindre } from '@/domaine/planning';
import { periodesDuPlanning, type PlanningVue } from '@/domaine/planningVue';
import { lundiIso, versIso } from '@/domaine/semaines';
import { PERRIER_LOTS } from '../../tests/fixtures/perrier';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { insererPlanningPerrier } from '../../tests/integration/planningPerrier';
import {
	ajouterFermeture, changerCouleurLot, creerPeriode, deplacerPeriodes, lierPeriode, lirePlanning,
	modifierFermeture, modifierPeriode, supprimerFermeture, supprimerPeriodes,
} from './planning';
import { prisma } from './prisma';

let p: Awaited<ReturnType<typeof insererPerrier>>;
let ids: Record<string, string>;
let fermetures: string[];

const semaine = (annee: number, s: number) => versIso(lundiIso(annee, s));
const per = (vue: PlanningVue, intitule: string) => vue.lots.flatMap((l) => l.periodes).find((x) => x.intitule === intitule)!;
const enBase = (intitule: string) => prisma.periode.findUniqueOrThrow({ where: { id: ids[intitule] } });

beforeEach(async () => {
	await viderBase();
	p = await insererPerrier();
	({ periodes: ids, fermetures } = await insererPlanningPerrier(p));
});

describe('lecture du planning', () => {
	it('PERRIER : les lots dans l\'ordre du chantier, 23 périodes, 2 fermetures, couleurs et entreprises', async () => {
		const vue = (await lirePlanning(p.chantierId))!;
		expect(vue.lots.map((l) => l.designation)).toEqual(PERRIER_LOTS.map((l) => l.designation));
		expect(periodesDuPlanning(vue)).toHaveLength(23);
		expect(vue.fermetures.map((f) => [f.libelle, f.debut, f.duree])).toEqual([
			["Congés d'été", '2026-07-27', 2], ['Congés de Noël', '2026-12-21', 2],
		]);
		expect(vue.lots.find((l) => l.designation === 'CHARPENTE')).toMatchObject({
			numero: '03', couleur: 'vert-clair', entreprise: 'CHARPENTE ET CONSTRUCTIONS BOIS', telephone: '06-62-75-58-70',
		});
		expect(vue.lots.find((l) => l.designation === 'ENDUIT EXTÉRIEUR')).toMatchObject({ entreprise: null, telephone: null });
		expect(vue.dateSignaturePrevue).toBe('2026-04-03');
	});

	it('les dates de la démonstration respectent déjà la chaîne : rien ne bouge au chargement', async () => {
		const vue = (await lirePlanning(p.chantierId))!;
		expect(contraindre(periodesDuPlanning(vue)).decalees).toBe(0);
		expect(per(vue, 'Peintures').dependDeId).toBe(ids['Pose des portes']);
	});

	it('un chantier inconnu', async () => {
		expect(await lirePlanning('inconnu')).toBeNull();
	});
});

describe('cascade enregistrée', () => {
	it('retarder les fondations de deux semaines repousse l\'élévation RDC, pas le plancher', async () => {
		const r = await deplacerPeriodes(p.chantierId, [{ id: ids['Fondations et soubassements'], debut: semaine(2026, 18) }]);
		expect(r.message).toBe('1 période décalée à la suite.');
		expect(per(r.planning, 'Élévation RDC').debut).toBe(semaine(2026, 21));
		expect(per(r.planning, 'Plancher intermédiaire').debut).toBe(semaine(2026, 25));
		expect(versIso((await enBase('Élévation RDC')).debut)).toBe(semaine(2026, 21));
	});

	it('la cascade passe d\'un lot à l\'autre', async () => {
		const r = await deplacerPeriodes(p.chantierId, [{ id: ids['Montage charpente'], debut: semaine(2026, 36) }]);
		expect(r.message).toBe('2 périodes décalées à la suite.');
		expect(versIso((await enBase('Couverture et gouttières')).debut)).toBe(semaine(2026, 38));
		expect(versIso((await enBase('Pose des menuiseries')).debut)).toBe(semaine(2026, 40));
		expect(versIso((await enBase('Isolation périphérique')).debut)).toBe(semaine(2026, 43));
	});

	it('un groupe décalé : message de groupe', async () => {
		const r = await deplacerPeriodes(p.chantierId, [
			{ id: ids['Accès et plateforme'], debut: semaine(2026, 17) },
			{ id: ids['Fondations et soubassements'], debut: semaine(2026, 18) },
		]);
		expect(r.message).toBe('2 périodes décalées de 2 semaines plus tard — 1 à la suite.');
	});

	it('un groupe dont les décalages diffèrent (période bougée entre-temps) : message neutre', async () => {
		const r = await deplacerPeriodes(p.chantierId, [
			{ id: ids['Accès et plateforme'], debut: semaine(2026, 17) },
			{ id: ids['Terrassements finaux'], debut: semaine(2026, 45) },
		]);
		expect(r.message).toBe('2 périodes déplacées. 2 périodes décalées à la suite.');
	});

	it('deux déplacements simultanés sur des périodes différentes sont tous deux conservés', async () => {
		await Promise.all([
			deplacerPeriodes(p.chantierId, [{ id: ids['Terrassements finaux'], debut: semaine(2026, 44) }]),
			deplacerPeriodes(p.chantierId, [{ id: ids['Pose des appareils'], debut: semaine(2026, 50) }]),
		]);
		expect(versIso((await enBase('Terrassements finaux')).debut)).toBe(semaine(2026, 44));
		expect(versIso((await enBase('Pose des appareils')).debut)).toBe(semaine(2026, 50));
	});

	it('créer une période : un début qui n\'est pas un lundi est recalé sur le lundi de sa semaine', async () => {
		const r = await creerPeriode(p.lots['CHARPENTE'], '2026-04-30', 3);
		expect(r.message).toBe('Période créée — semaine 18, 3 sem. Nommez-la si besoin.');
		const creee = await prisma.periode.findUniqueOrThrow({ where: { id: r.periodeId! } });
		expect([versIso(creee.debut), creee.duree, creee.intitule, creee.lotId]).toEqual(['2026-04-27', 3, '', p.lots['CHARPENTE']]);
	});
});

describe('liens et suppressions', () => {
	it('une boucle est refusée sans rien écrire', async () => {
		await expect(lierPeriode(ids['Accès et plateforme'], ids['Peintures']))
			.rejects.toThrow('Ce lien créerait une boucle : Peintures dépend déjà de cette période.');
		expect((await enBase('Accès et plateforme')).dependDeId).toBeNull();
	});

	it('poser un lien recale la période ; le retirer la laisse en place', async () => {
		const pose = await lierPeriode(ids['Terrassements finaux'], ids['Peintures']);
		expect(pose.message).toBe('Lien posé.');
		expect(per(pose.planning, 'Terrassements finaux').debut).toBe(semaine(2027, 10));
		const retire = await lierPeriode(ids['Terrassements finaux'], null);
		expect(retire.message).toBe('Lien retiré — la période redevient libre.');
		expect(per(retire.planning, 'Terrassements finaux')).toMatchObject({ debut: semaine(2027, 10), dependDeId: null });
	});

	it('supprimer une période détache ses suites, qui restent en place', async () => {
		const r = await supprimerPeriodes(p.chantierId, [ids['Élévation RDC']]);
		expect(r.message).toBe('Période supprimée.');
		expect(await enBase('Plancher intermédiaire')).toMatchObject({ dependDeId: null, debut: lundiIso(2026, 25) });
	});

	it('supprimer un lot emporte ses périodes et détache les liens venus d\'autres lots', async () => {
		await prisma.lot.delete({ where: { id: p.lots['GROS ŒUVRE'] } });
		expect(await prisma.periode.count({ where: { id: ids['Élévation RDC'] } })).toBe(0);
		expect(await enBase('Montage charpente')).toMatchObject({ dependDeId: null, debut: lundiIso(2026, 33) });
	});
});

describe('éléments disparus ou d\'un autre chantier', () => {
	async function periodeAilleurs() {
		const c = await prisma.chantier.create({ data: { reference: 'AUTRE', maitreOuvrage: 'X', chargeAffaireId: p.utilisateurId, creeParId: p.utilisateurId } });
		const l = await prisma.lot.create({ data: { chantierId: c.id, ordre: 1, designation: 'LOT' } });
		return (await prisma.periode.create({ data: { lotId: l.id, debut: lundiIso(2026, 20), duree: 1 } })).id;
	}

	it('une période d\'un autre chantier est refusée, sans écriture', async () => {
		const autre = await periodeAilleurs();
		await expect(deplacerPeriodes(p.chantierId, [{ id: autre, debut: semaine(2026, 22) }])).rejects.toThrow('Élément introuvable.');
		await expect(supprimerPeriodes(p.chantierId, [autre])).rejects.toThrow('Élément introuvable.');
		await expect(lierPeriode(ids['Chape'], autre)).rejects.toThrow('Élément introuvable.');
		expect(versIso((await prisma.periode.findUniqueOrThrow({ where: { id: autre } })).debut)).toBe(semaine(2026, 20));
	});

	it('une période supprimée entre-temps', async () => {
		await prisma.periode.delete({ where: { id: ids['Chape'] } });
		await expect(deplacerPeriodes(p.chantierId, [{ id: ids['Chape'], debut: semaine(2026, 51) }])).rejects.toThrow("Cette période n'existe plus.");
		await expect(modifierPeriode(ids['Chape'], 'duree', '2')).rejects.toThrow("Cette période n'existe plus.");
		// Supprimer ce qui n'existe déjà plus n'est pas une erreur.
		expect((await supprimerPeriodes(p.chantierId, [ids['Chape']])).message).toBeUndefined();
	});
});

describe('saisies du panneau : refus clairs, rien d\'écrit', () => {
	it.each([
		['duree', 'abc', 'Durée : saisissez un nombre entier.'],
		['duree', '', 'Durée : saisissez un nombre entier.'],
		['duree', '3,5', 'Durée : saisissez un nombre entier.'],
		['duree', '0', 'La durée doit être comprise entre 1 et 104 semaines.'],
		['duree', '105', 'La durée doit être comprise entre 1 et 104 semaines.'],
		['annee', '1999', "L'année doit être comprise entre 2000 et 2100."],
		['annee', 'deux mille', 'Année : saisissez un nombre entier.'],
		['semaine', '54', "Cette semaine n'existe pas."],
		['semaine', '0', "Cette semaine n'existe pas."],
		['intitule', 'x'.repeat(121), "L'intitulé fait 120 caractères au plus."],
	] as const)('%s = « %s »', async (champ, valeur, message) => {
		await expect(modifierPeriode(ids['Fondations et soubassements'], champ, valeur)).rejects.toThrow(message);
		expect(await enBase('Fondations et soubassements')).toMatchObject({
			debut: lundiIso(2026, 16), duree: 3, intitule: 'Fondations et soubassements',
		});
	});

	it('semaine 53 : acceptée en 2026, refusée quand on passe l\'année à 2027', async () => {
		const r = await modifierPeriode(ids['Terrassements finaux'], 'semaine', '53');
		expect(per(r.planning, 'Terrassements finaux').debut).toBe(semaine(2026, 53));
		await expect(modifierPeriode(ids['Terrassements finaux'], 'annee', '2027')).rejects.toThrow("Cette semaine n'existe pas.");
	});

	it('les saisies valides, espaces compris', async () => {
		await modifierPeriode(ids['Fondations et soubassements'], 'intitule', '  Fondations  ');
		const r = await modifierPeriode(ids['Fondations et soubassements'], 'duree', ' 5 ');
		expect(per(r.planning, 'Fondations').duree).toBe(5);
		expect(r.message).toBe('1 période décalée à la suite.');
	});
});

describe('fermetures et couleurs', () => {
	it('ajouter : « Congés », 2 semaines, au lundi du début de l\'axe', async () => {
		const r = await ajouterFermeture(p.chantierId);
		expect(r.planning.fermetures).toHaveLength(3);
		expect(r.planning.fermetures[0]).toMatchObject({ libelle: 'Congés', debut: '2026-04-06', duree: 2 });
	});

	it('modifier, refuser, supprimer ; une fermeture ne pousse aucune période', async () => {
		await modifierFermeture(fermetures[0], 'semaine', '16');
		const r = await modifierFermeture(fermetures[0], 'duree', '4');
		expect(r.planning.fermetures[0]).toMatchObject({ libelle: "Congés d'été", debut: '2026-04-13', duree: 4 });
		expect(per(r.planning, 'Fondations et soubassements').debut).toBe('2026-04-13');
		await expect(modifierFermeture(fermetures[0], 'duree', '53')).rejects.toThrow("La durée d'une fermeture doit être comprise entre 1 et 52 semaines.");
		await modifierFermeture(fermetures[1], 'semaine', '53');
		await expect(modifierFermeture(fermetures[1], 'annee', '2027')).rejects.toThrow("Cette semaine n'existe pas.");
		expect((await supprimerFermeture(fermetures[1])).planning.fermetures).toHaveLength(1);
		await expect(supprimerFermeture(fermetures[1])).rejects.toThrow("Cette fermeture n'existe plus.");
	});

	it('couleur d\'un lot', async () => {
		await expect(changerCouleurLot(p.lots['PEINTURE'], 'fuchsia')).rejects.toThrow('Couleur inconnue.');
		const r = await changerCouleurLot(p.lots['PEINTURE'], 'violet');
		expect(r.planning.lots.find((l) => l.designation === 'PEINTURE')!.couleur).toBe('violet');
	});
});
