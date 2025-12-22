import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';

interface RagSuggestion {
  code: string;
  name: string;
  confidence: number;
  reason?: string;
  isValidation?: boolean;  // True ako je ovo validacija postojeće šifre
  isValid?: boolean;       // Je li šifra valjana za navedenu namjenu
  alternatives?: string[]; // Alternativne šifre ako originalna nije prikladna
}

/**
 * Rezultat RAG pretrage s metapodacima
 */
export interface RagSearchResult {
  suggestions: RagSuggestion[];
  blocked: boolean;        // True ako je upit blokiran zbog content policy
  blockedReason?: string;  // Razlog blokiranja za prikaz korisniku
}

/**
 * Konfiguracija za retry logiku i rate limiting
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterMs: number;
}

/**
 * Request queue item za kontrolirano slanje zahtjeva
 */
interface QueuedRequest {
  prompt: string;
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  retryCount: number;
  addedAt: number;
}

/**
 * RAG Service - Google Gemini File Search API
 *
 * Koristi Google Gemini za pretragu KPD šifara s File Search grounding.
 * RAG Store ID povezuje se s uploadanim KPD dokumentima za semantičku pretragu.
 *
 * Konfiguracija:
 * - GEMINI_MODEL: Model za AI (default: gemini-2.5-flash)
 * - RAG_STORE_ID: File Search Store ID (default: fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc)
 */
@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private client: GoogleGenAI | null = null;
  private ragStoreId: string | null = null;
  private geminiModel: string = 'gemini-2.5-flash';
  private isInitialized = false;
  private prisma = new PrismaClient();

  // ============================================
  // PREMIUM ERROR HANDLING & RATE LIMITING
  // ============================================

  // Retry konfiguracija za Gemini API
  private readonly retryConfig: RetryConfig = {
    maxRetries: 5,           // Maksimalno 5 pokušaja
    baseDelayMs: 1000,       // Početni delay 1 sekunda
    maxDelayMs: 32000,       // Maksimalni delay 32 sekunde
    jitterMs: 500,           // Random jitter ±500ms
  };

  // Request queue za kontrolirano slanje zahtjeva
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private readonly maxConcurrentRequests = 8;  // Tier 1 ima 1000 RPM, ali budimo konzervativni
  private activeRequests = 0;
  private readonly minRequestIntervalMs = 100; // Min 100ms između zahtjeva
  private lastRequestTime = 0;

  // Statistike za monitoring
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    retriedRequests: 0,
    rateLimitHits: 0,
    averageLatencyMs: 0,
  };

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY nije konfiguriran - RAG usluga onemogućena');
      return;
    }

    // Load settings from database or fall back to env/defaults
    await this.loadSettings();

    try {
      this.client = new GoogleGenAI({ apiKey });
      this.isInitialized = true;
      this.logger.log(`RAG Service inicijaliziran - Model: ${this.geminiModel}, Store: ${this.ragStoreId}`);
    } catch (error) {
      this.logger.error('Greška pri inicijalizaciji Gemini API:', error);
    }
  }

  private async loadSettings() {
    try {
      // Try to load from database
      const configs = await this.prisma.systemConfig.findMany({
        where: { key: { in: ['GEMINI_MODEL', 'RAG_STORE_ID'] } },
      });

      const configMap = new Map(configs.map(c => [c.key, c.value]));

      // GEMINI_MODEL: DB -> ENV -> default
      this.geminiModel = configMap.get('GEMINI_MODEL')
        || this.configService.get<string>('GEMINI_MODEL')
        || 'gemini-2.5-flash';

      // RAG_STORE_ID: DB -> ENV -> default (using the one from CLAUDE.md)
      this.ragStoreId = configMap.get('RAG_STORE_ID')
        || this.configService.get<string>('RAG_STORE_ID')
        || 'fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc';

      this.logger.log(`Loaded settings - Model: ${this.geminiModel}, Store ID: ${this.ragStoreId}`);
    } catch (error) {
      this.logger.warn('Could not load settings from DB, using defaults:', error);
      this.geminiModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
      this.ragStoreId = this.configService.get<string>('RAG_STORE_ID') || 'fileSearchStores/kpd-2025-klasifikacija-6g9v4clu15pc';
    }
  }

  /**
   * Refresh settings from database (call after config change)
   */
  async refreshSettings() {
    await this.loadSettings();
    this.logger.log('Settings refreshed');
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  // ============================================
  // CONTENT MODERATION - Pre-check za ilegalne upite
  // ============================================

  /**
   * Provjeri je li upit eksplicitno ilegalan
   * Vraća true ako upit sadrži eksplicitno ilegalne pojmove
   *
   * NAPOMENA: Ovo NE blokira legitimne poslovne upite kao:
   * - "prodaja lijekova" (ljekarne)
   * - "trgovina oružjem" (oružarnice s licencom)
   * - "kemikalije" (industrijska kemija)
   */
  private isExplicitlyIllegal(query: string): boolean {
    const normalizedQuery = query.toLowerCase().trim();

    // Eksplicitno ilegalni pojmovi - nema legitimne poslovne primjene
    const illegalPatterns = [
      // Krijumčarenje i crno tržište
      /krijum[čc]ar/i,
      /crno\s*tr[zž]i[sš]t/i,
      /dark\s*web/i,
      /darkweb/i,
      /deep\s*web\s*(prodaja|kupovina)/i,

      // Pranje novca i financijski kriminal
      /pranje\s*novca/i,
      /money\s*launder/i,
      /utaja\s*(poreza|novca)/i,
      /porezna\s*prijevar/i,
      /financijska\s*prijevar/i,

      // Terorizam
      /teroriz/i,
      /teroristi[čc]/i,
      /eksploziv.*napad/i,
      /napad.*eksploziv/i,
      /bomba[sš]ki\s*napad/i,
      /masovno\s*(ubijanje|nasilje)/i,
      /oru[žz]ani\s*napad/i,

      // Nasilje i teške tjelesne ozljede
      /nasilje/i,
      /mu[čc]enje/i,
      /uboj(stvo|ica)/i,
      /silovanje/i,
      /zlostavljanje/i,
      /fizi[čc]ki\s*napad/i,
      /te[sš]k[ae]\s*tjelesn[ae]/i,

      // Trgovina ljudima i eksploatacija
      /trgovina\s*ljudima/i,
      /dje[čc]ja\s*pornografija/i,
      /seksualno\s*iskor/i,
      /prostitucij/i,
      /pedofil/i,
      /maloljetni[čc]/i,

      // Teška kriminalna djela
      /razbojni[sš]tv/i,
      /plja[čc]k/i,
      /otmic/i,
      /kidnapovan/i,
      /iznud/i,
      /ucjen/i,
      /reketaren/i,
      /sabota[zž]/i,
      /[sš]pijuna[zž]/i,
      /cyber\s*napad/i,
      /haker.*napad/i,
      /hakiranj/i,
      /kra[dđ].*identitet/i,
      /falsifik/i,
      /krivotvor/i,

      // Ilegalno oružje i eksplozivi
      /ilegalno\s*oru[zž]j/i,
      /nelegalno\s*oru[zž]j/i,
      /nabav.*eksploziv/i,
      /izrad.*bomb/i,
      /izrad.*eksploziv/i,

      // Droge - sleng termini (NE blokira "lijekovi", "farmaceutski")
      /prodaj.*drog[eu]/i,
      /diler.*drog/i,
      /drog.*diler/i,
      /(trava|marihuana|hasis|kokain|heroin|speed|mdma|ecstasy).*prodaj/i,
      /prodaj.*(trava|marihuana|hasis|kokain|heroin|speed|mdma|ecstasy)/i,
      /narkotik/i,
      /opojn[ae]\s*sredstv/i,
    ];

    const isIllegal = illegalPatterns.some(pattern => pattern.test(normalizedQuery));

    if (isIllegal) {
      this.logger.warn(`Blokiran eksplicitno ilegalan upit: "${query}"`);
    }

    return isIllegal;
  }

  /**
   * Pretraži KPD šifre korištenjem Gemini AI
   */
  async searchKpd(query: string): Promise<RagSearchResult> {
    if (!this.isReady()) {
      this.logger.warn('RAG service nije spreman, vraćam prazan rezultat');
      return { suggestions: [], blocked: false };
    }

    // Content moderation - blokiraj eksplicitno ilegalne upite
    if (this.isExplicitlyIllegal(query)) {
      this.logger.warn(`Upit blokiran zbog content policy: "${query}"`);
      return {
        suggestions: [],
        blocked: true,
        blockedReason: 'Ovaj upit nije prikladan za KPD klasifikaciju. Ako smatrate da je ovo greška, javite se na kpd@2klika.hr',
      };
    }

    try {
      // Detektiraj tip upita
      const queryType = this.detectQueryType(query);
      this.logger.log(`Query type detected: ${queryType}`);

      const prompt = this.buildPrompt(query, queryType);
      const response = await this.queryGemini(prompt);
      const suggestions = this.parseResponse(response, queryType);
      return { suggestions, blocked: false };
    } catch (error) {
      this.logger.error(`RAG search greška za upit "${query}":`, error);
      throw error;
    }
  }

  /**
   * Detektiraj tip upita
   */
  private detectQueryType(query: string): 'validation' | 'multi-service' | 'standard' {
    // Validacija šifre: "Mogu li koristiti XX.XX.XX za...", "Je li XX.XX.XX ispravna za..."
    const validationPatterns = [
      /mogu li koristiti\s+\d{2}\.\d{2}/i,
      /je li\s+\d{2}\.\d{2}/i,
      /ispravna.*\d{2}\.\d{2}/i,
      /\d{2}\.\d{2}\.\d{2}.*za\s+/i,
      /provjeri.*\d{2}\.\d{2}/i,
    ];
    if (validationPatterns.some(p => p.test(query))) {
      return 'validation';
    }

    // Multi-service: sadrži više usluga odvojenih zarezom ili "i"
    const multiServiceIndicators = [
      /održavanje.*,.*održavanje/i,
      /,\s*(internet|web|hosting|računala|podrška|društvene)/i,
      /paušalno.*održavanje/i,
      /(računala|servera).*i.*(stranice|hosting|podrška)/i,
    ];
    if (multiServiceIndicators.some(p => p.test(query))) {
      return 'multi-service';
    }

    return 'standard';
  }

  private buildPrompt(query: string, queryType: 'validation' | 'multi-service' | 'standard' = 'standard'): string {
    // Prompt za validaciju šifre
    if (queryType === 'validation') {
      return this.buildValidationPrompt(query);
    }

    // Prompt za više usluga
    if (queryType === 'multi-service') {
      return this.buildMultiServicePrompt(query);
    }

    // Standardni prompt
    return this.buildStandardPrompt(query);
  }

  private buildValidationPrompt(query: string): string {
    // Izvuci šifru iz upita
    const codeMatch = query.match(/(\d{2}\.\d{2}\.?\d{0,2})/);
    const extractedCode = codeMatch ? codeMatch[1] : 'nepoznata';

    return `ZADATAK: Validiraj KPD šifru i predloži alternative.

UPIT KORISNIKA: "${query}"
ŠIFRA ZA VALIDACIJU: ${extractedCode}

KORACI:
1. Pronađi šifru ${extractedCode} u KPD 2025 klasifikaciji
2. Objasni što ta šifra službeno pokriva
3. Analiziraj je li prikladna za navedenu djelatnost/uslugu
4. Predloži bolje alternative ako šifra nije prikladna

ASPEKTI POSLOVANJA (navedi u alternativama):
- OSOBNE USLUGE (96.xx) - wellness, frizerske, kozmetičke
- SPORTSKE USLUGE (93.xx) - sport, rekreacija
- ZDRAVSTVENE USLUGE (86.xx) - fizioterapija, medicina
- POPRAVAK I ODRŽAVANJE (95.xx) - servis opreme
- IT USLUGE (62-63) - softver, web, hosting

ČESTE TOČNE KPD ŠIFRE ZA ALTERNATIVE:
- Masaža (wellness): 96.04.10 (ASPEKT: Osobne usluge)
- Sportska masaža: 93.19.19 (ASPEKT: Sportske usluge)
- Fizioterapija: 86.90.11 (ASPEKT: Zdravstvene usluge)
- Kozmetičke usluge: 96.02.11 (ASPEKT: Osobne usluge)
- Popravak računala: 95.10.01 (ASPEKT: Popravak i održavanje)
- IT podrška: 62.20.30 (ASPEKT: IT usluge)
- Web razvoj: 62.10.11 (ASPEKT: IT usluge)

ODGOVORI U JSON FORMATU - format reason polja: "Objašnjenje - ASPEKT: naziv":
[
  {
    "code": "${extractedCode}",
    "name": "Službeni naziv šifre iz KPD",
    "confidence": 0.0-1.0,
    "reason": "VALIDACIJA: [Što šifra pokriva] i [je li ispravna za navedenu namjenu] - ASPEKT: [Naziv aspekta]",
    "isValidation": true,
    "isValid": true/false
  },
  {
    "code": "XX.XX.XX",
    "name": "Alternativna šifra",
    "confidence": 0.95,
    "reason": "ALTERNATIVA: Zašto je ova šifra bolja za navedenu namjenu - ASPEKT: [Naziv aspekta]"
  }
]

PRIMJER ISPRAVNOG ODGOVORA:
[
  {"code": "96.22.03", "name": "Ostale usluge uljepšavanja", "confidence": 0.3, "reason": "VALIDACIJA: Šifra 96.22.03 pokriva kozmetičke tretmane i uljepšavanje, NE sportsku masažu - ASPEKT: Osobne usluge", "isValidation": true, "isValid": false},
  {"code": "93.19.19", "name": "Ostale sportske usluge", "confidence": 0.95, "reason": "Ova šifra pokriva sportsku masažu kao dio sportskih usluga - ASPEKT: Sportske usluge"}
]

⚠️ KRITIČNO - NE IZMIŠLJAJ ŠIFRE! ⚠️
- Koristi SAMO šifre koje POSTOJE u KPD 2025 klasifikaciji
- Format: XX.XX.XX (npr. 96.04.10, 62.20.30)
- Format reason: "Objašnjenje - ASPEKT: naziv" (ASPEKT ide NA KRAJ!)
- Uvijek uključi originalnu šifru s objašnjenjem
- Ako šifra nije prikladna, dodaj 2-3 bolje alternative

🛡️ CONTENT POLICY:
1. UVIJEK koristi NEUTRALNA, SLUŽBENA objašnjenja
2. NIKADA ne objašnjavaj u kontekstu ilegalnih aktivnosti
3. Za osjetljive artikle naglasi LEGALNI kontekst i potrebne dozvole`;
  }

  private buildMultiServicePrompt(query: string): string {
    return `ZADATAK: Pronađi KPD šifre za SVAKU uslugu u kompleksnom upitu.

UPIT: "${query}"

VAŽNO: Ovaj upit sadrži VIŠE različitih usluga! Analiziraj SVAKU zasebno.

ASPEKTI POSLOVANJA (OBAVEZNO navedi u svakom odgovoru):
- POPRAVAK I ODRŽAVANJE (95.xx) - servis, održavanje opreme
- IT USLUGE (62-63) - softver, web, hosting, IT podrška
- STRUČNE USLUGE (69-75) - savjetovanje, marketing, računovodstvo

TOČNE KPD 2025 ŠIFRE (koristi ISKLJUČIVO ove!):
- Popravak/održavanje računala: 95.10.01 (ASPEKT: Popravak i održavanje)
- Tehnička podrška: 62.20.30 (ASPEKT: IT usluge)
- Upravljanje IT sustavima: 62.20.42 (ASPEKT: IT usluge)
- Hosting/poslužitelji: 63.10.12 (ASPEKT: IT usluge)
- Ostale IT infrastrukture: 63.10.13 (ASPEKT: IT usluge)
- Web razvoj/programiranje: 62.10.11 (ASPEKT: IT usluge)
- IT savjetovanje: 62.20.20 (ASPEKT: IT usluge)
- Marketing/oglašavanje: 73.11.11 (ASPEKT: Stručne usluge)
- Odnosi s javnošću: 73.11.12 (ASPEKT: Stručne usluge)
- Održavanje web stranica: 62.20.30 (ASPEKT: IT usluge)
- Društvene mreže (upravljanje): 73.11.11 (ASPEKT: Stručne usluge)

RAŠČLANI UPIT NA KOMPONENTE I ZA SVAKU PRONAĐI ŠIFRU:
- "računala" → 95.10.01 (Popravak) ili 62.20.42 (IT upravljanje)
- "web/internet stranice" → 62.10.11 (razvoj) ili 62.20.30 (održavanje)
- "hosting" → 63.10.12 ili 63.10.13
- "društvene mreže" → 73.11.11
- "podrška" → 62.20.30

Vrati 5-8 šifara pokrivajući SVE navedene usluge.

ODGOVORI U JSON FORMATU - format reason: "Objašnjenje - ASPEKT: naziv":
[
  {"code": "XX.XX.XX", "name": "Naziv", "confidence": 0.95, "reason": "Za uslugu [koja usluga iz upita]: kratko objašnjenje - ASPEKT: [Naziv aspekta]"}
]

PRIMJER ISPRAVNOG ODGOVORA:
[
  {"code": "95.10.01", "name": "Usluge popravka računala", "confidence": 0.95, "reason": "Za uslugu održavanje računala: servis i održavanje IT opreme - ASPEKT: Popravak i održavanje"},
  {"code": "63.10.12", "name": "Usluge internetskog poslužitelja", "confidence": 0.92, "reason": "Za uslugu hosting: usluge web hostinga i poslužitelja - ASPEKT: IT usluge"},
  {"code": "73.11.11", "name": "Usluge marketinških agencija", "confidence": 0.88, "reason": "Za uslugu društvene mreže: upravljanje i marketing na društvenim mrežama - ASPEKT: Stručne usluge"}
]

⚠️ KRITIČNO - NE IZMIŠLJAJ ŠIFRE! ⚠️
- Koristi ISKLJUČIVO šifre navedene gore ili iz KPD 2025 klasifikacije
- Format šifre: XX.XX.XX (npr. 62.20.30, 95.10.01)
- Format reason: "Objašnjenje - ASPEKT: naziv" (ASPEKT ide NA KRAJ!)

🛡️ CONTENT POLICY:
1. UVIJEK koristi NEUTRALNA, SLUŽBENA objašnjenja
2. NIKADA ne objašnjavaj u kontekstu ilegalnih aktivnosti
3. Za osjetljive usluge naglasi LEGALNI kontekst i potrebne dozvole`;
  }

  private buildStandardPrompt(query: string): string {
    return `Na temelju KPD 2025 klasifikacije, pronađi SVE relevantne KPD šifre za sljedeći artikl/uslugu:

ARTIKL: "${query}"

VAŽNO - Analiziraj artikl iz SVIH mogućih aspekata poslovanja. Razmisli koje sve djelatnosti mogu biti povezane s ovim artiklom/uslugom:

1. PROIZVOD (sektor C, 10-33) - Ako se radi o fizičkom proizvodu, koja šifra opisuje proizvodnju?
   Primjeri: klima uređaj = 28.25.12, laptop = 26.20.11, kruh = 10.71.11

2. UGRADNJA/INSTALACIJA/GRAĐEVINSKI RADOVI (sektor F, 41-43) - Ako artikl uključuje ugradnju, instalaciju ili radove
   Primjeri: ugradnja klime = 43.22.12, ugradnja prozora = 43.32.10

3. TRGOVINA NA VELIKO (sektor G, 46.xx) - Ako se proizvod prodaje drugim firmama/trgovcima
   Primjeri: veleprodaja klima = 46.43.03, veleprodaja računala = 46.51.xx

4. TRGOVINA NA MALO (sektor G, 47.xx) - Ako se proizvod prodaje krajnjim kupcima
   Primjeri: maloprodaja elektronike = 47.52.05, maloprodaja odjeće = 47.71.xx

5. POPRAVAK/ODRŽAVANJE - Ako uključuje servis, popravak ili održavanje
   - Industrijska oprema (sektor C, 33.xx): popravak strojeva = 33.12.xx
   - IT oprema i kućanski aparati (sektor S, 95.xx): popravak računala = 95.11.10, popravak telefona = 95.12.00

6. NAJAM/IZNAJMLJIVANJE (sektor N, 77.xx) - Ako se proizvod može iznajmljivati
   Primjeri: najam automobila = 77.11.xx, najam opreme = 77.39.xx

7. IT USLUGE / SOFTVER (sektor K, 62-63) - Ako se radi o softveru, aplikacijama ili IT uslugama
   Primjeri: izrada softvera = 62.01.xx, web stranice = 62.01.21, hosting = 63.11.xx

8. UGOSTITELJSTVO (sektor I, 55-56) - Ako se radi o hrani/piću za konzumaciju
   Primjeri: restorani = 56.10.xx, barovi = 56.30.xx

9. PRIJEVOZ/DOSTAVA (sektor H, 49-53) - Ako usluga uključuje dostavu ili prijevoz
   Primjeri: cestovni prijevoz = 49.41.xx, kurirske usluge = 53.20.xx

10. STRUČNE USLUGE (sektor N, 69-75) - Ako se radi o savjetovanju, projektiranju, marketingu
    Primjeri: pravne usluge = 69.10.xx, računovodstvo = 69.20.xx, marketing = 73.11.xx

Vrati maksimalno 8 najprikladnijih KPD šifara. OBAVEZNO uključi šifre iz RAZLIČITIH aspekata ako su primjenjivi na artikl!

Za svaku šifru navedi:
- code: KPD šifra (format XX.XX.XX - 6 znamenki)
- name: Službeni naziv šifre iz KPD klasifikacije (TOČAN naziv, ne izmišljaj!)
- confidence: Pouzdanost prijedloga (0.0 - 1.0)
- reason: Kratko objašnjenje + ASPEKT (npr. "Proizvodnja elektronike - ASPEKT: Proizvod", "Prodaja krajnjim kupcima - ASPEKT: Trgovina na malo", "Servis IT opreme - ASPEKT: Popravak")

⚠️ KRITIČNO - STROGA PRAVILA:
1. Koristi ISKLJUČIVO šifre koje postoje u priloženoj KPD klasifikaciji!
2. NIKAD ne izmišljaj šifre - ako nisi siguran, ne uključuj tu šifru
3. Preferiraj finalne šifre sa 6 znamenki (XX.XX.XX)
4. Provjeri svaku šifru u priloženom dokumentu prije nego je predložiš
5. Format reason: "Objašnjenje - ASPEKT: naziv" (ASPEKT ide NA KRAJ!)

🛡️ CONTENT POLICY - OBAVEZNO SLIJEDI:
1. UVIJEK koristi NEUTRALNA, SLUŽBENA objašnjenja temeljena na KPD opisu
2. NIKADA ne objašnjavaj šifre u kontekstu ilegalnih aktivnosti
3. NIKADA ne spominji: darkweb, crno tržište, ilegalna prodaja, zaobilaženje zakona
4. Za OSJETLJIVE artikle (lijekovi, oružje, kemikalije):
   - Vrati LEGITIMNE šifre (ljekarne, oružarnice, industrija)
   - Objašnjenje MORA naglasiti LEGALNI kontekst i potrebne dozvole
   - Primjer: "Maloprodaja farmaceutskih proizvoda u OVLAŠTENIM ljekarnama (zahtijeva dozvolu) - ASPEKT: Trgovina na malo"

Odgovori ISKLJUČIVO u JSON formatu bez dodatnog teksta:
{
  "suggestions": [
    {"code": "XX.XX.XX", "name": "Naziv", "confidence": 0.95, "reason": "Objašnjenje zašto je ova šifra prikladna - ASPEKT: naziv_aspekta"}
  ]
}`;
  }

  /**
   * Query Gemini API s retry logikom i queueing-om
   * Premium error handling - garantira minimalnu grešku korisnika
   */
  private async queryGemini(prompt: string): Promise<string> {
    if (!this.client || !this.ragStoreId) {
      throw new Error('Gemini client ili RAG store nije inicijaliziran');
    }

    // Dodaj u queue i čekaj rezultat
    return this.enqueueRequest(prompt);
  }

  /**
   * Dodaj zahtjev u queue
   */
  private enqueueRequest(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        prompt,
        resolve,
        reject,
        retryCount: 0,
        addedAt: Date.now(),
      });

      this.stats.totalRequests++;
      this.logger.debug(`Request queued. Queue size: ${this.requestQueue.length}, Active: ${this.activeRequests}`);

      // Pokreni queue processor ako nije aktivan
      this.processQueue();
    });
  }

  /**
   * Procesiraj queue - kontrolirano slanje zahtjeva
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Čekaj ako je previše aktivnih zahtjeva
      if (this.activeRequests >= this.maxConcurrentRequests) {
        await this.sleep(100);
        continue;
      }

      // Rate limiting - osiguraj minimalni interval
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestIntervalMs) {
        await this.sleep(this.minRequestIntervalMs - timeSinceLastRequest);
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      // Provjeri timeout (30 sekundi u queue = odbaci)
      if (Date.now() - request.addedAt > 30000) {
        this.logger.warn('Request timeout in queue - odbačen');
        request.reject(new Error('Request timeout - queue preopterećen'));
        this.stats.failedRequests++;
        continue;
      }

      this.activeRequests++;
      this.lastRequestTime = Date.now();

      // Izvedi zahtjev s retry logikom (bez await da omogućimo paralelizam)
      this.executeWithRetry(request)
        .finally(() => {
          this.activeRequests--;
        });
    }

    this.isProcessingQueue = false;
  }

  /**
   * Izvedi zahtjev s exponential backoff retry logikom
   */
  private async executeWithRetry(request: QueuedRequest): Promise<void> {
    const startTime = Date.now();

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeGeminiRequest(request.prompt);

        // Uspješno!
        const latency = Date.now() - startTime;
        this.updateAverageLatency(latency);
        this.stats.successfulRequests++;

        if (attempt > 0) {
          this.logger.log(`Request succeeded after ${attempt} retries (${latency}ms)`);
        }

        request.resolve(response);
        return;

      } catch (error: any) {
        const isRateLimitError = this.isRateLimitError(error);
        const isRetryableError = this.isRetryableError(error);

        if (isRateLimitError) {
          this.stats.rateLimitHits++;
          this.logger.warn(`Rate limit hit (429). Attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}`);
        }

        // Ako nije retryable ili smo iscrpili pokušaje - odustani
        if (!isRetryableError || attempt === this.retryConfig.maxRetries) {
          this.stats.failedRequests++;
          this.logger.error(`Request failed after ${attempt + 1} attempts: ${error.message}`);
          request.reject(this.createUserFriendlyError(error));
          return;
        }

        // Izračunaj delay za retry (exponential backoff + jitter)
        const delay = this.calculateRetryDelay(attempt, isRateLimitError);
        this.stats.retriedRequests++;

        this.logger.debug(`Retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1})`);
        await this.sleep(delay);
      }
    }
  }

  /**
   * Direktno izvedi Gemini zahtjev (bez retry logike)
   */
  private async executeGeminiRequest(prompt: string): Promise<string> {
    this.logger.debug(`Executing Gemini request with File Search grounding: ${this.ragStoreId}`);

    const response = await this.client!.models.generateContent({
      model: this.geminiModel,
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [this.ragStoreId!],
            },
          },
        ],
      },
    });

    return response.text || '';
  }

  /**
   * Provjeri je li greška rate limit (429)
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;

    // HTTP status 429
    if (error.status === 429 || error.statusCode === 429) return true;

    // Google API specifične poruke
    const message = String(error.message || '').toLowerCase();
    if (message.includes('rate limit') || message.includes('quota exceeded') ||
        message.includes('resource exhausted') || message.includes('429')) {
      return true;
    }

    return false;
  }

  /**
   * Provjeri je li greška retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Rate limit je uvijek retryable
    if (this.isRateLimitError(error)) return true;

    // HTTP status kodovi koji su retryable
    const retryableStatuses = [429, 500, 502, 503, 504];
    if (retryableStatuses.includes(error.status) || retryableStatuses.includes(error.statusCode)) {
      return true;
    }

    // Network greške
    const message = String(error.message || '').toLowerCase();
    if (message.includes('network') || message.includes('timeout') ||
        message.includes('econnreset') || message.includes('socket')) {
      return true;
    }

    return false;
  }

  /**
   * Izračunaj delay za retry s exponential backoff + jitter
   */
  private calculateRetryDelay(attempt: number, isRateLimitError: boolean): number {
    // Za rate limit greške, koristi duži bazni delay
    const baseDelay = isRateLimitError
      ? this.retryConfig.baseDelayMs * 2
      : this.retryConfig.baseDelayMs;

    // Exponential backoff: baseDelay * 2^attempt
    let delay = baseDelay * Math.pow(2, attempt);

    // Ograniči na max delay
    delay = Math.min(delay, this.retryConfig.maxDelayMs);

    // Dodaj random jitter za izbjegavanje thundering herd problema
    const jitter = Math.random() * this.retryConfig.jitterMs * 2 - this.retryConfig.jitterMs;
    delay += jitter;

    return Math.max(0, Math.round(delay));
  }

  /**
   * Stvori user-friendly error poruku
   */
  private createUserFriendlyError(error: any): Error {
    if (this.isRateLimitError(error)) {
      return new Error('Sustav je trenutno preopterećen. Molimo pokušajte ponovno za nekoliko sekundi.');
    }

    const message = String(error.message || '').toLowerCase();
    if (message.includes('timeout')) {
      return new Error('Zahtjev je trajao predugo. Molimo pokušajte ponovno.');
    }

    if (message.includes('network') || message.includes('connection')) {
      return new Error('Problem s mrežnom vezom. Molimo provjerite internet i pokušajte ponovno.');
    }

    return new Error('Došlo je do greške pri obradi zahtjeva. Molimo pokušajte ponovno.');
  }

  /**
   * Ažuriraj prosječnu latenciju (rolling average)
   */
  private updateAverageLatency(latencyMs: number): void {
    const totalSuccessful = this.stats.successfulRequests;
    if (totalSuccessful === 1) {
      this.stats.averageLatencyMs = latencyMs;
    } else {
      // Rolling average
      this.stats.averageLatencyMs =
        (this.stats.averageLatencyMs * (totalSuccessful - 1) + latencyMs) / totalSuccessful;
    }
  }

  /**
   * Helper za sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Dohvati statistike za monitoring/debugging
   */
  getStats(): typeof this.stats & { queueSize: number; activeRequests: number } {
    return {
      ...this.stats,
      queueSize: this.requestQueue.length,
      activeRequests: this.activeRequests,
    };
  }

  /**
   * Reset statistike
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      rateLimitHits: 0,
      averageLatencyMs: 0,
    };
  }

  private parseResponse(responseText: string, queryType: 'validation' | 'multi-service' | 'standard' = 'standard'): RagSuggestion[] {
    try {
      this.logger.log(`RAG Raw Response (first 800 chars): ${responseText.substring(0, 800)}`);

      let cleaned = responseText.trim();

      // Ukloni markdown code blocks
      cleaned = cleaned.replace(/```(?:json|JSON)?\s*/g, '');
      cleaned = cleaned.replace(/```\s*/g, '');

      this.logger.debug(`After markdown strip: ${cleaned.substring(0, 400)}`);

      let suggestions: any[] = [];

      // Prvo pokušaj parsirati kao {"suggestions": [...]} format (FiskalAI stil)
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
          suggestions = parsed.suggestions;
          this.logger.debug(`Parsed suggestions from object format (${suggestions.length} items)`);
        } else if (Array.isArray(parsed)) {
          suggestions = parsed;
          this.logger.debug(`Parsed suggestions from array format (${suggestions.length} items)`);
        }
      } catch {
        // Ako ne uspije, pokušaj izvući JSON array
        const jsonArrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonArrayMatch) {
          cleaned = jsonArrayMatch[0];
          suggestions = JSON.parse(cleaned);
          this.logger.debug(`Extracted JSON array (${suggestions.length} items)`);
        } else {
          // Provjeri prazan array
          const emptyArrayMatch = cleaned.match(/\[\s*\]/);
          if (emptyArrayMatch) {
            this.logger.log('RAG returned empty array');
            return [];
          }
          this.logger.warn('Could not extract JSON from response');
          return [];
        }
      }

      if (!Array.isArray(suggestions)) {
        this.logger.warn('RAG response nije array');
        return [];
      }

      this.logger.log(`Parsed ${suggestions.length} suggestions from RAG (type: ${queryType})`);

      // Maksimalni broj rezultata ovisi o tipu upita (svi tipovi sada vraćaju do 8)
      const maxResults = queryType === 'multi-service' ? 8 : queryType === 'validation' ? 5 : 8;

      // Validiraj i mapiraj strukturu
      return suggestions
        .filter((s: any) => s.code && s.name && typeof s.confidence === 'number')
        .map((s: any) => ({
          code: String(s.code).trim(),
          name: String(s.name).trim(),
          confidence: Math.min(1, Math.max(0, Number(s.confidence))),
          reason: s.reason ? String(s.reason).trim() : undefined,
          isValidation: s.isValidation === true,
          isValid: s.isValid === true || s.isValid === false ? s.isValid : undefined,
        }))
        .slice(0, maxResults);
    } catch (error) {
      this.logger.error('Greška pri parsiranju RAG responsa:', error);
      this.logger.error('Raw response was:', responseText.substring(0, 1000));
      return [];
    }
  }
}
