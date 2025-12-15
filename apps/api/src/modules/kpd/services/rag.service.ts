import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

interface RagSuggestion {
  code: string;
  name: string;
  confidence: number;
  reason?: string;
}

/**
 * RAG Service - Google Gemini File Search API
 *
 * Koristi Google Gemini za pretragu KPD šifara s File Search grounding.
 * RAG Store ID povezuje se s uploadanim KPD dokumentima za semantičku pretragu.
 */
@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private client: GoogleGenAI | null = null;
  private ragStoreId: string | null = null;
  private isInitialized = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const ragStoreIdConfig = this.configService.get<string>('RAG_STORE_ID');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY nije konfiguriran - RAG usluga onemogućena');
      return;
    }

    // Default RAG store ID za KPD ako nije konfigurirano
    this.ragStoreId = ragStoreIdConfig || 'fileSearchStores/kpd-2025-classification-kno-69q2f41wumy0';
    this.logger.log(`RAG Store ID: ${this.ragStoreId}`);

    try {
      this.client = new GoogleGenAI({ apiKey });
      this.isInitialized = true;
      this.logger.log('RAG Service inicijaliziran s File Search');
    } catch (error) {
      this.logger.error('Greška pri inicijalizaciji Gemini API:', error);
    }
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
      const prompt = this.buildPrompt(query);
      const response = await this.queryGemini(prompt);
      return this.parseResponse(response);
    } catch (error) {
      this.logger.error(`RAG search greška za upit "${query}":`, error);
      throw error;
    }
  }

  private buildPrompt(query: string): string {
    return `Na temelju KPD 2025 klasifikacije, pronađi SVE relevantne KPD šifre za sljedeći artikl/uslugu:

ARTIKL: "${query}"

VAŽNO - Analiziraj artikl iz SVIH mogućih aspekata poslovanja. Razmisli koje sve djelatnosti mogu biti povezane s ovim artiklom/uslugom:

1. PROIZVOD (sektor C, 10-33) - Ako se radi o fizičkom proizvodu, koja šifra opisuje proizvodnju?
   Primjeri: klima uređaj = 28.25.12, laptop/računalo = 26.20.15, kruh = 10.71.11

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

7. IT USLUGE / SOFTVER (sektor J, 62-63) - Ako se radi o softveru, aplikacijama ili IT uslugama
   Primjeri: izrada softvera = 62.01.xx, web stranice = 62.01.21, hosting = 63.11.xx

8. UGOSTITELJSTVO (sektor I, 55-56) - Ako se radi o hrani/piću za konzumaciju
   Primjeri: restorani = 56.10.xx, barovi = 56.30.xx

9. PRIJEVOZ/DOSTAVA (sektor H, 49-53) - Ako usluga uključuje dostavu ili prijevoz
   Primjeri: cestovni prijevoz = 49.41.xx, kurirske usluge = 53.20.xx

10. STRUČNE USLUGE (sektor M, 69-75) - Ako se radi o savjetovanju, projektiranju, marketingu
    Primjeri: pravne usluge = 69.10.xx, računovodstvo = 69.20.xx, marketing = 73.11.xx

Vrati maksimalno 5 najprikladnijih KPD šifara. OBAVEZNO uključi šifre iz RAZLIČITIH aspekata ako su primjenjivi na artikl!

Za svaku šifru navedi:
- code: KPD šifra (format XX.XX.XX - 6 znamenki)
- name: Službeni naziv šifre iz KPD klasifikacije (TOČAN naziv, ne izmišljaj!)
- confidence: Pouzdanost prijedloga (0.0 - 1.0)
- reason: Kratko objašnjenje + ASPEKT (npr. "ASPEKT: Proizvod", "ASPEKT: Trgovina na malo", "ASPEKT: Popravak IT")

KRITIČNO - STROGA PRAVILA:
1. Koristi ISKLJUČIVO šifre koje postoje u priloženoj KPD klasifikaciji!
2. NIKAD ne izmišljaj šifre - ako nisi siguran, ne uključuj tu šifru
3. Preferiraj finalne šifre sa 6 znamenki (XX.XX.XX)
4. Provjeri svaku šifru u priloženom dokumentu prije nego je predložiš

Odgovori ISKLJUČIVO u JSON formatu bez dodatnog teksta:
[
  {"code": "XX.XX.XX", "name": "Naziv", "confidence": 0.95, "reason": "Objašnjenje - ASPEKT: naziv_aspekta"}
]

Ako ne možeš pronaći odgovarajuću šifru, vrati prazan array: []`;
  }

  private async queryGemini(prompt: string): Promise<string> {
    if (!this.client || !this.ragStoreId) {
      throw new Error('Gemini client ili RAG store nije inicijaliziran');
    }

    this.logger.debug(`Querying Gemini with File Search grounding: ${this.ragStoreId}`);

    // Timeout wrapper - 25 seconds max (ostavi 5s za frontend)
    const timeoutMs = 25000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout - upit predugo traje')), timeoutMs);
    });

    const queryPromise = this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [this.ragStoreId],
            },
          },
        ],
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 4096,
      },
    });

    const result = await Promise.race([queryPromise, timeoutPromise]);

    return result.text || '';
  }

  private parseResponse(responseText: string): RagSuggestion[] {
    try {
      this.logger.log(`RAG Raw Response (first 500 chars): ${responseText.substring(0, 500)}`);

      let cleaned = responseText.trim();

      // Metoda 1: Ukloni SVE markdown code block oznake (```json, ```, itd.)
      // Koristi regex koji hvata sve varijante
      cleaned = cleaned.replace(/```(?:json|JSON)?\s*/g, '');
      cleaned = cleaned.replace(/```\s*/g, '');

      this.logger.debug(`After markdown strip: ${cleaned.substring(0, 300)}`);

      // Metoda 2: Izvuci JSON array direktno pomoću regex
      // Traži pattern koji počinje s [ i završava s ], s objektima unutra
      const jsonArrayMatch = cleaned.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonArrayMatch) {
        cleaned = jsonArrayMatch[0];
        this.logger.debug(`Extracted JSON array: ${cleaned.substring(0, 200)}`);
      } else {
        // Fallback: možda je prazan array []
        const emptyArrayMatch = cleaned.match(/\[\s*\]/);
        if (emptyArrayMatch) {
          this.logger.log('RAG returned empty array - no matches found');
          return [];
        }
        this.logger.warn('Could not extract JSON array from response');
      }

      // Parsiraj JSON
      const suggestions = JSON.parse(cleaned);

      if (!Array.isArray(suggestions)) {
        this.logger.warn('RAG response nije array');
        return [];
      }

      this.logger.log(`Parsed ${suggestions.length} suggestions from RAG`);

      // Validiraj strukturu
      return suggestions
        .filter((s: any) => s.code && s.name && typeof s.confidence === 'number')
        .map((s: any) => ({
          code: String(s.code).trim(),
          name: String(s.name).trim(),
          confidence: Math.min(1, Math.max(0, Number(s.confidence))),
          reason: s.reason ? String(s.reason).trim() : undefined,
        }))
        .slice(0, 5);
    } catch (error) {
      this.logger.error('Greška pri parsiranju RAG responsa:', error);
      this.logger.error('Raw response was:', responseText);
      return [];
    }
  }
}
