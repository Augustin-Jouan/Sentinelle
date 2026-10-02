/** Joint des classes ; ignore false, null, undefined et les chaînes vides. Pas de fusion : une brique n'émet jamais deux classes sans variante sur la même propriété. */
export function cx(...classes: (string | false | null | undefined)[]): string {
	return classes.filter(Boolean).join(' ');
}
