import { z } from 'zod';

/**
 * DTO za kupnju Query Booster paketa
 * 10 dodatnih upita za 6.99 EUR (nikad ne istjecu)
 */
export const PurchaseQueryBoosterSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID je obavezan'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type PurchaseQueryBoosterDto = z.infer<typeof PurchaseQueryBoosterSchema>;
