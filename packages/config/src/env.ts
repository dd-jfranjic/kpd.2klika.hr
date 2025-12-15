import { z } from 'zod';

/**
 * Environment variable schema with Zod validation
 * All env vars are validated at application startup
 */
export const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  APP_URL: z.string().url().default('http://localhost:13620'),
  API_URL: z.string().url().default('http://localhost:13621'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:13623'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),

  // Gemini AI
  GEMINI_API_KEY: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: z.coerce.number().default(60000),
  RATE_LIMIT_LIMIT: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Feature Flags
  FEATURE_MAINTENANCE_MODE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  FEATURE_AI_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Security
  API_KEY_SALT: z.string().optional(),
  SESSION_SECRET: z.string().optional(),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup
 * Throws detailed error if validation fails
 */
export function validateEnv(env: Record<string, unknown>): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Get validated environment
 * Call this once at application startup
 */
export function getEnv(): Env {
  return validateEnv(process.env);
}
