import {
  Injectable,
  Logger,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { RagService, RagSearchResult } from './rag.service';
import { KpdService } from './kpd.service';
import { KpdSuggestion, KpdSearchResponse } from '../dto';

interface UsageInfo {
  remainingQueries: number;
  monthlyLimit: number;
  usedThisMonth: number;
}

/**
 * KPD Suggestion Service
 *
 * Glavna business logika za KPD pretragu:
 * 1. Provjera usage limita
 * 2. Cache provjera
 * 3. RAG upit (Gemini AI)
 * 4. Validacija rezultata protiv lokalne baze
 * 5. Logiranje upita
 */
@Injectable()
export class KpdSuggestionService {
  private readonly logger = new Logger(KpdSuggestionService.name);
  private readonly CACHE_TTL = 86400000; // 24 sata u ms - KPD šifre su statične

  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
    private kpdService: KpdService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Dohvati KPD prijedloge za upit
   */
  async getSuggestions(
    query: string,
    organizationId: string,
    userId?: string,
  ): Promise<KpdSearchResponse> {
    const normalizedQuery = query.toLowerCase().trim();
    const startTime = Date.now();

    // 1. Provjeri usage limit
    const usageInfo = await this.checkUsageLimit(organizationId);
    if (usageInfo.remainingQueries <= 0) {
      throw new ForbiddenException(
        'Dnevni limit upita dosegnut. Nadogradite plan za više upita.',
      );
    }

    // 2. Provjeri cache
    const cacheKey = `kpd:query:${normalizedQuery}`;
    const cached = await this.cacheManager.get<KpdSuggestion[]>(cacheKey);

    if (cached && cached.length > 0) {
      this.logger.debug(`Cache hit za upit: "${query}"`);

      // Inkrementiraj usage samo ako ima rezultata
      await this.incrementUsage(organizationId);

      // Logiraj upit (cached)
      await this.logQuery({
        query: normalizedQuery,
        suggestions: cached,
        organizationId,
        userId,
        cached: true,
        latencyMs: Date.now() - startTime,
      });

      const newUsageInfo = await this.checkUsageLimit(organizationId);

      return {
        query,
        suggestions: cached,
        cached: true,
        latencyMs: Date.now() - startTime,
        remainingQueries: newUsageInfo.remainingQueries,
      };
    }

    // 3. Query RAG service
    this.logger.debug(`RAG query za: "${query}"`);
    let rawSuggestions: { code: string; name: string; confidence: number }[] =
      [];
    let ragResult: RagSearchResult | null = null;

    try {
      ragResult = await this.ragService.searchKpd(query);

      // Ako je upit blokiran, vrati odmah s blocked flagom
      if (ragResult.blocked) {
        this.logger.warn(`Upit blokiran: "${query}"`);
        const newUsageInfo = await this.checkUsageLimit(organizationId);
        return {
          query,
          suggestions: [],
          cached: false,
          latencyMs: Date.now() - startTime,
          remainingQueries: newUsageInfo.remainingQueries,
          blocked: true,
          blockedReason: ragResult.blockedReason,
        };
      }

      rawSuggestions = ragResult.suggestions;

      // Ako RAG vrati prazan rezultat, pokušaj s lokalnom pretragom
      if (rawSuggestions.length === 0) {
        this.logger.debug('RAG vratio prazan rezultat, pokušavam lokalnu pretragu...');
        rawSuggestions = await this.fallbackLocalSearch(normalizedQuery);
      }
    } catch (error) {
      this.logger.error('RAG error:', error);
      // Fallback na lokalnu pretragu ako RAG nije dostupan
      rawSuggestions = await this.fallbackLocalSearch(normalizedQuery);
    }

    // 4. Validiraj protiv lokalne baze
    const validatedSuggestions = await this.validateSuggestions(rawSuggestions);

    // 5. Cache rezultate (samo ako ima rezultata)
    if (validatedSuggestions.length > 0) {
      await this.cacheManager.set(cacheKey, validatedSuggestions, this.CACHE_TTL);
    }

    // 6. Inkrementiraj usage SAMO ako ima rezultata
    // Korisnik ne treba "platiti" za neuspješni upit
    if (validatedSuggestions.length > 0) {
      await this.incrementUsage(organizationId);
    }

    const latencyMs = Date.now() - startTime;

    // 7. Logiraj upit (uvijek logiraj za analitiku, bez obzira na rezultat)
    await this.logQuery({
      query: normalizedQuery,
      suggestions: validatedSuggestions,
      organizationId,
      userId,
      cached: false,
      latencyMs,
    });

    const newUsageInfo = await this.checkUsageLimit(organizationId);

    return {
      query,
      suggestions: validatedSuggestions,
      cached: false,
      latencyMs,
      remainingQueries: newUsageInfo.remainingQueries,
    };
  }

  /**
   * Fallback pretraga ako RAG nije dostupan
   */
  private async fallbackLocalSearch(
    query: string,
  ): Promise<{ code: string; name: string; confidence: number }[]> {
    const localResults = await this.kpdService.searchByText(query, {
      limit: 5,
      onlyFinal: true,
    });

    return localResults.map((r, index) => ({
      code: r.id,
      name: r.name,
      confidence: Math.max(0.5, 0.9 - index * 0.1), // Decreasing confidence
    }));
  }

  /**
   * Validiraj AI prijedloge protiv lokalne baze
   */
  private async validateSuggestions(
    suggestions: { code: string; name: string; confidence: number; reason?: string; isValidation?: boolean; isValid?: boolean }[],
  ): Promise<KpdSuggestion[]> {
    const validated: KpdSuggestion[] = [];

    for (const s of suggestions) {
      const kpdCode = await this.prisma.kpdCode.findUnique({
        where: { id: s.code },
        include: { category: true },
      });

      if (kpdCode && kpdCode.isActive) {
        validated.push({
          code: kpdCode.id,
          name: kpdCode.name,
          description: kpdCode.description ?? undefined,
          confidence: s.confidence,
          level: kpdCode.level,
          categoryId: kpdCode.categoryId,
          isFinal: kpdCode.isFinal,
          reason: s.reason,
          isValidation: s.isValidation,
          isValid: s.isValid,
        });
      } else {
        // Za validaciju, prikaži i nepostojeće šifre s upozorenjem
        if (s.isValidation) {
          this.logger.debug(`Validacija šifre ${s.code} - ne postoji u bazi`);
          validated.push({
            code: s.code,
            name: s.name || 'Šifra ne postoji u KPD klasifikaciji',
            confidence: 0,
            level: 0,
            categoryId: '',
            isFinal: false,
            reason: `UPOZORENJE: Šifra ${s.code} ne postoji u KPD 2025 klasifikaciji. ${s.reason || ''}`,
            isValidation: true,
            isValid: false,
          });
        } else {
          this.logger.debug(`Nevalidna šifra iz AI: ${s.code}`);
        }
      }
    }

    return validated;
  }

  /**
   * Provjeri usage limit za organizaciju (mjesečni limit)
   * IZVOR ISTINE: Query tablica (svaki upit se logira)
   *
   * BITNO: Broji upite od KASNIJEG datuma između:
   * - Početak kalendar mjeseca
   * - currentPeriodStart pretplate (kada je korisnik upgrade-ao)
   *
   * Time se osigurava da se usage resetira pri upgrade-u!
   *
   * BONUS UPITI: bonusQueryQuota se DODAJE na monthlyQueryLimit (npr. FREE 3 + BONUS 10 = 13 ukupno)
   */
  private async checkUsageLimit(organizationId: string): Promise<UsageInfo> {
    // Dohvati organizaciju sa subscription
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
      },
    });

    if (!org) {
      throw new ForbiddenException('Organizacija nije pronađena');
    }

    // Mjesečni limit iz subscriptiona, ili dohvati FREE plan iz PlanConfig
    let monthlyLimit = org.subscription?.monthlyQueryLimit;
    if (!monthlyLimit) {
      const freePlan = await this.prisma.planConfig.findUnique({
        where: { plan: 'FREE' },
      });
      monthlyLimit = freePlan?.monthlyQueryLimit ?? freePlan?.dailyQueryLimit ?? 0;
    }

    // DODAJ BONUS UPITE (kupljeni ili poklonni upiti)
    const bonusQuota = org.subscription?.bonusQueryQuota ?? 0;
    const totalLimit = monthlyLimit + bonusQuota;

    // Odredi početak perioda za brojanje upita
    // UVIJEK broji od početka kalendaskog mjeseca - subscription reset se NE koristi
    // jer bonusQueryQuota uključuje prenesene upite iz prethodnog plana
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const countFromDate = monthStart;

    // Broji SAMO upite koji su imali rezultate (suggestedCodes nije prazan)
    // Upiti bez rezultata ne troše limit korisnika
    const usedThisMonth = await this.prisma.query.count({
      where: {
        organizationId,
        createdAt: { gte: countFromDate },
        NOT: {
          suggestedCodes: { equals: [] },
        },
      },
    });

    const remainingQueries = Math.max(0, totalLimit - usedThisMonth);

    return { remainingQueries, monthlyLimit: totalLimit, usedThisMonth };
  }

  /**
   * Inkrementiraj usage counter
   */
  private async incrementUsage(organizationId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Pronađi ili kreiraj UsageRecord za danas
    const existingRecord = await this.prisma.usageRecord.findUnique({
      where: {
        organizationId_periodStart: {
          organizationId,
          periodStart: today,
        },
      },
    });

    if (existingRecord) {
      await this.prisma.usageRecord.update({
        where: { id: existingRecord.id },
        data: {
          queryCount: { increment: 1 },
          aiQueryCount: { increment: 1 },
        },
      });
    } else {
      await this.prisma.usageRecord.create({
        data: {
          organizationId,
          periodStart: today,
          periodEnd: tomorrow,
          queryCount: 1,
          aiQueryCount: 1,
        },
      });
    }
  }

  /**
   * Logiraj upit u Query tablicu
   */
  private async logQuery(data: {
    query: string;
    suggestions: KpdSuggestion[];
    organizationId: string;
    userId?: string;
    cached: boolean;
    latencyMs: number;
  }): Promise<void> {
    try {
      // Odaberi prvi prijedlog kao rezultat (ako postoji)
      const topSuggestion = data.suggestions[0];
      const suggestedCodes = data.suggestions.map((s) => s.code);

      // Dohvati sector iz kategorije za svaki prijedlog
      const suggestionsData = await Promise.all(
        data.suggestions.map(async (s) => {
          let sectorName: string | null = null;
          if (s.categoryId) {
            const category = await this.prisma.kpdCategory.findUnique({
              where: { id: s.categoryId },
            });
            if (category?.name) {
              sectorName = category.name;
            }
          }
          return {
            code: s.code,
            name: s.name,
            confidence: s.confidence,
            reason: s.reason || null,
            sector: sectorName,
            level: s.level,
            isFinal: s.isFinal,
          };
        }),
      );

      // Sector za prvi prijedlog (za backward compatibility)
      const sector = suggestionsData[0]?.sector || null;

      await this.prisma.query.create({
        data: {
          inputText: data.query,
          suggestedCodes: suggestedCodes,
          selectedCode: topSuggestion?.code ?? null,
          confidence: topSuggestion?.confidence ?? null,
          organizationId: data.organizationId,
          userId: data.userId ?? null,
          cached: data.cached,
          latencyMs: data.latencyMs,
          aiModel: 'gemini-2.5-flash',
          explanation: topSuggestion?.reason ?? null,
          sector: sector,
          suggestionsData: suggestionsData,
        },
      });
    } catch (error) {
      // Ne prekidaj flow ako logiranje ne uspije
      this.logger.error('Greška pri logiranju upita:', error);
    }
  }

  /**
   * Dohvati usage statistike za organizaciju (mjesečno)
   * Koristi istu logiku kao checkUsageLimit - broji od kasnijeg datuma
   */
  async getUsageStats(organizationId: string): Promise<{
    today: number;
    thisMonth: number;
    limit: number;
    remaining: number;
    periodStart: Date;
  }> {
    // Dohvati organizaciju sa subscription
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!org) {
      throw new ForbiddenException('Organizacija nije pronađena');
    }

    // Odredi početak perioda za brojanje (ista logika kao checkUsageLimit)
    // UVIJEK broji od početka kalendaskog mjeseca
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const countFromDate = monthStart;

    const usageInfo = await this.checkUsageLimit(organizationId);

    // Današnja potrošnja
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayRecord = await this.prisma.usageRecord.findFirst({
      where: {
        organizationId,
        periodStart: { gte: today, lt: tomorrow },
      },
    });

    return {
      today: todayRecord?.aiQueryCount ?? 0,
      thisMonth: usageInfo.usedThisMonth,
      limit: usageInfo.monthlyLimit,
      remaining: usageInfo.remainingQueries,
      periodStart: countFromDate,
    };
  }
}
