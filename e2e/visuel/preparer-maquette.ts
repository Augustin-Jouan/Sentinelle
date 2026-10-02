import 'dotenv/config';
import { construireDonneesMarche, construireDonneesRecap } from '../../src/documents/donnees';
import { empreinteDocument } from '../../src/documents/batir';
import { SERIES } from '../../src/documents/series';
import { prisma } from '../../src/donnees/prisma';
import { insererMaquette } from '../../prisma/demo/maquette';

/* Les 4 chantiers de la maquette (prisma/demo/maquette.ts) et les 6 documents de PERRIER. Base de test seulement. */
async function main() {
	const base = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/aucune').pathname.slice(1);
	if (!base.endsWith('_test')) throw new Error(`Refus : « ${base} » n'est pas une base de test (le nom doit finir par _test).`);
	if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL est requis.');
	const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
	const ids = await insererMaquette(admin.id);
	await documentsPerrier(ids['PERRIER — Louisfert'], admin.id);
	console.log('Banc visuel : les 4 chantiers de la maquette sont prêts.');
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
