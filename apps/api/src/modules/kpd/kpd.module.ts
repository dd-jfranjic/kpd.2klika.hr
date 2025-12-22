import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { KpdController } from './kpd.controller';
import { KpdService, KpdSuggestionService, RagService } from './services';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    // ============================================
    // REDIS CACHE - Premium skalabilni cache
    // ============================================
    // Prednosti Redis cache-a:
    // 1. Cache preživljava restart API-ja
    // 2. Dijeli se između više instanci (skalabilnost)
    // 3. Brže od in-memory za velike datasetove
    // 4. TTL se automatski čisti
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        // Ako nema Redis URL-a, koristi fallback in-memory cache
        if (!redisUrl) {
          console.warn('⚠️ REDIS_URL nije postavljen - koristim in-memory cache');
          return {
            ttl: 86400000, // 24 sata - KPD šifre su statične
            max: 1000,
          };
        }

        try {
          const store = await redisStore({
            url: redisUrl,
            ttl: 86400000, // 24 sata default TTL - KPD šifre su statične
            // Prefix za KPD keys - omogućava dijeljenje Redis instance
            keyPrefix: 'kpd:cache:',
          });

          console.log('✅ Redis cache inicijaliziran:', redisUrl);

          return {
            store: store,
            ttl: 86400000, // 24 sata
          };
        } catch (error) {
          console.error('❌ Redis connection failed, falling back to in-memory:', error);
          return {
            ttl: 86400000, // 24 sata
            max: 1000,
          };
        }
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [KpdController],
  providers: [KpdService, KpdSuggestionService, RagService],
  exports: [KpdService, KpdSuggestionService, RagService],
})
export class KpdModule {}
