import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/donnees/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { sourcePlanningPerrier } from '../../tests/fixtures/planningPerrier';
import { viderBase } from '../../tests/integration/aide';
import { insererPerrier } from '../../tests/integration/perrier';
import { insererPlanningPerrier } from '../../tests/integration/planningPerrier';
import { batirPlanning } from './batir';
import { construireDonneesPlanning, construireDonneesVisa, derniereVersionPlanning } from './donnees';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
let p: Awaited<ReturnType<typeof insererPerrier>>;

describe('données du planning lues en base', () => {
	beforeEach(async () => {
		await viderBase();
		p = await insererPerrier();
		await insererPlanningPerrier(p);
	});

	it('le planning lu en base est celui de la fixture', async () => {
		const { donnees, chantier } = await construireDonneesPlanning(p.chantierId, MAINTENANT);
		expect(chantier.reference).toBe('PERRIER — Louisfert');
		expect(donnees.contenu).toEqual(batirPlanning(sourcePlanningPerrier(), PERRIER_PARAMETRES, MAINTENANT).contenu);
	});

	it('le visa exige une version du planning, puis la lit', async () => {
		expect(await derniereVersionPlanning(p.chantierId)).toBeNull();
		await expect(construireDonneesVisa(p.chantierId, MAINTENANT)).rejects.toThrow("Aucune version du planning : générez d'abord le planning.");
		const { donnees } = await construireDonneesPlanning(p.chantierId, MAINTENANT);
		const cree = await prisma.document.create({ data: {
			chantierId: p.chantierId, serie: 'PLANNING', type: 'PLANNING', version: 1,
			donnees: donnees as unknown as Prisma.InputJsonValue, empreinte: 'e',
			pdf: new Uint8Array([1]), nomFichier: 'x.pdf', creeParId: p.utilisateurId,
		} });
		const visa = await construireDonneesVisa(p.chantierId, MAINTENANT);
		expect(visa.source).toEqual({ id: cree.id, version: 1 });
		expect(visa.donnees.contenu.planning).toEqual({ version: 1, date: '29.09.2026' });
	});
});
