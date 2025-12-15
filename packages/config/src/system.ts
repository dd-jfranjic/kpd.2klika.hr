import { z } from 'zod';

/**
 * System Configuration Keys
 * All configurable values - ZERO HARDCODING!
 */
export const SystemConfigKeys = {
  // AI Settings
  AI_MODEL_NAME: 'ai.model_name',
  AI_MAX_TOKENS: 'ai.max_tokens',
  AI_TEMPERATURE: 'ai.temperature',
  AI_SYSTEM_PROMPT: 'ai.system_prompt',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 'rate_limit.window_ms',
  RATE_LIMIT_MAX_REQUESTS: 'rate_limit.max_requests',

  // Cache TTL (seconds)
  CACHE_TTL_KPD_CODES: 'cache.ttl.kpd_codes',
  CACHE_TTL_CONFIG: 'cache.ttl.config',
  CACHE_TTL_USER_SESSION: 'cache.ttl.user_session',
  CACHE_TTL_QUERY_RESULT: 'cache.ttl.query_result',

  // Billing
  BILLING_GRACE_PERIOD_DAYS: 'billing.grace_period_days',
  BILLING_FREE_TRIAL_DAYS: 'billing.free_trial_days',

  // Security
  SECURITY_MAX_LOGIN_ATTEMPTS: 'security.max_login_attempts',
  SECURITY_LOCKOUT_DURATION_MIN: 'security.lockout_duration_min',
  SECURITY_API_KEY_EXPIRY_DAYS: 'security.api_key_expiry_days',

  // Features
  FEATURE_MAINTENANCE_MODE: 'feature.maintenance_mode',
  FEATURE_AI_ENABLED: 'feature.ai_enabled',
  FEATURE_NEW_USER_ONBOARDING: 'feature.new_user_onboarding',

  // Limits
  LIMIT_MAX_QUERY_LENGTH: 'limit.max_query_length',
  LIMIT_MAX_RESULTS_PER_QUERY: 'limit.max_results_per_query',
  LIMIT_MAX_FAVORITES: 'limit.max_favorites',
  LIMIT_MAX_HISTORY_ITEMS: 'limit.max_history_items',

  // UI
  UI_DEFAULT_THEME: 'ui.default_theme',
  UI_DEFAULT_LOCALE: 'ui.default_locale',
  UI_ITEMS_PER_PAGE: 'ui.items_per_page',
} as const;

export type SystemConfigKey =
  (typeof SystemConfigKeys)[keyof typeof SystemConfigKeys];

/**
 * Default values for System Configuration
 */
export const SystemConfigDefaults: Record<SystemConfigKey, unknown> = {
  // AI Settings
  [SystemConfigKeys.AI_MODEL_NAME]: 'gemini-2.0-flash-exp',
  [SystemConfigKeys.AI_MAX_TOKENS]: 2048,
  [SystemConfigKeys.AI_TEMPERATURE]: 0.3,
  [SystemConfigKeys.AI_SYSTEM_PROMPT]: `Ti si stručnjak za klasifikaciju poslovnih djelatnosti prema KPD (Klasifikacija Proizvoda po Djelatnostima) standardu.
Tvoj zadatak je analizirati opis posla ili djelatnosti i predložiti najprikladnije KPD šifre.
Uvijek navedi razlog zašto si odabrao određenu šifru.
Odgovori na hrvatskom jeziku.`,

  // Rate Limiting
  [SystemConfigKeys.RATE_LIMIT_WINDOW_MS]: 60000,
  [SystemConfigKeys.RATE_LIMIT_MAX_REQUESTS]: 100,

  // Cache TTL (seconds)
  [SystemConfigKeys.CACHE_TTL_KPD_CODES]: 86400, // 24 hours
  [SystemConfigKeys.CACHE_TTL_CONFIG]: 3600, // 1 hour
  [SystemConfigKeys.CACHE_TTL_USER_SESSION]: 1800, // 30 minutes
  [SystemConfigKeys.CACHE_TTL_QUERY_RESULT]: 86400, // 24 hours

  // Billing
  [SystemConfigKeys.BILLING_GRACE_PERIOD_DAYS]: 7,
  [SystemConfigKeys.BILLING_FREE_TRIAL_DAYS]: 14,

  // Security
  [SystemConfigKeys.SECURITY_MAX_LOGIN_ATTEMPTS]: 5,
  [SystemConfigKeys.SECURITY_LOCKOUT_DURATION_MIN]: 15,
  [SystemConfigKeys.SECURITY_API_KEY_EXPIRY_DAYS]: 365,

  // Features
  [SystemConfigKeys.FEATURE_MAINTENANCE_MODE]: false,
  [SystemConfigKeys.FEATURE_AI_ENABLED]: true,
  [SystemConfigKeys.FEATURE_NEW_USER_ONBOARDING]: true,

  // Limits
  [SystemConfigKeys.LIMIT_MAX_QUERY_LENGTH]: 1000,
  [SystemConfigKeys.LIMIT_MAX_RESULTS_PER_QUERY]: 5,
  [SystemConfigKeys.LIMIT_MAX_FAVORITES]: 50,
  [SystemConfigKeys.LIMIT_MAX_HISTORY_ITEMS]: 100,

  // UI
  [SystemConfigKeys.UI_DEFAULT_THEME]: 'system',
  [SystemConfigKeys.UI_DEFAULT_LOCALE]: 'hr',
  [SystemConfigKeys.UI_ITEMS_PER_PAGE]: 20,
};

/**
 * Zod schemas for config validation
 */
export const SystemConfigSchemas = {
  [SystemConfigKeys.AI_MODEL_NAME]: z.string().min(1),
  [SystemConfigKeys.AI_MAX_TOKENS]: z.number().int().min(100).max(8192),
  [SystemConfigKeys.AI_TEMPERATURE]: z.number().min(0).max(2),
  [SystemConfigKeys.AI_SYSTEM_PROMPT]: z.string().min(10),

  [SystemConfigKeys.RATE_LIMIT_WINDOW_MS]: z.number().int().min(1000),
  [SystemConfigKeys.RATE_LIMIT_MAX_REQUESTS]: z.number().int().min(1),

  [SystemConfigKeys.CACHE_TTL_KPD_CODES]: z.number().int().min(60),
  [SystemConfigKeys.CACHE_TTL_CONFIG]: z.number().int().min(60),
  [SystemConfigKeys.CACHE_TTL_USER_SESSION]: z.number().int().min(60),
  [SystemConfigKeys.CACHE_TTL_QUERY_RESULT]: z.number().int().min(60),

  [SystemConfigKeys.BILLING_GRACE_PERIOD_DAYS]: z.number().int().min(0),
  [SystemConfigKeys.BILLING_FREE_TRIAL_DAYS]: z.number().int().min(0),

  [SystemConfigKeys.SECURITY_MAX_LOGIN_ATTEMPTS]: z.number().int().min(1),
  [SystemConfigKeys.SECURITY_LOCKOUT_DURATION_MIN]: z.number().int().min(1),
  [SystemConfigKeys.SECURITY_API_KEY_EXPIRY_DAYS]: z.number().int().min(1),

  [SystemConfigKeys.FEATURE_MAINTENANCE_MODE]: z.boolean(),
  [SystemConfigKeys.FEATURE_AI_ENABLED]: z.boolean(),
  [SystemConfigKeys.FEATURE_NEW_USER_ONBOARDING]: z.boolean(),

  [SystemConfigKeys.LIMIT_MAX_QUERY_LENGTH]: z.number().int().min(10),
  [SystemConfigKeys.LIMIT_MAX_RESULTS_PER_QUERY]: z.number().int().min(1),
  [SystemConfigKeys.LIMIT_MAX_FAVORITES]: z.number().int().min(1),
  [SystemConfigKeys.LIMIT_MAX_HISTORY_ITEMS]: z.number().int().min(1),

  [SystemConfigKeys.UI_DEFAULT_THEME]: z.enum(['light', 'dark', 'system']),
  [SystemConfigKeys.UI_DEFAULT_LOCALE]: z.enum(['hr', 'en']),
  [SystemConfigKeys.UI_ITEMS_PER_PAGE]: z.number().int().min(5).max(100),
} as const;

/**
 * Validate a config value against its schema
 */
export function validateConfigValue<K extends SystemConfigKey>(
  key: K,
  value: unknown
): boolean {
  const schema = SystemConfigSchemas[key];
  if (!schema) return true;

  const result = schema.safeParse(value);
  return result.success;
}

/**
 * Get category from config key
 */
export function getConfigCategory(key: SystemConfigKey): string {
  return key.split('.')[0];
}
