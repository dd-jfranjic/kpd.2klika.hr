import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface QueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class QueriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dohvati organizaciju korisnika
   */
  private async getUserOrganizationId(userId: string): Promise<string | null> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    return membership?.organizationId || null;
  }

  /**
   * Dohvati povijest upita s paginacijom
   */
  async getQueries(userId: string, filters: QueryFilters) {
    const organizationId = await this.getUserOrganizationId(userId);

    if (!organizationId) {
      throw new ForbiddenException('Nemate organizaciju');
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { organizationId };

    if (filters.search) {
      where.inputText = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get total count
    const total = await this.prisma.query.count({ where });

    // Get queries with KPD code details
    const queries = await this.prisma.query.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        selectedKpd: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      items: queries.map((q) => ({
        id: q.id,
        inputText: q.inputText,
        suggestedCodes: q.suggestedCodes,
        selectedCode: q.selectedCode,
        selectedCodeName: q.selectedKpd?.name || null,
        confidence: q.confidence,
        aiModel: q.aiModel,
        latencyMs: q.latencyMs,
        cached: q.cached,
        createdAt: q.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Dohvati pojedini upit
   */
  async getQueryById(queryId: string, userId: string) {
    const organizationId = await this.getUserOrganizationId(userId);

    if (!organizationId) {
      throw new ForbiddenException('Nemate organizaciju');
    }

    const query = await this.prisma.query.findFirst({
      where: {
        id: queryId,
        organizationId,
      },
      include: {
        selectedKpd: {
          select: {
            id: true,
            name: true,
            description: true,
            fullPath: true,
          },
        },
      },
    });

    if (!query) {
      throw new ForbiddenException('Upit nije pronađen ili nemate pristup');
    }

    return query;
  }

  /**
   * Eksportaj upite u CSV format
   */
  async exportQueries(userId: string, filters: QueryFilters) {
    const organizationId = await this.getUserOrganizationId(userId);

    if (!organizationId) {
      throw new ForbiddenException('Nemate organizaciju');
    }

    // Build where clause (same as getQueries)
    const where: any = { organizationId };

    if (filters.search) {
      where.inputText = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get all queries (limit to 10000 for safety)
    const queries = await this.prisma.query.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000,
      include: {
        selectedKpd: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Generate CSV
    const headers = [
      'Datum',
      'Opis djelatnosti',
      'Predloženi kodovi',
      'Odabrani kod',
      'Naziv koda',
      'Pouzdanost',
    ];

    const rows = queries.map((q) => [
      new Date(q.createdAt).toLocaleString('hr-HR'),
      `"${q.inputText.replace(/"/g, '""')}"`,
      q.suggestedCodes.join('; '),
      q.selectedCode || '',
      q.selectedKpd?.name ? `"${q.selectedKpd.name.replace(/"/g, '""')}"` : '',
      q.confidence ? `${Math.round(q.confidence * 100)}%` : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    return {
      filename: `kpd-upiti-${new Date().toISOString().split('T')[0]}.csv`,
      content: csv,
      mimeType: 'text/csv',
    };
  }

  /**
   * Izbriši upit
   */
  async deleteQuery(queryId: string, userId: string) {
    const organizationId = await this.getUserOrganizationId(userId);

    if (!organizationId) {
      throw new ForbiddenException('Nemate organizaciju');
    }

    const query = await this.prisma.query.findFirst({
      where: {
        id: queryId,
        organizationId,
      },
    });

    if (!query) {
      throw new ForbiddenException('Upit nije pronađen ili nemate pristup');
    }

    await this.prisma.query.delete({
      where: { id: queryId },
    });

    return { success: true, message: 'Upit uspješno obrisan' };
  }
}
