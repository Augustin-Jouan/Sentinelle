import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Champ, classesSaisie, Saisie } from './Champ';
import { ChoixSegmente } from './ChoixSegmente';
import { Interrupteur } from './Interrupteur';

describe('briques de formulaire', () => {
	it('classesSaisie : « gras » remplace la graisse de la variante, sans doublon', () => {
		const c = classesSaisie('texte', { gras: true }).split(' ');
		expect(c).toContain('font-semibold');
		expect(c).not.toContain('font-medium');
		expect(classesSaisie('champ', { chiffres: true })).toContain('font-mono tabular-nums');
	});

	it('toute saisie porte les états erreur et en cours', () => {
		for (const v of ['champ', 'texte', 'montant-etroit', 'kv', 'date'] as const) {
			expect(classesSaisie(v)).toContain('aria-invalid:border-danger');
			expect(classesSaisie(v)).toContain('aria-busy:opacity-70');
		}
	});

	it('Champ relie le libellé au contrôle, et l\'erreur à la saisie', () => {
		const html = renderToStaticMarkup(
			<Champ libelle="Référence dossier" pour="f-ref" erreur="Cette référence existe déjà.">
				<Saisie id="f-ref" erreur="Cette référence existe déjà." />
			</Champ>,
		);
		expect(html).toContain('<label for="f-ref"');
		expect(html).toContain('aria-invalid="true"');
		expect(html).toContain('aria-describedby="f-ref-erreur"');
		expect(html).toContain('<p id="f-ref-erreur" class="m-0 text-danger text-11">Cette référence existe déjà.</p>');
	});

	it('ChoixSegmente : des role="radio", un seul coché', () => {
		const html = renderToStaticMarkup(
			<ChoixSegmente libelle="Type de mission" valeur="PARTIELLE" onChoisir={() => {}}
				options={[{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }]} />,
		);
		expect(html).toContain('role="radiogroup" aria-label="Type de mission"');
		expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
		expect(html).toMatch(/aria-checked="true"[^>]*>Partielle</);
	});

	it('ChoixSegmente : un seul arrêt de tabulation, sur l\'option cochée', () => {
		const html = renderToStaticMarkup(
			<ChoixSegmente libelle="Type de mission" valeur="PARTIELLE" onChoisir={() => {}}
				options={[{ v: 'COMPLETE', t: 'Complète' }, { v: 'PARTIELLE', t: 'Partielle' }]} />,
		);
		expect(html).toMatch(/aria-checked="true" tabindex="0"[^>]*>Partielle</);
		expect(html).toMatch(/aria-checked="false" tabindex="-1"[^>]*>Complète</);
	});

	it('Interrupteur discret : le texte du libellé d\'un champ', () => {
		expect(renderToStaticMarkup(<Interrupteur coche={false} onChange={() => {}} variante="discrete">x</Interrupteur>)).toContain('text-12 text-muted');
	});
});
