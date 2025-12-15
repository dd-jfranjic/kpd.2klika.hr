import { z } from 'zod';

export const CreatePortalSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID je obavezan'),
  returnUrl: z.string().url().optional(),
});

export type CreatePortalDto = z.infer<typeof CreatePortalSchema>;
