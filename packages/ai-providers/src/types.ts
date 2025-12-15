import { z } from 'zod';

// Classification input schema
export const ClassificationInputSchema = z.object({
  description: z.string().min(10).max(5000),
  language: z.enum(['hr', 'en']).default('hr'),
  maxResults: z.number().min(1).max(10).default(5),
  includeExplanation: z.boolean().default(true),
});

export type ClassificationInput = z.infer<typeof ClassificationInputSchema>;

// Classification result schema
export const ClassificationResultSchema = z.object({
  code: z.string(),
  name: z.string(),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
  parentCode: z.string().nullable().optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// Full classification response
export const ClassificationResponseSchema = z.object({
  results: z.array(ClassificationResultSchema),
  inputDescription: z.string(),
  processingTimeMs: z.number(),
  modelUsed: z.string(),
  tokenCount: z.object({
    input: z.number(),
    output: z.number(),
  }).optional(),
});

export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;

// Provider configuration
export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

// Provider interface
export interface AIProvider {
  name: string;
  classify(input: ClassificationInput): Promise<ClassificationResponse>;
  validateConfig(): boolean;
}

// Error types
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(provider: string, retryAfterMs?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ''}`,
      provider,
      'RATE_LIMIT',
      true
    );
    this.name = 'RateLimitError';
  }
}

export class InvalidResponseError extends AIProviderError {
  constructor(provider: string, details?: string) {
    super(
      `Invalid response from ${provider}${details ? `: ${details}` : ''}`,
      provider,
      'INVALID_RESPONSE',
      true
    );
    this.name = 'InvalidResponseError';
  }
}
