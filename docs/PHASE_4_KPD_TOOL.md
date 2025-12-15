# FAZA 4: KPD CORE APP

**Status**: Ceka
**Preduvjeti**: PHASE_3_BILLING.md - kompletirana
**Sljedeca faza**: PHASE_5_DASHBOARD.md

---

## Cilj Faze

Implementirati glavni KPD klasifikacijski alat - kopirati iz FiskalAI i prilagoditi za multi-tenant.

---

## Arhitektura

```
User Query: "izrada web stranica"
            |
            v
+------------------------+
|   KPD Controller       |
|   (Rate Limit Check)   |
+------------------------+
            |
            v
+------------------------+
|   Usage Service        |
|   (Check daily limit)  |
+------------------------+
            |
   if quota available
            |
            v
+------------------------+
|   RAG Service          |
|   (Google Gemini API)  |
+------------------------+
            |
   AI returns suggestions
            |
            v
+------------------------+
|   KPD Service          |
|   (Validate against DB)|
+------------------------+
            |
            v
+------------------------+
|   Response with        |
|   validated KPD codes  |
+------------------------+
```

---

## Backend Module (NestJS)

### 1. KPD Module Struktura

**Lokacija**: `apps/api/src/modules/kpd/`

```
kpd/
  kpd.module.ts
  kpd.controller.ts
  services/
    kpd.service.ts           # CRUD za lokalnu bazu
    kpd-suggestion.service.ts # Business logic + caching
    rag.service.ts           # Google RAG komunikacija
  dto/
    search-kpd.dto.ts
    kpd-response.dto.ts
```

### 2. RAG Service

```typescript
// rag.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class RagService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.configService.get('GEMINI_API_KEY')
    );
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  async searchKpd(query: string): Promise<KpdSuggestion[]> {
    const prompt = `
      Ti si KPD klasifikator za hrvatske poduzetnike.
      Korisnik trazi KPD sifru za: "${query}"

      Vrati JSON array s top 5 prijedloga u formatu:
      [
        { "code": "62.01.11", "name": "Programiranje", "confidence": 0.92 },
        ...
      ]

      SAMO JSON, bez objasnjenja.
    `;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    return JSON.parse(response);
  }
}
```

### 3. KPD Suggestion Service

```typescript
// kpd-suggestion.service.ts

@Injectable()
export class KpdSuggestionService {
  constructor(
    private prisma: PrismaService,
    private ragService: RagService,
    private usageService: UsageService,
    private cacheManager: Cache,
  ) {}

  async getSuggestions(
    query: string,
    organizationId: string,
    userId?: string,
  ): Promise<KpdSuggestion[]> {
    // 1. Check usage limit
    const canQuery = await this.usageService.checkAndIncrement(organizationId);
    if (!canQuery) {
      throw new QuotaExceededException('Dnevni limit upita dosegnut');
    }

    // 2. Check cache
    const cacheKey = `kpd:query:${query.toLowerCase().trim()}`;
    const cached = await this.cacheManager.get<KpdSuggestion[]>(cacheKey);
    if (cached) {
      await this.logQuery(query, cached, organizationId, userId, true);
      return cached;
    }

    // 3. Query RAG
    const startTime = Date.now();
    const suggestions = await this.ragService.searchKpd(query);
    const latencyMs = Date.now() - startTime;

    // 4. Validate against local DB
    const validated = await this.validateSuggestions(suggestions);

    // 5. Cache results (1 hour)
    await this.cacheManager.set(cacheKey, validated, 3600000);

    // 6. Log query
    await this.logQuery(query, validated, organizationId, userId, false, latencyMs);

    return validated;
  }

  private async validateSuggestions(
    suggestions: KpdSuggestion[]
  ): Promise<KpdSuggestion[]> {
    const validated = [];

    for (const s of suggestions) {
      const kpdCode = await this.prisma.kpdCode.findUnique({
        where: { id: s.code, isActive: true },
      });

      if (kpdCode) {
        validated.push({
          code: kpdCode.id,
          name: kpdCode.name,
          description: kpdCode.description,
          confidence: s.confidence,
        });
      }
    }

    return validated;
  }

  private async logQuery(
    inputText: string,
    suggestions: KpdSuggestion[],
    organizationId: string,
    userId: string | undefined,
    cached: boolean,
    latencyMs?: number,
  ) {
    await this.prisma.query.create({
      data: {
        organizationId,
        userId,
        inputText,
        suggestedCodes: suggestions.map(s => s.code),
        cached,
        latencyMs,
        aiModel: 'gemini-2.5-flash',
      },
    });
  }
}
```

### 4. Usage Service

```typescript
// usage.service.ts

@Injectable()
export class UsageService {
  constructor(
    private prisma: PrismaService,
    private redis: Redis,
  ) {}

  async checkAndIncrement(organizationId: string): Promise<boolean> {
    // Get subscription limit
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const limit = subscription?.dailyQueryLimit ?? 5;

    // Redis key: kpd:usage:{orgId}:{date}
    const today = new Date().toISOString().split('T')[0];
    const key = `kpd:usage:${organizationId}:${today}`;

    // Check current count
    const current = await this.redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      return false;
    }

    // Increment with TTL (24h)
    await this.redis.incr(key);
    await this.redis.expire(key, 86400);

    return true;
  }

  async getCurrentUsage(organizationId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const limit = subscription?.dailyQueryLimit ?? 5;

    const today = new Date().toISOString().split('T')[0];
    const key = `kpd:usage:${organizationId}:${today}`;

    const current = await this.redis.get(key);
    const used = current ? parseInt(current) : 0;

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }
}
```

### 5. KPD Controller

```typescript
// kpd.controller.ts

@Controller('kpd')
@UseGuards(JwtAuthGuard)
export class KpdController {
  constructor(
    private kpdService: KpdService,
    private suggestionService: KpdSuggestionService,
    private usageService: UsageService,
  ) {}

  @Post('suggest')
  async getSuggestions(
    @Body() dto: SearchKpdDto,
    @CurrentUser() user: User,
    @CurrentOrganization() org: Organization,
  ) {
    return this.suggestionService.getSuggestions(
      dto.query,
      org.id,
      user.id,
    );
  }

  @Get('usage')
  async getUsage(@CurrentOrganization() org: Organization) {
    return this.usageService.getCurrentUsage(org.id);
  }

  @Get('codes')
  async getCodes(@Query() query: GetCodesDto) {
    return this.kpdService.getCodes(query);
  }

  @Get('codes/:id')
  async getCode(@Param('id') id: string) {
    return this.kpdService.getCodeById(id);
  }

  @Get('tree')
  async getTree(@Query('parentId') parentId?: string) {
    return this.kpdService.getTree(parentId);
  }
}
```

---

## Frontend Components

### Dizajn Reference

**OBAVEZNO**: Citaj [DESIGN_RULES.md](./DESIGN_RULES.md)!
- Kopirati vizual iz FiskalAI `/tools/kpd-lookup`
- NIKAKO inline stilovi
- Mobile-first responsive

### Komponente za Implementirati

**Kopirati iz FiskalAI:**

| FiskalAI | KPD | Opis |
|----------|-----|------|
| KpdLookupTool.tsx | KpdTool.tsx | Glavni wrapper |
| KpdSearchInput.tsx | KpdSearch.tsx | AI search input |
| KpdSuggestions.tsx | KpdSuggestions.tsx | AI prijedlozi |
| KpdTreeView.tsx | KpdTree.tsx | Tree browser |
| KpdCodeItem.tsx | KpdCodeItem.tsx | Pojedinacni kod |
| kpd.module.css | kpd.module.css | Stilovi |

### Layout

```
+-----------------------------------------------------------+
|  KPD Klasifikator                                [PRO]    |
+-----------------------------------------------------------+
|                                                           |
|  AI PRETRAGA                                             |
|  +-------------------------------------------------------+|
|  | Unesite naziv djelatnosti ili opis...                ||
|  +-------------------------------------------------------+|
|  [Pretrazi]                                              |
|                                                           |
|  +-- Dnevni limit: 234/250 -------- [Nadogradi] ---------+|
|                                                           |
|  AI Prijedlozi:                                          |
|  +-------------------------------------------------------+|
|  | 62.01.11 - Programiranje (92%)               [+] [>] ||
|  | 62.01.12 - Izrada web stranica (78%)         [+] [>] ||
|  | 62.02 - Savjetovanje (65%)                   [+] [>] ||
|  +-------------------------------------------------------+|
|                                                           |
+-----------------------------------------------------------+
|  KPD SIFRARNIK                                            |
+-----------------------------------------------------------+
|  [Search in tree...]                                      |
|                                                           |
|  > A - Poljoprivreda, sumarstvo i ribarstvo              |
|  > B - Rudarstvo i vadenje                               |
|  > C - Preradivacka industrija                           |
|  v J - Informacije i komunikacije                        |
|    > 58 - Izdavacke djelatnosti                          |
|    > 59 - Filmska i glazbena industrija                  |
|    > 60 - Emitiranje programa                            |
|    > 61 - Telekomunikacije                               |
|    v 62 - Racunalno programiranje                        |
|      v 62.01 - Programiranje                             |
|        * 62.01.11 - Izrada aplikativnog softvera         |
|        * 62.01.12 - Izrada sistemskog softvera           |
|        * 62.01.2 - Izrada web stranica                   |
|      > 62.02 - Savjetovanje                              |
|      > 62.03 - Upravljanje racunalnom opremom            |
|      > 62.09 - Ostale IT usluge                          |
|                                                           |
+-----------------------------------------------------------+
```

### React Komponente

```tsx
// components/kpd/KpdTool.tsx
export function KpdTool() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<KpdSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const { usage, refetch } = useKpdUsage();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const result = await kpdApi.suggest(query);
      setSuggestions(result);
      refetch(); // Update usage display
    } catch (error) {
      if (error.status === 429) {
        // Quota exceeded
        toast.error('Dnevni limit upita dosegnut');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.kpdTool}>
      <KpdSearch
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        loading={loading}
      />

      <KpdUsageBar usage={usage} />

      {suggestions.length > 0 && (
        <KpdSuggestions suggestions={suggestions} />
      )}

      <KpdTree />
    </div>
  );
}
```

---

## Google RAG Setup

### 1. Kreiraj RAG Store

```bash
cd /root/tools/gemini-rag

# Kreiraj store
python3 gemini_rag.py create-store kpd-codes \
  --display-name "KPD Sifrarnik 2025"
```

### 2. Export KPD iz Baze

```sql
-- Export format za RAG
SELECT
  id || ' - ' || name || COALESCE('. ' || description, '') as text
FROM "KpdCode"
WHERE "isActive" = true
ORDER BY "codeNumeric";
```

```bash
# Export to file
docker exec kpd-postgres psql -U kpd -d kpd \
  -c "COPY (SELECT id || ' - ' || name FROM \"KpdCode\" WHERE \"isActive\" = true) TO STDOUT" \
  > /tmp/kpd-codes.txt
```

### 3. Upload u RAG

```bash
python3 gemini_rag.py upload kpd-codes \
  /tmp/kpd-codes.txt \
  --display-name "KPD 2025 v1"
```

### 4. Test Query

```bash
python3 gemini_rag.py query kpd-codes \
  "programiranje i razvoj softvera" --verbose
```

---

## API Endpoints

| Method | Endpoint | Auth | Opis |
|--------|----------|------|------|
| POST | /kpd/suggest | JWT | AI pretraga |
| GET | /kpd/usage | JWT | Trenutna potrosnja |
| GET | /kpd/codes | JWT | Lista kodova (paginated) |
| GET | /kpd/codes/:id | JWT | Pojedinacni kod |
| GET | /kpd/tree | JWT | Tree struktura |
| GET | /kpd/history | JWT | Query history |

---

## Checklist

### Backend
- [ ] KPD module kreiran
- [ ] RAG service (Gemini API)
- [ ] KPD suggestion service
- [ ] Usage service (Redis)
- [ ] KPD controller
- [ ] Query logging

### Frontend
- [ ] KpdTool komponenta
- [ ] KpdSearch komponenta
- [ ] KpdSuggestions komponenta
- [ ] KpdTree komponenta
- [ ] KpdCodeItem komponenta
- [ ] CSS (module, NE inline!)
- [ ] Mobile responsive

### Google RAG
- [ ] Store kreiran
- [ ] KPD kodovi exportani
- [ ] Upload u RAG
- [ ] Query testiran

### Testing
- [ ] AI pretraga radi
- [ ] Usage limit radi
- [ ] Tree navigation radi
- [ ] Mobile view OK

---

## Reference

- **Schema**: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - KpdCode, Query modeli
- **Dizajn**: [DESIGN_RULES.md](./DESIGN_RULES.md) - KPD tool layout
- **RAG Tool**: `/root/tools/gemini-rag/`

---

**Sljedeca faza**: [PHASE_5_DASHBOARD.md](./PHASE_5_DASHBOARD.md)
