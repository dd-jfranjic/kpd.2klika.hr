import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { KpdController } from './kpd.controller';
import { KpdService, KpdSuggestionService, RagService } from './services';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 3600000, // 1 hour default TTL
      max: 1000, // Max cached items
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [KpdController],
  providers: [KpdService, KpdSuggestionService, RagService],
  exports: [KpdService, KpdSuggestionService, RagService],
})
export class KpdModule {}
