import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DocumentSuppression, ResumeSuppression } from '@/domaine/suppression';
import { ContenuSuppression } from './AlerteSuppression';

const rien = () => {};

const doc = (id: string): DocumentSuppression => ({
	id,
	type: 'CERTIFICAT_PAIEMENT',
	serie: 's',
	nomFichier: `${id}.pdf`,
	version: 1,
	creeLe: new Date('2026-03-15T10:00:00.000Z'),
});

const PERRIER = 'PERRIER — Louisfert';

const resumeAvecDocs: ResumeSuppression = {
	reference: PERRIER,
	documents: [doc('a'), doc('b'), doc('c')],
	lots: 2,
	periodes: 0,
	fermetures: 0,
	compteRenduEnBrouillon: false,
};

const resumeVide: ResumeSuppression = {
	reference: PERRIER,
	documents: [],
	lots: 0,
	periodes: 0,
	fermetures: 0,
	compteRenduEnBrouillon: false,
};

function afficher(o: {
	resume?: ResumeSuppression | null;
	saisie?: string;
	etat?: 'chargement' | 'erreur-lecture' | 'pret' | 'erreur-suppression';
	messageErreur?: string;
	chantierId?: string;
}) {
	return renderToStaticMarkup(
		<ContenuSuppression
			chantierId={o.chantierId ?? 'c1'}
			reference={PERRIER}
			resume={o.resume === undefined ? resumeAvecDocs : o.resume}
			saisie={o.saisie ?? ''}
			etat={o.etat ?? 'pret'}
			messageErreur={o.messageErreur}
			onSaisie={rien}
			onAnnuler={rien}
			onConfirmer={rien}
		/>,
	).replaceAll('&#x27;', "'");
}

function boutonSupprimer(html: string): string {
	const m = /<button type="submit"[^>]*>Supprimer<\/button>/.exec(html);
	if (!m) throw new Error('bouton Supprimer introuvable');
	return m[0];
}

describe('AlerteSuppression', () => {
	it("EX-3 — l'alerte montre le décompte, la liste repliée et la consigne", () => {
		const html = afficher({});
		expect(html).toContain('je supprime PERRIER — Louisfert');
		expect(html).toContain('3 certificats de paiement');
		expect(html).toContain('<details');
		expect(html).not.toMatch(/<details[^>]*\sopen/);
	});

	it('EX-3 — sans document, l\'alerte indique Aucun document généré', () => {
		const html = afficher({ resume: resumeVide });
		expect(html).toContain('Aucun document généré.');
		expect(html).not.toContain('<details');
	});

	it('EX-3 — Supprimer reste désactivé tant que la phrase ne correspond pas', () => {
		expect(boutonSupprimer(afficher({ saisie: 'je supprime PERRIER' }))).toContain('disabled=""');
		expect(boutonSupprimer(afficher({ saisie: 'je supprime PERRIER — Louisfert' }))).not.toContain('disabled=""');
	});

	it('EX-3 — pendant le chargement, après une erreur de lecture ou un refus, Supprimer reste désactivé ou le message s\'affiche', () => {
		const phrase = 'je supprime PERRIER — Louisfert';
		expect(boutonSupprimer(afficher({ etat: 'chargement', saisie: phrase, resume: null }))).toContain('disabled=""');
		expect(boutonSupprimer(afficher({
			etat: 'erreur-lecture', saisie: phrase, resume: null, messageErreur: 'Ce chantier a déjà été supprimé.',
		}))).toContain('disabled=""');
		expect(afficher({
			etat: 'erreur-suppression', saisie: phrase,
			messageErreur: 'La liste des documents a changé : rouvrez la suppression pour la vérifier.',
		})).toContain('La liste des documents a changé : rouvrez la suppression pour la vérifier.');
	});

	it("EX-5 — lien d'archive seulement quand il y a des documents", () => {
		const avec = afficher({ resume: resumeAvecDocs, chantierId: 'c1' });
		expect(avec).toContain('/api/chantiers/c1/archive');
		expect(avec).toContain("Télécharger l'archive avant de supprimer");
		const sans = afficher({ resume: resumeVide });
		expect(sans).not.toContain('/archive');
	});
});
