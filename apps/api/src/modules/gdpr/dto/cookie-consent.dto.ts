import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCookieConsentDto {
  @ApiProperty({ description: 'Unique visitor identifier (UUID from browser cookie)' })
  @IsString()
  visitorId!: string;

  @ApiPropertyOptional({ description: 'Analytics cookies consent' })
  @IsOptional()
  @IsBoolean()
  analytics?: boolean;

  @ApiPropertyOptional({ description: 'Marketing cookies consent' })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

export class CookieConsentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  visitorId!: string;

  @ApiProperty()
  necessary!: boolean;

  @ApiProperty()
  analytics!: boolean;

  @ApiProperty()
  marketing!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
