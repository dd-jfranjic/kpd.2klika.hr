import { z } from 'zod';

export const UpgradeSubscriptionSchema = z.object({
  organizationId: z.string().min(1, 'organizationId je obavezan'),
  priceId: z.string().min(1, 'priceId je obavezan'),
});

export type UpgradeSubscriptionDto = z.infer<typeof UpgradeSubscriptionSchema>;
