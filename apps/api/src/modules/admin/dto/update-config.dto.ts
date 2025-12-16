import { IsString, MaxLength, IsBoolean, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// SECURITY: Samo ovi ključevi se mogu modificirati preko admin API-ja
// Kritični ključevi (STRIPE_SECRET_KEY, DATABASE_URL, itd.) NISU na listi
export const ALLOWED_CONFIG_KEYS = [
  'MAINTENANCE_MODE',
  'LOG_LEVEL',
  'MAX_REQUESTS_PER_MINUTE',
  'AI_ENABLED',
  'AI_MODEL',
  'AI_TEMPERATURE',
  'AI_SYSTEM_PROMPT',
  'SUPPORT_EMAIL',
  'TERMS_URL',
  'PRIVACY_URL',
  // Security settings
  'ADMIN_2FA_REQUIRED',
  'SESSION_TIMEOUT_MINUTES',
  'IP_WHITELIST_ENABLED',
  'IP_WHITELIST_ADDRESSES',
  'RATE_LIMIT_PER_MINUTE',
] as const;

export const ALLOWED_INTEGRATION_KEYS = [
  'STRIPE_WEBHOOK_URL',
  'GEMINI_MODEL',
  'RAG_STORE_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_FROM_NAME',
  'SMTP_FROM_EMAIL',
  'SMTP_SECURE',
] as const;

// Models compatible with Google Gemini File Search (RAG)
// Reference: https://ai.google.dev/gemini-api/docs/file-search
export const GEMINI_RAG_COMPATIBLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Najbolji omjer cijene i performansi (preporučeno)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Napredni model s enhanced thinking' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Najbrži i najjeftiniji model' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', description: 'Najnoviji preview model' },
] as const;

export const ALLOWED_FEATURE_FLAGS = [
  'AI_SUGGESTIONS',
  'MAINTENANCE_MODE',
  'NEW_PRICING',
  'BETA_FEATURES',
] as const;

export class UpdateConfigDto {
  @ApiProperty({
    example: 'debug',
    description: 'Nova vrijednost konfiguracije',
  })
  @IsString()
  @MaxLength(10000, { message: 'Vrijednost preduga (max 10000 znakova)' })
  value!: string;
}

export class UpdateIntegrationDto {
  @ApiProperty({
    example: 'https://example.com/webhook',
    description: 'Nova vrijednost integracije',
  })
  @IsString()
  @MaxLength(10000, { message: 'Vrijednost preduga (max 10000 znakova)' })
  value!: string;
}

export class ToggleFeatureFlagDto {
  @ApiProperty({
    example: true,
    description: 'Da li je feature uključen',
  })
  @IsBoolean()
  enabled!: boolean;
}

// =====================================
// SECURITY SETTINGS DTOs
// =====================================

export class UpdateSecuritySettingsDto {
  @ApiProperty({ example: false, description: 'Obavezna 2FA za admine' })
  @IsOptional()
  @IsBoolean()
  admin2faRequired?: boolean;

  @ApiProperty({ example: 60, description: 'Session timeout u minutama' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440) // Max 24 sata
  sessionTimeoutMinutes?: number;

  @ApiProperty({ example: false, description: 'IP whitelist enabled' })
  @IsOptional()
  @IsBoolean()
  ipWhitelistEnabled?: boolean;

  @ApiProperty({ example: '192.168.1.1\n10.0.0.1', description: 'IP adrese (jedna po liniji)' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  ipWhitelistAddresses?: string;

  @ApiProperty({ example: 100, description: 'Max zahtjeva po minuti' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(10000)
  rateLimitPerMinute?: number;
}

export class ClearCacheDto {
  @ApiProperty({ example: 'all', description: 'Tip cachea za brisanje (all, redis, memory)' })
  @IsOptional()
  @IsString()
  type?: 'all' | 'redis' | 'memory';
}
