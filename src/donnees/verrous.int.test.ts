import { beforeEach, describe, expect, it } from 'vitest';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { prisma } from './prisma';
import { sousVerrouChantier, sousVerrouLot } from './verrouLot';

function signal() {
	let ouvrir!: () => void;
	const attendu = new Promise<void>((r) => { ouvrir = r; });
	return { attendu, ouvrir };
}

describe('verrou du lot et verrou du chantier', () => {
	let p: Awaited<ReturnType<typeof insererPerrier>>;

	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
	});

	it('une génération sous verrou du lot et un geste du planning sous verrou du chantier ne s\'interbloquent pas', async () => {
		const lotId = p.lots['GROS ŒUVRE'];
		const lotPris = signal();
		const chantierPris = signal();
		// A : comme un certificat — lot verrouillé, puis un document du chantier.
		const a = sousVerrouLot(lotId, async (tx) => {
			lotPris.ouvrir();
			await chantierPris.attendu;
			await tx.document.create({ data: {
				chantierId: p.chantierId, lotId, serie: 'ESSAI', type: 'MARCHE_GRE_A_GRE', version: 1, donnees: {}, empreinte: 'x',
				pdf: new Uint8Array([1]), nomFichier: 'x.pdf', creeParId: p.utilisateurId,
			} });
		});
		// B : comme un geste du planning — chantier verrouillé, puis une période du lot, pendant que A attend.
		const b = sousVerrouChantier(p.chantierId, async (tx) => {
			chantierPris.ouvrir();
			await lotPris.attendu;
			await new Promise((r) => setTimeout(r, 300));
			await tx.periode.create({ data: { lotId, debut: new Date('2026-10-05T00:00:00Z'), duree: 1 } });
		});
		await Promise.all([a, b]);
		expect([await prisma.document.count({ where: { serie: 'ESSAI' } }), await prisma.periode.count({ where: { lotId } })]).toEqual([1, 1]);
	});

	it('deux écritures sous verrou du chantier passent l\'une après l\'autre', async () => {
		const ordre: string[] = [];
		const premier = signal();
		await Promise.all([
			sousVerrouChantier(p.chantierId, async () => {
				premier.ouvrir();
				await new Promise((r) => setTimeout(r, 300));
				ordre.push('premier');
			}),
			premier.attendu.then(() => sousVerrouChantier(p.chantierId, async () => { ordre.push('second'); })),
		]);
		expect(ordre).toEqual(['premier', 'second']);
	});

	it('chantier inconnu : refusé', async () => {
		await expect(sousVerrouChantier('inconnu', async () => null)).rejects.toThrow('Chantier introuvable.');
	});
});
