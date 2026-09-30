import { describe, expect, it } from 'vitest';
import { creerFileActions } from './fileActions';

describe('file d’actions du planning', () => {
	it('n’exécute le second travail qu’après le premier', async () => {
		const enFile = creerFileActions();
		const ordre: number[] = [];
		let debloquer!: () => void;
		const premier = new Promise<void>((r) => { debloquer = r; });

		const a = enFile(async () => {
			ordre.push(1);
			await premier;
			ordre.push(2);
			return 'a';
		});
		const b = enFile(async () => {
			ordre.push(3);
			return 'b';
		});

		await Promise.resolve();
		expect(ordre).toEqual([1]);
		debloquer();
		await expect(a).resolves.toBe('a');
		await expect(b).resolves.toBe('b');
		expect(ordre).toEqual([1, 2, 3]);
	});

	it('enchaîne après un échec, sans bloquer la file', async () => {
		const enFile = creerFileActions();
		const a = enFile(async () => { throw new Error('non'); });
		const b = enFile(async () => 'ok');
		await expect(a).rejects.toThrow('non');
		await expect(b).resolves.toBe('ok');
	});
});
