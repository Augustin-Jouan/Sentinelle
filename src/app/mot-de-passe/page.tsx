import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/auth/session';
import { FormulaireMotDePasse } from '@/composants/FormulaireMotDePasse';

export default async function PageMotDePasse() {
	if (!(await utilisateurConnecte())) redirect('/connexion');
	return <FormulaireMotDePasse />;
}
