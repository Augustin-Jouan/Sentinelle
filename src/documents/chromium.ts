/** Chromium : bac à sable actif, sauf `CHROMIUM_NO_SANDBOX=1` (Docker dont le kernel refuse les namespaces). */
export function argumentsChromium(): string[] {
	const args = ['--disable-dev-shm-usage'];
	if (process.env.CHROMIUM_NO_SANDBOX === '1') args.unshift('--no-sandbox');
	return args;
}
