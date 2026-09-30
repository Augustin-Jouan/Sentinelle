import { chromium, type Browser, type BrowserContext } from 'playwright';
import { ErreurMetier } from '@/domaine/erreurs';

export type RendrePdf = (html: string) => Promise<Uint8Array>;

const MAX_SIMULTANEES = 2;
const DELAI_MS = 30_000;

let navigateur: Promise<Browser> | null = null;
let enCours = 0;

/** Un seul Chromium par processus, lancé au premier besoin puis réutilisé (une seule réplique de l'app). */
function obtenirNavigateur(): Promise<Browser> {
	if (!navigateur) {
		const lancement = chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
		navigateur = lancement;
		lancement.then(
			(b) => b.on('disconnected', () => { navigateur = null; }),
			() => { navigateur = null; },
		);
	}
	return navigateur;
}

function avecDelai<T>(travail: Promise<T>, ms: number): Promise<T> {
	let minuterie: NodeJS.Timeout | undefined;
	const expiration = new Promise<never>((_, rejeter) => {
		minuterie = setTimeout(() => rejeter(new Error('Délai de génération PDF dépassé.')), ms);
	});
	return Promise.race([travail, expiration]).finally(() => clearTimeout(minuterie));
}

export async function htmlVersPdf(html: string, opts: { paysage?: boolean; delaiMs?: number } = {}): Promise<Uint8Array> {
	if (enCours >= MAX_SIMULTANEES) throw new ErreurMetier('Génération en cours, réessayez dans quelques secondes.');
	enCours++;
	let contexte: BrowserContext | undefined;
	let abandonne = false;
	const travail = (async () => {
		contexte = await (await obtenirNavigateur()).newContext();
		if (abandonne) throw new Error('Génération abandonnée.');
		// Aucune requête ne sort : polices et CSS sont déjà dans la page (setContent ne passe pas par le réseau).
		await contexte.route('**/*', (route) => route.abort());
		const page = await contexte.newPage();
		await page.setContent(html, { waitUntil: 'load' });
		await page.evaluate(async () => { await document.fonts.ready; });
		// ISO A4 mm : format:'A4' de Chromium 1243 donne 842.88 pt (Math.round → 843).
		const paysage = opts.paysage ?? true;
		return page.pdf({
			width: paysage ? '297mm' : '210mm',
			height: paysage ? '210mm' : '297mm',
			margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
			printBackground: true,
		});
	})();
	// La place ne se libère qu'à la fin réelle du travail de Chromium, jamais au moment du délai.
	void travail
		.catch(() => undefined)
		.finally(() => {
			enCours--;
			void contexte?.close().catch(() => undefined);
		});
	try {
		return new Uint8Array(await avecDelai(travail, opts.delaiMs ?? DELAI_MS));
	} catch (e) {
		// Délai dépassé : on ferme le contexte pour interrompre page.pdf, ce qui termine le travail et libère la place.
		abandonne = true;
		await contexte?.close().catch(() => undefined);
		throw e;
	}
}

export function generationsEnCours(): number {
	return enCours;
}

export async function fermerNavigateur(): Promise<void> {
	const b = navigateur;
	navigateur = null;
	if (b) await (await b).close();
}
