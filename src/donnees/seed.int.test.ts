import { beforeEach, describe, expect, it } from 'vitest';
import { auth } from '@/auth';
import { viderBase } from '../../tests/integration/aide';
import { creerCompteAvecMotDePasse, initialesDe } from './comptes';
import { prisma } from './prisma';
import { creerPremierAdmin, seedArtisans, seedParametres } from './seed';

async function motDePasseValide(email: string, motDePasse: string) {
	const u = await prisma.utilisateur.findUniqueOrThrow({ where: { email }, include: { comptes: true } });
	const hash = u.comptes.find((c) => c.providerId === 'credential')?.password;
	if (!hash) return false;
	return (await auth.$context).password.verify({ hash, password: motDePasse });
}

describe('données de départ', () => {
	beforeEach(viderBase);

	it('crée les 73 artisans une seule fois', async () => {
		expect(await seedArtisans()).toBe(73);
		expect(await seedArtisans()).toBe(0);
		expect(await prisma.artisan.count()).toBe(73);
		const rebours = await prisma.artisan.findUniqueOrThrow({ where: { nom: 'CONSTRUCTIONS REBOURS' } });
		expect(rebours).toMatchObject({ commune: 'MARTIGNÉ-FERCHAUD', email: '', actif: true });
	});

	it('crée les paramètres sans écraser une modification', async () => {
		await seedParametres();
		await prisma.parametres.update({ where: { id: 1 }, data: { telephone: '02 00 00 00 00' } });
		await seedParametres();
		expect(await prisma.parametres.count()).toBe(1);
		expect((await prisma.parametres.findUniqueOrThrow({ where: { id: 1 } })).telephone).toBe('02 00 00 00 00');
	});

	it('le compte écrit en base se connecte : session avec rôle et mot de passe provisoire', async () => {
		await creerCompteAvecMotDePasse({ email: 'jean@b.fr', nom: 'Jean Martin', role: 'user', motDePasse: 'motdepasse-1234', doitChangerMotDePasse: true });
		const reponse = await auth.api.signInEmail({ body: { email: 'jean@b.fr', password: 'motdepasse-1234' }, asResponse: true });
		expect(reponse.status).toBe(200);
		const cookie = (reponse.headers.get('set-cookie') ?? '').split(';')[0];
		const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
		expect(session?.user).toMatchObject({ email: 'jean@b.fr', role: 'user', doitChangerMotDePasse: true });
	});

	it('un compte « banned » ne peut plus se connecter', async () => {
		const id = await creerCompteAvecMotDePasse({ email: 'x@b.fr', nom: 'X', role: 'user', motDePasse: 'motdepasse-1234', doitChangerMotDePasse: false });
		await prisma.utilisateur.update({ where: { id }, data: { banned: true } });
		const reponse = await auth.api.signInEmail({ body: { email: 'x@b.fr', password: 'motdepasse-1234' }, asResponse: true });
		expect(reponse.status).toBe(403);
	});

	it('crée le premier admin seulement s\'il n\'existe aucun admin', async () => {
		expect(await creerPremierAdmin({ email: 'Admin@Socoreve.local', nom: 'Augustin Jouan', motDePasse: 'motdepasse-1234' })).toBe('cree');
		expect(await creerPremierAdmin({ email: 'autre@socoreve.local', nom: 'X', motDePasse: 'autre-mot-de-passe' })).toBe('existe');
		const admin = await prisma.utilisateur.findUniqueOrThrow({ where: { email: 'admin@socoreve.local' } });
		expect(admin).toMatchObject({ role: 'admin', emailVerified: true, initiales: 'AJ', doitChangerMotDePasse: false });
		expect(await motDePasseValide('admin@socoreve.local', 'motdepasse-1234')).toBe(true);
	});

	it('refuse un e-mail déjà utilisé, sans tenir compte de la casse', async () => {
		await creerCompteAvecMotDePasse({ email: 'a@b.fr', nom: 'A', role: 'user', motDePasse: 'x'.repeat(16), doitChangerMotDePasse: true });
		await expect(creerCompteAvecMotDePasse({ email: 'A@B.fr', nom: 'B', role: 'user', motDePasse: 'y'.repeat(16), doitChangerMotDePasse: true }))
			.rejects.toThrow('Un compte existe déjà avec cet e-mail.');
	});

	it('calcule les initiales', () => {
		expect(initialesDe('Augustin Jouan')).toBe('AJ');
		expect(initialesDe('  jean-marc  le  goff ')).toBe('JL');
		expect(initialesDe('Zoé')).toBe('Z');
	});
});
