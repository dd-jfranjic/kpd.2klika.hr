import { z } from 'zod';

/**
 * DTO za kreiranje jednokratne checkout session
 * Za kupnju plana kao one-time payment (ne subscription)
 */
export const CreateOnetimeCheckoutSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID je obavezan'),
  plan: z.enum(['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'], {
    errorMap: () => ({ message: 'Plan mora biti BASIC, PRO, BUSINESS ili ENTERPRISE' }),
  }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateOnetimeCheckoutDto = z.infer<typeof CreateOnetimeCheckoutSchema>;
