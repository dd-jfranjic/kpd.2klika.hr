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
  'SMTP_FROM_NAME',
  'SMTP_FROM_EMAIL',
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
