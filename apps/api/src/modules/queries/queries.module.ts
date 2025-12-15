import { Module } from '@nestjs/common';
import { QueriesController } from './queries.controller';
import { QueriesService } from './queries.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QueriesController],
  providers: [QueriesService],
  exports: [QueriesService],
})
export class QueriesModule {}
