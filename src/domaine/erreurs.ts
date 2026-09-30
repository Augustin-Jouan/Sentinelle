/** Erreur attendue, dont le message (en français) peut être montré tel quel à l'utilisateur. */
export class ErreurMetier extends Error {
	readonly champ?: string;

	constructor(message: string, champ?: string) {
		super(message);
		this.name = 'ErreurMetier';
		this.champ = champ;
	}
}
