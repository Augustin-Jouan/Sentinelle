import type { DonneesDocument } from '../schemas';
import { LettreAvenant } from './LettreAvenant';
import { MarcheGreAGre } from './MarcheGreAGre';
import { MarcheSousTraitance } from './MarcheSousTraitance';
import { PlanningPrevisionnel } from './PlanningPrevisionnel';
import { Recapitulatif } from './Recapitulatif';
import { VisaPlanning } from './VisaPlanning';
import type { ModeGabarit, Saisie } from './Zone';

export type { CleZone, ModeGabarit, Saisie } from './Zone';

export function Gabarit({ donnees, mode, onSaisie }: { donnees: DonneesDocument; mode: ModeGabarit; onSaisie?: Saisie }) {
	switch (donnees.type) {
		case 'MARCHE_GRE_A_GRE':
			return <MarcheGreAGre donnees={donnees} mode={mode} onSaisie={onSaisie} />;
		case 'MARCHE_SOUS_TRAITANCE':
			return <MarcheSousTraitance donnees={donnees} mode={mode} onSaisie={onSaisie} />;
		case 'RECAPITULATIF':
			return <Recapitulatif donnees={donnees} />;
		case 'PLANNING':
			return <PlanningPrevisionnel donnees={donnees} />;
		case 'VISA_PLANNING':
			return <VisaPlanning donnees={donnees} />;
		case 'AVENANT':
			return <LettreAvenant donnees={donnees} mode={mode} onSaisie={onSaisie} />;
	}
}
