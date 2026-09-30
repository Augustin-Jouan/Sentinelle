import { afterEach, describe, expect, it } from 'vitest';
import { argumentsChromium } from './chromium';

describe('arguments Chromium', () => {
	const avant = process.env.CHROMIUM_NO_SANDBOX;
	afterEach(() => {
		if (avant === undefined) delete process.env.CHROMIUM_NO_SANDBOX;
		else process.env.CHROMIUM_NO_SANDBOX = avant;
	});

	it('garde le bac à sable par défaut', () => {
		delete process.env.CHROMIUM_NO_SANDBOX;
		expect(argumentsChromium()).toEqual(['--disable-dev-shm-usage']);
	});

	it('ajoute --no-sandbox seulement si demandé', () => {
		process.env.CHROMIUM_NO_SANDBOX = '1';
		expect(argumentsChromium()).toEqual(['--no-sandbox', '--disable-dev-shm-usage']);
	});
});
