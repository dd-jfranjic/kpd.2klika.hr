import { z } from 'zod';

/**
 * DTO za admin dodjelu bonus upita
 * Samo SUPER_ADMIN moze koristiti ovaj endpoint
 */
export const GrantBonusQueriesSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID je obavezan'),
  queriesCount: z.number().int().min(1, 'Broj upita mora biti najmanje 1').max(10000, 'Maksimalno 10000 upita'),
  reason: z.string().max(500, 'Razlog moze imati maksimalno 500 znakova').optional(),
});

export type GrantBonusQueriesDto = z.infer<typeof GrantBonusQueriesSchema>;
