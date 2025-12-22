import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueriesService } from './queries.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('queries')
@Controller('queries')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  /**
   * Dohvati povijest upita s paginacijom
   */
  @Get()
  @ApiOperation({ summary: 'Dohvati povijest upita' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista upita' })
  async getQueries(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.queriesService.getQueries(user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: {
        items: result.items,
        pagination: result.pagination,
      },
    };
  }

  /**
   * Eksportaj upite u CSV
   * NAPOMENA: Dostupno samo za PRO, BUSINESS i ENTERPRISE planove
   */
  @Get('export')
  @ApiOperation({ summary: 'Eksportaj upite u CSV (PRO+ planovi)' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'CSV podaci u JSON formatu' })
  @ApiResponse({ status: 403, description: 'PRO+ plan potreban za ovu funkcionalnost' })
  async exportQueries(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const result = await this.queriesService.exportQueries(user.sub, {
      search,
      startDate,
      endDate,
    });

    return {
      success: true,
      data: {
        filename: result.filename,
        content: result.content,
        mimeType: result.mimeType,
      },
    };
  }

  /**
   * Dohvati pojedini upit
   */
  @Get(':id')
  @ApiOperation({ summary: 'Dohvati pojedini upit' })
  @ApiResponse({ status: 200, description: 'Detalji upita' })
  @ApiResponse({ status: 403, description: 'Nema pristupa' })
  async getQuery(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const query = await this.queriesService.getQueryById(id, user.sub);
    return {
      success: true,
      data: query,
    };
  }

  /**
   * Izbriši upit
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Izbriši upit' })
  @ApiResponse({ status: 200, description: 'Upit obrisan' })
  @ApiResponse({ status: 403, description: 'Nema pristupa' })
  async deleteQuery(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.queriesService.deleteQuery(id, user.sub);
  }
}
