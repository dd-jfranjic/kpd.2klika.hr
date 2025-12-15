import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlanType, SubscriptionStatus } from '@prisma/client';

export class UpdateTenantDto {
  @ApiProperty({
    enum: SubscriptionStatus,
    example: 'ACTIVE',
    description: 'Status pretplate',
    required: false,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus, {
    message: 'Status mora biti validan (ACTIVE, PAST_DUE, CANCELLED, TRIALING, PAUSED)',
  })
  status?: SubscriptionStatus;

  @ApiProperty({
    enum: PlanType,
    example: 'PRO',
    description: 'Plan pretplate',
    required: false,
  })
  @IsOptional()
  @IsEnum(PlanType, {
    message: 'Plan mora biti validan (FREE, BASIC, PRO, BUSINESS, ENTERPRISE)',
  })
  plan?: PlanType;
}
