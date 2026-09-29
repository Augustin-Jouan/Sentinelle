import { createHash } from 'node:crypto';

/** JSON aux clés triées : deux objets égaux donnent la même chaîne. */
export function serialiserStable(v: unknown): string {
	if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
	if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : serialiserStable(x))).join(',')}]`;
	const o = v as Record<string, unknown>;
	const cles = Object.keys(o).filter((k) => o[k] !== undefined).sort();
	return `{${cles.map((k) => `${JSON.stringify(k)}:${serialiserStable(o[k])}`).join(',')}}`;
}

export function empreinte(v: unknown): string {
	return createHash('sha256').update(serialiserStable(v)).digest('hex');
}
