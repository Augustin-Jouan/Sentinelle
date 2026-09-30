import { describe, expect, it } from 'vitest';
import { formatEuros } from '@/domaine/montants';
import { PERRIER_CHANTIER, PERRIER_LOTS, PERRIER_PARAMETRES } from '../../tests/fixtures/perrier';
import { batirAvenant, batirCadre, batirMarche, empreinteDocument, type SourceAvenant } from './batir';
import { donneesDocumentSchema } from './schemas';

const MAINTENANT = new Date('2026-09-29T08:00:00Z');
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);
const CARRELAGE = PERRIER_LOTS.find((l) => l.designation === 'CARRELAGE — FAÏENCE')!;
const N1: SourceAvenant = { id: 'a1', numero: 1, devis: 'D-2026-031', montantHt: '850', date: jour('2026-04-20'), objet: "Faïence toute hauteur dans la salle d'eau." };
const N2: SourceAvenant = { id: 'a2', numero: 2, devis: 'D-2026-044', montantHt: '-300', date: jour('2026-05-12'), objet: 'Suppression de la plinthe du cellier.' };
const avec = (...avenants: SourceAvenant[]) => ({ ...CARRELAGE, avenants });
const lettre = (lot: ReturnType<typeof avec>, id: string) => batirAvenant(PERRIER_CHANTIER, lot, id, PERRIER_PARAMETRES, MAINTENANT);

describe('lettre d\'avenant (annexe A)', () => {
	it('lettre n° 02 : moins-value, montants TTC', () => {
		const d = lettre(avec(N1, N2), 'a2');
		expect(d).toEqual({
			type: 'AVENANT',
			contenu: {
				entete: {
					coordination: 'Augustin Jouan', maitreOuvrage: 'M. et Mme PERRIER',
					projet: "Construction d'une maison individuelle — 142 m² + garage", adresseChantier: 'Le Haut Bois – 44110 LOUISFERT',
				},
				lieuDate: 'Châteaubriant, le 12 mai 2026',
				numero: '02',
				entreprise: 'MD CARRELAGE',
				lot: 'CARRELAGE — FAÏENCE',
				sens: 'moins-value',
				objet: 'Suppression de la plinthe du cellier.',
				montants: {
					marcheInitial: formatEuros('16140'),
					devis: { numero: 'D-2026-044', montant: formatEuros('360') },
					difference: formatEuros('360'),
					nouveauMontant: formatEuros('15780'),
				},
			},
			cadre: batirCadre(PERRIER_PARAMETRES, MAINTENANT),
		});
		expect(donneesDocumentSchema.parse(d)).toEqual(d);
	});

	it('lettre n° 01 : plus-value, les avenants suivants ne comptent pas', () => {
		const c = lettre(avec(N1, N2), 'a1').contenu;
		expect([c.sens, c.montants.marcheInitial, c.montants.nouveauMontant]).toEqual(['plus-value', formatEuros('15120'), formatEuros('16140')]);
	});

	it('après suppression du n° 01, la lettre n° 02 repart du marché initial : son empreinte change', () => {
		const avant = lettre(avec(N1, N2), 'a2');
		const apres = lettre(avec(N2), 'a2');
		expect([apres.contenu.montants.marcheInitial, apres.contenu.montants.nouveauMontant]).toEqual([formatEuros('15120'), formatEuros('14760')]);
		expect(empreinteDocument(apres)).not.toBe(empreinteDocument(avant));
	});

	it('un avenant suivant ne change pas la lettre ; un avenant ne change pas le marché imprimé', () => {
		const n3: SourceAvenant = { ...N2, id: 'a3', numero: 3, montantHt: '120' };
		expect(empreinteDocument(lettre(avec(N1, N2, n3), 'a2'))).toBe(empreinteDocument(lettre(avec(N1, N2), 'a2')));
		expect(empreinteDocument(batirMarche(PERRIER_CHANTIER, avec(N1, N2), PERRIER_PARAMETRES, MAINTENANT)))
			.toBe(empreinteDocument(batirMarche(PERRIER_CHANTIER, CARRELAGE, PERRIER_PARAMETRES, MAINTENANT)));
	});

	it('un avenant absent : message clair', () => {
		expect(() => lettre(avec(N1), 'a2')).toThrow("Cet avenant n'existe plus.");
	});
});
