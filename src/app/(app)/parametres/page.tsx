import { exigerPage } from '@/auth/session';
import { FormulaireParametres } from '@/composants/FormulaireParametres';
import { lireParametres } from '@/donnees/parametres';

export default async function PageParametres() {
	await exigerPage({ admin: true });
	const { id: _id, logo, ...p } = await lireParametres();
	return <FormulaireParametres initiales={{ ...p, fax: p.fax ?? '', email: p.email ?? '', siteWeb: p.siteWeb ?? '' }} logoInitial={logo} />;
}
