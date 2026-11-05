import { describe, expect, it } from 'vitest';
import { LOGO_TAILLE_MAX, verifierLogo } from './logo';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD';
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');

describe('verifierLogo', () => {
	it('accepte un vrai PNG et un vrai JPEG', () => {
		expect(() => verifierLogo(`data:image/png;base64,${PNG}`)).not.toThrow();
		expect(() => verifierLogo(`data:image/jpeg;base64,${JPEG}`)).not.toThrow();
	});

	it.each([
		['un SVG, qui peut porter du script', `data:image/svg+xml;base64,${SVG}`],
		['un SVG déguisé en PNG', `data:image/png;base64,${SVG}`],
		['un JPEG annoncé comme PNG', `data:image/png;base64,${JPEG}`],
		['un PNG annoncé comme JPEG', `data:image/jpeg;base64,${PNG}`],
		['du texte', 'bonjour'],
		['une adresse externe', 'https://exemple.fr/logo.png'],
		['un base64 invalide', `data:image/png;base64,${PNG}"><script>`],
		['une image vide', 'data:image/png;base64,'],
	])('refuse %s', (_cas, valeur) => {
		expect(() => verifierLogo(valeur)).toThrow('Choisissez une image PNG ou JPEG.');
	});

	it('refuse une image au-delà de la taille maximale, accepte la limite', () => {
		const debut = 'data:image/png;base64,iVBORw0KGgoAAAAN';
		const juste = debut + 'A'.repeat(LOGO_TAILLE_MAX - debut.length);
		expect(() => verifierLogo(juste)).not.toThrow();
		expect(() => verifierLogo(`${juste}A`)).toThrow('Cette image est trop lourde.');
	});
});
