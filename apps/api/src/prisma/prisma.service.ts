import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Čisti bazu u testovima
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase se smije pozivati samo u test okruženju!');
    }

    // Briši u ispravnom redoslijedu zbog foreign keys
    await this.$transaction([
      this.auditLog.deleteMany(),
      this.query.deleteMany(),
      this.usageRecord.deleteMany(),
      this.invitation.deleteMany(),
      this.subscription.deleteMany(),
      this.organizationMember.deleteMany(),
      this.organization.deleteMany(),
      this.user.deleteMany(),
      this.kpdCode.deleteMany(),
      this.kpdCategory.deleteMany(),
      this.systemConfig.deleteMany(),
      this.planConfig.deleteMany(),
    ]);
  }
}
