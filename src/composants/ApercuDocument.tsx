'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { genererMarcheAction, genererRecapAction } from '@/actions/documents';
import { modifierChampLotAction } from '@/actions/lots';
import { Button, buttonVariants } from '@/components/ui/button';
import { Gabarit, type CleZone } from '@/documents/gabarits/Gabarit';
import type { DonneesDocument } from '@/documents/schemas';
import { CSS_DOCUMENTS } from '@/documents/styles';

type Source = { type: 'marche'; lotId: string } | { type: 'recap'; chantierId: string } | { type: 'version'; documentId: string };

type Props = { titre: string; sousTitre: string; donnees: DonneesDocument; source: Source; manques?: string[] };

export function ApercuDocument({ titre, sousTitre, donnees, source, manques = [] }: Props) {
	const router = useRouter();
	const chemin = usePathname();
	const enregistrements = useRef(new Set<Promise<unknown>>());
	const [enCours, demarrer] = useTransition();

	// Un document ouvert bloque le défilement de la page de derrière ; Échap le ferme.
	useEffect(() => {
		const avant = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') router.replace(chemin, { scroll: false }); };
		window.addEventListener('keydown', touche);
		return () => {
			document.body.style.overflow = avant;
			window.removeEventListener('keydown', touche);
		};
	}, [router, chemin]);

	function saisir(cle: CleZone, texte: string) {
		if (source.type !== 'marche') return;
		const enregistrement = modifierChampLotAction(source.lotId, cle, texte).then((r) => {
			if (!r.ok) toast.error(r.erreur);
			return r;
		});
		enregistrements.current.add(enregistrement);
		void enregistrement.finally(() => enregistrements.current.delete(enregistrement));
	}

	function generer() {
		demarrer(async () => {
			// La zone encore ouverte s'enregistre d'abord : le PDF ne perd jamais une saisie.
			(document.activeElement as HTMLElement | null)?.blur();
			await Promise.all(enregistrements.current);
			const r = source.type === 'marche'
				? await genererMarcheAction(source.lotId)
				: source.type === 'recap' ? await genererRecapAction(source.chantierId) : null;
			if (!r) return;
			if (!r.ok) {
				toast.error(r.erreur);
				return;
			}
			toast.success(r.donnees.nouvelle
				? `Version ${r.donnees.version} générée.`
				: `Rien n'a changé depuis la version ${r.donnees.version} : elle est téléchargée.`);
			window.location.assign(`/api/documents/${r.donnees.documentId}/pdf`);
			router.refresh();
		});
	}

	return (
		<div role="dialog" aria-label={titre} className="fixed inset-0 z-50 flex flex-col bg-background">
			<style dangerouslySetInnerHTML={{ __html: CSS_DOCUMENTS }} />
			<header className="flex items-center gap-4 border-b bg-card px-6 py-3">
				<div>
					<p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
					<p className="font-semibold">{sousTitre}</p>
				</div>
				<div className="ml-auto flex items-center gap-3">
					{source.type === 'marche' && (
						<span className="text-xs text-muted-foreground">Les zones bleues s&apos;écrivent directement sur le marché — le bleu ne s&apos;imprime pas.</span>
					)}
					{source.type === 'version' ? (
						<a href={`/api/documents/${source.documentId}/pdf`} className={buttonVariants()}>Télécharger le PDF</a>
					) : (
						<Button onClick={generer} disabled={enCours || manques.length > 0} title={manques.length ? `Manque : ${manques.join(', ')}` : undefined}>
							{enCours ? 'Génération…' : 'Générer le PDF'}
						</Button>
					)}
					<Button variant="outline" onClick={() => router.replace(chemin, { scroll: false })}>Fermer</Button>
				</div>
			</header>
			{source.type === 'version' && (
				<p role="note" className="border-b bg-accent px-6 py-2 text-sm">Le PDF téléchargé fait foi ; cet aperçu suit le modèle actuel.</p>
			)}
			{manques.length > 0 && (
				<p role="note" className="border-b bg-destructive-soft px-6 py-2 text-sm">Pour générer ce marché : {manques.join(', ')}.</p>
			)}
			<div className="flex flex-1 items-start justify-center overflow-auto overscroll-contain p-7">
				<Gabarit donnees={donnees} mode={source.type === 'marche' ? 'edition' : 'lecture'} onSaisie={saisir} />
			</div>
		</div>
	);
}
