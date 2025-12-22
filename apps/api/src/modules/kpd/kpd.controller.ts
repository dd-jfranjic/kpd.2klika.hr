import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KpdService, KpdSuggestionService, RagService } from './services';
import { SearchKpdDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

/**
 * KPD Controller
 *
 * API endpoints za KPD klasifikacijski alat:
 * - POST /kpd/search - AI pretraga (zahtijeva auth)
 * - GET /kpd/code/:id - Detalji šifre
 * - GET /kpd/categories - Lista sektora
 * - GET /kpd/stats - Statistike baze
 * - GET /kpd/usage - Usage statistike (zahtijeva auth)
 */
@Controller('kpd')
export class KpdController {
  private readonly logger = new Logger(KpdController.name);

  constructor(
    private readonly kpdService: KpdService,
    private readonly suggestionService: KpdSuggestionService,
    private readonly ragService: RagService,
  ) {}

  /**
   * POST /kpd/search
   * AI pretraga KPD šifara
   *
   * Zahtijeva autentifikaciju i troši dnevni limit upita.
   */
  @Post('search')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async search(
    @Body() dto: SearchKpdDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `KPD search: "${dto.query}" by user ${req.user.sub} (org: ${req.user.organizationId})`,
    );

    const result = await this.suggestionService.getSuggestions(
      dto.query,
      req.user.organizationId,
      req.user.sub,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /kpd/search/local
   * Lokalna pretraga po nazivu (bez AI, ne troši limit)
   */
  @Get('search/local')
  async searchLocal(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('onlyFinal') onlyFinal?: string,
  ) {
    if (!query || query.length < 2) {
      return {
        success: true,
        data: [],
      };
    }

    const results = await this.kpdService.searchByText(query, {
      limit: limit ? parseInt(limit, 10) : 20,
      onlyFinal: onlyFinal === 'true',
    });

    return {
      success: true,
      data: results,
    };
  }

  /**
   * GET /kpd/code/:id
   * Detalji KPD šifre
   */
  @Get('code/:id')
  async getCode(@Param('id') id: string) {
    const code = await this.kpdService.getById(id);

    if (!code) {
      return {
        success: false,
        error: 'KPD šifra nije pronađena',
      };
    }

    return {
      success: true,
      data: code,
    };
  }

  /**
   * GET /kpd/code/:id/children
   * Djeca KPD šifre (subcodes)
   */
  @Get('code/:id/children')
  async getChildren(@Param('id') id: string) {
    const children = await this.kpdService.getChildren(id);

    return {
      success: true,
      data: children,
    };
  }

  /**
   * GET /kpd/code/:id/hierarchy
   * Hijerarhija KPD šifre (put do roota)
   */
  @Get('code/:id/hierarchy')
  async getHierarchy(@Param('id') id: string) {
    const hierarchy = await this.kpdService.getHierarchy(id);

    return {
      success: true,
      data: hierarchy,
    };
  }

  /**
   * GET /kpd/categories
   * Lista svih kategorija (sektora)
   */
  @Get('categories')
  async getCategories() {
    const categories = await this.kpdService.getCategories();

    return {
      success: true,
      data: categories,
    };
  }

  /**
   * GET /kpd/categories/:id
   * Kategorija s kodovima prve razine
   */
  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    const result = await this.kpdService.getCategoryWithCodes(id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /kpd/stats
   * Statistike KPD baze
   */
  @Get('stats')
  async getStats() {
    const stats = await this.kpdService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /kpd/usage
   * Usage statistike za trenutnu organizaciju
   */
  @Get('usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(@Request() req: AuthenticatedRequest) {
    const usage = await this.suggestionService.getUsageStats(
      req.user.organizationId,
    );

    return {
      success: true,
      data: usage,
    };
  }

  /**
   * GET /kpd/health
   * Health check za KPD modul
   */
  @Get('health')
  async health() {
    const stats = await this.kpdService.getStats();
    const ragReady = this.ragService.isReady();

    return {
      success: true,
      data: {
        database: stats.totalCodes > 0,
        rag: ragReady,
        codesCount: stats.totalCodes,
        categoriesCount: stats.totalCategories,
      },
    };
  }

  /**
   * POST /kpd/validate
   * Validiraj KPD šifre (bulk)
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateCodes(@Body() body: { codes: string[] }) {
    const result = await this.kpdService.validateCodes(body.codes || []);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /kpd/debug/rag-stats
   * RAG statistike za monitoring (samo SUPER_ADMIN)
   *
   * Pokazuje:
   * - Ukupno zahtjeva
   * - Uspješni/neuspješni zahtjevi
   * - Retry statistike
   * - Rate limit hitovi
   * - Queue status
   * - Prosječna latencija
   */
  @Get('debug/rag-stats')
  @UseGuards(JwtAuthGuard)
  async getRagStats(@Request() req: AuthenticatedRequest) {
    // Dozvoli samo SUPER_ADMIN ili u development okruženju
    if (req.user.role !== 'SUPER_ADMIN' && process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Pristup odbijen - potrebna SUPER_ADMIN uloga',
      };
    }

    const stats = this.ragService.getStats();

    return {
      success: true,
      data: {
        rag: {
          isReady: this.ragService.isReady(),
          ...stats,
          successRate: stats.totalRequests > 0
            ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%'
            : 'N/A',
          retryRate: stats.totalRequests > 0
            ? ((stats.retriedRequests / stats.totalRequests) * 100).toFixed(2) + '%'
            : 'N/A',
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * POST /kpd/debug/rag-stats/reset
   * Reset RAG statistika (samo SUPER_ADMIN)
   */
  @Post('debug/rag-stats/reset')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resetRagStats(@Request() req: AuthenticatedRequest) {
    if (req.user.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        error: 'Pristup odbijen - potrebna SUPER_ADMIN uloga',
      };
    }

    this.ragService.resetStats();

    return {
      success: true,
      message: 'RAG statistike resetirane',
    };
  }
}
