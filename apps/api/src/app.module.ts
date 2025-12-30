import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { KpdModule } from './modules/kpd/kpd.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { QueriesModule } from './modules/queries/queries.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { EmailModule } from './modules/email/email.module';
import { GdprModule } from './modules/gdpr/gdpr.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SupportModule } from './modules/support/support.module';

/**
 * KPD 2klika API - Fresh Start
 * Version: 2.0
 * Date: 2025-12-13
 *
 * PHASE 1 complete - minimal working API
 * PHASE 2 complete - authentication
 * Modules will be added in subsequent phases:
 * - PHASE 3: StripeModule, SubscriptionsModule
 * - PHASE 4: KpdModule, ClassifyModule
 * - PHASE 5: DashboardModule
 * - PHASE 6: AdminModule
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting (global)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),

    // Database (PHASE 1)
    PrismaModule,

    // Health check endpoints (PHASE 1)
    HealthModule,

    // Authentication (PHASE 2)
    AuthModule,

    // Billing & Subscriptions (PHASE 3)
    StripeModule,

    // KPD Classification Tool (PHASE 4)
    KpdModule,

    // Dashboard & User Management (PHASE 5)
    UsersModule,
    OrganizationsModule,
    QueriesModule,

    // Admin Panel (PHASE 6)
    AdminModule,

    // API Keys (for programmatic access)
    ApiKeysModule,

    // Email service (global)
    EmailModule,

    // GDPR Compliance (PHASE 7)
    GdprModule,

    // Notifications (PHASE 8)
    NotificationModule,

    // Support Chat (PHASE 9)
    SupportModule,
  ],
  controllers: [],
  providers: [
    // SECURITY: Globalni rate limiting guard
    // Štiti sve endpointe od DDoS i brute-force napada
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
