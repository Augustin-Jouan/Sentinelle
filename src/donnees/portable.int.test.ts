import { beforeEach, describe, expect, it } from 'vitest';
import { creerUtilisateurTest, viderBase } from '../../tests/integration/aide';
import { listerComptes, modifierTelephone } from './comptes';
import { prisma } from './prisma';

describe('portable des comptes', () => {
	beforeEach(async () => {
		await viderBase();
	});

	it("l'admin saisit le portable ; vidé, il redevient nul ; 120 caractères au plus", async () => {
		const u = await creerUtilisateurTest();
		await modifierTelephone(u.id, ' 06 12 34 56 78 ');
		expect((await listerComptes()).find((c) => c.id === u.id)?.telephone).toBe('06 12 34 56 78');
		await modifierTelephone(u.id, '  ');
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id: u.id } })).telephone).toBeNull();
		await expect(modifierTelephone(u.id, 'x'.repeat(121))).rejects.toThrow('120 caractères au plus.');
	});
});
