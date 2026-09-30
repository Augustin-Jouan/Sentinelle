import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { auth } from '@/auth';
import { viderBase } from '../../tests/integration/aide';
import { bloquerCompte, changerRole, creerCompte, debloquerCompte, listerComptes, reinitialiserMotDePasse } from './comptes';
import { prisma } from './prisma';

async function motDePasseValide(id: string, motDePasse: string) {
	const compte = await prisma.compte.findFirstOrThrow({ where: { userId: id, providerId: 'credential' } });
	return (await auth.$context).password.verify({ hash: compte.password ?? '', password: motDePasse });
}

async function ouvrirSession(userId: string) {
	await prisma.session.create({
		data: { id: randomUUID(), token: randomUUID(), userId, expiresAt: new Date(Date.now() + 3_600_000) },
	});
}

describe('comptes', () => {
	beforeEach(viderBase);

	it('crée un compte avec un mot de passe provisoire à changer', async () => {
		const { id, motDePasse } = await creerCompte({ email: ' Jean@Socoreve.fr ', nom: 'Jean Martin', role: 'user' });
		expect(motDePasse).toHaveLength(16);
		expect(await motDePasseValide(id, motDePasse)).toBe(true);
		const [compte] = await listerComptes();
		expect(compte).toMatchObject({ email: 'jean@socoreve.fr', nom: 'Jean Martin', role: 'user', bloque: false, doitChangerMotDePasse: true });
	});

	it('réinitialise : nouveau mot de passe, sessions révoquées, changement exigé', async () => {
		const { id } = await creerCompte({ email: 'a@b.fr', nom: 'A', role: 'user' });
		await prisma.utilisateur.update({ where: { id }, data: { doitChangerMotDePasse: false } });
		await ouvrirSession(id);
		const nouveau = await reinitialiserMotDePasse(id);
		expect(await motDePasseValide(id, nouveau)).toBe(true);
		expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id } })).doitChangerMotDePasse).toBe(true);
	});

	it('bloque (sessions révoquées) puis débloque', async () => {
		const admin = await creerCompte({ email: 'admin@b.fr', nom: 'Admin', role: 'admin' });
		const { id } = await creerCompte({ email: 'a@b.fr', nom: 'A', role: 'user' });
		await ouvrirSession(id);
		await bloquerCompte(id, admin.id);
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id } })).banned).toBe(true);
		expect(await prisma.session.count({ where: { userId: id } })).toBe(0);
		await debloquerCompte(id);
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id } })).banned).toBe(false);
	});

	it('un admin ne peut ni se bloquer ni se retirer le rôle admin', async () => {
		const { id } = await creerCompte({ email: 'admin@b.fr', nom: 'Admin', role: 'admin' });
		await expect(bloquerCompte(id, id)).rejects.toThrow('Vous ne pouvez pas bloquer votre propre compte.');
		await expect(changerRole(id, 'user', id)).rejects.toThrow('Vous ne pouvez pas retirer votre propre rôle administrateur.');
	});

	it('change le rôle d\'un autre compte', async () => {
		const admin = await creerCompte({ email: 'admin@b.fr', nom: 'Admin', role: 'admin' });
		const { id } = await creerCompte({ email: 'a@b.fr', nom: 'A', role: 'user' });
		await changerRole(id, 'admin', admin.id);
		expect((await prisma.utilisateur.findUniqueOrThrow({ where: { id } })).role).toBe('admin');
	});
});
