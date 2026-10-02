import { describe, expect, it, vi } from 'vitest';
import { enregistrerArtisan, idArtisanOuverte, type FicheArtisan } from './ficheArtisan';

const fiche = (o: Partial<FicheArtisan> = {}): FicheArtisan => ({
	nom: 'AM COUVERTURE', adresse: '', cp: '', commune: '', interlocuteur: '', telephone: '', email: '', ...o,
});

describe('idArtisanOuverte', () => {
	it('une fiche nouvelle n’a pas d’id — on créera', () => {
		expect(idArtisanOuverte('nouvelle')).toBeNull();
		expect(idArtisanOuverte(null)).toBeNull();
	});
	it('après création, l’id ouvert sert sans recréer', () => {
		expect(idArtisanOuverte('art-1')).toBe('art-1');
	});
});

describe('enregistrerArtisan', () => {
	it('si un champ est refusé après la création, l’id est quand même renvoyé pour le prochain essai', async () => {
		const creer = vi.fn().mockResolvedValue({ ok: true, donnees: { id: 'art-1' } });
		const modifier = vi.fn().mockResolvedValue({ ok: false, erreur: 'Adresse e-mail invalide.' });
		const r = await enregistrerArtisan({
			id: idArtisanOuverte('nouvelle'),
			fiche: fiche({ email: 'foo' }),
			actuelle: null,
			creer,
			modifier,
		});
		expect(creer).toHaveBeenCalledTimes(1);
		expect(r.id).toBe('art-1');
		expect(r.erreur).toEqual({ champ: 'email', message: 'Adresse e-mail invalide.' });
	});

	it('un nouvel essai avec l’id créé ne rappelle pas créer', async () => {
		const creer = vi.fn().mockResolvedValue({ ok: true, donnees: { id: 'art-1' } });
		const modifier = vi.fn().mockResolvedValue({ ok: true, donnees: null });
		const r = await enregistrerArtisan({
			id: idArtisanOuverte('art-1'),
			fiche: fiche({ email: 'contact@am.fr' }),
			actuelle: null,
			creer,
			modifier,
		});
		expect(creer).not.toHaveBeenCalled();
		expect(modifier).toHaveBeenCalledWith('art-1', 'email', 'contact@am.fr');
		expect(r).toEqual({ id: 'art-1', erreur: null });
	});
});
