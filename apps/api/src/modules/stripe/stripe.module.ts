import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { WebhookController } from './webhook.controller';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminModule } from '../admin/admin.module';
import { OrganizationMemberGuard } from './guards';

@Module({
  imports: [ConfigModule, PrismaModule, AdminModule],
  controllers: [StripeController, WebhookController],
  providers: [StripeService, OrganizationMemberGuard],
  exports: [StripeService],
})
export class StripeModule {}
