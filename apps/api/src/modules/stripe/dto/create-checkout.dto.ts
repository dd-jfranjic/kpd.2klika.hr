import { z } from 'zod';

export const CreateCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID je obavezan'),
  organizationId: z.string().min(1, 'Organization ID je obavezan'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutDto = z.infer<typeof CreateCheckoutSchema>;
