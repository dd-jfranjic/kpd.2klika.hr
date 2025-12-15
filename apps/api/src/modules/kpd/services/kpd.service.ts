import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { KpdCodeDetail, KpdCategoryDetail, KpdStatsResponse } from '../dto';
import { KpdCode, KpdCategory } from '@prisma/client';

// Tip za kod s uključenom kategorijom
type KpdCodeWithCategory = KpdCode & { category: KpdCategory };

/**
 * KPD Service - CRUD operacije za KPD bazu
 *
 * Pristupa lokalnoj PostgreSQL bazi s KPD šiframa za:
 * - Validaciju AI prijedloga
 * - Dohvat detalja šifara
 * - Pretragu po kodu/nazivu
 * - Statistike
 */
@Injectable()
export class KpdService {
  constructor(private prisma: PrismaService) {}

  /**
   * Dohvati KPD kod po ID-u
   */
  async getById(id: string): Promise<KpdCodeDetail | null> {
    const code = await this.prisma.kpdCode.findUnique({
      where: { id, isActive: true },
      include: {
        category: true,
        parent: true,
      },
    });

    if (!code) return null;

    return {
      id: code.id,
      name: code.name,
      description: code.description ?? undefined,
      level: code.level,
      categoryId: code.categoryId,
      categoryName: code.category.name,
      parentId: code.parentId ?? undefined,
      parentName: code.parent?.name ?? undefined,
      isFinal: code.isFinal,
    };
  }

  /**
   * Validiraj da KPD kod postoji i aktivan je
   */
  async validateCode(code: string): Promise<boolean> {
    const exists = await this.prisma.kpdCode.findFirst({
      where: {
        id: code,
        isActive: true,
      },
    });
    return !!exists;
  }

  /**
   * Validiraj više kodova odjednom
   */
  async validateCodes(codes: string[]): Promise<Record<string, boolean>> {
    const validCodes = await this.prisma.kpdCode.findMany({
      where: {
        id: { in: codes },
        isActive: true,
      },
      select: { id: true },
    });

    const validSet = new Set(validCodes.map((c) => c.id));
    const result: Record<string, boolean> = {};

    for (const code of codes) {
      result[code] = validSet.has(code);
    }

    return result;
  }

  /**
   * Pretraži KPD kodove po tekstu (naziv)
   */
  async searchByText(
    query: string,
    options: { limit?: number; onlyFinal?: boolean } = {},
  ): Promise<KpdCodeDetail[]> {
    const { limit = 20, onlyFinal = false } = options;

    const codes = await this.prisma.kpdCode.findMany({
      where: {
        isActive: true,
        ...(onlyFinal && { isFinal: true }),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { id: { contains: query } },
        ],
      },
      include: {
        category: true,
      },
      orderBy: [{ level: 'desc' }, { codeNumeric: 'asc' }],
      take: limit,
    });

    return codes.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      level: c.level,
      categoryId: c.categoryId,
      categoryName: c.category.name,
      isFinal: c.isFinal,
    }));
  }

  /**
   * Pretraži KPD kodove po šifri (pattern match)
   */
  async searchByCode(codePattern: string): Promise<KpdCodeDetail[]> {
    const codes = await this.prisma.kpdCode.findMany({
      where: {
        isActive: true,
        id: { startsWith: codePattern },
      },
      include: {
        category: true,
        parent: true,
      },
      orderBy: { codeNumeric: 'asc' },
      take: 50,
    });

    return codes.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      level: c.level,
      categoryId: c.categoryId,
      categoryName: c.category.name,
      parentId: c.parentId ?? undefined,
      parentName: c.parent?.name ?? undefined,
      isFinal: c.isFinal,
    }));
  }

  /**
   * Dohvati djecu KPD koda
   */
  async getChildren(parentId: string): Promise<KpdCodeDetail[]> {
    const children = await this.prisma.kpdCode.findMany({
      where: {
        parentId,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: { codeNumeric: 'asc' },
    });

    return children.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      level: c.level,
      categoryId: c.categoryId,
      categoryName: c.category.name,
      isFinal: c.isFinal,
    }));
  }

  /**
   * Dohvati sve kategorije (sektore)
   */
  async getCategories(): Promise<KpdCategoryDetail[]> {
    const categories = await this.prisma.kpdCategory.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { codes: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      codesCount: c._count.codes,
    }));
  }

  /**
   * Dohvati kategoriju s kodovima prve razine
   */
  async getCategoryWithCodes(categoryId: string): Promise<{
    category: KpdCategoryDetail;
    codes: KpdCodeDetail[];
  }> {
    const category = await this.prisma.kpdCategory.findUnique({
      where: { id: categoryId },
      include: {
        _count: { select: { codes: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Kategorija ${categoryId} nije pronađena`);
    }

    const codes = await this.prisma.kpdCode.findMany({
      where: {
        categoryId,
        level: 1,
        isActive: true,
      },
      include: { category: true },
      orderBy: { codeNumeric: 'asc' },
    });

    return {
      category: {
        id: category.id,
        name: category.name,
        description: category.description ?? undefined,
        codesCount: category._count.codes,
      },
      codes: codes.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        level: c.level,
        categoryId: c.categoryId,
        categoryName: c.category.name,
        isFinal: c.isFinal,
      })),
    };
  }

  /**
   * Dohvati statistike KPD baze
   */
  async getStats(): Promise<KpdStatsResponse> {
    const [totalCategories, totalCodes, finalCodes, levelCounts] =
      await Promise.all([
        this.prisma.kpdCategory.count({ where: { isActive: true } }),
        this.prisma.kpdCode.count({ where: { isActive: true } }),
        this.prisma.kpdCode.count({ where: { isActive: true, isFinal: true } }),
        this.prisma.kpdCode.groupBy({
          by: ['level'],
          where: { isActive: true },
          _count: true,
        }),
      ]);

    const codesByLevel: Record<number, number> = {};
    for (const lc of levelCounts) {
      codesByLevel[lc.level] = lc._count;
    }

    return {
      totalCategories,
      totalCodes,
      finalCodes,
      codesByLevel,
    };
  }

  /**
   * Dohvati hijerarhiju za kod (roditelji do roota)
   */
  async getHierarchy(codeId: string): Promise<KpdCodeDetail[]> {
    const hierarchy: KpdCodeDetail[] = [];
    let currentId: string | null = codeId;

    while (currentId) {
      const code: KpdCodeWithCategory | null =
        await this.prisma.kpdCode.findUnique({
          where: { id: currentId },
          include: { category: true },
        });

      if (!code) break;

      hierarchy.unshift({
        id: code.id,
        name: code.name,
        description: code.description ?? undefined,
        level: code.level,
        categoryId: code.categoryId,
        categoryName: code.category.name,
        isFinal: code.isFinal,
      });

      currentId = code.parentId;
    }

    return hierarchy;
  }
}
