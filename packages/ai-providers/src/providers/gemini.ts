import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import pino from 'pino';
import {
  AIProvider,
  AIProviderConfig,
  ClassificationInput,
  ClassificationResponse,
  ClassificationResult,
  AIProviderError,
  RateLimitError,
  InvalidResponseError,
} from '../types';

const logger = pino({ name: 'gemini-provider' });

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.1;
const DEFAULT_TIMEOUT = 30000;

export interface GeminiConfig extends AIProviderConfig {
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = {
      model: DEFAULT_MODEL,
      maxTokens: DEFAULT_MAX_TOKENS,
      temperature: DEFAULT_TEMPERATURE,
      timeout: DEFAULT_TIMEOUT,
      ...config,
    };

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = this.client.getGenerativeModel({
      model: this.config.model!,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    });
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  async classify(input: ClassificationInput): Promise<ClassificationResponse> {
    const startTime = Date.now();

    if (!this.validateConfig()) {
      throw new AIProviderError(
        'Invalid Gemini configuration: API key is required',
        this.name,
        'INVALID_CONFIG'
      );
    }

    const prompt = this.buildPrompt(input);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = this.parseResponse(text, input.maxResults);
      const processingTimeMs = Date.now() - startTime;

      // Get token counts if available
      const tokenCount = response.usageMetadata
        ? {
            input: response.usageMetadata.promptTokenCount || 0,
            output: response.usageMetadata.candidatesTokenCount || 0,
          }
        : undefined;

      logger.info({
        msg: 'Classification completed',
        resultsCount: parsed.length,
        processingTimeMs,
        tokenCount,
      });

      return {
        results: parsed,
        inputDescription: input.description,
        processingTimeMs,
        modelUsed: this.config.model!,
        tokenCount,
      };
    } catch (error: any) {
      logger.error({ msg: 'Gemini classification error', error: error.message });

      if (error.status === 429) {
        throw new RateLimitError(this.name);
      }

      if (error.status === 400) {
        throw new AIProviderError(
          `Bad request: ${error.message}`,
          this.name,
          'BAD_REQUEST'
        );
      }

      throw new AIProviderError(
        `Gemini API error: ${error.message}`,
        this.name,
        'API_ERROR',
        true
      );
    }
  }

  private buildPrompt(input: ClassificationInput): string {
    const language = input.language === 'hr' ? 'Croatian' : 'English';
    const explanationInstructions = input.includeExplanation
      ? 'Include a brief explanation for each classification.'
      : 'Do not include explanations.';

    return `You are a KPD (Klasifikacija Proizvoda po Djelatnostima) classification expert for Croatian businesses.
Your task is to classify a business description into the most appropriate KPD codes.

KPD (Classification of Products by Activities) is the Croatian standard based on CPA (Classification of Products by Activity).
KPD codes follow a hierarchical structure: Section (1 letter) -> Division (2 digits) -> Group (3 digits) -> Class (4 digits) -> Category (5 digits) -> Subcategory (6 digits).

Business Description (in ${language}):
"${input.description}"

Instructions:
1. Analyze the business description carefully
2. Identify the main products or services described
3. Match them to the most specific KPD codes possible
4. Provide up to ${input.maxResults} most relevant KPD codes
5. ${explanationInstructions}
6. Order results by confidence (highest first)

Response format (JSON array):
[
  {
    "code": "XX.XX.XX",
    "name": "Official KPD category name in Croatian",
    "confidence": 0.95,
    "explanation": "Brief explanation why this code matches"
  }
]

Important:
- Use real KPD codes only
- Confidence should be between 0 and 1
- Be specific - prefer 6-digit codes when possible
- If unsure, use broader category codes (4-5 digits)

Respond with ONLY the JSON array, no additional text.`;
  }

  private parseResponse(text: string, maxResults: number): ClassificationResult[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new InvalidResponseError(this.name, 'Response is not an array');
      }

      const results: ClassificationResult[] = parsed
        .slice(0, maxResults)
        .map((item: any) => ({
          code: String(item.code || ''),
          name: String(item.name || ''),
          confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
          explanation: item.explanation ? String(item.explanation) : undefined,
          parentCode: item.parentCode || null,
        }))
        .filter((r: ClassificationResult) => r.code && r.name);

      if (results.length === 0) {
        throw new InvalidResponseError(this.name, 'No valid classifications in response');
      }

      return results;
    } catch (error) {
      if (error instanceof InvalidResponseError) {
        throw error;
      }
      throw new InvalidResponseError(
        this.name,
        `Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Factory function for creating Gemini provider
export function createGeminiProvider(config: GeminiConfig): GeminiProvider {
  return new GeminiProvider(config);
}
