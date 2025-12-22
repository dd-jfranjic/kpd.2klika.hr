import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '@prisma/client';

// DTO for recording consent during registration
export class RecordConsentDto {
  @ApiProperty({ enum: ConsentType, description: 'Type of consent being recorded' })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiProperty({ description: 'Whether consent is granted' })
  @IsBoolean()
  granted!: boolean;

  @ApiPropertyOptional({ description: 'Policy version (e.g., "1.0", "2.0")' })
  @IsOptional()
  @IsString()
  version?: string;
}

// DTO for registration with consents
export class RegistrationConsentsDto {
  @ApiProperty({ description: 'Accept Terms of Service (required)' })
  @IsBoolean()
  termsOfService!: boolean;

  @ApiProperty({ description: 'Accept Privacy Policy (required)' })
  @IsBoolean()
  privacyPolicy!: boolean;

  @ApiPropertyOptional({ description: 'Subscribe to marketing emails (optional)' })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;
}

// Response DTO for consent records
export class ConsentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ConsentType })
  consentType!: ConsentType;

  @ApiProperty()
  granted!: boolean;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  grantedAt!: Date;

  @ApiPropertyOptional()
  revokedAt?: Date;
}

// DTO for updating consent
export class UpdateConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  consentType!: ConsentType;

  @ApiProperty({ description: 'New consent status' })
  @IsBoolean()
  granted!: boolean;
}
