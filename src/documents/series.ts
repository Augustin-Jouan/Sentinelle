/** Séries des documents du chantier entier ; la série d'un marché est l'id de son lot. */
export const SERIES = { RECAPITULATIF: 'RECAPITULATIF', PLANNING: 'PLANNING', VISA: 'VISA' } as const;

/** Une lettre d'avenant : ses versions survivent à l'avenant (pas de clé étrangère). */
export const serieAvenant = (avenantId: string): string => `AVENANT:${avenantId}`;
/** Un certificat de paiement : une série par acompte, dont seule la dernière version compte. */
export const serieCertificat = (acompteId: string): string => `CERTIFICAT:${acompteId}`;
