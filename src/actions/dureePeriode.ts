import { z } from 'zod';

const message = 'La durée doit être comprise entre 1 et 104 semaines.';

/** Bornes Zod §8 : 1–104 semaines (création de période uniquement). */
export const dureePeriode = z.number()
	.int(message)
	.min(1, message)
	.max(104, message);
