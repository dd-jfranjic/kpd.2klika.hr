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

  /**
   * Pretraži KPD šifre korištenjem Gemini AI
   */
  async searchKpd(query: string): Promise<RagSuggestion[]> {
    if (!this.isReady()) {
      this.logger.warn('RAG service nije spreman, vraćam prazan rezultat');
      return [];
    }

    try {
      // Detektiraj tip upita
      const queryType = this.detectQueryType(query);
      this.logger.log(`Query type detected: ${queryType}`);

      const prompt = this.buildPrompt(query, queryType);
      const response = await this.queryGemini(prompt);
      return this.parseResponse(response, queryType);
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
- Ako šifra nije prikladna, dodaj 2-3 bolje alternative`;
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
- Format reason: "Objašnjenje - ASPEKT: naziv" (ASPEKT ide NA KRAJ!)`;
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

Odgovori ISKLJUČIVO u JSON formatu bez dodatnog teksta:
{
  "suggestions": [
    {"code": "XX.XX.XX", "name": "Naziv", "confidence": 0.95, "reason": "Objašnjenje zašto je ova šifra prikladna - ASPEKT: naziv_aspekta"}
  ]
}`;
  }

  private async queryGemini(prompt: string): Promise<string> {
    if (!this.client || !this.ragStoreId) {
      throw new Error('Gemini client ili RAG store nije inicijaliziran');
    }

    this.logger.debug(`Querying Gemini with File Search grounding: ${this.ragStoreId}`);

    // Bez timeout wrappera - Gemini API ima vlastiti timeout
    const response = await this.client.models.generateContent({
      model: this.geminiModel,
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [this.ragStoreId],
            },
          },
        ],
      },
    });

    return response.text || '';
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
