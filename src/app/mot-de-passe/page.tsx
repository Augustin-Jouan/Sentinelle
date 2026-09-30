import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/auth/session';
import { FormulaireMotDePasse } from '@/composants/FormulaireMotDePasse';

export default async function PageMotDePasse() {
	if (!(await utilisateurConnecte())) redirect('/connexion');
	return (
		<main className="grid min-h-screen place-items-center px-4">
			<FormulaireMotDePasse />
		</main>
	);
}
