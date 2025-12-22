import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GdprRequestType, GdprRequestStatus } from '@prisma/client';

// DTO for creating data export request (Article 15)
export class RequestDataExportDto {
  @ApiPropertyOptional({ description: 'Additional notes for the request' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

// DTO for creating data deletion request (Article 17)
export class RequestDataDeletionDto {
  @ApiProperty({ description: 'Reason for deletion request' })
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

// Response DTO for GDPR requests
export class GdprRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: GdprRequestType })
  requestType!: GdprRequestType;

  @ApiProperty({ enum: GdprRequestStatus })
  status!: GdprRequestStatus;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  exportUrl?: string;

  @ApiPropertyOptional()
  exportExpiresAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  processedAt?: Date;
}

// Admin DTO for processing GDPR requests
export class ProcessGdprRequestDto {
  @ApiProperty({ enum: GdprRequestStatus })
  @IsEnum(GdprRequestStatus)
  status!: GdprRequestStatus;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Export URL (for data export requests)' })
  @IsOptional()
  @IsString()
  exportUrl?: string;
}

// Admin query DTO for listing GDPR requests
export class ListGdprRequestsQueryDto {
  @ApiPropertyOptional({ enum: GdprRequestType })
  @IsOptional()
  @IsEnum(GdprRequestType)
  requestType?: GdprRequestType;

  @ApiPropertyOptional({ enum: GdprRequestStatus })
  @IsOptional()
  @IsEnum(GdprRequestStatus)
  status?: GdprRequestStatus;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  limit?: number;
}
